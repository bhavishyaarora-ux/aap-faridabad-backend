const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed using bcrypt
    role: {
      type: String,
      enum: ["Admin", "AssemblyInCharge", "GroundWorker"],
      default: "GroundWorker",
    },
    // Specific assembly constituency in Faridabad (e.g., 'NIT', 'Badkhal', 'Ballabhgarh')
    assignedAssembly: { type: String, required: true },
    // Array of sectors/wards this specific ground worker handles
    assignedLocalities: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
