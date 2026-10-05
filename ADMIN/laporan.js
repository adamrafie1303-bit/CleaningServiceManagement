
document.addEventListener("DOMContentLoaded", () => {
  initReportPage();
});

let reportData = [];
let reportEmployeeData = [];
let reportSiteData = [];
let filteredReportData = [];

const reportElements = {
  startDate: document.getElementById("filterStartDate"),
  endDate: document.getElementById("filterEndDate"),
  site: document.getElementById("filterSite"),
  employee: document.getElementById("filterEmployee"),
  status: document.getElementById("filterStatus"),

  applyButton: document.getElementById("applyReportFilterBtn"),
  resetButton: document.getElementById("resetReportFilterBtn"),
  exportButton: document.getElementById("exportReportBtn"),

  total: document.getElementById("totalReports"),
  pending: document.getElementById("pendingReports"),
  reviewed: document.getElementById("reviewedReports"),
  approved: document.getElementById("approvedReports"),

  count: document.getElementById("reportCount"),
  tableBody: document.getElementById("reportTableBody"),

  modal: document.getElementById("reportDetailModal"),
  modalContent: document.getElementById("reportDetailContent"),
  closeModal: document.getElementById("closeReportModal")
};

async function initReportPage() {
  bindReportEvents();

  if (!window.supabaseClient) {
    showReportMessage("Koneksi Supabase belum tersedia.");
    return;
  }

  await loadReportPageData();
}

function bindReportEvents() {
  reportElements.applyButton?.addEventListener("click", applyReportFilters);
  reportElements.resetButton?.addEventListener("click", resetReportFilters);
  reportElements.exportButton?.addEventListener("click", exportReportCSV);
  reportElements.closeModal?.addEventListener("click", closeReportDetail);

  reportElements.modal?.addEventListener("click", event => {
    if (event.target === reportElements.modal) {
      closeReportDetail();
    }
  });

  reportElements.tableBody?.addEventListener("click", event => {
    const button = event.target.closest("[data-report-detail]");

    if (!button) return;

    const reportId = button.dataset.reportDetail;

    const item = filteredReportData.find(row =>
      getReportId(row) === reportId
    );

    if (item) {
      showReportDetail(item);
    }
  });
}

async function loadReportPageData() {
  showReportMessage("Memuat data laporan...");

  try {
    const [reportsResult, employeesResult, sitesResult] = await Promise.all([
      window.supabaseClient.from("laporan").select("*"),
      window.supabaseClient.from("karyawan").select("*"),
      window.supabaseClient.from("site").select("*")
    ]);

    if (reportsResult.error) throw reportsResult.error;
    if (employeesResult.error) throw employeesResult.error;
    if (sitesResult.error) throw sitesResult.error;

    reportData = reportsResult.data || [];
    reportEmployeeData = employeesResult.data || [];
    reportSiteData = sitesResult.data || [];

    populateReportFilters();
    applyReportFilters();

  } catch (error) {
    console.error("Gagal memuat laporan:", error);

    showReportMessage(
      "Data laporan gagal dimuat. Periksa koneksi, nama tabel, dan izin akses Supabase."
    );
  }
}

function populateReportFilters() {
  populateReportSelect(
    reportElements.site,
    reportSiteData,
    ["id_site", "ID_SITE"],
    ["nama_site", "NAMA_SITE"],
    "Semua Site"
  );

  populateReportSelect(
    reportElements.employee,
    reportEmployeeData,
    ["id_karyawan", "ID_KARYAWAN"],
    ["nama", "NAMA"],
    "Semua Karyawan"
  );
}

function populateReportSelect(selectElement, rows, idFields, labelFields, defaultLabel) {
  if (!selectElement) return;

  selectElement.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  selectElement.appendChild(defaultOption);

  rows.forEach(row => {
    const id = getReportValue(row, idFields);
    const label = getReportValue(row, labelFields);

    if (id === null || id === undefined || id === "") return;

    const option = document.createElement("option");
    option.value = String(id);
    option.textContent = label || String(id);

    selectElement.appendChild(option);
  });
}

function applyReportFilters() {
  const startDate = reportElements.startDate?.value || "";
  const endDate = reportElements.endDate?.value || "";
  const selectedSite = reportElements.site?.value || "";
  const selectedEmployee = reportElements.employee?.value || "";
  const selectedStatus = reportElements.status?.value || "";

  filteredReportData = reportData.filter(item => {
    const reportDate = getReportDate(item);
    const siteId = getReportSiteId(item);
    const employeeId = getReportEmployeeId(item);
    const status = normalizeReportStatus(getReportStatus(item));

    if (startDate && reportDate && reportDate < startDate) return false;
    if (endDate && reportDate && reportDate > endDate) return false;

    if (selectedSite && String(siteId) !== selectedSite) return false;
    if (selectedEmployee && String(employeeId) !== selectedEmployee) return false;
    if (selectedStatus && status !== selectedStatus) return false;

    return true;
  });

  filteredReportData.sort((a, b) => {
    return getReportDate(b).localeCompare(getReportDate(a));
  });

  updateReportSummary();
  renderReportTable();
}

function resetReportFilters() {
  if (reportElements.startDate) reportElements.startDate.value = "";
  if (reportElements.endDate) reportElements.endDate.value = "";
  if (reportElements.site) reportElements.site.value = "";
  if (reportElements.employee) reportElements.employee.value = "";
  if (reportElements.status) reportElements.status.value = "";

  applyReportFilters();
}

function updateReportSummary() {
  const total = filteredReportData.length;

  const pending = filteredReportData.filter(item =>
    normalizeReportStatus(getReportStatus(item)) === "MENUNGGU"
  ).length;

  const reviewed = filteredReportData.filter(item =>
    normalizeReportStatus(getReportStatus(item)) === "DITINJAU"
  ).length;

  const approved = filteredReportData.filter(item =>
    normalizeReportStatus(getReportStatus(item)) === "DISETUJUI"
  ).length;

  setReportText(reportElements.total, total);
  setReportText(reportElements.pending, pending);
  setReportText(reportElements.reviewed, reviewed);
  setReportText(reportElements.approved, approved);
  setReportText(reportElements.count, `${total} data`);
}

function renderReportTable() {
  const tbody = reportElements.tableBody;

  if (!tbody) return;

  if (filteredReportData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">Tidak ada laporan untuk filter ini.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredReportData.map((item, index) => {
    const employee = findReportEmployee(getReportEmployeeId(item));
    const site = findReportSite(getReportSiteId(item));

    const employeeName =
      getReportValue(item, ["nama_karyawan", "nama", "NAMA"]) ||
      getReportValue(employee, ["nama", "NAMA"]) ||
      "-";

    const siteName =
      getReportValue(item, ["nama_site", "NAMA_SITE"]) ||
      getReportValue(site, ["nama_site", "NAMA_SITE"]) ||
      "-";

    const title = getReportTitle(item);
    const status = normalizeReportStatus(getReportStatus(item));
    const hasPhoto = Boolean(getReportPhotoBefore(item) || getReportPhotoAfter(item));

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeReportHTML(formatReportDate(getReportDate(item)))}</td>
        <td>
          <strong>${escapeReportHTML(employeeName)}</strong>
          <small>${escapeReportHTML(getReportEmployeeId(item) || "")}</small>
        </td>
        <td>${escapeReportHTML(siteName)}</td>
        <td>${escapeReportHTML(title)}</td>
        <td>
          <span class="status-badge status-${status.toLowerCase()}">
            ${escapeReportHTML(reportStatusLabel(status))}
          </span>
        </td>
        <td>${hasPhoto ? "Tersedia" : "Tidak ada"}</td>
        <td>
          <button
            type="button"
            data-report-detail="${escapeReportHTML(getReportId(item))}"
          >
            Detail
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function showReportDetail(item) {
  const employee = findReportEmployee(getReportEmployeeId(item));
  const site = findReportSite(getReportSiteId(item));

  const employeeName =
    getReportValue(item, ["nama_karyawan", "nama", "NAMA"]) ||
    getReportValue(employee, ["nama", "NAMA"]) ||
    "-";

  const siteName =
    getReportValue(item, ["nama_site", "NAMA_SITE"]) ||
    getReportValue(site, ["nama_site", "NAMA_SITE"]) ||
    "-";

  const status = normalizeReportStatus(getReportStatus(item));
  const description = getReportDescription(item);
  const note = getReportNote(item);
  const photoBefore = getReportPhotoBefore(item);
  const photoAfter = getReportPhotoAfter(item);

  const createdAt = getReportValue(item, [
    "created_at",
    "waktu_laporan",
    "tanggal_laporan"
  ]);

  const photoBeforeHTML = photoBefore
    ? `<img src="${escapeReportHTML(photoBefore)}" alt="Dokumentasi sebelum pekerjaan" class="report-detail-photo">`
    : "<p>Foto sebelum tidak tersedia.</p>";

  const photoAfterHTML = photoAfter
    ? `<img src="${escapeReportHTML(photoAfter)}" alt="Dokumentasi sesudah pekerjaan" class="report-detail-photo">`
    : "<p>Foto sesudah tidak tersedia.</p>";

  reportElements.modalContent.innerHTML = `
    <div class="detail-row">
      <strong>Tanggal</strong>
      <span>${escapeReportHTML(formatReportDate(getReportDate(item)))}</span>
    </div>

    <div class="detail-row">
      <strong>Waktu Laporan</strong>
      <span>${escapeReportHTML(createdAt || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>ID Karyawan</strong>
      <span>${escapeReportHTML(getReportEmployeeId(item) || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>Nama Karyawan</strong>
      <span>${escapeReportHTML(employeeName)}</span>
    </div>

    <div class="detail-row">
      <strong>Site</strong>
      <span>${escapeReportHTML(siteName)}</span>
    </div>

    <div class="detail-row">
      <strong>Judul Laporan</strong>
      <span>${escapeReportHTML(getReportTitle(item))}</span>
    </div>

    <div class="detail-row">
      <strong>Status</strong>
      <span>${escapeReportHTML(reportStatusLabel(status))}</span>
    </div>

    <div class="detail-row">
      <strong>Deskripsi Pekerjaan</strong>
      <span>${escapeReportHTML(description || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>Catatan Admin/Karyawan</strong>
      <span>${escapeReportHTML(note || "-")}</span>
    </div>

    <section class="report-photo-section">
      <h3>Dokumentasi Sebelum</h3>
      ${photoBeforeHTML}
    </section>

    <section class="report-photo-section">
      <h3>Dokumentasi Sesudah</h3>
      ${photoAfterHTML}
    </section>
  `;

  reportElements.modal?.classList.add("show");
  reportElements.modal?.setAttribute("aria-hidden", "false");
}

function closeReportDetail() {
  reportElements.modal?.classList.remove("show");
  reportElements.modal?.setAttribute("aria-hidden", "true");
}

function exportReportCSV() {
  if (filteredReportData.length === 0) {
    alert("Tidak ada laporan untuk diekspor.");
    return;
  }

  const headers = [
    "Tanggal",
    "ID Karyawan",
    "Nama Karyawan",
    "Site",
    "Judul Laporan",
    "Deskripsi",
    "Status",
    "Catatan"
  ];

  const rows = filteredReportData.map(item => {
    const employee = findReportEmployee(getReportEmployeeId(item));
    const site = findReportSite(getReportSiteId(item));

    return [
      getReportDate(item),
      getReportEmployeeId(item),
      getReportValue(item, ["nama_karyawan", "nama", "NAMA"]) ||
        getReportValue(employee, ["nama", "NAMA"]) || "",
      getReportValue(item, ["nama_site", "NAMA_SITE"]) ||
        getReportValue(site, ["nama_site", "NAMA_SITE"]) || "",
      getReportTitle(item),
      getReportDescription(item),
      reportStatusLabel(normalizeReportStatus(getReportStatus(item))),
      getReportNote(item)
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(reportCSVEscape).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `laporan-pekerjaan-${getReportLocalDate()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function reportCSVEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function findReportEmployee(employeeId) {
  return reportEmployeeData.find(item =>
    String(getReportValue(item, ["id_karyawan", "ID_KARYAWAN"])) ===
    String(employeeId)
  ) || null;
}

function findReportSite(siteId) {
  return reportSiteData.find(item =>
    String(getReportValue(item, ["id_site", "ID_SITE"])) ===
    String(siteId)
  ) || null;
}

function getReportId(item) {
  const id = getReportValue(item, [
    "id_laporan",
    "id",
    "ID_LAPORAN"
  ]);

  if (id !== null && id !== undefined && id !== "") {
    return String(id);
  }

  return [
    getReportEmployeeId(item) || "employee",
    getReportDate(item),
    getReportTitle(item)
  ].join("-");
}

function getReportDate(item) {
  const value = getReportValue(item, [
    "tanggal",
    "tanggal_laporan",
    "created_at",
    "waktu_laporan"
  ]);

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getReportEmployeeId(item) {
  return getReportValue(item, [
    "id_karyawan",
    "employee_id",
    "ID_KARYAWAN"
  ]);
}

function getReportSiteId(item) {
  return getReportValue(item, [
    "id_site",
    "site_id",
    "ID_SITE"
  ]);
}

function getReportTitle(item) {
  return getReportValue(item, [
    "judul",
    "judul_laporan",
    "nama_laporan",
    "title"
  ]) || "Laporan Pekerjaan";
}

function getReportDescription(item) {
  return getReportValue(item, [
    "deskripsi",
    "isi_laporan",
    "uraian_pekerjaan",
    "keterangan",
    "description"
  ]) || "";
}

function getReportNote(item) {
  return getReportValue(item, [
    "catatan",
    "notes",
    "remark",
    "komentar_admin"
  ]) || "";
}

function getReportStatus(item) {
  return getReportValue(item, [
    "status",
    "status_laporan",
    "approval_status"
  ]);
}

function getReportPhotoBefore(item) {
  return getReportValue(item, [
    "foto_sebelum",
    "foto_before",
    "foto_awal",
    "photo_before",
    "before_photo_url"
  ]);
}

function getReportPhotoAfter(item) {
  return getReportValue(item, [
    "foto_sesudah",
    "foto_after",
    "foto_akhir",
    "photo_after",
    "after_photo_url"
  ]);
}

function normalizeReportStatus(value) {
  const status = String(value ?? "").trim().toUpperCase();

  if (["DISETUJUI", "DISETUJUI ADMIN", "APPROVED", "ACCEPTED"].includes(status)) {
    return "DISETUJUI";
  }

  if (["DITOLAK", "REJECTED", "DECLINED"].includes(status)) {
    return "DITOLAK";
  }

  if (["DITINJAU", "REVIEWED", "IN_REVIEW", "DIPROSES"].includes(status)) {
    return "DITINJAU";
  }

  return "MENUNGGU";
}

function reportStatusLabel(status) {
  const labels = {
    MENUNGGU: "Menunggu",
    DITINJAU: "Ditinjau",
    DISETUJUI: "Disetujui",
    DITOLAK: "Ditolak"
  };

  return labels[status] || "Menunggu";
}

function getReportValue(object, fields) {
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

function formatReportDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function getReportLocalDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function setReportText(element, value) {
  if (element) element.textContent = String(value);
}

function escapeReportHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showReportMessage(message) {
  if (reportElements.tableBody) {
    reportElements.tableBody.innerHTML = `
      <tr>
        <td colspan="8">${escapeReportHTML(message)}</td>
      </tr>
    `;
  }
}