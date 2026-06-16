const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`✗ Database Connection Error: ${error.message}`);
    // Exit process with failure code if connection cannot be established
    process.exit(1);
  }
};

module.exports = connectDB;
