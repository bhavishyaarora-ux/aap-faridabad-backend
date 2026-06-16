const express = require("express");
const router = express.Router();
const {
  getOpenPool,
  claimComplaint,
} = require("../controllers/workerController");
const { protect } = require("../middleware/authMiddleware");

// GET request to view open pool (Requires login)
router.get("/pool", protect, getOpenPool);

// PUT request to claim a specific ticket (Requires login)
router.put("/claim/:id", protect, claimComplaint);

module.exports = router;
