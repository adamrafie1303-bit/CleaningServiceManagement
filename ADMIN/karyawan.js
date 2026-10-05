
document.addEventListener("DOMContentLoaded", () => {
  initEmployeePage();
});

let employeeRecords = [];
let employeeSiteRecords = [];
let filteredEmployeeRecords = [];

const employeeElements = {
  search: document.getElementById("searchEmployee"),
  site: document.getElementById("filterEmployeeSite"),
  status: document.getElementById("filterEmployeeStatus"),

  applyButton: document.getElementById("applyEmployeeFilterBtn"),
  resetButton: document.getElementById("resetEmployeeFilterBtn"),
  exportButton: document.getElementById("exportEmployeesBtn"),

  total: document.getElementById("totalEmployees"),
  active: document.getElementById("activeEmployees"),
  inactive: document.getElementById("inactiveEmployees"),
  totalSites: document.getElementById("totalEmployeeSites"),

  count: document.getElementById("employeeCount"),
  tableBody: document.getElementById("employeeTableBody"),

  modal: document.getElementById("employeeDetailModal"),
  modalContent: document.getElementById("employeeDetailContent"),
  closeModal: document.getElementById("closeEmployeeModal")
};

async function initEmployeePage() {
  bindEmployeeEvents();

  if (!window.supabaseClient) {
    showEmployeeMessage("Koneksi Supabase belum tersedia.");
    return;
  }

  await loadEmployeePageData();
}

function bindEmployeeEvents() {
  employeeElements.applyButton?.addEventListener("click", applyEmployeeFilters);
  employeeElements.resetButton?.addEventListener("click", resetEmployeeFilters);
  employeeElements.exportButton?.addEventListener("click", exportEmployeesCSV);

  employeeElements.search?.addEventListener("input", applyEmployeeFilters);

  employeeElements.closeModal?.addEventListener("click", closeEmployeeDetail);

  employeeElements.modal?.addEventListener("click", event => {
    if (event.target === employeeElements.modal) {
      closeEmployeeDetail();
    }
  });

  employeeElements.tableBody?.addEventListener("click", event => {
    const button = event.target.closest("[data-employee-detail]");

    if (!button) return;

    const employeeId = button.dataset.employeeDetail;

    const employee = filteredEmployeeRecords.find(item =>
      String(getEmployeeId(item)) === employeeId
    );

    if (employee) {
      showEmployeeDetail(employee);
    }
  });
}

async function loadEmployeePageData() {
  showEmployeeMessage("Memuat data karyawan...");

  try {
    const [employeesResult, sitesResult] = await Promise.all([
      window.supabaseClient.from("karyawan").select("*"),
      window.supabaseClient.from("site").select("*")
    ]);

    if (employeesResult.error) throw employeesResult.error;
    if (sitesResult.error) throw sitesResult.error;

    employeeRecords = employeesResult.data || [];
    employeeSiteRecords = sitesResult.data || [];

    populateEmployeeSiteFilter();
    applyEmployeeFilters();

  } catch (error) {
    console.error("Gagal memuat data karyawan:", error);

    showEmployeeMessage(
      "Data karyawan gagal dimuat. Periksa koneksi, nama tabel, dan izin akses Supabase."
    );
  }
}

function populateEmployeeSiteFilter() {
  const select = employeeElements.site;

  if (!select) return;

  select.innerHTML = '<option value="">Semua Site</option>';

  employeeSiteRecords.forEach(site => {
    const siteId = getEmployeeSiteIdFromSite(site);
    const siteName = getEmployeeSiteName(site);

    if (!siteId) return;

    const option = document.createElement("option");
    option.value = String(siteId);
    option.textContent = siteName || String(siteId);

    select.appendChild(option);
  });
}

function applyEmployeeFilters() {
  const searchTerm = (employeeElements.search?.value || "")
    .trim()
    .toLowerCase();

  const selectedSite = employeeElements.site?.value || "";
  const selectedStatus = employeeElements.status?.value || "";

  filteredEmployeeRecords = employeeRecords.filter(employee => {
    const employeeId = String(getEmployeeId(employee) || "").toLowerCase();
    const employeeName = String(getEmployeeName(employee) || "").toLowerCase();
    const phone = String(getEmployeePhone(employee) || "").toLowerCase();
    const position = String(getEmployeePosition(employee) || "").toLowerCase();

    const siteId = String(getEmployeeSiteId(employee) || "");
    const status = normalizeEmployeeStatus(getEmployeeStatus(employee));

    const matchesSearch =
      !searchTerm ||
      employeeId.includes(searchTerm) ||
      employeeName.includes(searchTerm) ||
      phone.includes(searchTerm) ||
      position.includes(searchTerm);

    const matchesSite = !selectedSite || siteId === selectedSite;
    const matchesStatus = !selectedStatus || status === selectedStatus;

    return matchesSearch && matchesSite && matchesStatus;
  });

  filteredEmployeeRecords.sort((a, b) => {
    return String(getEmployeeName(a) || "")
      .localeCompare(String(getEmployeeName(b) || ""), "id");
  });

  updateEmployeeSummary();
  renderEmployeeTable();
}

function resetEmployeeFilters() {
  if (employeeElements.search) employeeElements.search.value = "";
  if (employeeElements.site) employeeElements.site.value = "";
  if (employeeElements.status) employeeElements.status.value = "";

  applyEmployeeFilters();
}

function updateEmployeeSummary() {
  const total = filteredEmployeeRecords.length;

  const active = filteredEmployeeRecords.filter(employee =>
    normalizeEmployeeStatus(getEmployeeStatus(employee)) === "AKTIF"
  ).length;

  const inactive = filteredEmployeeRecords.filter(employee =>
    normalizeEmployeeStatus(getEmployeeStatus(employee)) === "NONAKTIF"
  ).length;

  const siteIds = new Set(
    filteredEmployeeRecords
      .map(employee => getEmployeeSiteId(employee))
      .filter(Boolean)
      .map(String)
  );

  setEmployeeText(employeeElements.total, total);
  setEmployeeText(employeeElements.active, active);
  setEmployeeText(employeeElements.inactive, inactive);
  setEmployeeText(employeeElements.totalSites, siteIds.size);
  setEmployeeText(employeeElements.count, `${total} karyawan`);
}

function renderEmployeeTable() {
  const tbody = employeeElements.tableBody;

  if (!tbody) return;

  if (filteredEmployeeRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">Tidak ada data karyawan yang sesuai dengan filter.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredEmployeeRecords.map((employee, index) => {
    const employeeId = getEmployeeId(employee);
    const site = findEmployeeSite(getEmployeeSiteId(employee));
    const status = normalizeEmployeeStatus(getEmployeeStatus(employee));

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeEmployeeHTML(employeeId || "-")}</td>
        <td>
          <strong>${escapeEmployeeHTML(getEmployeeName(employee) || "-")}</strong>
        </td>
        <td>${escapeEmployeeHTML(getEmployeePhone(employee) || "-")}</td>
        <td>${escapeEmployeeHTML(getEmployeePosition(employee) || "-")}</td>
        <td>${escapeEmployeeHTML(getEmployeeSiteName(site) || "-")}</td>
        <td>
          <span class="status-badge status-${status.toLowerCase()}">
            ${escapeEmployeeHTML(employeeStatusLabel(status))}
          </span>
        </td>
        <td>
          <button
            type="button"
            data-employee-detail="${escapeEmployeeHTML(employeeId || "")}"
          >
            Detail
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function showEmployeeDetail(employee) {
  const site = findEmployeeSite(getEmployeeSiteId(employee));
  const status = normalizeEmployeeStatus(getEmployeeStatus(employee));

  employeeElements.modalContent.innerHTML = `
    <div class="detail-row">
      <strong>ID Karyawan</strong>
      <span>${escapeEmployeeHTML(getEmployeeId(employee) || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>Nama Lengkap</strong>
      <span>${escapeEmployeeHTML(getEmployeeName(employee) || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>Nomor HP</strong>
      <span>${escapeEmployeeHTML(getEmployeePhone(employee) || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>Jabatan</strong>
      <span>${escapeEmployeeHTML(getEmployeePosition(employee) || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>Site Penempatan</strong>
      <span>${escapeEmployeeHTML(getEmployeeSiteName(site) || "-")}</span>
    </div>

    <div class="detail-row">
      <strong>Status</strong>
      <span>${escapeEmployeeHTML(employeeStatusLabel(status))}</span>
    </div>
  `;

  employeeElements.modal?.classList.add("show");
  employeeElements.modal?.setAttribute("aria-hidden", "false");
}

function closeEmployeeDetail() {
  employeeElements.modal?.classList.remove("show");
  employeeElements.modal?.setAttribute("aria-hidden", "true");
}

function exportEmployeesCSV() {
  if (filteredEmployeeRecords.length === 0) {
    alert("Tidak ada data karyawan untuk diekspor.");
    return;
  }

  const headers = [
    "ID Karyawan",
    "Nama",
    "Nomor HP",
    "Jabatan",
    "Site",
    "Status"
  ];

  const rows = filteredEmployeeRecords.map(employee => {
    const site = findEmployeeSite(getEmployeeSiteId(employee));

    return [
      getEmployeeId(employee),
      getEmployeeName(employee),
      getEmployeePhone(employee),
      getEmployeePosition(employee),
      getEmployeeSiteName(site),
      employeeStatusLabel(normalizeEmployeeStatus(getEmployeeStatus(employee)))
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(employeeCSVEscape).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `data-karyawan-${getEmployeeLocalDate()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function employeeCSVEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function findEmployeeSite(siteId) {
  return employeeSiteRecords.find(site =>
    String(getEmployeeSiteIdFromSite(site)) === String(siteId)
  ) || null;
}

function getEmployeeId(employee) {
  return getEmployeeField(employee, [
    "id_karyawan",
    "employee_id",
    "ID_KARYAWAN"
  ]);
}

function getEmployeeName(employee) {
  return getEmployeeField(employee, [
    "nama",
    "nama_karyawan",
    "full_name",
    "NAMA"
  ]);
}

function getEmployeePhone(employee) {
  return getEmployeeField(employee, [
    "no_hp",
    "nomor_hp",
    "phone",
    "telepon",
    "NO_HP"
  ]);
}

function getEmployeePosition(employee) {
  return getEmployeeField(employee, [
    "jabatan",
    "posisi",
    "position",
    "JABATAN"
  ]);
}

function getEmployeeSiteId(employee) {
  return getEmployeeField(employee, [
    "id_site",
    "site_id",
    "ID_SITE"
  ]);
}

function getEmployeeStatus(employee) {
  return getEmployeeField(employee, [
    "status",
    "STATUS"
  ]);
}

function getEmployeeSiteIdFromSite(site) {
  return getEmployeeField(site, [
    "id_site",
    "ID_SITE"
  ]);
}

function getEmployeeSiteName(site) {
  return getEmployeeField(site, [
    "nama_site",
    "nama",
    "NAMA_SITE"
  ]);
}

function normalizeEmployeeStatus(value) {
  const status = String(value ?? "").trim().toUpperCase();

  if (["AKTIF", "ACTIVE", "1", "TRUE"].includes(status)) {
    return "AKTIF";
  }

  return "NONAKTIF";
}

function employeeStatusLabel(status) {
  return status === "AKTIF" ? "Aktif" : "Nonaktif";
}

function getEmployeeField(object, fields) {
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

function setEmployeeText(element, value) {
  if (element) element.textContent = String(value);
}

function getEmployeeLocalDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function escapeEmployeeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showEmployeeMessage(message) {
  if (employeeElements.tableBody) {
    employeeElements.tableBody.innerHTML = `
      <tr>
        <td colspan="8">${escapeEmployeeHTML(message)}</td>
      </tr>
    `;
  }
}