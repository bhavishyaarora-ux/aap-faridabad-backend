const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Worker = require("../models/Worker");
const Citizen = require("../models/Citizen");
const MovementMember = require("../models/MovementMember");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");

// Helper function to sign JWT tokens
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "30d", // 30-day lifecycle for ground operations persistence
  });
};

/**
 * @desc    Register a new party worker / admin
 * @route   POST /api/auth/register
 * @access  Public (Can be restricted by role later)
 */
exports.registerUser = async (req, res) => {
  try {
    console.log("!!! HEY! A request just arrived from Postman !!!");
    const {
      name,
      phone,
      password,
      role,
      assignedAssembly,
      assignedLocalities,
    } = req.body;

    // 1. Validate mandatory user properties
    if (!name || !phone || !password || !assignedAssembly) {
      return res.status(400).json({
        success: false,
        message: "Please provide all mandatory fields",
      });
    }

    // 2. Prevent duplication by checking existing phone registration
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "A worker with this phone number already exists",
      });
    }

    // 3. Securely hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create record in MongoDB Atlas
    const newUser = await User.create({
      name,
      phone,
      password: hashedPassword,
      role,
      assignedAssembly,
      assignedLocalities: assignedLocalities || [],
    });

    // 5. Send back credential profiles alongside access token
    return res.status(201).json({
      success: true,
      token: generateToken(newUser._id, newUser.role),
      user: {
        id: newUser._id,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        assignedAssembly: newUser.assignedAssembly,
        assignedLocalities: newUser.assignedLocalities,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Authenticate party worker & generate token
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // 1. Validate input structure
    if (!phone || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide phone and password" });
    }

    // 2. Search for existing profile
    const user = await User.findOne({ phone });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // 3. Verify string matches database crypt hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // 4. Issue authenticated session pass
    return res.status(200).json({
      success: true,
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        assignedAssembly: user.assignedAssembly,
        assignedLocalities: user.assignedLocalities,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Authenticate Citizen with Google
 * @route   POST /api/auth/citizen/google
 * @access  Public
 */
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // 1. Ask Google to verify the token sent from React
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 2. Check if this citizen is already in our database
    let citizen = await Citizen.findOne({ email });

    // 3. If they are new, save their email to the database!
    if (!citizen) {
      citizen = await Citizen.create({
        name,
        email,
        googleId,
        profilePicture: picture,
      });
    }

    // 4. Send back an AAP App Session Token so they stay logged in
    res.status(200).json({
      success: true,
      token: generateToken(citizen._id, "citizen"),
      user: {
        id: citizen._id,
        name: citizen.name,
        email: citizen.email,
        picture: citizen.profilePicture,
      },
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ success: false, message: "Invalid Google Token" });
  }
};

// --- WORKER & VOLUNTEER OTP LOGIC ---

exports.sendWorkerOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    console.log("👉 1. FRONTEND SENT THIS NUMBER:", mobile);
    console.log("👉 2. LOOKING IN DATABASE...");
    const worker = await Worker.findOne({ mobile });
    console.log("👉 3. DATABASE RETURNED:", worker);

    if (!worker)
      return res.status(404).json({
        success: false,
        message: "Unauthorized. Number not registered in Command Center.",
      });

    // Generate 4-digit OTP & Expiry (5 mins)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    worker.currentOtp = otp;
    worker.otpExpiry = Date.now() + 5 * 60 * 1000;
    await worker.save();

    // The Zero-Cost Telegram API Call
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN || "";
    const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

    // Fire & Forget HTTP POST to Telegram
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: worker.telegramChatId,
        text: `🚨 *AAP Faridabad Command Center*\n\nWorker: ${worker.name}\nYour secure access OTP is: *${otp}*\n\nValid for 5 minutes. Do not share.`,
        parse_mode: "Markdown",
      }),
    });

    const tgData = await telegramResponse.json();
    console.log("👉 Telegram API Response:", tgData);

    if (!telegramResponse.ok) {
      return res.status(500).json({
        success: false,
        message: "Telegram rejected the message. Check server console.",
      });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Secure OTP sent to your Telegram app.",
      });
  } catch (error) {
    console.error("OTP Error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error triggering Telegram Bot.",
      });
  }
};

exports.verifyWorkerOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const worker = await Worker.findOne({ mobile });

    if (!worker || worker.currentOtp !== otp || worker.otpExpiry < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    // Clear OTP after successful login
    worker.currentOtp = undefined;
    worker.otpExpiry = undefined;
    await worker.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Verified",
        data: { name: worker.name, role: worker.role },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed." });
  }
};

/**
 * @desc    Send OTP via Email to new public volunteers
 * @route   POST /api/auth/volunteer-otp
 */
exports.sendVolunteerOtp = async (req, res) => {
  try {
    const { name, mobile, email } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    // Use findOneAndUpdate with upsert to bypass document validation completely for Step 1
    // This talks directly to MongoDB and skips Mongoose's strict required field checks!
    await MovementMember.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          mobile,
          currentOtp: otp,
          otpExpiry: otpExpiry,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"AAP Faridabad" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Join AAP Faridabad - Email Verification",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #1e3a8a;">Welcome ${name}!</h2>
            <p>Your verification code to join the movement is:</p>
            <h1 style="background: #f3f4f6; padding: 10px; display: inline-block; letter-spacing: 5px;">${otp}</h1>
            <p style="color: gray; font-size: 12px;">Valid for 5 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("Volunteer OTP Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error sending OTP" });
  }
};

/**
 * @desc    Verify Volunteer OTP
 * @route   POST /api/auth/volunteer-verify
 */
exports.verifyVolunteerOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const member = await MovementMember.findOne({ email });

    if (!member || member.currentOtp !== otp || member.otpExpiry < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    // Use updateOne to safely clear the OTPs without triggering strict schema validation
    await MovementMember.updateOne(
      { email },
      {
        $set: { isVerified: true },
        $unset: { currentOtp: 1, otpExpiry: 1 },
      },
    );

    res
      .status(200)
      .json({ success: true, message: "Welcome to the Movement!" });
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ success: false, message: "Verification failed." });
  }
};
