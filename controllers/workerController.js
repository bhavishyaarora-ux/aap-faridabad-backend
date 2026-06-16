const Complaint = require("../models/Complaint");

/**
 * @desc    Get all open, unassigned complaints (The Job Pool)
 * @route   GET /api/workers/pool
 * @access  Private (Requires Worker JWT)
 */
exports.getOpenPool = async (req, res) => {
  try {
    // Find all complaints where assignedWorker is null and status is Pending
    const openComplaints = await Complaint.find({
      assignedWorker: null,
      status: "Pending",
    }).sort({ createdAt: -1 }); // Sort by newest first

    return res.status(200).json({
      success: true,
      count: openComplaints.length,
      data: openComplaints,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error fetching pool" });
  }
};

/**
 * @desc    Worker claims a complaint from the pool
 * @route   PUT /api/workers/claim/:id
 * @access  Private (Requires Worker JWT)
 */
exports.claimComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const workerId = req.user.id; // This will come from our auth middleware!

    // 1. Find the complaint
    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    // 2. Check if someone else already claimed it
    if (complaint.assignedWorker !== null) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Another worker already claimed this issue.",
        });
    }

    // 3. Update the ticket: Attach worker and change status
    complaint.assignedWorker = workerId;
    complaint.status = "Verified";
    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "You have successfully claimed this issue.",
      data: complaint,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error claiming complaint" });
  }
};
