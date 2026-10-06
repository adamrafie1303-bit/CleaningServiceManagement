"use strict";

/* =========================================================
   LAPORAN KARYAWAN
   PT. Ardend Adhikara Pandita
   ========================================================= */

const db = window.supabaseClient;

let currentUser = null;
let currentEmployee = null;
let currentSite = null;
let reportData = [];


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    setupEvents();
    initPage();
});


async function initPage() {
    try {
        if (!db) {
            showToast(
                "Koneksi sistem tidak tersedia.",
                "error"
            );

            return;
        }

        const userLoaded =
            await loadLoginUser();

        if (!userLoaded) {
            return;
        }

        const employeeLoaded =
            await loadEmployee();

        if (!employeeLoaded) {
            return;
        }

        const siteLoaded =
            await loadSite();

        if (!siteLoaded) {
            return;
        }

        setDefaultFilters();

        await loadReports();

    } catch (error) {

        console.error(
            "Laporan Init Error:",
            error
        );

        showToast(
            "Gagal memuat halaman laporan.",
            "error"
        );
    }
}


/* =========================================================
   LOAD LOGIN USER
   ========================================================= */

async function loadLoginUser() {
    try {

        const authResult =
            await db.auth.getUser();

        const authData =
            authResult.data;

        const authError =
            authResult.error;


        if (
            authError ||
            !authData ||
            !authData.user
        ) {

            window.location.href =
                "../index.html";

            return false;
        }


        currentUser =
            authData.user;


        const userResult =
            await db
                .from("users")
                .select("*")
                .eq(
                    "auth_user_id",
                    currentUser.id
                )
                .maybeSingle();


        const userData =
            userResult.data;

        const userError =
            userResult.error;


        if (userError) {

            console.error(
                "Users Error:",
                userError
            );

            showToast(
                "Data akun tidak dapat dibaca.",
                "error"
            );

            return false;
        }


        if (!userData) {

            showToast(
                "Data akun tidak ditemukan.",
                "error"
            );

            return false;
        }


        if (
            userData.status &&
            userData.status !== "AKTIF"
        ) {

            showToast(
                "Akun kamu tidak aktif.",
                "error"
            );

            await db.auth.signOut();

            setTimeout(
                function () {

                    window.location.href =
                        "../index.html";

                },
                1500
            );

            return false;
        }


        if (
            userData.role &&
            userData.role !== "KARYAWAN"
        ) {

            showToast(
                "Akun ini bukan akun karyawan.",
                "error"
            );

            return false;
        }


        if (!userData.id_karyawan) {

            showToast(
                "Akun belum terhubung dengan data karyawan.",
                "error"
            );

            return false;
        }


        currentUser.profile =
            userData;


        return true;

    } catch (error) {

        console.error(
            "loadLoginUser Error:",
            error
        );

        showToast(
            "Gagal memeriksa akun.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   LOAD EMPLOYEE
   ========================================================= */

async function loadEmployee() {

    try {

        const employeeId =
            currentUser &&
            currentUser.profile &&
            currentUser.profile.id_karyawan;


        if (!employeeId) {

            showToast(
                "ID karyawan tidak ditemukan.",
                "error"
            );

            return false;
        }


        const result =
            await db
                .from("karyawan")
                .select("*")
                .eq(
                    "id_karyawan",
                    employeeId
                )
                .maybeSingle();


        const data =
            result.data;

        const error =
            result.error;


        if (error) {

            console.error(
                "Karyawan Error:",
                error
            );

            showToast(
                "Data karyawan tidak dapat dibaca.",
                "error"
            );

            return false;
        }


        if (!data) {

            showToast(
                "Data karyawan tidak ditemukan.",
                "error"
            );

            return false;
        }


        currentEmployee =
            data;


        setText(
            "employeeId",
            data.id_karyawan || "-"
        );


        setText(
            "topNama",
            data.nama || "Karyawan"
        );


        setText(
            "topId",
            data.id_karyawan || "-"
        );


        updateAvatar(
            data.nama
        );


        return true;

    } catch (error) {

        console.error(
            "loadEmployee Error:",
            error
        );

        showToast(
            "Gagal memuat data karyawan.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   LOAD SITE
   ========================================================= */

async function loadSite() {

    try {

        const siteId =
            currentEmployee &&
            currentEmployee.id_site;


        if (!siteId) {

            renderEmptySite();

            return false;
        }


        const result =
            await db
                .from("site")
                .select("*")
                .eq(
                    "id_site",
                    siteId
                )
                .maybeSingle();


        const data =
            result.data;

        const error =
            result.error;


        if (error) {

            console.error(
                "Site Error:",
                error
            );

            renderEmptySite();

            showToast(
                "Data site tidak dapat dibaca.",
                "error"
            );

            return false;
        }


        if (!data) {

            renderEmptySite();

            showToast(
                "Data site tidak ditemukan.",
                "error"
            );

            return false;
        }


        currentSite =
            data;


        setText(
            "siteName",
            data.nama_site || "-"
        );


        setText(
            "siteAddress",
            data.alamat || "-"
        );


        const siteStatus =
            document.getElementById(
                "siteStatus"
            );


        if (siteStatus) {

            siteStatus.textContent =
                data.status || "AKTIF";
        }


        return true;

    } catch (error) {

        console.error(
            "loadSite Error:",
            error
        );

        renderEmptySite();

        return false;
    }
}


function renderEmptySite() {

    setText(
        "siteName",
        "Site belum tersedia"
    );


    setText(
        "siteAddress",
        "-"
    );


    const siteStatus =
        document.getElementById(
            "siteStatus"
        );


    if (siteStatus) {

        siteStatus.textContent =
            "TIDAK TERSEDIA";
    }
}


/* =========================================================
   DEFAULT FILTER
   ========================================================= */

function setDefaultFilters() {

    const tanggal =
        document.getElementById(
            "filterTanggal"
        );


    const bulan =
        document.getElementById(
            "filterBulan"
        );


    const status =
        document.getElementById(
            "filterStatus"
        );


    if (tanggal) {

        tanggal.value =
            getTodayDate();
    }


    if (bulan) {

        bulan.value =
            "";
    }


    if (status) {

        status.value =
            "";
    }
}


/* =========================================================
   LOAD REPORT
   ========================================================= */

async function loadReports() {

    const list =
        document.getElementById(
            "reportList"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        "<div class=\"loading-state\">" +
            "<div class=\"loading-spinner\"></div>" +
            "<p>Memuat laporan...</p>" +
        "</div>";


    try {

        const employeeId =
            currentUser &&
            currentUser.profile &&
            currentUser.profile.id_karyawan;


        const siteId =
            currentEmployee &&
            currentEmployee.id_site;


        if (!employeeId || !siteId) {

            throw new Error(
                "Data karyawan atau site tidak ditemukan."
            );
        }


        let query =
            db
                .from("checklist_harian")
                .select(
                    "id_checklist,id_template,id_karyawan,id_site,tanggal,pekerjaan,status,keterangan,foto,created_at,updated_at"
                )
                .eq(
                    "id_karyawan",
                    employeeId
                )
                .eq(
                    "id_site",
                    siteId
                );


        const tanggal =
            document.getElementById(
                "filterTanggal"
            );


        const bulan =
            document.getElementById(
                "filterBulan"
            );


        const status =
            document.getElementById(
                "filterStatus"
            );


        if (
            tanggal &&
            tanggal.value
        ) {

            query =
                query.eq(
                    "tanggal",
                    tanggal.value
                );

        } else if (
            bulan &&
            bulan.value
        ) {

            const year =
                new Date()
                    .getFullYear();


            const startDate =
                year +
                "-" +
                bulan.value +
                "-01";


            const endDate =
                getLastDateOfMonth(
                    year,
                    Number(bulan.value)
                );


            query =
                query
                    .gte(
                        "tanggal",
                        startDate
                    )
                    .lte(
                        "tanggal",
                        endDate
                    );
        }


        if (
            status &&
            status.value
        ) {

            query =
                query.eq(
                    "status",
                    status.value
                );
        }


        const result =
            await query
                .order(
                    "tanggal",
                    {
                        ascending: false
                    }
                )
                .order(
                    "id_template",
                    {
                        ascending: true
                    }
                );


        const data =
            result.data;

        const error =
            result.error;


        if (error) {

            console.error(
                "Report Error:",
                error
            );

            throw error;
        }


        reportData =
            data || [];


        renderReports();

    } catch (error) {

        console.error(
            "loadReports Error:",
            error
        );


        list.innerHTML =
            "<div class=\"empty-state\">" +
                "<div class=\"empty-state-icon\">⚠️</div>" +
                "<strong>Laporan tidak dapat dimuat</strong>" +
                "<p>" +
                    escapeHtml(
                        error.message ||
                        "Terjadi kesalahan."
                    ) +
                "</p>" +
            "</div>";


        updateSummary(
            []
        );


        showToast(
            "Gagal memuat laporan.",
            "error"
        );
    }
}


/* =========================================================
   RENDER REPORT
   ========================================================= */

function renderReports() {

    const list =
        document.getElementById(
            "reportList"
        );


    if (!list) {
        return;
    }


    updateSummary(
        reportData
    );


    setText(
        "reportCount",
        reportData.length +
        " laporan"
    );


    if (
        !reportData ||
        reportData.length === 0
    ) {

        list.innerHTML =
            "<div class=\"empty-state\">" +
                "<div class=\"empty-state-icon\">📄</div>" +
                "<strong>Belum ada laporan</strong>" +
                "<p>Tidak ada data pekerjaan sesuai filter.</p>" +
            "</div>";

        return;
    }


    list.innerHTML =
        "";


    for (
        let i = 0;
        i < reportData.length;
        i++
    ) {

        const item =
            reportData[i];


        const completed =
            String(
                item.status || ""
            ).toUpperCase() ===
            "SELESAI";


        const statusClass =
            completed
                ? "completed"
                : "pending";


        const statusText =
            completed
                ? "Selesai"
                : "Belum Selesai";


        const dateText =
            formatDate(
                item.tanggal
            );


        const element =
            document.createElement(
                "div"
            );


        element.className =
            "report-item";


        element.innerHTML =
            "<div class=\"report-number\">" +
                (i + 1) +
            "</div>" +

            "<div class=\"report-content\">" +

                "<div class=\"report-title\">" +
                    escapeHtml(
                        item.pekerjaan ||
                        "Pekerjaan"
                    ) +
                "</div>" +

                "<div class=\"report-meta\">" +

                    "<span>" +
                        "📅 " +
                        dateText +
                    "</span>" +

                    "<span>" +
                        "ID " +
                        escapeHtml(
                            String(
                                item.id_checklist
                            )
                        ) +
                    "</span>" +

                "</div>" +

            "</div>" +

            "<span class=\"report-status " +
                statusClass +
            "\">" +
                statusText +
            "</span>";


        list.appendChild(
            element
        );
    }
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary(data) {

    const total =
        data.length;


    let completed =
        0;


    let pending =
        0;


    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        const status =
            String(
                data[i].status || ""
            ).toUpperCase();


        if (
            status === "SELESAI"
        ) {

            completed++;

        } else {

            pending++;
        }
    }


    setText(
        "totalTasks",
        total
    );


    setText(
        "completedTasks",
        completed
    );


    setText(
        "pendingTasks",
        pending
    );
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    const filterButton =
        document.getElementById(
            "filterButton"
        );


    if (filterButton) {

        filterButton.addEventListener(
            "click",
            function () {

                loadReports();

            }
        );
    }


    const tanggal =
        document.getElementById(
            "filterTanggal"
        );


    const bulan =
        document.getElementById(
            "filterBulan"
        );


    if (tanggal) {

        tanggal.addEventListener(
            "change",
            function () {

                if (
                    tanggal.value &&
                    bulan
                ) {

                    bulan.value =
                        "";
                }

            }
        );
    }


    if (bulan) {

        bulan.addEventListener(
            "change",
            function () {

                if (
                    bulan.value &&
                    tanggal
                ) {

                    tanggal.value =
                        "";
                }

            }
        );
    }
}


/* =========================================================
   AVATAR
   ========================================================= */

function updateAvatar(name) {

    const avatar =
        document.getElementById(
            "employeeAvatar"
        );


    if (
        !avatar ||
        !name
    ) {
        return;
    }


    avatar.textContent =
        String(name)
            .trim()
            .charAt(0)
            .toUpperCase();
}


/* =========================================================
   DATE
   ========================================================= */

function getTodayDate() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}


function formatDate(dateValue) {

    if (!dateValue) {
        return "-";
    }


    const parts =
        String(
            dateValue
        ).split("-");


    if (
        parts.length !== 3
    ) {
        return dateValue;
    }


    const year =
        Number(parts[0]);


    const month =
        Number(parts[1]);


    const day =
        Number(parts[2]);


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    return date.toLocaleDateString(
        "id-ID",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}


function getLastDateOfMonth(
    year,
    month
) {

    const date =
        new Date(
            year,
            month,
            0
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        String(month).padStart(
            2,
            "0"
        ) +
        "-" +
        day
    );
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;
    }
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    if (!type) {
        type = "info";
    }


    toast.textContent =
        message;


    toast.className =
        "toast " +
        type;


    toast.classList.add(
        "show"
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    let text =
        String(
            value == null
                ? ""
                : value
        );


    text =
        text.replace(
            /&/g,
            "&amp;"
        );


    text =
        text.replace(
            /</g,
            "&lt;"
        );


    text =
        text.replace(
            />/g,
            "&gt;"
        );


    text =
        text.replace(
            /"/g,
            "&quot;"
        );


    return text;
}
