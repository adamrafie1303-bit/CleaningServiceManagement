"use strict";

const db = window.supabaseClient;

let currentUser = null;
let currentEmployee = null;
let currentSite = null;


// ================================
// SAAT HALAMAN DIBUKA
// ================================

document.addEventListener("DOMContentLoaded", function () {
    startDashboard();
});


// ================================
// START DASHBOARD
// ================================

async function startDashboard() {

    if (!db) {
        showMessage(
            "Supabase belum terhubung.",
            "error"
        );
        return;
    }

    setText(
        "footerYear",
        new Date().getFullYear()
    );

    setText(
        "todayDate",
        getTodayText()
    );

    bindLogout();

    try {
        await loadLoginUser();

        if (!currentUser) {
            return;
        }

        await loadEmployee();

        if (!currentEmployee) {
            return;
        }

        await loadSite();

        await loadAttendance();

        await loadChecklist();

        renderDashboard();

        hideMessage();

    } catch (error) {

        console.error(error);

        showMessage(
            "Dashboard gagal dimuat. Periksa koneksi Supabase.",
            "error"
        );
    }
}


// ================================
// CEK LOGIN
// ================================

async function loadLoginUser() {

    const result = await db.auth.getUser();

    if (result.error) {
        throw result.error;
    }

    const authUser = result.data.user;

    if (!authUser) {

        window.location.href = "../index.html";

        return;
    }


    const userResult = await db
        .from("users")
        .select("*")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();


    if (userResult.error) {
        throw userResult.error;
    }


    if (!userResult.data) {

        showMessage(
            "Data akun tidak ditemukan.",
            "error"
        );

        return;
    }


    currentUser = userResult.data;


    const status = String(
        currentUser.status || ""
    ).toUpperCase();


    const role = String(
        currentUser.role || ""
    ).toUpperCase();


    if (status !== "AKTIF") {

        await db.auth.signOut();

        window.location.href = "../index.html";

        return;
    }


    if (role !== "KARYAWAN") {

        showMessage(
            "Akun ini bukan akun karyawan.",
            "error"
        );

        return;
    }


    if (!currentUser.id_karyawan) {

        showMessage(
            "Akun belum memiliki ID karyawan.",
            "error"
        );

        return;
    }
}


// ================================
// LOAD DATA KARYAWAN
// ================================

async function loadEmployee() {

    const result = await db
        .from("karyawan")
        .select("*")
        .eq(
            "id_karyawan",
            currentUser.id_karyawan
        )
        .maybeSingle();


    if (result.error) {
        throw result.error;
    }


    if (!result.data) {

        showMessage(
            "Data karyawan tidak ditemukan.",
            "error"
        );

        return;
    }


    currentEmployee = result.data;
}


// ================================
// LOAD SITE
// ================================

async function loadSite() {

    if (!currentEmployee.id_site) {
        currentSite = null;
        return;
    }


    const result = await db
        .from("site")
        .select("*")
        .eq(
            "id_site",
            currentEmployee.id_site
        )
        .maybeSingle();


    if (result.error) {
        throw result.error;
    }


    currentSite = result.data;
}


// ================================
// LOAD ABSENSI
// ================================

async function loadAttendance() {

    const result = await db
        .from("absensi")
        .select("*")
        .eq(
            "id_karyawan",
            currentEmployee.id_karyawan
        );


    if (result.error) {
        throw result.error;
    }


    const records = result.data || [];

    const today = getLocalDate();


    let todayRecord = null;


    for (let i = records.length - 1; i >= 0; i--) {

        const record = records[i];

        const dateValue =
            record.tanggal ||
            record.tanggal_absensi ||
            record.created_at ||
            record.waktu_masuk ||
            record.jam_masuk;


        if (
            dateValue &&
            getDatePart(dateValue) === today
        ) {

            todayRecord = record;

            break;
        }
    }


    renderAttendance(todayRecord);
}


// ================================
// LOAD CHECKLIST
// ================================

async function loadChecklist() {

    const result = await db
        .from("checklist_harian")
        .select("*")
        .eq(
            "id_karyawan",
            currentEmployee.id_karyawan
        )
        .eq(
            "tanggal",
            getLocalDate()
        );


    if (result.error) {
        throw result.error;
    }


    const checklist = result.data || [];


    const total = checklist.length;


    let selesai = 0;


    for (let i = 0; i < checklist.length; i++) {

        const status = String(
            checklist[i].status || ""
        ).toUpperCase();


        if (status === "SELESAI") {
            selesai++;
        }
    }


    const belum = total - selesai;


    let progress = 0;


    if (total > 0) {
        progress = Math.round(
            (selesai / total) * 100
        );
    }


    setText(
        "totalChecklist",
        total
    );


    setText(
        "completedChecklist",
        selesai
    );


    setText(
        "pendingChecklist",
        belum
    );


    setText(
        "progressChecklist",
        progress + "%"
    );


    const progressBar =
        document.getElementById(
            "checklistProgressBar"
        );


    if (progressBar) {

        progressBar.style.width =
            progress + "%";
    }


    renderChecklistPreview(checklist);
}


// ================================
// RENDER DATA UTAMA
// ================================

function renderDashboard() {

    const nama =
        currentEmployee.nama || "Karyawan";


    const id =
        currentEmployee.id_karyawan || "—";


    setText(
        "welcomeName",
        nama
    );


    const employeeIds =
        document.querySelectorAll(
            "[data-employee-id]"
        );


    employeeIds.forEach(function (element) {

        element.textContent = id;

    });


    const employeeNames =
        document.querySelectorAll(
            "[data-employee-name]"
        );


    employeeNames.forEach(function (element) {

        element.textContent = nama;

    });


    renderSite();
}


// ================================
// RENDER SITE
// ================================

function renderSite() {

    if (!currentSite) {

        setText(
            "employeeSite",
            "Belum ditentukan"
        );


        setText(
            "employeeSiteAddress",
            "Site belum ditentukan."
        );


        return;
    }


    setText(
        "employeeSite",
        currentSite.nama_site ||
        currentSite.id_site ||
        "Site"
    );


    setText(
        "employeeSiteAddress",
        currentSite.alamat ||
        "Alamat belum tersedia."
    );


    const schedule =
        document.getElementById(
            "siteSchedule"
        );


    if (!schedule) {
        return;
    }


    schedule.innerHTML = "";


    addSchedule(
        schedule,
        "Jam Masuk",
        formatTime(
            currentSite.jam_masuk
        )
    );


    addSchedule(
        schedule,
        "Batas Terlambat",
        formatTime(
            currentSite.batas_terlambat
        )
    );


    addSchedule(
        schedule,
        "Jam Pulang",
        formatTime(
            currentSite.jam_pulang
        )
    );


    addSchedule(
        schedule,
        "Radius Absensi",
        formatRadius(
            currentSite.radius_meter
        )
    );
}


// ================================
// TAMBAH JADWAL
// ================================

function addSchedule(
    container,
    label,
    value
) {

    const item =
        document.createElement("div");


    item.className =
        "schedule-item";


    const span =
        document.createElement("span");


    span.textContent = label;


    const strong =
        document.createElement("strong");


    strong.textContent = value;


    item.appendChild(span);

    item.appendChild(strong);

    container.appendChild(item);
}


// ================================
// RENDER ABSENSI
// ================================

function renderAttendance(record) {

    if (!record) {

        setText(
            "todayAttendanceStatus",
            "Belum Absen"
        );


        setText(
            "todayAttendanceTime",
            "Belum ada catatan absensi hari ini"
        );


        setText(
            "todayCheckIn",
            "—"
        );


        setText(
            "todayCheckOut",
            "—"
        );


        return;
    }


    const checkIn =
        record.jam_masuk ||
        record.waktu_masuk ||
        record.check_in ||
        null;


    const checkOut =
        record.jam_pulang ||
        record.waktu_pulang ||
        record.check_out ||
        null;


    const status =
        record.status ||
        record.status_absensi ||
        "";


    let statusText = "Tercatat";


    if (checkOut) {

        statusText =
            "Absensi Selesai";

    } else if (checkIn) {

        statusText =
            "Sudah Absen Masuk";

    } else if (status) {

        statusText =
            status;
    }


    setText(
        "todayAttendanceStatus",
        statusText
    );


    if (status) {

        setText(
            "todayAttendanceTime",
            "Status: " + status
        );

    } else {

        setText(
            "todayAttendanceTime",
            "Catatan absensi hari ini"
        );
    }


    setText(
        "todayCheckIn",
        formatTime(checkIn)
    );


    setText(
        "todayCheckOut",
        formatTime(checkOut)
    );
}


// ================================
// RENDER CHECKLIST PREVIEW
// ================================

function renderChecklistPreview(
    checklist
) {

    const container =
        document.getElementById(
            "checklistPreview"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (checklist.length === 0) {

        const empty =
            document.createElement("div");


        empty.className =
            "empty-preview";


        empty.textContent =
            "Belum ada checklist hari ini.";


        container.appendChild(empty);

        return;
    }


    const max =
        Math.min(
            checklist.length,
            5
        );


    for (let i = 0; i < max; i++) {

        const item =
            checklist[i];


        const row =
            document.createElement("div");


        row.className =
            "check-preview-item";


        const dot =
            document.createElement("span");


        const status =
            String(
                item.status || ""
            ).toUpperCase();


        if (status === "SELESAI") {

            dot.className =
                "check-dot done";

        } else {

            dot.className =
                "check-dot";
        }


        const text =
            document.createElement("span");


        text.textContent =
            item.pekerjaan ||
            "Pekerjaan";


        row.appendChild(dot);

        row.appendChild(text);

        container.appendChild(row);
    }
}


// ================================
// LOGOUT
// ================================

function bindLogout() {

    const buttons =
        document.querySelectorAll(
            ".logout-btn"
        );


    buttons.forEach(function (button) {

        button.addEventListener(
            "click",
            logout
        );

    });
}


async function logout() {

    const result =
        await db.auth.signOut();


    if (result.error) {

        console.error(
            result.error
        );


        showMessage(
            "Logout gagal.",
            "error"
        );


        return;
    }


    sessionStorage.clear();


    window.location.href =
        "../index.html";
}


// ================================
// TANGGAL
// ================================

function getLocalDate() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}


function getTodayText() {

    return new Date().toLocaleDateString(
        "id-ID",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


function getDatePart(value) {

    const text =
        String(value);


    return text.substring(
        0,
        10
    );
}


// ================================
// FORMAT WAKTU
// ================================

function formatTime(value) {

    if (!value) {
        return "—";
    }


    const text =
        String(value);


    if (
        text.length >= 5 &&
        text.charAt(2) === ":"
    ) {

        return text.substring(
            0,
            5
        );
    }


    const match =
        text.match(
            /(\d{1,2}:\d{2})/
        );


    if (match) {
        return match[1];
    }


    return text;
}


// ================================
// FORMAT RADIUS
// ================================

function formatRadius(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";
    }


    return value + " meter";
}


// ================================
// SET TEXT
// ================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent = value;
    }
}


// ================================
// MESSAGE
// ================================

function showMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "messageBox"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        "message-box " + type;


    element.style.display =
        "block";
}


function hideMessage() {

    const element =
        document.getElementById(
            "messageBox"
        );


    if (element) {
        element.style.display =
            "none";
    }
}

