const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true }, // URL path from cloud storage
    category: { type: String, required: true }, // e.g., 'Sewage', 'Pothole', 'Garbage'
    description: { type: String },

    // Storing precise GPS location using MongoDB GeoJSON format
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },

    parsedAddress: { type: String }, // Human-readable address from reverse geocoding
    detectedSector: { type: String }, // Extracted sector name for matching logic

    status: {
      type: String,
      enum: ["Pending", "Verified", "In-Progress", "Resolved"],
      default: "Pending",
    },

    // Link to the specific worker responsible for resolution
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    boosts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Create a 2dsphere index to enable spatial calculations
ComplaintSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Complaint", ComplaintSchema);
