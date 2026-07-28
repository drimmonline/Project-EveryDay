const express = require("express");
const router = express.Router();
const {
  getTasks,
  getTaskStats,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  archiveDoneTasks,
} = require("../controllers/taskController");

// Route: /api/tasks
router.route("/").get(getTasks).post(createTask);

// Route: /api/tasks/stats
router.get("/stats", getTaskStats);

// Route: /api/tasks/:id
router.route("/:id").put(updateTask).delete(deleteTask);

// Route: /api/tasks/:id/status
router.patch("/:id/status", updateTaskStatus);

router.patch("/archive-done", archiveDoneTasks);
module.exports = router;
