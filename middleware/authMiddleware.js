const jwt = require("jsonwebtoken");
const Citizen = require("../models/Citizen"); 

exports.protect = async (req, res, next) => {
  let token;

  // 1. Check if the token was sent in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1]; // Extract token from "Bearer <token>"
  }

  // 2. If no token, deny access
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized to access this route" });
  }

  try {
    // 3. Verify token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach the decoded user payload (id and role) to the request object
    req.user = decoded;

    // 5. Move to the next function (the controller)
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Token failed or expired" });
  }
};

exports.protectCitizen = async (req, res, next) => {
  let token;

  // 1. Check if the request has an authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(" ")[1];

      // 2. Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Fetch the citizen from the database and attach it to req.user
      req.user = await Citizen.findById(decoded.id).select("-password");

      // 4. Let them pass!
      next();
    } catch (error) {
      console.error("Not authorized, token failed");
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, no token provided" });
  }
};
