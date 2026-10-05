
"use strict";

(() => {
  const supabase = window.supabaseClient;

  const state = {
    sites: [],
    filteredSites: []
  };

  const el = {
    message: document.getElementById("siteMessage"),
    tableBody: document.getElementById("siteTableBody"),
    search: document.getElementById("searchSite"),
    status: document.getElementById("filterSiteStatus"),
    count: document.getElementById("siteCount"),
    total: document.getElementById("totalSites"),
    active: document.getElementById("activeSites"),
    inactive: document.getElementById("inactiveSites"),
    refresh: document.getElementById("refreshSitesBtn"),
    modal: document.getElementById("siteDetailModal"),
    modalContent: document.getElementById("siteDetailContent"),
    closeModal: document.getElementById("closeSiteModal"),
    modalBackdrop: document.getElementById("siteModalBackdrop")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (!supabase) {
      showMessage("Koneksi Supabase belum tersedia. Periksa supabase-config.js.", "error");
      return;
    }

    bindEvents();
    await loadSites();
  }

  function bindEvents() {
    el.search.addEventListener("input", applyFilters);
    el.status.addEventListener("change", applyFilters);
    el.refresh.addEventListener("click", loadSites);

    el.tableBody.addEventListener("click", event => {
      const button = event.target.closest("[data-site-action='detail']");
      if (!button) return;

      const siteId = button.dataset.siteId;
      const site = state.sites.find(item => String(item.id_site) === String(siteId));

      if (site) openSiteDetail(site);
    });

    el.closeModal.addEventListener("click", closeSiteDetail);
    el.modalBackdrop.addEventListener("click", closeSiteDetail);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeSiteDetail();
    });
  }

  async function loadSites() {
    setLoading(true);
    showMessage("", "");

    try {
      const { data, error } = await supabase
        .from("site")
        .select("*")
        .order("nama_site", { ascending: true });

      if (error) throw error;

      state.sites = Array.isArray(data) ? data : [];
      updateSummary();
      applyFilters();

      showMessage(
        state.sites.length
          ? `Berhasil memuat ${state.sites.length} site.`
          : "Belum ada data site di database.",
        "success"
      );
    } catch (error) {
      console.error("Gagal memuat data site:", error);
      state.sites = [];
      state.filteredSites = [];
      updateSummary();
      renderTable();

      showMessage(
        "Data site gagal dimuat. Periksa koneksi, nama tabel, dan kebijakan RLS Supabase.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function updateSummary() {
    const activeCount = state.sites.filter(site => normalizeStatus(site.status) === "AKTIF").length;
    const inactiveCount = state.sites.length - activeCount;

    el.total.textContent = state.sites.length;
    el.active.textContent = activeCount;
    el.inactive.textContent = inactiveCount;
  }

  function applyFilters() {
    const keyword = el.search.value.trim().toLowerCase();
    const selectedStatus = el.status.value;

    state.filteredSites = state.sites.filter(site => {
      const searchable = [
        site.id_site,
        site.nama_site,
        site.alamat
      ].join(" ").toLowerCase();

      const matchesKeyword = !keyword || searchable.includes(keyword);
      const matchesStatus =
        !selectedStatus || normalizeStatus(site.status) === selectedStatus;

      return matchesKeyword && matchesStatus;
    });

    renderTable();
  }

  function renderTable() {
    el.count.textContent = `${state.filteredSites.length} site ditemukan`;

    if (!state.filteredSites.length) {
      el.tableBody.innerHTML = `
        <tr>
          <td colspan="8">Tidak ada data site yang cocok.</td>
        </tr>
      `;
      return;
    }

    el.tableBody.innerHTML = state.filteredSites.map(site => {
      const status = normalizeStatus(site.status);

      return `
        <tr>
          <td>${escapeHTML(site.id_site ?? "-")}</td>
          <td>${escapeHTML(site.nama_site ?? "-")}</td>
          <td>${escapeHTML(site.alamat ?? "-")}</td>
          <td>${formatRadius(site.radius_meter)}</td>
          <td>${escapeHTML(formatTime(site.jam_masuk))}</td>
          <td>${escapeHTML(formatTime(site.jam_pulang))}</td>
          <td>
            <span class="status-badge status-${status.toLowerCase()}">
              ${status === "AKTIF" ? "Aktif" : "Nonaktif"}
            </span>
          </td>
          <td>
            <button
              type="button"
              data-site-action="detail"
              data-site-id="${escapeHTML(site.id_site ?? "")}"
            >
              Detail
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function openSiteDetail(site) {
    const latitude = toNumber(site.latitude);
    const longitude = toNumber(site.longitude);
    const hasCoordinates = latitude !== null && longitude !== null;
    const mapURL = hasCoordinates
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`
      : "";

    el.modalContent.innerHTML = `
      <dl class="detail-list">
        ${detailRow("ID Site", site.id_site)}
        ${detailRow("Nama Site", site.nama_site)}
        ${detailRow("Alamat", site.alamat)}
        ${detailRow("Latitude", site.latitude)}
        ${detailRow("Longitude", site.longitude)}
        ${detailRow("Radius Absensi", formatRadius(site.radius_meter))}
        ${detailRow("Jam Masuk", formatTime(site.jam_masuk))}
        ${detailRow("Batas Terlambat", formatTime(site.batas_terlambat))}
        ${detailRow("Jam Pulang", formatTime(site.jam_pulang))}
        ${detailRow("Status", normalizeStatus(site.status))}
      </dl>

      ${
        hasCoordinates
          ? `<p class="map-link-wrap">
               <a href="${mapURL}" target="_blank" rel="noopener noreferrer">
                 Lihat lokasi di Google Maps
               </a>
             </p>`
          : `<p>Koordinat lokasi belum tersedia.</p>`
      }
    `;

    el.modal.hidden = false;
    document.body.classList.add("modal-open");
    el.closeModal.focus();
  }

  function closeSiteDetail() {
    if (el.modal.hidden) return;

    el.modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function detailRow(label, value) {
    return `
      <div class="detail-row">
        <dt>${escapeHTML(label)}</dt>
        <dd>${escapeHTML(value ?? "-")}</dd>
      </div>
    `;
  }

  function normalizeStatus(value) {
    const status = String(value ?? "").trim().toUpperCase();
    return ["AKTIF", "ACTIVE", "1", "TRUE"].includes(status)
      ? "AKTIF"
      : "NONAKTIF";
  }

  function formatRadius(value) {
    const number = toNumber(value);
    return number === null ? "-" : `${number} meter`;
  }

  function formatTime(value) {
    if (!value) return "-";
    return String(value).slice(0, 5);
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showMessage(message, type) {
    el.message.textContent = message;
    el.message.className = type ? `message-box ${type}` : "message-box";
  }

  function setLoading(isLoading) {
    el.refresh.disabled = isLoading;
    el.refresh.textContent = isLoading ? "Memuat..." : "Muat Ulang";
  }
})();