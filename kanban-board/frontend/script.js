const API_BASE = "https://kanban-board-nj04.onrender.com/api/tasks";
// ดึง Root Origin สำหรับเชื่อมต่อ WebSocket (เช่น https://kanban-board-nj04.onrender.com)
const SOCKET_URL = "https://kanban-board-nj04.onrender.com";

let tasks = [];

let currentPage = 1;
let pageSize = 10;

let statusChartInstance = null;
let priorityChartInstance = null;

// ================= SOCKET.IO INITIALIZATION =================
// 1. สร้างการเชื่อมต่อ Socket.io
const socket = io(SOCKET_URL);

socket.on("connect", () => {
  console.log("⚡ Real-time Socket Connected:", socket.id);
});

// 2. ดักฟัง Event เมื่อมีคนสร้าง Task ใหม่
socket.on("task:created", (t) => {
  console.log("📢 Event: Task Created", t);
  const newTask = {
    id: t._id,
    title: t.title,
    desc: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
  };

  // ตรวจสอบว่ามี Task นี้ใน Array หรือยังเพื่อป้องกัน Duplicate
  if (!tasks.some((item) => item.id === newTask.id)) {
    tasks.unshift(newTask);
    refreshUI();
  }
});

// 3. ดักฟัง Event เมื่อมีคนอัปเดต Task (รวมถึงการลากย้าย Drag & Drop)
socket.on("task:updated", (t) => {
  console.log("📢 Event: Task Updated", t);
  const index = tasks.findIndex((item) => item.id === t._id);
  const updatedTask = {
    id: t._id,
    title: t.title,
    desc: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
  };

  if (index !== -1) {
    tasks[index] = updatedTask;
  } else {
    tasks.unshift(updatedTask);
  }
  refreshUI();
});

// 4. ดักฟัง Event เมื่อมีคนลบ Task
socket.on("task:deleted", (deletedId) => {
  console.log("📢 Event: Task Deleted", deletedId);
  tasks = tasks.filter((item) => item.id !== deletedId);
  refreshUI();
});

// ฟังก์ชันสำหรับรีเฟรชหน้าจอทั้งหมดเมื่อมีการเปลี่ยนแปลงข้อมูล Real-time
function refreshUI() {
  renderKanban();
  if (document.getElementById("excel-view")?.classList.contains("active")) {
    renderExcelTable();
  }
  if (document.getElementById("dashboard-view")?.classList.contains("active")) {
    updateDashboard();
  }
}

// ================= API HELPERS =================
async function fetchAllTasks() {
  const res = await fetch(`${API_BASE}?limit=500`);
  const json = await res.json();
  if (json.success) {
    tasks = json.data.map((t) => ({
      id: t._id,
      title: t.title,
      desc: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
    }));
  }
}

async function createTaskAPI(data) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: data.title,
      description: data.desc,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate || null,
    }),
  });
  return await res.json();
}

async function updateTaskAPI(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: data.title,
      description: data.desc,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate || null,
    }),
  });
  return await res.json();
}

async function updateTaskStatusAPI(id, status) {
  const res = await fetch(`${API_BASE}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return await res.json();
}

async function deleteTaskAPI(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  return await res.json();
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
  await fetchAllTasks();
  renderKanban();
  initCharts();
  updateDashboard();
});

// ================= HELPERS =================
const statusLabels = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

// ================= 1. TAB NAVIGATION =================
function switchTab(tabId, element) {
  document
    .querySelectorAll(".page-view")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((el) => el.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  element.classList.add("active");

  if (tabId === "excel-view") renderExcelTable();
  if (tabId === "dashboard-view") updateDashboard();
}

// ================= 2. KANBAN RENDERING & DRAG-DROP =================
function renderKanban() {
  const columns = ["todo", "in-progress", "done"];
  columns.forEach((col) => {
    const container = document.getElementById(`cards-${col}`);
    if (!container) return;

    const colTasks = tasks.filter((t) => t.status === col);
    const badge = document.getElementById(`badge-${col}`);
    if (badge) badge.innerText = colTasks.length;

    container.innerHTML = colTasks
      .map(
        (task) => `
      <div class="card" draggable="true" id="card-${task.id}" ondragstart="drag(event, '${task.id}')">
        <div class="card-header">
          <span class="card-title">${escapeHtml(task.title)}</span>
          <div class="card-actions">
            <button class="card-action-btn" onclick="openModal('${task.id}')" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>
            <button class="card-action-btn delete-btn" onclick="deleteTask('${task.id}')" title="ลบ"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        ${task.desc ? `<div class="card-description">${escapeHtml(task.desc)}</div>` : ""}
        <div class="card-footer">
          <span class="priority ${task.priority}">${task.priority.toUpperCase()}</span>
          <span class="due-date"><i class="fa-regular fa-calendar"></i> ${task.dueDate || "-"}</span>
        </div>
      </div>
    `,
      )
      .join("");
  });
}

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev, id) {
  ev.dataTransfer.setData("text/plain", id);
}

async function drop(ev, targetStatus) {
  ev.preventDefault();
  const id = ev.dataTransfer.getData("text/plain");
  const task = tasks.find((t) => t.id === id);

  if (task && task.status !== targetStatus) {
    // Optimistic UI Update (ย้าย UI ทันทีไม่ต้องรอ Network)
    task.status = targetStatus;
    renderKanban();

    // ยิง API (Backend จะปล่อย socket event `task:updated` กลับมาให้เครื่องอื่นๆ เอง)
    const result = await updateTaskStatusAPI(id, targetStatus);
    if (!result.success) {
      // หากยิงไม่ผ่าน ค่อยสั่ง Fetch ดึงข้อมูลคืน
      await fetchAllTasks();
      refreshUI();
    }
  }
}

// ================= 3. CRUD OPERATIONS =================
function openModal(id = null) {
  const modal = document.getElementById("taskModal");
  const form = document.getElementById("taskForm");

  if (id) {
    const task = tasks.find((t) => t.id === id);
    document.getElementById("modalTitle").innerText = "แก้ไขงาน";
    document.getElementById("taskId").value = task.id;
    document.getElementById("taskTitle").value = task.title;
    document.getElementById("taskDesc").value = task.desc;
    document.getElementById("taskStatus").value = task.status;
    document.getElementById("taskPriority").value = task.priority;
    document.getElementById("taskDueDate").value = task.dueDate;
  } else {
    document.getElementById("modalTitle").innerText = "เพิ่มงานใหม่";
    form.reset();
    document.getElementById("taskId").value = "";
  }
  modal.classList.add("active");
}

function closeModal() {
  document.getElementById("taskModal").classList.remove("active");
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("taskId").value;
  const title = document.getElementById("taskTitle").value;
  const desc = document.getElementById("taskDesc").value;
  const status = document.getElementById("taskStatus").value;
  const priority = document.getElementById("taskPriority").value;
  const dueDate = document.getElementById("taskDueDate").value;

  closeModal();

  if (id) {
    await updateTaskAPI(id, {
      title,
      desc,
      status,
      priority,
      dueDate,
    });
  } else {
    await createTaskAPI({
      title,
      desc,
      status,
      priority,
      dueDate,
    });
  }
  // ไม่จำเป็นต้อง Render ซ้ำที่นี่ เพราะ Socket Event (`task:created` หรือ `task:updated`)
  // จาก Backend จะส่งกลับมา trigger ให้ refreshUI() ทำงานอัตโนมัติครับ
}

async function deleteTask(id) {
  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?")) {
    await deleteTaskAPI(id);
    // Socket Event (`task:deleted`) จะเคลียร์ array และ refreshUI() ให้อัตโนมัติเช่นกันครับ
  }
}

// ================= 4. EXCEL TABLE & PAGINATION =================
function renderExcelTable() {
  const tbody = document.getElementById("excel-table-body");
  if (!tbody) return;

  const totalItems = tasks.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTasks = tasks.slice(startIndex, endIndex);

  tbody.innerHTML = paginatedTasks
    .map(
      (task) => `
    <tr>
      <td>#${task.id.slice(-4)}</td>
      <td><strong>${escapeHtml(task.title)}</strong></td>
      <td>${escapeHtml(task.desc || "-")}</td>
      <td><span class="status-badge status-${task.status}">${statusLabels[task.status] || task.status}</span></td>
      <td><span class="priority ${task.priority}">${task.priority.toUpperCase()}</span></td>
      <td>${task.dueDate || "-"}</td>
      <td>
        <button class="card-action-btn" onclick="openModal('${task.id}')" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>
        <button class="card-action-btn delete-btn" onclick="deleteTask('${task.id}')" title="ลบ"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `,
    )
    .join("");

  document.getElementById("pagination-info").innerText =
    totalItems === 0
      ? "ไม่มีข้อมูล"
      : `แสดง ${startIndex + 1} ถึง ${endIndex} จากทั้งหมด ${totalItems} รายการ`;

  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById("pagination-controls");
  if (!container) return;

  let buttonsHTML = `
    <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>ก่อนหน้า</button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    buttonsHTML += `
      <button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>
    `;
  }

  buttonsHTML += `
    <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages || totalPages === 0 ? "disabled" : ""}>ถัดไป</button>
  `;

  container.innerHTML = buttonsHTML;
}

function goToPage(page) {
  currentPage = page;
  renderExcelTable();
}

function changePageSize(size) {
  pageSize = parseInt(size);
  currentPage = 1;
  renderExcelTable();
}

function exportToCSV() {
  if (tasks.length === 0) return alert("ไม่มีข้อมูลสำหรับส่งออก");

  let csvContent = "\uFEFF";
  csvContent += "ID,Title,Description,Status,Priority,Due Date\n";

  tasks.forEach((t) => {
    csvContent += `"${t.id}","${t.title.replace(/"/g, '""')}","${(t.desc || "").replace(/"/g, '""')}","${t.status}","${t.priority}","${t.dueDate}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Project_Log_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

// ================= 5. DASHBOARD & CHARTS =================
function initCharts() {
  const statusEl = document.getElementById("statusChart");
  if (statusEl) {
    const ctxStatus = statusEl.getContext("2d");
    statusChartInstance = new Chart(ctxStatus, {
      type: "doughnut",
      data: {
        labels: ["To Do", "In Progress", "Done"],
        datasets: [
          {
            data: [0, 0, 0],
            backgroundColor: ["#f59e0b", "#2563eb", "#10b981"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  const priorityEl = document.getElementById("priorityChart");
  if (priorityEl) {
    const ctxPriority = priorityEl.getContext("2d");
    priorityChartInstance = new Chart(ctxPriority, {
      type: "bar",
      data: {
        labels: ["Low", "Medium", "High"],
        datasets: [
          {
            label: "จำนวนงาน",
            data: [0, 0, 0],
            backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        plugins: { legend: { display: false } },
      },
    });
  }
}

function updateDashboard() {
  const total = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in-progress",
  ).length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const highCount = tasks.filter((t) => t.priority === "high").length;

  const elTotal = document.getElementById("stat-total");
  const elProgress = document.getElementById("stat-in-progress");
  const elDone = document.getElementById("stat-done");
  const elHigh = document.getElementById("stat-high");

  if (elTotal) elTotal.innerText = total;
  if (elProgress) elProgress.innerText = inProgressCount;
  if (elDone) elDone.innerText = doneCount;
  if (elHigh) elHigh.innerText = highCount;

  const progress = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const progressBar = document.getElementById("overall-progress-bar");
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
    progressBar.innerText = `${progress}%`;
  }

  if (statusChartInstance && priorityChartInstance) {
    statusChartInstance.data.datasets[0].data = [
      todoCount,
      inProgressCount,
      doneCount,
    ];
    statusChartInstance.update();

    const lowCount = tasks.filter((t) => t.priority === "low").length;
    const mediumCount = tasks.filter((t) => t.priority === "medium").length;
    priorityChartInstance.data.datasets[0].data = [
      lowCount,
      mediumCount,
      highCount,
    ];
    priorityChartInstance.update();
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(
    /[&<>"']/g,
    (match) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        match
      ],
  );
}
