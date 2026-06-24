const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  sendWorkerOtp,
  verifyWorkerOtp,
  googleLogin,
  sendVolunteerOtp,
  verifyVolunteerOtp,
} = require("../controllers/authController");

// Mapping endpoints to controller handlers
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/worker-otp", sendWorkerOtp);
router.post("/worker-verify", verifyWorkerOtp);
router.post("/citizen/google", googleLogin);
router.post("/volunteer-otp", sendVolunteerOtp);
router.post("/volunteer-verify", verifyVolunteerOtp);

module.exports = router;
