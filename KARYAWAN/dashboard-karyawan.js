"use strict";

/* =========================================================
   DASHBOARD KARYAWAN
   PT. Ardend Adhikara Pandita
   ========================================================= */

const db = window.supabaseClient;

let currentUser = null;
let currentEmployee = null;
let currentSite = null;


/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    startDashboard();
});


async function startDashboard() {

    try {

        /* ================= CEK SUPABASE ================= */

        if (!db) {
            showMessage("Koneksi sistem tidak tersedia.", "error");
            return;
        }


        /* ================= TAHUN ================= */

        const yearElement = document.getElementById("currentYear");

        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }


        /* ================= TANGGAL ================= */

        renderTodayDate();


        /* ================= LOGIN ================= */

        const loginSuccess = await loadLoginUser();

        if (!loginSuccess) {
            return;
        }


        /* ================= KARYAWAN ================= */

        const employeeSuccess = await loadEmployee();

        if (!employeeSuccess) {
            return;
        }


        /* ================= SITE ================= */

        await loadSite();


        /* ================= RENDER ================= */

        renderDashboard();

    } catch (error) {

        console.error("Dashboard Error:", error);

        showMessage(
            "Terjadi kesalahan saat memuat dashboard.",
            "error"
        );
    }
}


/* =========================================================
   LOAD LOGIN USER
   ========================================================= */

async function loadLoginUser() {

    try {

        const {
            data: authData,
            error: authError
        } = await db.auth.getUser();


        /* Tidak login */

        if (
            authError ||
            !authData ||
            !authData.user
        ) {

            window.location.href = "../index.html";

            return false;
        }


        currentUser = authData.user;


        /* ================= USERS ================= */

        const {
            data: userData,
            error: userError
        } = await db
            .from("users")
            .select("*")
            .eq("auth_user_id", currentUser.id)
            .maybeSingle();


        if (userError) {

            console.error(
                "Users Error:",
                userError
            );

            showMessage(
                "Data akun tidak dapat dibaca.",
                "error"
            );

            return false;
        }


        if (!userData) {

            showMessage(
                "Data akun tidak ditemukan.",
                "error"
            );

            return false;
        }


        /* ================= STATUS ================= */

        if (
            userData.status &&
            userData.status !== "AKTIF"
        ) {

            showMessage(
                "Akun kamu tidak aktif.",
                "error"
            );

            await db.auth.signOut();

            setTimeout(() => {
                window.location.href = "../index.html";
            }, 1500);

            return false;
        }


        /* ================= ROLE ================= */

        if (
            userData.role &&
            userData.role !== "KARYAWAN"
        ) {

            showMessage(
                "Akun ini bukan akun karyawan.",
                "error"
            );

            return false;
        }


        /* ================= ID KARYAWAN ================= */

        if (!userData.id_karyawan) {

            showMessage(
                "Akun belum terhubung dengan data karyawan.",
                "error"
            );

            return false;
        }


        currentUser.profile = userData;

        return true;

    } catch (error) {

        console.error(
            "loadLoginUser Error:",
            error
        );

        showMessage(
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
            currentUser?.profile?.id_karyawan;


        if (!employeeId) {
            return false;
        }


        const {
            data,
            error
        } = await db
            .from("karyawan")
            .select("*")
            .eq("id_karyawan", employeeId)
            .maybeSingle();


        if (error) {

            console.error(
                "Karyawan Error:",
                error
            );

            showMessage(
                "Data karyawan tidak dapat dibaca.",
                "error"
            );

            return false;
        }


        if (!data) {

            showMessage(
                "Data karyawan tidak ditemukan.",
                "error"
            );

            return false;
        }


        currentEmployee = data;

        return true;

    } catch (error) {

        console.error(
            "loadEmployee Error:",
            error
        );

        showMessage(
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

        if (!currentEmployee?.id_site) {
            return false;
        }


        const {
            data,
            error
        } = await db
            .from("site")
            .select("*")
            .eq("id_site", currentEmployee.id_site)
            .maybeSingle();


        if (error) {

            console.error(
                "Site Error:",
                error
            );

            return false;
        }


        currentSite = data || null;

        return true;

    } catch (error) {

        console.error(
            "loadSite Error:",
            error
        );

        return false;
    }
}


/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

function renderDashboard() {

    if (!currentEmployee) {
        return;
    }


    /* ================= NAMA ================= */

    const employeeName =
        currentEmployee.nama ||
        "Karyawan";


    const employeeId =
        currentEmployee.id_karyawan ||
        "CS---";


    const welcomeName =
        document.getElementById("welcomeName");


    const employeeNameElements =
        document.querySelectorAll(
            "[data-employee-name]"
        );


    const employeeIdElements =
        document.querySelectorAll(
            "[data-employee-id]"
        );


    if (welcomeName) {
        welcomeName.textContent =
            employeeName;
    }


    employeeNameElements.forEach(element => {
        element.textContent =
            employeeName;
    });


    employeeIdElements.forEach(element => {
        element.textContent =
            employeeId;
    });


    /* ================= SITE ================= */

    renderSite();
}


/* =========================================================
   RENDER SITE
   ========================================================= */

function renderSite() {

    const siteNameElement =
        document.getElementById("employeeSite");


    const siteAddressElement =
        document.getElementById(
            "employeeSiteAddress"
        );


    if (!currentSite) {

        if (siteNameElement) {
            siteNameElement.textContent =
                "Site belum tersedia";
        }

        if (siteAddressElement) {
            siteAddressElement.textContent =
                "Data site belum ditemukan";
        }

        return;
    }


    const siteName =
        currentSite.nama_site ||
        currentSite.nama ||
        currentSite.name ||
        "Site";


    const siteAddress =
        currentSite.alamat ||
        currentSite.address ||
        "-";


    if (siteNameElement) {
        siteNameElement.textContent =
            siteName;
    }


    if (siteAddressElement) {
        siteAddressElement.textContent =
            siteAddress;
    }
}


/* =========================================================
   TANGGAL HARI INI
   ========================================================= */

function renderTodayDate() {

    const element =
        document.getElementById("todayDate");


    if (!element) {
        return;
    }


    const today = new Date();


    const formatted =
        today.toLocaleDateString(
            "id-ID",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );


    element.textContent = formatted;
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    message,
    type = "info"
) {

    const box =
        document.getElementById(
            "messageBox"
        );


    if (!box) {
        return;
    }


    box.textContent = message;


    box.style.display = "block";


    if (type === "error") {

        box.style.color = "#b42318";

        box.style.background =
            "#fff1f0";

        box.style.borderColor =
            "#ffd0cc";

    } else {

        box.style.color = "#087df5";

        box.style.background =
            "#eaf4ff";

        box.style.borderColor =
            "#d9ebff";
    }


    setTimeout(() => {

        box.style.display = "none";

    }, 4000);
}