const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error("❌ Error: MONGO_URI is missing in environment variables!");
      return;
    }

    const conn = await mongoose.connect(mongoURI);
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // ไม่ใส่ process.exit(1) เพื่อให้ Express Server ยังคงรันและเปิด Port ได้ต่อ
  }
};

module.exports = connectDB;
