const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignee: { type: String, default: "Unassigned" }, // 👈 เพิ่มผู้รับผิดชอบ
    dueDate: { type: Date },
    isArchived: { type: Boolean, default: false }, // 👈 เพิ่มสถานะ Archive
  },
  { timestamps: true },
);

module.exports = mongoose.model("Task", TaskSchema);
