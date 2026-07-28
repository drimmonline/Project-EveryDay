const Task = require("../models/Task");

// Helper function สำหรับดึง io instance
const getIO = (req) => req.app.get("io");

// @desc    ดึงรายการงานทั้งหมด (รองรับ Pagination สำหรับ Excel View)
// @route   GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const tasks = await Task.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments();

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    ดึงข้อมูลสถิติสำหรับ Dashboard
// @route   GET /api/tasks/stats
exports.getTaskStats = async (req, res) => {
  try {
    const stats = await Task.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          highPriority: {
            $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      total: 0,
      todo: 0,
      inProgress: 0,
      done: 0,
      highPriority: 0,
    };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    สร้างงานใหม่
// @route   POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const task = await Task.create(req.body);

    // 📢 กระจาย Event แจ้งเตือนทุก Client ว่ามี Task ใหม่สร้างขึ้น
    const io = getIO(req);
    if (io) io.emit("task:created", task);

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    แก้ไขข้อมูลงานทั้งหมด
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "ไม่พบงานที่ต้องการแก้ไข" });
    }

    // 📢 กระจาย Event แจ้งเตือนทุก Client ว่าข้อมูล Task อัปเดตแล้ว
    const io = getIO(req);
    if (io) io.emit("task:updated", task);

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    อัปเดตเฉพาะสถานะ (สำหรับ Drag & Drop)
// @route   PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "ไม่พบงานที่ต้องการเปลี่ยนสถานะ" });
    }

    // 📢 กระจาย Event แจ้งเตือนทุก Client ว่ามีการ Drag & Drop ย้ายสถานะ Task
    const io = getIO(req);
    if (io) io.emit("task:updated", task);

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    ลบงาน
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "ไม่พบงานที่ต้องการลบ" });
    }

    // 📢 กระจาย Event แจ้งเตือนทุก Client ว่ามี Task โดนลบไปแล้ว (ส่ง id ไป)
    const io = getIO(req);
    if (io) io.emit("task:deleted", req.params.id);

    res
      .status(200)
      .json({ success: true, message: "ลบงานสำเร็จ", id: req.params.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
