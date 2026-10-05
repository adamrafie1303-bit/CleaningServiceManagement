const db = window.supabaseClient;

let currentUser = null;
let currentEmployee = null;
let currentSite = null;
let reports = [];


// =====================================================
// DOM READY
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
    await initLaporan();
});


// =====================================================
// INIT
// =====================================================

async function initLaporan() {
    try {

        if (!db) {
            throw new Error("Supabase belum terhubung.");
        }

        const sessionValid = checkSession();

        if (!sessionValid) {
            return;
        }

        await loadCurrentUser();
        await loadEmployee();
        await loadSite();
        await loadReports();

        setupEvents();
        renderPage();

    } catch (error) {

        console.error(
            "Gagal memuat halaman laporan:",
            error
        );

        showMessage(
            "Gagal memuat data laporan. " +
            (error.message || ""),
            "error"
        );
    }
}


// =====================================================
// SESSION
// =====================================================

function checkSession() {

    const idUser =
        sessionStorage.getItem("id_user");

    const username =
        sessionStorage.getItem("username");

    const role =
        sessionStorage.getItem("role");

    const idKaryawan =
        sessionStorage.getItem("id_karyawan");


    if (
        !idUser ||
        !username ||
        !role ||
        !idKaryawan
    ) {

        window.location.href =
            "../index.html";

        return false;
    }


    if (role !== "KARYAWAN") {

        window.location.href =
            "../index.html";

        return false;
    }


    return true;
}


// =====================================================
// LOAD CURRENT USER
// =====================================================

async function loadCurrentUser() {

    const idUser =
        sessionStorage.getItem("id_user");


    const {
        data,
        error
    } = await db
        .from("users")
        .select("*")
        .eq("id_user", idUser)
        .maybeSingle();


    if (error) {

        console.error(
            "Error load user:",
            error
        );

        throw error;
    }


    if (!data) {

        throw new Error(
            "Data user tidak ditemukan."
        );
    }


    currentUser = data;
}


// =====================================================
// LOAD EMPLOYEE
// =====================================================

async function loadEmployee() {

    const idKaryawan =
        sessionStorage.getItem(
            "id_karyawan"
        );


    const {
        data,
        error
    } = await db
        .from("karyawan")
        .select("*")
        .eq(
            "id_karyawan",
            idKaryawan
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Error load employee:",
            error
        );

        throw error;
    }


    if (!data) {

        throw new Error(
            "Data karyawan tidak ditemukan."
        );
    }


    currentEmployee = data;
}


// =====================================================
// LOAD SITE
// =====================================================

async function loadSite() {

    if (
        !currentEmployee ||
        !currentEmployee.id_site
    ) {

        currentSite = null;

        return;
    }


    const {
        data,
        error
    } = await db
        .from("site")
        .select("*")
        .eq(
            "id_site",
            currentEmployee.id_site
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Error load site:",
            error
        );

        throw error;
    }


    currentSite = data || null;
}


// =====================================================
// LOAD REPORTS
// =====================================================

async function loadReports() {

    if (!currentEmployee) {
        reports = [];
        return;
    }


    const {
        data,
        error
    } = await db
        .from("laporan")
        .select("*")
        .eq(
            "id_karyawan",
            currentEmployee.id_karyawan
        )
        .order(
            "tanggal",
            {
                ascending: false
            }
        )
        .order(
            "waktu",
            {
                ascending: false
            }
        )
        .limit(200);


    if (error) {

        console.error(
            "Error load laporan:",
            error
        );

        throw error;
    }


    reports = data || [];
}


// =====================================================
// EVENTS
// =====================================================

function setupEvents() {

    // FORM LAPORAN
    const reportForm =
        document.getElementById(
            "reportForm"
        );

    if (reportForm) {

        reportForm.addEventListener(
            "submit",
            submitReport
        );
    }


    // FILTER TANGGAL
    const reportDateFilter =
        document.getElementById(
            "reportDateFilter"
        );

    if (reportDateFilter) {

        reportDateFilter.addEventListener(
            "change",
            renderReports
        );
    }


    // CLEAR FILTER
    const clearReportFilter =
        document.getElementById(
            "clearReportFilter"
        );

    if (clearReportFilter) {

        clearReportFilter.addEventListener(
            "click",
            () => {

                if (reportDateFilter) {
                    reportDateFilter.value = "";
                }

                renderReports();
            }
        );
    }


    // REFRESH
    const refreshReportsBtn =
        document.getElementById(
            "refreshReportsBtn"
        );

    if (refreshReportsBtn) {

        refreshReportsBtn.addEventListener(
            "click",
            refreshReports
        );
    }


    // MOBILE MENU
    const mobileMenuBtn =
        document.getElementById(
            "mobileMenuBtn"
        );

    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    if (
        mobileMenuBtn &&
        sidebar
    ) {

        mobileMenuBtn.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "show"
                );
            }
        );
    }


    // LOGOUT
    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );
    }
}


// =====================================================
// RENDER PAGE
// =====================================================

function renderPage() {

    // ID KARYAWAN
    setTextBySelector(
        "[data-employee-id]",
        currentEmployee?.id_karyawan || "-"
    );


    // NAMA KARYAWAN
    setTextBySelector(
        "[data-employee-name]",
        currentEmployee?.nama || "Karyawan"
    );


    // SITE
    setText(
        "reportSite",
        currentSite?.nama_site ||
        currentEmployee?.id_site ||
        "-"
    );


    // TANGGAL
    setText(
        "reportDate",
        formatDateIndo(
            getLocalDateString()
        )
    );


    renderReports();
}


// =====================================================
// REFRESH REPORTS
// =====================================================

async function refreshReports() {

    const button =
        document.getElementById(
            "refreshReportsBtn"
        );


    if (button) {

        button.disabled = true;
        button.textContent =
            "Memuat...";
    }


    try {

        await loadCurrentUser();
        await loadEmployee();
        await loadSite();
        await loadReports();

        renderPage();

        showMessage(
            "Data laporan berhasil diperbarui.",
            "success"
        );

    } catch (error) {

        console.error(
            "Refresh error:",
            error
        );

        showMessage(
            "Gagal memuat ulang laporan.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;
            button.textContent =
                "Muat Ulang";
        }
    }
}


// =====================================================
// SUBMIT REPORT
// =====================================================

async function submitReport(event) {

    event.preventDefault();


    const submitButton =
        document.getElementById(
            "submitReportBtn"
        );


    try {

        const areaElement =
            document.getElementById(
                "reportArea"
            );

        const workElement =
            document.getElementById(
                "reportWork"
            );

        const descriptionElement =
            document.getElementById(
                "reportDescription"
            );

        const beforeUrlElement =
            document.getElementById(
                "photoBeforeUrl"
            );

        const afterUrlElement =
            document.getElementById(
                "photoAfterUrl"
            );


        const area =
            areaElement?.value.trim() || "";

        const pekerjaan =
            workElement?.value.trim() || "";

        const keterangan =
            descriptionElement?.value.trim() || "";

        const fotoSebelum =
            beforeUrlElement?.value.trim() || "";

        const fotoSesudah =
            afterUrlElement?.value.trim() || "";


        // VALIDASI AREA
        if (!area) {

            showMessage(
                "Area pekerjaan wajib diisi.",
                "error"
            );

            areaElement?.focus();

            return;
        }


        // VALIDASI PEKERJAAN
        if (!pekerjaan) {

            showMessage(
                "Pekerjaan wajib diisi.",
                "error"
            );

            workElement?.focus();

            return;
        }


        // VALIDASI EMPLOYEE
        if (!currentEmployee) {

            showMessage(
                "Data karyawan belum tersedia.",
                "error"
            );

            return;
        }


        if (submitButton) {

            submitButton.disabled = true;
            submitButton.textContent =
                "Mengirim...";
        }


        const now =
            new Date();


        const reportData = {

            id_laporan:
                generateReportId(),

            id_karyawan:
                currentEmployee.id_karyawan,

            id_site:
                currentEmployee.id_site,

            tanggal:
                getLocalDateString(),

            area:
                area,

            pekerjaan:
                pekerjaan,

            keterangan:
                keterangan || null,

            foto_sebelum:
                fotoSebelum || null,

            foto_sesudah:
                fotoSesudah || null,

            waktu:
                now.toISOString(),

            status:
                "AKTIF"
        };


        console.log(
            "Data laporan:",
            reportData
        );


        const {
            data,
            error
        } = await db
            .from("laporan")
            .insert(reportData)
            .select()
            .single();


        if (error) {

            console.error(
                "Error Supabase:",
                error
            );

            throw error;
        }


        console.log(
            "Laporan berhasil:",
            data
        );


        showMessage(
            "Laporan berhasil dikirim.",
            "success"
        );


        resetReportForm();


        await loadReports();

        renderReports();


    } catch (error) {

        console.error(
            "Gagal mengirim laporan:",
            error
        );


        showMessage(
            "Laporan gagal dikirim. " +
            (error.message || ""),
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "Kirim Laporan";
        }
    }
}


// =====================================================
// GENERATE REPORT ID
// =====================================================

function generateReportId() {

    const now =
        new Date();


    const timestamp =

        now.getFullYear().toString() +

        String(
            now.getMonth() + 1
        ).padStart(2, "0") +

        String(
            now.getDate()
        ).padStart(2, "0") +

        String(
            now.getHours()
        ).padStart(2, "0") +

        String(
            now.getMinutes()
        ).padStart(2, "0") +

        String(
            now.getSeconds()
        ).padStart(2, "0") +

        String(
            now.getMilliseconds()
        ).padStart(3, "0");


    return `LAP${timestamp}`;
}


// =====================================================
// RENDER REPORTS
// =====================================================

function renderReports() {

    const tbody =
        document.getElementById(
            "reportsTableBody"
        );


    if (!tbody) {
        return;
    }


    const filterElement =
        document.getElementById(
            "reportDateFilter"
        );


    const filterTanggal =
        filterElement?.value || "";


    let filteredReports =
        [...reports];


    if (filterTanggal) {

        filteredReports =
            filteredReports.filter(
                report =>
                    report.tanggal ===
                    filterTanggal
            );
    }


    // TIDAK ADA DATA
    if (
        filteredReports.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    Belum ada laporan.
                </td>
            </tr>
        `;

        updateReportsCount(0);

        return;
    }


    tbody.innerHTML =
        filteredReports
            .map(
                report => {

                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    formatDateIndo(
                                        report.tanggal
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    formatDateTime(
                                        report.waktu
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    report.area ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    report.pekerjaan ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    report.keterangan ||
                                    "-"
                                )}
                            </td>

                            <td>
                                <span class="status-pill ${getStatusClass(
                                    report.status
                                )}">
                                    ${escapeHtml(
                                        report.status ||
                                        "-"
                                    )}
                                </span>
                            </td>

                        </tr>

                    `;
                }
            )
            .join("");


    updateReportsCount(
        filteredReports.length
    );
}


// =====================================================
// REPORT COUNT
// =====================================================

function updateReportsCount(count) {

    const element =
        document.getElementById(
            "reportsCount"
        );


    if (!element) {
        return;
    }


    element.textContent =
        `${count} laporan`;
}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {

    switch (
        String(status || "")
            .toUpperCase()
    ) {

        case "AKTIF":
            return "success";

        case "SELESAI":
            return "success";

        case "PROSES":
            return "warning";

        case "DITOLAK":
            return "danger";

        default:
            return "neutral";
    }
}


// =====================================================
// RESET FORM
// =====================================================

function resetReportForm() {

    const form =
        document.getElementById(
            "reportForm"
        );


    if (form) {
        form.reset();
    }
}


// =====================================================
// LOGOUT
// =====================================================

async function logout() {

    try {

        if (db?.auth) {
            await db.auth.signOut();
        }

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }


    sessionStorage.clear();


    window.location.href =
        "../index.html";
}


// =====================================================
// DATE
// =====================================================

function getLocalDateString() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDateIndo(
    dateString
) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
    }


    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


// =====================================================
// FORMAT DATE TIME
// =====================================================

function formatDateTime(
    dateString
) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(dateString);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleTimeString(
        "id-ID",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// =====================================================
// SET TEXT BY ID
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;
    }
}


// =====================================================
// SET TEXT BY SELECTOR
// =====================================================

function setTextBySelector(
    selector,
    value
) {

    const element =
        document.querySelector(
            selector
        );


    if (element) {

        element.textContent =
            value;
    }
}


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
    message,
    type = "error"
) {

    const box =
        document.getElementById(
            "reportMessage"
        );


    if (!box) {

        console.warn(
            message
        );

        return;
    }


    box.textContent =
        message;


    box.className =
        `message-box show ${type}`;


    clearTimeout(
        showMessage.timer
    );


    showMessage.timer =
        setTimeout(
            () => {

                box.className =
                    "message-box";

            },
            4000
        );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}