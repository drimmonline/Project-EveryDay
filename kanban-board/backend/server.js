const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is working!");
});

app.use("/api/tasks", require("./routes/taskRoutes"));

const PORT = process.env.PORT || 10000;

// ให้ Server เริ่มทำงานและเปิด Port ก่อนเลย
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // จากนั้นค่อยสั่งเชื่อมต่อ Database
  connectDB();
});
