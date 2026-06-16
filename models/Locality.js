const mongoose = require("mongoose");

const LocalitySchema = new mongoose.Schema({
  sectorName: { type: String, required: true, unique: true }, // e.g., 'Sector 15', 'NIT 3'
  assemblyName: { type: String, required: true }, // e.g., 'Badkhal'
  primaryWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // The worker automatically assigned
});

module.exports = mongoose.model("Locality", LocalitySchema);
