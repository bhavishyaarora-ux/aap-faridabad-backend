const MovementMember = require("../models/MovementMember");

const generateMembershipId = () => {
  const random4Digit = Math.floor(1000 + Math.random() * 9000);
  return `AAP-FBD-2026-${random4Digit}`;
};

exports.joinMovement = async (req, res) => {
  try {
    const { name, mobile, constituency, coreMotivations } = req.body;

    // 1. Check for missing fields
    if (
      !name ||
      !mobile ||
      !constituency ||
      !coreMotivations ||
      coreMotivations.length === 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required fields.",
        });
    }

    // 2. Find the existing member (created during the OTP step)
    const existingMember = await MovementMember.findOne({ mobile });

    if (!existingMember) {
      // This is a safety catch. If they somehow bypassed the OTP step, we reject them.
      return res
        .status(400)
        .json({
          success: false,
          message: "Please verify your email first before joining.",
        });
    }

    // Optional Check: Ensure they actually verified the OTP!
    // if (!existingMember.isVerified) {
    //   return res.status(400).json({ success: false, message: 'Email not verified. Please verify your OTP.' });
    // }

    // 3. Generate Unique Pass ID
    const membershipId = generateMembershipId();

    // 4. UPDATE the existing document instead of creating a new one
    existingMember.constituency = constituency;
    existingMember.coreMotivations = coreMotivations;
    existingMember.membershipId = membershipId;

    await existingMember.save();

    return res.status(201).json({
      success: true,
      message: "Successfully joined the movement!",
      data: existingMember, // Return the updated member
    });

    // directly BELOW
  } catch (error) {
    console.error("Join Movement Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing registration.",
    });
  }
};
