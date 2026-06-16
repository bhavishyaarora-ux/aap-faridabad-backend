const express = require("express");
const router = express.Router();
const { submitComplaint } = require("../controllers/complaintController");

// POST request to submit a new issue
router.post("/", submitComplaint);

module.exports = router;
