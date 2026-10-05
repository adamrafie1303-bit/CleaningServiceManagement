
document.addEventListener("DOMContentLoaded", () => {
  initSettingsPage();
});

let settingsData = [];

const settingsElements = {
  refreshButton: document.getElementById("refreshSettingsBtn"),
  count: document.getElementById("settingsCount"),
  message: document.getElementById("settingsMessage"),
  tableBody: document.getElementById("settingsTableBody")
};

async function initSettingsPage() {
  settingsElements.refreshButton?.addEventListener("click", loadSettings);

  if (!window.supabaseClient) {
    showSettingsMessage("Koneksi Supabase belum tersedia.");
    return;
  }

  await loadSettings();
}

async function loadSettings() {
  showSettingsMessage("Memuat konfigurasi dari database...");

  if (settingsElements.refreshButton) {
    settingsElements.refreshButton.disabled = true;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("setting")
      .select("*");

    if (error) throw error;

    settingsData = data || [];

    renderSettingsTable();
    showSettingsMessage(
      settingsData.length
        ? "Konfigurasi berhasil dimuat."
        : "Belum ada data konfigurasi pada tabel setting."
    );

  } catch (error) {
    console.error("Gagal memuat pengaturan:", error);

    settingsData = [];
    renderSettingsTable();

    showSettingsMessage(
      "Pengaturan gagal dimuat. Periksa nama tabel, koneksi, dan izin akses Supabase."
    );

  } finally {
    if (settingsElements.refreshButton) {
      settingsElements.refreshButton.disabled = false;
    }
  }
}

function renderSettingsTable() {
  const tbody = settingsElements.tableBody;

  if (!tbody) return;

  if (settingsElements.count) {
    settingsElements.count.textContent = `${settingsData.length} pengaturan`;
  }

  if (settingsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">Belum ada data pengaturan.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = settingsData.map((item, index) => {
    const key = getSettingKey(item);
    const value = getSettingValue(item);
    const description = getSettingDescription(item);

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${escapeSettingsHTML(key || "Pengaturan")}</strong>
        </td>
        <td>${escapeSettingsHTML(formatSettingValue(value))}</td>
        <td>${escapeSettingsHTML(description || "-")}</td>
      </tr>
    `;
  }).join("");
}

function getSettingKey(item) {
  return getSettingField(item, [
    "nama_setting",
    "key",
    "setting_key",
    "kode_setting",
    "nama",
    "id_setting"
  ]);
}

function getSettingValue(item) {
  return getSettingField(item, [
    "nilai",
    "value",
    "setting_value",
    "isi",
    "value_setting"
  ]);
}

function getSettingDescription(item) {
  return getSettingField(item, [
    "deskripsi",
    "keterangan",
    "description",
    "catatan"
  ]);
}

function getSettingField(item, candidates) {
  if (!item) return null;

  for (const field of candidates) {
    if (
      Object.prototype.hasOwnProperty.call(item, field) &&
      item[field] !== null &&
      item[field] !== undefined &&
      item[field] !== ""
    ) {
      return item[field];
    }
  }

  return null;
}

function formatSettingValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Aktif" : "Tidak Aktif";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function showSettingsMessage(message) {
  if (settingsElements.message) {
    settingsElements.message.textContent = message;
  }
}

function escapeSettingsHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}