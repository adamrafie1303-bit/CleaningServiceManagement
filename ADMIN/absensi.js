/* =========================================================
   ADMIN - ABSENSI
   PT. ARDEND ADHIKARA PANDITA
   Backend : Supabase
   ========================================================= */

const db = window.supabaseClient;

let allAttendance = [];
let filteredAttendance = [];


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("🔥 ABSENSI.JS TERLOAD");

    try {

        bindEvents();

        await loadAbsensi();

    } catch (error) {

        console.error(
            "❌ Gagal memuat halaman absensi:",
            error
        );

        showError(
            error?.message ||
            "Gagal memuat data absensi."
        );

    }

});


/* =========================================================
   EVENT
   ========================================================= */

function bindEvents() {

    const searchInput =
        document.getElementById("searchInput");

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            handleFilter
        );

    }


    const statusFilter =
        document.getElementById("statusFilter");

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            handleFilter
        );

    }


    const dateFilter =
        document.getElementById("dateFilter");

    if (dateFilter) {

        dateFilter.addEventListener(
            "change",
            handleFilter
        );

    }


    const refreshBtn =
        document.getElementById("refreshBtn");

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            async () => {

                await loadAbsensi();

            }
        );

    }


    const closeModal =
        document.getElementById("closeModal");

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeDetailModal
        );

    }


    const detailModal =
        document.getElementById("detailModal");

    if (detailModal) {

        detailModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    detailModal
                ) {

                    closeDetailModal();

                }

            }
        );

    }

}


/* =========================================================
   LOAD ABSENSI
   ========================================================= */

async function loadAbsensi() {

    if (!db) {

        throw new Error(
            "Supabase client tidak ditemukan."
        );

    }


    console.log(
        "📥 Memuat data absensi..."
    );


    /*
     * SESUAI STRUKTUR DATABASE SUPABASE
     */

    const { data, error } = await db
        .from("absensi")
        .select(`
            id_absensi,
            id_karyawan,
            id_site,
            tanggal,
            jam_masuk,
            lat_masuk,
            lng_masuk,
            foto_masuk,
            lat_pulang,
            lng_pulang,
            foto_pulang,
            status_pulang,
            created_at,
            updated_at
        `)
        .order(
            "tanggal",
            {
                ascending: false
            }
        )
        .order(
            "jam_masuk",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "❌ Load absensi error:",
            error
        );

        throw error;

    }


    allAttendance =
        data || [];


    console.log(
        "✅ Data absensi:",
        allAttendance.length
    );


    await enrichAttendanceData();


    filteredAttendance =
        [...allAttendance];


    renderAbsensi();

    updateStatistics();

}


/* =========================================================
   LOAD KARYAWAN & SITE
   ========================================================= */

async function enrichAttendanceData() {

    if (!allAttendance.length) {
        return;
    }


    /* =====================================================
       ID KARYAWAN
       ===================================================== */

    const employeeIds = [
        ...new Set(
            allAttendance
                .map(
                    item =>
                        item.id_karyawan
                )
                .filter(Boolean)
        )
    ];


    /* =====================================================
       ID SITE
       ===================================================== */

    const siteIds = [
        ...new Set(
            allAttendance
                .map(
                    item =>
                        item.id_site
                )
                .filter(Boolean)
        )
    ];


    /* =====================================================
       KARYAWAN
       ===================================================== */

    let employees = [];


    if (employeeIds.length) {

        const {
            data,
            error
        } = await db
            .from("karyawan")
            .select(`
                id_karyawan,
                nama,
                no_hp,
                jabatan,
                id_site,
                status
            `)
            .in(
                "id_karyawan",
                employeeIds
            );


        if (error) {

            console.warn(
                "⚠️ Gagal mengambil karyawan:",
                error
            );

        } else {

            employees =
                data || [];

        }

    }


    /* =====================================================
       SITE
       ===================================================== */

    let sites = [];


    if (siteIds.length) {

        const {
            data,
            error
        } = await db
            .from("site")
            .select(`
                id_site,
                nama_site,
                alamat,
                latitude,
                longitude,
                radius_meter,
                jam_masuk,
                batas_terlambat,
                jam_pulang,
                status
            `)
            .in(
                "id_site",
                siteIds
            );


        if (error) {

            console.warn(
                "⚠️ Gagal mengambil site:",
                error
            );

        } else {

            sites =
                data || [];

        }

    }


    /* =====================================================
       MAP
       ===================================================== */

    const employeeMap =
        new Map(
            employees.map(
                employee => [
                    employee.id_karyawan,
                    employee
                ]
            )
        );


    const siteMap =
        new Map(
            sites.map(
                site => [
                    site.id_site,
                    site
                ]
            )
        );


    /* =====================================================
       GABUNGKAN
       ===================================================== */

    allAttendance =
        allAttendance.map(item => {

            const employee =
                employeeMap.get(
                    item.id_karyawan
                );


            const site =
                siteMap.get(
                    item.id_site
                );


            return {

                ...item,

                nama_karyawan:
                    employee?.nama ||
                    item.id_karyawan ||
                    "-",

                jabatan:
                    employee?.jabatan ||
                    "-",

                nama_site:
                    site?.nama_site ||
                    item.id_site ||
                    "-",

                alamat_site:
                    site?.alamat ||
                    "-",

                jam_masuk_site:
                    site?.jam_masuk ||
                    null,

                batas_terlambat:
                    site?.batas_terlambat ||
                    null,

                jam_pulang_site:
                    site?.jam_pulang ||
                    null

            };

        });

}


/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderAbsensi() {

    const tbody =
        document.getElementById(
            "attendanceTableBody"
        ) ||
        document.getElementById(
            "absensiTableBody"
        ) ||
        document.querySelector(
            "tbody"
        );


    if (!tbody) {

        console.warn(
            "⚠️ Tabel absensi tidak ditemukan."
        );

        return;

    }


    if (!filteredAttendance.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="100%"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    Belum ada data absensi.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        filteredAttendance
            .map(
                (item, index) => {

                    return `
                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        item.id_karyawan
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(
                                    item.nama_karyawan
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    item.nama_site
                                )}
                            </td>

                            <td>
                                ${formatTanggal(
                                    item.tanggal
                                )}
                            </td>

                            <td>
                                ${formatJam(
                                    item.jam_masuk
                                )}
                            </td>

                            <td>
                                ${formatStatusPulang(
                                    item.status_pulang
                                )}
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="btn-detail"
                                    onclick="
                                        showAttendanceDetail(
                                            '${escapeAttribute(
                                                item.id_absensi
                                            )}'
                                        )
                                    "
                                >
                                    Detail
                                </button>
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   FILTER
   ========================================================= */

function handleFilter() {

    const search =
        document
            .getElementById(
                "searchInput"
            )
            ?.value
            ?.trim()
            .toLowerCase() ||
        "";


    const status =
        document
            .getElementById(
                "statusFilter"
            )
            ?.value
            ?.trim()
            .toLowerCase() ||
        "";


    const date =
        document
            .getElementById(
                "dateFilter"
            )
            ?.value
            ?.trim() ||
        "";


    filteredAttendance =
        allAttendance.filter(
            item => {

                const employeeId =
                    String(
                        item.id_karyawan ||
                        ""
                    ).toLowerCase();


                const employeeName =
                    String(
                        item.nama_karyawan ||
                        ""
                    ).toLowerCase();


                const siteName =
                    String(
                        item.nama_site ||
                        ""
                    ).toLowerCase();


                const itemStatus =
                    String(
                        item.status_pulang ||
                        ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    employeeId.includes(
                        search
                    ) ||
                    employeeName.includes(
                        search
                    ) ||
                    siteName.includes(
                        search
                    );


                const matchesStatus =
                    !status ||
                    itemStatus === status;


                const matchesDate =
                    !date ||
                    item.tanggal === date;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesDate
                );

            }
        );


    renderAbsensi();

    updateStatistics();

}


/* =========================================================
   STATISTICS
   ========================================================= */

function updateStatistics() {

    const total =
        filteredAttendance.length;


    const sudahPulang =
        filteredAttendance.filter(
            item =>
                item.status_pulang
        ).length;


    const belumPulang =
        filteredAttendance.filter(
            item =>
                !item.status_pulang
        ).length;


    const hadir =
        filteredAttendance.filter(
            item =>
                item.jam_masuk
        ).length;


    setStatistic(
        [
            "totalAbsensi",
            "totalAttendance"
        ],
        total
    );


    setStatistic(
        [
            "totalHadir",
            "hadirHariIni"
        ],
        hadir
    );


    setStatistic(
        [
            "totalPulang",
            "pulangHariIni"
        ],
        sudahPulang
    );


    setStatistic(
        [
            "totalBelumPulang",
            "belumPulangHariIni"
        ],
        belumPulang
    );

}


/* =========================================================
   DETAIL
   ========================================================= */

window.showAttendanceDetail =
    function (id) {

        const item =
            allAttendance.find(
                attendance =>
                    String(
                        attendance.id_absensi
                    ) === String(id)
            );


        if (!item) {

            console.warn(
                "Data absensi tidak ditemukan:",
                id
            );

            return;

        }


        const modal =
            document.getElementById(
                "detailModal"
            ) ||
            document.getElementById(
                "attendanceModal"
            );


        if (!modal) {

            console.warn(
                "⚠️ Modal detail tidak ditemukan."
            );

            return;

        }


        const detailContainer =
            document.getElementById(
                "detailContent"
            ) ||
            document.getElementById(
                "attendanceDetail"
            );


        if (detailContainer) {

            detailContainer.innerHTML = `

                <div class="detail-row">
                    <span>ID Absensi</span>
                    <strong>
                        ${escapeHTML(
                            item.id_absensi
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>ID Karyawan</span>
                    <strong>
                        ${escapeHTML(
                            item.id_karyawan
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Nama Karyawan</span>
                    <strong>
                        ${escapeHTML(
                            item.nama_karyawan
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Site</span>
                    <strong>
                        ${escapeHTML(
                            item.nama_site
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Tanggal</span>
                    <strong>
                        ${formatTanggal(
                            item.tanggal
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Jam Masuk</span>
                    <strong>
                        ${formatJam(
                            item.jam_masuk
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Status Pulang</span>
                    <strong>
                        ${formatStatusPulang(
                            item.status_pulang
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Lokasi Masuk</span>
                    <strong>
                        ${formatCoordinate(
                            item.lat_masuk
                        )},
                        ${formatCoordinate(
                            item.lng_masuk
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Lokasi Pulang</span>
                    <strong>
                        ${formatCoordinate(
                            item.lat_pulang
                        )},
                        ${formatCoordinate(
                            item.lng_pulang
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Dibuat</span>
                    <strong>
                        ${formatDateTime(
                            item.created_at
                        )}
                    </strong>
                </div>

                <div class="detail-row">
                    <span>Diperbarui</span>
                    <strong>
                        ${formatDateTime(
                            item.updated_at
                        )}
                    </strong>
                </div>

                <div class="detail-photos">

                    ${renderPhoto(
                        item.foto_masuk,
                        "Foto Masuk"
                    )}

                    ${renderPhoto(
                        item.foto_pulang,
                        "Foto Pulang"
                    )}

                </div>

            `;

        }


        modal.classList.add(
            "active"
        );

        modal.style.display =
            "flex";

    };


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeDetailModal() {

    const modal =
        document.getElementById(
            "detailModal"
        ) ||
        document.getElementById(
            "attendanceModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );


    modal.style.display =
        "none";

}


window.closeDetailModal =
    closeDetailModal;


/* =========================================================
   PHOTO
   ========================================================= */

function renderPhoto(
    url,
    title
) {

    if (!url) {

        return `
            <div class="detail-photo">

                <h4>
                    ${escapeHTML(title)}
                </h4>

                <div class="no-photo">
                    Tidak ada foto
                </div>

            </div>
        `;

    }


    return `
        <div class="detail-photo">

            <h4>
                ${escapeHTML(title)}
            </h4>

            <img
                src="${escapeAttribute(url)}"
                alt="${escapeAttribute(title)}"
                loading="lazy"
                onerror="
                    this.style.display='none';
                "
            >

        </div>
    `;

}


/* =========================================================
   STATUS PULANG
   ========================================================= */

function formatStatusPulang(
    status
) {

    if (!status) {

        return `
            <span class="status-badge status-default">
                Belum Pulang
            </span>
        `;

    }


    const value =
        String(status)
            .trim()
            .toUpperCase();


    let className =
        "status-default";


    let label =
        value;


    if (
        value === "PULANG" ||
        value === "SELESAI"
    ) {

        className =
            "status-hadir";

        label =
            "Sudah Pulang";

    }

    else if (
        value === "IZIN"
    ) {

        className =
            "status-izin";

        label =
            "Izin";

    }

    else if (
        value === "TERLAMBAT"
    ) {

        className =
            "status-terlambat";

        label =
            "Terlambat";

    }


    return `
        <span class="status-badge ${className}">
            ${escapeHTML(label)}
        </span>
    `;

}


/* =========================================================
   DATE
   ========================================================= */

function formatTanggal(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================================
   DATETIME
   ========================================================= */

function formatDateTime(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   TIME
   ========================================================= */

function formatJam(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        !Number.isNaN(
            date.getTime()
        )
    ) {

        return date.toLocaleTimeString(
            "id-ID",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    const text =
        String(value);


    if (text.length >= 5) {

        return text.substring(
            0,
            5
        );

    }


    return text;

}


/* =========================================================
   COORDINATE
   ========================================================= */

function formatCoordinate(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "-";

    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return String(value);

    }


    return number.toFixed(6);

}


/* =========================================================
   STATISTIC HELPER
   ========================================================= */

function setStatistic(
    ids,
    value
) {

    ids.forEach(id => {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                value;

        }

    });

}


/* =========================================================
   ERROR
   ========================================================= */

function showError(
    message
) {

    console.error(
        "❌",
        message
    );


    const errorElement =
        document.getElementById(
            "errorMessage"
        );


    if (errorElement) {

        errorElement.textContent =
            message;

        errorElement.style.display =
            "block";

    }

}


/* =========================================================
   SECURITY
   ========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =========================================================
   GLOBAL
   ========================================================= */

window.loadAbsensi =
    loadAbsensi;
