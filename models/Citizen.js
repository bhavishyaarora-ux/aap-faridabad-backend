const mongoose = require("mongoose");

const CitizenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: true },
    profilePicture: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Citizen", CitizenSchema);
