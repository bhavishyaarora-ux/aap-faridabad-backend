const express = require("express");
const router = express.Router();
const {
  submitComplaint,
  getAllComplaints,
  boostComplaint,
} = require("../controllers/complaintController");
const complaintController = require('../controllers/complaintController');
const upload = require('../config/cloudinary'); // Import our new Cloudinary middleware
const { protectCitizen } = require("../middleware/authMiddleware");

router.get("/", getAllComplaints);

// POST request to submit a new issue
// --- UPDATE YOUR POST ROUTE TO INCLUDE upload.single('image') ---
router.post("/", upload.single("image"), complaintController.submitComplaint);
router.patch("/:id/boost", protectCitizen, boostComplaint);

module.exports = router;
