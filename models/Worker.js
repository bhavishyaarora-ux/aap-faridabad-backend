const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    telegramChatId: { type: String, required: true, unique: true }, // Mapped to their Telegram App
    currentOtp: { type: String }, // Temp storage for the 4-digit code
    otpExpiry: { type: Date },
    role: { type: String, default: "Ground Worker" },
  },
  { collection: "ground_workers" },
);

module.exports = mongoose.model("Worker", WorkerSchema);
