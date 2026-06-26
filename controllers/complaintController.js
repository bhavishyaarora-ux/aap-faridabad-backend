const Complaint = require("../models/Complaint");

/**
 * @desc    Submit a new civic complaint (Citizen facing)
 * @route   POST /api/complaints
 * @access  Public (Citizens don't need to log in to report issues)
 */
exports.submitComplaint = async (req, res) => {
  try {
    const imageUrl = req.file ? req.file.path : null;
    const {category, description, lat, lng } = req.body;

    // 1. Validate incoming data
    if (!imageUrl || !category || !lat || !lng) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide image, category, and GPS coordinates",
        });
    }

    let parsedAddress = "Unknown Location";
    let detectedSector = "Unassigned";

    // 2. REVERSE GEOCODING: Turn GPS into a real Faridabad address
    // We use OpenStreetMap's free Nominatim API. No API key required!
    try {
      console.log(`Translating GPS: Lat ${lat}, Lng ${lng}...`);
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "AAP-Faridabad-Civic-App" } }, // Nominatim requires a user-agent
      );

      const geoData = await geoResponse.json();

      if (geoData && geoData.address) {
        // Construct a readable address from the API response
        parsedAddress = geoData.display_name;
        // Try to extract the neighborhood, suburb, or road for the sector name
        detectedSector =
          geoData.address.neighbourhood ||
          geoData.address.suburb ||
          geoData.address.residential ||
          "Open Pool";
      }
    } catch (geoError) {
      console.log(
        "Geocoding failed, but saving complaint anyway:",
        geoError.message,
      );
    }

    // 3. Save the complaint to the Database
    const newComplaint = await Complaint.create({
      imageUrl,
      category,
      description: description || "No description provided",
      location: {
        type: "Point",
        coordinates: [lng, lat], // IMPORTANT: MongoDB requires Longitude first, then Latitude!
      },
      parsedAddress,
      detectedSector,
      status: "Pending",
      assignedWorker: null, // Remains null until a worker claims it from the open pool
      citizenEmail: req.citizen
        ? req.citizen.email
        : req.user
          ? req.user.email
          : "anonymous@citizen.com",
      citizenId: req.citizen ? req.citizen._id : req.user ? req.user._id : null,
    });

    // 4. Send success response back to the citizen's phone
    return res.status(201).json({
      success: true,
      message: "Complaint submitted successfully into the open pool!",
      data: newComplaint,
    });
  } catch (error) {
    console.error("Complaint Submission Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server Error: Could not submit complaint",
      });
  }
};
exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 }); // Newest first
    return res
      .status(200)
      .json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server Error fetching complaints" });
  }
};

exports.boostComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;

    // Securely get the ID of the citizen making the request
    const citizenId = req.citizen
      ? req.citizen._id
      : req.user
        ? req.user._id
        : null;

    if (!citizenId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Please log in." });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    // Check if this specific citizen has already boosted this complaint
    const alreadyBoosted = complaint.boostedBy.includes(citizenId);

    let updatedComplaint;

    if (alreadyBoosted) {
      // UN-BOOST: They already boosted it, so remove their ID and subtract 1
      updatedComplaint = await Complaint.findByIdAndUpdate(
        complaintId,
        {
          $pull: { boostedBy: citizenId }, // Removes ID from array
          $inc: { boosts: -1 }, // Decreases total count
        },
        { new: true },
      );
    } else {
      // BOOST: Add their ID to the array and add 1
      updatedComplaint = await Complaint.findByIdAndUpdate(
        complaintId,
        {
          $addToSet: { boostedBy: citizenId }, // Adds ID to array safely
          $inc: { boosts: 1 }, // Increases total count
        },
        { new: true },
      );
    }

    return res.status(200).json({ success: true, data: updatedComplaint });
  } catch (error) {
    console.error("Boost Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error boosting complaint" });
  }
};
