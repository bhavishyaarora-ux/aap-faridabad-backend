require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const workerRoutes = require("./routes/workerRoutes");
const movementRoutes = require("./routes/movementRoutes");

const app = express();

// Database Connection
connectDB();

// Global Middleware
app.use(cors());
app.use(express.json()); // Essential for parsing raw JSON payloads

// Mounting Application Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/movement", movementRoutes);
app.use("/api/auth", authRoutes);


// Catch-All Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Application core executing on port ${PORT}`);
});
