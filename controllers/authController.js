const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all mandatory fields",
        });
    }

    // 2. Prevent duplication by checking existing phone registration
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res
        .status(400)
        .json({
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
