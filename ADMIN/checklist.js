
document.addEventListener("DOMContentLoaded", () => {
  initChecklistPage();
});

let checklistData = [];
let employeeData = [];
let siteData = [];
let filteredChecklistData = [];

const checklistElements = {
  date: document.getElementById("filterDate"),
  site: document.getElementById("filterSite"),
  employee: document.getElementById("filterEmployee"),
  status: document.getElementById("filterStatus"),

  applyButton: document.getElementById("applyFilterBtn"),
  resetButton: document.getElementById("resetFilterBtn"),
  exportButton: document.getElementById("exportChecklistBtn"),

  total: document.getElementById("totalChecklist"),
  completed: document.getElementById("completedChecklist"),
  inProgress: document.getElementById("inProgressChecklist"),
  pending: document.getElementById("pendingChecklist"),

  count: document.getElementById("checklistCount"),
  tableBody: document.getElementById("checklistTableBody"),

  modal: document.getElementById("checklistDetailModal"),
  modalContent: document.getElementById("checklistDetailContent"),
  closeModal: document.getElementById("closeChecklistModal")
};

async function initChecklistPage() {
  setDefaultChecklistDate();
  bindChecklistEvents();

  if (!window.supabaseClient) {
    showChecklistMessage("Koneksi Supabase belum tersedia.");
    return;
  }

  await loadChecklistPageData();
}

function setDefaultChecklistDate() {
  if (checklistElements.date) {
    checklistElements.date.value = getLocalDateString();
  }
}

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function bindChecklistEvents() {
  checklistElements.applyButton?.addEventListener("click", applyChecklistFilters);
  checklistElements.resetButton?.addEventListener("click", resetChecklistFilters);
  checklistElements.exportButton?.addEventListener("click", exportChecklistCSV);
  checklistElements.closeModal?.addEventListener("click", closeChecklistDetail);

  checklistElements.modal?.addEventListener("click", event => {
    if (event.target === checklistElements.modal) {
      closeChecklistDetail();
    }
  });

  checklistElements.tableBody?.addEventListener("click", event => {
    const button = event.target.closest("[data-checklist-detail]");

    if (!button) return;

    const checklistId = button.dataset.checklistDetail;
    const item = filteredChecklistData.find(row => getChecklistId(row) === checklistId);

    if (item) {
      showChecklistDetail(item);
    }
  });
}

async function loadChecklistPageData() {
  showChecklistMessage("Memuat data checklist...");

  try {
    const [checklistResult, employeeResult, siteResult] = await Promise.all([
      window.supabaseClient.from("checklist").select("*"),
      window.supabaseClient.from("karyawan").select("*"),
      window.supabaseClient.from("site").select("*")
    ]);

    if (checklistResult.error) throw checklistResult.error;
    if (employeeResult.error) throw employeeResult.error;
    if (siteResult.error) throw siteResult.error;

    checklistData = checklistResult.data || [];
    employeeData = employeeResult.data || [];
    siteData = siteResult.data || [];

    populateChecklistFilters();
    applyChecklistFilters();

  } catch (error) {
    console.error("Gagal memuat checklist:", error);
    showChecklistMessage(
      "Data checklist gagal dimuat. Periksa koneksi, nama tabel, dan izin akses Supabase."
    );
  }
}

function populateChecklistFilters() {
  populateSelect(
    checklistElements.site,
    siteData,
    ["id_site", "ID_SITE"],
    ["nama_site", "NAMA_SITE"],
    "Semua Site"
  );

  populateSelect(
    checklistElements.employee,
    employeeData,
    ["id_karyawan", "ID_KARYAWAN"],
    ["nama", "NAMA"],
    "Semua Karyawan"
  );
}

function populateSelect(selectElement, rows, idFields, labelFields, defaultLabel) {
  if (!selectElement) return;

  selectElement.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  selectElement.appendChild(defaultOption);

  rows.forEach(row => {
    const id = getFirstValue(row, idFields);
    const label = getFirstValue(row, labelFields);

    if (id === null || id === undefined || id === "") return;

    const option = document.createElement("option");
    option.value = String(id);
    option.textContent = label || String(id);

    selectElement.appendChild(option);
  });
}

function applyChecklistFilters() {
  const selectedDate = checklistElements.date?.value || "";
  const selectedSite = checklistElements.site?.value || "";
  const selectedEmployee = checklistElements.employee?.value || "";
  const selectedStatus = checklistElements.status?.value || "";

  filteredChecklistData = checklistData.filter(item => {
    const itemDate = getChecklistDate(item);
    const employeeId = getChecklistEmployeeId(item);
    const siteId = getChecklistSiteId(item);
    const status = normalizeChecklistStatus(getChecklistStatus(item));

    if (selectedDate && itemDate !== selectedDate) return false;
    if (selectedSite && String(siteId) !== selectedSite) return false;
    if (selectedEmployee && String(employeeId) !== selectedEmployee) return false;

    if (selectedStatus && status !== selectedStatus) return false;

    return true;
  });

  filteredChecklistData.sort((a, b) => {
    return getChecklistDate(b).localeCompare(getChecklistDate(a));
  });

  updateChecklistSummary();
  renderChecklistTable();
}

function resetChecklistFilters() {
  if (checklistElements.date) checklistElements.date.value = "";
  if (checklistElements.site) checklistElements.site.value = "";
  if (checklistElements.employee) checklistElements.employee.value = "";
  if (checklistElements.status) checklistElements.status.value = "";

  applyChecklistFilters();
}

function updateChecklistSummary() {
  const total = filteredChecklistData.length;

  const completed = filteredChecklistData.filter(item =>
    normalizeChecklistStatus(getChecklistStatus(item)) === "SELESAI"
  ).length;

  const inProgress = filteredChecklistData.filter(item =>
    normalizeChecklistStatus(getChecklistStatus(item)) === "PROSES"
  ).length;

  const pending = filteredChecklistData.filter(item =>
    normalizeChecklistStatus(getChecklistStatus(item)) === "BELUM"
  ).length;

  setText(checklistElements.total, total);
  setText(checklistElements.completed, completed);
  setText(checklistElements.inProgress, inProgress);
  setText(checklistElements.pending, pending);
  setText(checklistElements.count, `${total} data`);
}

function renderChecklistTable() {
  const tbody = checklistElements.tableBody;

  if (!tbody) return;

  if (filteredChecklistData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">Tidak ada data checklist untuk filter ini.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredChecklistData.map((item, index) => {
    const employee = findEmployee(getChecklistEmployeeId(item));
    const site = findSite(getChecklistSiteId(item));

    const employeeId = getChecklistEmployeeId(item);
    const employeeName =
      getFirstValue(item, ["nama_karyawan", "nama", "NAMA"]) ||
      getFirstValue(employee, ["nama", "NAMA"]) ||
      "-";

    const siteName =
      getFirstValue(item, ["nama_site", "NAMA_SITE"]) ||
      getFirstValue(site, ["nama_site", "NAMA_SITE"]) ||
      "-";

    const checklistName =
      getFirstValue(item, [
        "nama_checklist",
        "judul",
        "nama_tugas",
        "item_checklist",
        "aktivitas",
        "task_name"
      ]) || "Checklist";

    const status = normalizeChecklistStatus(getChecklistStatus(item));
    const note = getChecklistNote(item);

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(formatDate(getChecklistDate(item)))}</td>
        <td>
          <strong>${escapeHTML(employeeName)}</strong>
          <small>${escapeHTML(employeeId || "")}</small>
        </td>
        <td>${escapeHTML(siteName)}</td>
        <td>${escapeHTML(checklistName)}</td>
        <td>
          <span class="status-badge status-${status.toLowerCase()}">
            ${escapeHTML(statusLabel(status))}
          </span>
        </td>
        <td>${escapeHTML(note || "-")}</td>
        <td>
          <button
            type="button"
            data-checklist-detail="${escapeHTML(getChecklistId(item))}"
          >
            Detail
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function showChecklistDetail(item) {
  const employee = findEmployee(getChecklistEmployeeId(item));
  const site = findSite(getChecklistSiteId(item));

  const employeeName =
    getFirstValue(item, ["nama_karyawan", "nama", "NAMA"]) ||
    getFirstValue(employee, ["nama", "NAMA"]) ||
    "-";

  const siteName =
    getFirstValue(item, ["nama_site", "NAMA_SITE"]) ||
    getFirstValue(site, ["nama_site", "NAMA_SITE"]) ||
    "-";

  const checklistName =
    getFirstValue(item, [
      "nama_checklist",
      "judul",
      "nama_tugas",
      "item_checklist",
      "aktivitas",
      "task_name"
    ]) || "Checklist";

  const status = normalizeChecklistStatus(getChecklistStatus(item));
  const note = getChecklistNote(item);
  const date = getChecklistDate(item);
  const time = getFirstValue(item, [
    "waktu",
    "jam",
    "waktu_checklist",
    "created_at",
    "updated_at"
  ]);

  const photo = getFirstValue(item, [
    "foto",
    "foto_url",
    "photo_url",
    "foto_checklist",
    "image_url"
  ]);

  const photoHTML = photo
    ? `<p><strong>Foto:</strong></p>
       <img src="${escapeHTML(photo)}" alt="Foto checklist" class="checklist-detail-photo">`
    : "<p><strong>Foto:</strong> Tidak tersedia</p>";

  checklistElements.modalContent.innerHTML = `
    <div class="detail-row">
      <strong>Tanggal</strong>
      <span>${escapeHTML(formatDate(date))}</span>
    </div>

    <div class="detail-row">
      <strong>Waktu</strong>
      <span>${escapeHTML(time || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>ID Karyawan</strong>
      <span>${escapeHTML(getChecklistEmployeeId(item) || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>Nama Karyawan</strong>
      <span>${escapeHTML(employeeName)}</span>
    </div>

    <div class="detail-row">
      <strong>Site</strong>
      <span>${escapeHTML(siteName)}</span>
    </div>

    <div class="detail-row">
      <strong>Checklist</strong>
      <span>${escapeHTML(checklistName)}</span>
    </div>

    <div class="detail-row">
      <strong>Status</strong>
      <span>${escapeHTML(statusLabel(status))}</span>
    </div>

    <div class="detail-row">
      <strong>Catatan</strong>
      <span>${escapeHTML(note || "-")}</span>
    </div>

    ${photoHTML}
  `;

  checklistElements.modal?.classList.add("show");
  checklistElements.modal?.setAttribute("aria-hidden", "false");
}

function closeChecklistDetail() {
  checklistElements.modal?.classList.remove("show");
  checklistElements.modal?.setAttribute("aria-hidden", "true");
}

function exportChecklistCSV() {
  if (filteredChecklistData.length === 0) {
    alert("Tidak ada data checklist untuk diekspor.");
    return;
  }

  const headers = [
    "Tanggal",
    "ID Karyawan",
    "Nama Karyawan",
    "Site",
    "Checklist",
    "Status",
    "Catatan"
  ];

  const rows = filteredChecklistData.map(item => {
    const employee = findEmployee(getChecklistEmployeeId(item));
    const site = findSite(getChecklistSiteId(item));

    return [
      getChecklistDate(item),
      getChecklistEmployeeId(item),
      getFirstValue(item, ["nama_karyawan", "nama", "NAMA"]) ||
        getFirstValue(employee, ["nama", "NAMA"]) || "",
      getFirstValue(item, ["nama_site", "NAMA_SITE"]) ||
        getFirstValue(site, ["nama_site", "NAMA_SITE"]) || "",
      getFirstValue(item, [
        "nama_checklist",
        "judul",
        "nama_tugas",
        "item_checklist",
        "aktivitas",
        "task_name"
      ]) || "",
      statusLabel(normalizeChecklistStatus(getChecklistStatus(item))),
      getChecklistNote(item)
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(csvEscape).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `checklist-${getLocalDateString()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function findEmployee(employeeId) {
  return employeeData.find(item =>
    String(getFirstValue(item, ["id_karyawan", "ID_KARYAWAN"])) ===
    String(employeeId)
  ) || null;
}

function findSite(siteId) {
  return siteData.find(item =>
    String(getFirstValue(item, ["id_site", "ID_SITE"])) ===
    String(siteId)
  ) || null;
}

function getChecklistId(item) {
  const id = getFirstValue(item, [
    "id_checklist",
    "id",
    "ID_CHECKLIST"
  ]);

  if (id !== null && id !== undefined && id !== "") {
    return String(id);
  }

  return [
    getChecklistEmployeeId(item) || "employee",
    getChecklistDate(item),
    getFirstValue(item, ["nama_checklist", "judul", "nama_tugas"]) || "task"
  ].join("-");
}

function getChecklistDate(item) {
  const value = getFirstValue(item, [
    "tanggal",
    "tanggal_checklist",
    "created_at",
    "waktu_checklist",
    "waktu"
  ]);

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getChecklistEmployeeId(item) {
  return getFirstValue(item, [
    "id_karyawan",
    "employee_id",
    "ID_KARYAWAN"
  ]);
}

function getChecklistSiteId(item) {
  return getFirstValue(item, [
    "id_site",
    "site_id",
    "ID_SITE"
  ]);
}

function getChecklistStatus(item) {
  return getFirstValue(item, [
    "status",
    "status_checklist",
    "status_pekerjaan",
    "is_completed"
  ]);
}

function normalizeChecklistStatus(value) {
  if (value === true) return "SELESAI";
  if (value === false) return "BELUM";

  const status = String(value ?? "").trim().toUpperCase();

  if (
    ["SELESAI", "COMPLETED", "DONE", "TRUE", "1", "SUDAH"].includes(status)
  ) {
    return "SELESAI";
  }

  if (
    ["PROSES", "DALAM PROSES", "IN_PROGRESS", "ONGOING"].includes(status)
  ) {
    return "PROSES";
  }

  return "BELUM";
}

function statusLabel(status) {
  if (status === "SELESAI") return "Selesai";
  if (status === "PROSES") return "Dalam Proses";
  return "Belum Selesai";
}

function getChecklistNote(item) {
  return getFirstValue(item, [
    "catatan",
    "keterangan",
    "deskripsi",
    "notes",
    "remark"
  ]) || "";
}

function getFirstValue(object, fields) {
  if (!object) return null;

  for (const field of fields) {
    if (
      Object.prototype.hasOwnProperty.call(object, field) &&
      object[field] !== null &&
      object[field] !== undefined &&
      object[field] !== ""
    ) {
      return object[field];
    }
  }

  return null;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function setText(element, value) {
  if (element) element.textContent = String(value);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showChecklistMessage(message) {
  if (checklistElements.tableBody) {
    checklistElements.tableBody.innerHTML = `
      <tr>
        <td colspan="8">${escapeHTML(message)}</td>
      </tr>
    `;
  }
}