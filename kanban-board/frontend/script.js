const API_BASE = "http://localhost:3000/api/tasks";

let tasks = [];

let currentPage = 1;
let pageSize = 10;

let statusChartInstance = null;
let priorityChartInstance = null;

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
    const colTasks = tasks.filter((t) => t.status === col);
    document.getElementById(`badge-${col}`).innerText = colTasks.length;

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
    const result = await updateTaskStatusAPI(id, targetStatus);
    if (result.success) {
      task.status = targetStatus;
    }
    renderKanban();
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

  if (id) {
    const result = await updateTaskAPI(id, { title, desc, status, priority, dueDate });
    if (result.success) {
      const task = tasks.find((t) => t.id === id);
      Object.assign(task, { title, desc, status, priority, dueDate });
    }
  } else {
    const result = await createTaskAPI({ title, desc, status, priority, dueDate });
    if (result.success) {
      const t = result.data;
      tasks.unshift({
        id: t._id,
        title: t.title,
        desc: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
      });
    }
  }

  closeModal();
  renderKanban();
  if (document.getElementById("excel-view").classList.contains("active"))
    renderExcelTable();
  if (document.getElementById("dashboard-view").classList.contains("active"))
    updateDashboard();
}

async function deleteTask(id) {
  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?")) {
    const result = await deleteTaskAPI(id);
    if (result.success) {
      tasks = tasks.filter((t) => t.id !== id);
      renderKanban();
      if (document.getElementById("excel-view").classList.contains("active"))
        renderExcelTable();
      if (document.getElementById("dashboard-view").classList.contains("active"))
        updateDashboard();
    }
  }
}

// ================= 4. EXCEL TABLE & PAGINATION =================
function renderExcelTable() {
  const tbody = document.getElementById("excel-table-body");
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
  const ctxStatus = document.getElementById("statusChart").getContext("2d");
  statusChartInstance = new Chart(ctxStatus, {
    type: "doughnut",
    data: {
      labels: ["To Do", "In Progress", "Done"],
      datasets: [
        { data: [0, 0, 0], backgroundColor: ["#f59e0b", "#2563eb", "#10b981"] },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });

  const ctxPriority = document.getElementById("priorityChart").getContext("2d");
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

function updateDashboard() {
  const total = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in-progress",
  ).length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const highCount = tasks.filter((t) => t.priority === "high").length;

  document.getElementById("stat-total").innerText = total;
  document.getElementById("stat-in-progress").innerText = inProgressCount;
  document.getElementById("stat-done").innerText = doneCount;
  document.getElementById("stat-high").innerText = highCount;

  const progress = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const progressBar = document.getElementById("overall-progress-bar");
  progressBar.style.width = `${progress}%`;
  progressBar.innerText = `${progress}%`;

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
  return str.replace(
    /[&<>"']/g,
    (match) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        match
      ],
  );
}
