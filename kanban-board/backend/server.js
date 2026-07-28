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
const allowedOrigins = [
  "https://project-every-day.vercel.app",
  "https://project-every-day.vercel.app/",
  "http://localhost:3000",
  "http://127.0.0.1:5500", // เผื่อรัน Live Server ในเครื่อง
];

app.use(
  cors({
    origin: function (origin, callback) {
      // !origin ช่วยให้ tools อย่าง Postman หรือ cURL ยิงทดสอบได้
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use("/api/tasks", require("./routes/taskRoutes"));

const PORT = process.env.PORT || 3000;

// ให้ Server เริ่มทำงานและเปิด Port ก่อนเลย
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // จากนั้นค่อยสั่งเชื่อมต่อ Database
  connectDB();
});
