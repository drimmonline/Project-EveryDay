const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();

// 1. Allowed Origins List
const allowedOrigins = [
  "https://project-every-day.vercel.app",
  "https://project-every-day.vercel.app/",
  "http://localhost:3000",
  "http://127.0.0.1:5500", // สำหรับ Live Server ในเครื่อง
];

// 2. CORS Options สำหรับ Express & Socket.io
const corsOptions = {
  origin: function (origin, callback) {
    // !origin ช่วยให้ Postman หรือ cURL ยิงทดสอบได้
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // 👈 เพิ่ม PATCH เข้าไปให้ครบ
  credentials: true,
};

// 3. Apply CORS & Middlewares (ประกาศรอบเดียวไว้ด้านบนสุด)
app.use(cors(corsOptions));
app.use(express.json());

// 4. Create HTTP Server & Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions, // 👈 ใช้ corsOptions ตัวเดียวกันได้เลย
});

// เก็บ io instance ไว้ใน app เพื่อนำไปเรียกใช้ใน Controller
app.set("io", io);

// 5. Socket.io Event Handling
io.on("connection", (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`🔥 Client disconnected: ${socket.id}`);
  });
});

// 6. Routes
app.get("/", (req, res) => {
  res.send("Backend is running with Socket.io!");
});
app.use("/api/tasks", require("./routes/taskRoutes"));

// 7. Start Server
const PORT = process.env.PORT || 10000; // ใช้ 10000 หรือ process.env.PORT สำหรับ Render

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
