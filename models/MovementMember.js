const mongoose = require("mongoose");

const MovementMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    mobile: {
      type: String,
      required: [true, "Please add a mobile number"],
      unique: true,
      match: [/^\d{10}$/, "Please add a valid 10 digit mobile number"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    constituency: {
      type: String,
      required: [true, "Please select a constituency"],
    },
    coreMotivations: {
      type: [String],
      required: true,
    },
    membershipId: {
      type: String,
      unique: true,
      required: true,
    },
    currentOtp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // CRITICAL: Forces Mongoose to use this exact collection name
    collection: "movement_members",
  },
);

module.exports = mongoose.model("MovementMember", MovementMemberSchema);
