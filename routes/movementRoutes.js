const express = require("express");
const router = express.Router();
const { joinMovement } = require("../controllers/movementController");

// POST request to register a new citizen volunteer
router.post("/join", joinMovement);

module.exports = router;
