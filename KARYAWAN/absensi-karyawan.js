"use strict";

/* =========================================================
   ABSENSI KARYAWAN
   PT. Ardend Adhikara Pandita
   ========================================================= */

const db = window.supabaseClient;

let currentUser = null;
let currentEmployee = null;
let currentSite = null;
let currentLocation = null;

let checkInPhotoBase64 = null;
let checkOutPhotoBase64 = null;

let attendanceToday = null;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    setupEvents();

    updateDate();

    startClock();

    initPage();

});


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initPage() {

    try {

        /* ================= SUPABASE ================= */

        if (!db) {

            showToast(
                "Koneksi sistem tidak tersedia.",
                "error"
            );

            return;
        }


        /* ================= LOGIN ================= */

        const loginSuccess =
            await loadLoginUser();


        if (!loginSuccess) {
            return;
        }


        /* ================= KARYAWAN ================= */

        const employeeSuccess =
            await loadEmployee();


        if (!employeeSuccess) {
            return;
        }


        /* ================= SITE ================= */

        const siteSuccess =
            await loadSite();


        if (!siteSuccess) {
            return;
        }


        /* ================= ABSENSI HARI INI ================= */

        await loadTodayAttendance();


        /* ================= RIWAYAT ================= */

        await loadAttendanceHistory();


    } catch (error) {

        console.error(
            "Absensi Init Error:",
            error
        );


        showToast(
            "Gagal memuat halaman absensi.",
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


        /* ================= TIDAK LOGIN ================= */

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


        /* ================= USERS ================= */

        const {
            data: userData,
            error: userError
        } = await db
            .from("users")
            .select("*")
            .eq(
                "auth_user_id",
                currentUser.id
            )
            .maybeSingle();


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


        /* ================= STATUS ================= */

        if (
            userData.status &&
            userData.status !== "AKTIF"
        ) {

            showToast(
                "Akun kamu tidak aktif.",
                "error"
            );


            await db.auth.signOut();


            setTimeout(() => {

                window.location.href =
                    "../index.html";

            }, 1500);


            return false;
        }


        /* ================= ROLE ================= */

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


        /* ================= ID KARYAWAN ================= */

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
            currentUser?.profile?.id_karyawan;


        if (!employeeId) {

            showToast(
                "ID karyawan tidak ditemukan.",
                "error"
            );

            return false;
        }


        const {
            data,
            error
        } = await db
            .from("karyawan")
            .select("*")
            .eq(
                "id_karyawan",
                employeeId
            )
            .maybeSingle();


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


        /* ================= RENDER ================= */

        setText(
            "employeeId",
            data.id_karyawan || "-"
        );


        setText(
            "employeeName",
            data.nama || "Karyawan"
        );


        setText(
            "topNama",
            data.nama || "Karyawan"
        );


        setText(
            "topId",
            data.id_karyawan || "-"
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

        if (
            !currentEmployee ||
            !currentEmployee.id_site
        ) {

            renderEmptySite();

            return false;
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


        /* ================= RENDER ================= */

        setText(
            "siteName",
            data.nama_site || "-"
        );


        setText(
            "siteAddress",
            data.alamat || "-"
        );


        setText(
            "siteRadius",
            data.radius_meter
                ? `${data.radius_meter} meter`
                : "-"
        );


        setText(
            "siteJamMasuk",
            data.jam_masuk || "-"
        );


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


/* =========================================================
   EMPTY SITE
   ========================================================= */

function renderEmptySite() {

    setText(
        "siteName",
        "Site belum tersedia"
    );

    setText(
        "siteAddress",
        "-"
    );

    setText(
        "siteRadius",
        "-"
    );

    setText(
        "siteJamMasuk",
        "-"
    );
}


/* =========================================================
   LOAD TODAY ATTENDANCE
   ========================================================= */

async function loadTodayAttendance() {

    try {

        if (!currentUser?.profile?.id_karyawan) {
            return;
        }


        const today =
            getTodayDate();


        const {
            data,
            error
        } = await db
            .from("absensi")
            .select("*")
            .eq(
                "id_karyawan",
                currentUser.profile.id_karyawan
            )
            .eq(
                "tanggal",
                today
            )
            .maybeSingle();


        if (error) {

            console.error(
                "Today Attendance Error:",
                error
            );

            return;
        }


        attendanceToday =
            data || null;


        updateAttendanceStatus();


    } catch (error) {

        console.error(
            "loadTodayAttendance Error:",
            error
        );
    }
}


/* =========================================================
   UPDATE ATTENDANCE STATUS
   ========================================================= */

function updateAttendanceStatus() {

    const checkInBtn =
        document.getElementById(
            "checkInBtn"
        );


    const checkOutBtn =
        document.getElementById(
            "checkOutBtn"
        );


    const checkInStatus =
        document.getElementById(
            "checkInStatus"
        );


    const checkOutStatus =
        document.getElementById(
            "checkOutStatus"
        );


    if (
        !checkInBtn ||
        !checkOutBtn ||
        !checkInStatus ||
        !checkOutStatus
    ) {
        return;
    }


    /* ================= BELUM ADA ABSENSI ================= */

    if (!attendanceToday) {

        checkInStatus.textContent =
            "Belum Absen";

        checkInStatus.className =
            "status-pill neutral";


        checkOutStatus.textContent =
            "Belum Absen";

        checkOutStatus.className =
            "status-pill neutral";


        checkInBtn.disabled =
            !isLocationValid();


        checkOutBtn.disabled =
            true;


        return;
    }


    /* ================= ABSEN MASUK ================= */

    if (attendanceToday.jam_masuk) {

        checkInStatus.textContent =
            "Sudah Absen";

        checkInStatus.className =
            "status-pill success";


        setText(
            "checkInTime",
            formatTime(
                attendanceToday.jam_masuk
            )
        );


        checkInBtn.disabled =
            true;

    } else {

        checkInStatus.textContent =
            "Belum Absen";

        checkInStatus.className =
            "status-pill neutral";


        checkInBtn.disabled =
            !isLocationValid();
    }


    /* ================= ABSEN PULANG ================= */

    if (attendanceToday.jam_pulang) {

        checkOutStatus.textContent =
            "Sudah Absen";

        checkOutStatus.className =
            "status-pill danger";


        setText(
            "checkOutTime",
            formatTime(
                attendanceToday.jam_pulang
            )
        );


        checkOutBtn.disabled =
            true;

    } else {

        checkOutStatus.textContent =
            "Belum Absen";

        checkOutStatus.className =
            "status-pill neutral";


        checkOutBtn.disabled =
            !(
                attendanceToday.jam_masuk &&
                isLocationValid()
            );
    }
}


/* =========================================================
   CHECK LOCATION
   ========================================================= */

async function checkLocation() {

    const locationStatus =
        document.getElementById(
            "locationStatus"
        );


    const distanceStatus =
        document.getElementById(
            "distanceStatus"
        );


    const instruction =
        document.getElementById(
            "attendanceInstruction"
        );


    const button =
        document.getElementById(
            "checkLocationBtn"
        );


    if (!locationStatus) {
        return;
    }


    /* ================= GPS SUPPORT ================= */

    if (!navigator.geolocation) {

        locationStatus.textContent =
            "Browser tidak mendukung GPS.";

        locationStatus.className =
            "status-box error";


        if (instruction) {

            instruction.textContent =
                "⚠️ Browser tidak mendukung pemeriksaan lokasi.";

            instruction.className =
                "instruction-box error";
        }


        return;
    }


    /* ================= SITE ================= */

    if (!currentSite) {

        locationStatus.textContent =
            "Data site belum tersedia.";

        locationStatus.className =
            "status-box error";


        return;
    }


    /* ================= LOADING ================= */

    locationStatus.textContent =
        "Sedang mengambil lokasi...";

    locationStatus.className =
        "status-box neutral";


    if (distanceStatus) {

        distanceStatus.textContent =
            "Menghitung jarak...";
    }


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Memeriksa...";
    }


    /* ================= GET GPS ================= */

    navigator.geolocation.getCurrentPosition(

        position => {

            processLocation(
                position
            );


            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "📍 Periksa Lokasi";
            }
        },


        error => {

            console.error(
                "GPS Error:",
                error
            );


            let message =
                "GPS gagal diperoleh.";


            if (error.code === 1) {

                message =
                    "Izin lokasi ditolak oleh browser.";
            }


            if (error.code === 2) {

                message =
                    "Lokasi tidak tersedia.";
            }


            if (error.code === 3) {

                message =
                    "Waktu mengambil lokasi habis.";
            }


            locationStatus.textContent =
                message;

            locationStatus.className =
                "status-box error";


            if (distanceStatus) {

                distanceStatus.textContent =
                    "Jarak dari site: -";
            }


            if (instruction) {

                instruction.textContent =
                    "⚠️ Periksa izin lokasi browser lalu coba lagi.";

                instruction.className =
                    "instruction-box error";
            }


            currentLocation =
                null;


            updateAttendanceStatus();


            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "📍 Periksa Lokasi";
            }
        },


        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }

    );
}


/* =========================================================
   PROCESS LOCATION
   ========================================================= */

function processLocation(position) {

    const locationStatus =
        document.getElementById(
            "locationStatus"
        );


    const distanceStatus =
        document.getElementById(
            "distanceStatus"
        );


    const instruction =
        document.getElementById(
            "attendanceInstruction"
        );


    const latitude =
        Number(
            position.coords.latitude
        );


    const longitude =
        Number(
            position.coords.longitude
        );


    /* ================= SIMPAN LOKASI ================= */

    currentLocation = {

        latitude:
            latitude,

        longitude:
            longitude

    };


    /* ================= SITE COORDINATE ================= */

    const siteLatitude =
        Number(
            currentSite.latitude
        );


    const siteLongitude =
        Number(
            currentSite.longitude
        );


    const radius =
        Number(
            currentSite.radius_meter || 0
        );


    /* ================= VALIDASI KOORDINAT ================= */

    if (
        !Number.isFinite(siteLatitude) ||
        !Number.isFinite(siteLongitude)
    ) {

        currentLocation =
            null;


        locationStatus.textContent =
            "Koordinat site belum tersedia.";

        locationStatus.className =
            "status-box error";


        if (instruction) {

            instruction.textContent =
                "⚠️ Koordinat site belum diatur di database.";

            instruction.className =
                "instruction-box error";
        }


        updateAttendanceStatus();

        return;
    }


    /* ================= HITUNG JARAK ================= */

    const distance =
        calculateDistance(
            latitude,
            longitude,
            siteLatitude,
            siteLongitude
        );


    if (distanceStatus) {

        distanceStatus.textContent =
            `Jarak dari site: ${Math.round(
                distance
            )} meter`;
    }


    /* ================= DALAM RADIUS ================= */

    if (distance <= radius) {

        currentLocation.valid =
            true;


        locationStatus.textContent =
            "Lokasi valid. Kamu berada di area site.";

        locationStatus.className =
            "status-box success";


        if (instruction) {

            instruction.textContent =
                "✅ Lokasi valid. Kamu dapat melakukan absensi.";

            instruction.className =
                "instruction-box success";
        }


        updateAttendanceStatus();


        return;
    }


    /* ================= LUAR RADIUS ================= */

    currentLocation.valid =
        false;


    locationStatus.textContent =
        "Kamu berada di luar area site.";

    locationStatus.className =
        "status-box error";


    if (instruction) {

        instruction.textContent =
            "⚠️ Kamu harus berada di dalam radius site untuk melakukan absensi.";

        instruction.className =
            "instruction-box error";
    }


    updateAttendanceStatus();
}


/* =========================================================
   LOCATION VALID
   ========================================================= */

function isLocationValid() {

    return Boolean(
        currentLocation &&
        currentLocation.valid === true
    );
}


/* =========================================================
   ENABLE PHOTO BUTTON
   ========================================================= */

function setupPhotoButton(
    buttonId,
    inputId,
    handler
) {

    const button =
        document.getElementById(
            buttonId
        );


    const input =
        document.getElementById(
            inputId
        );


    if (!button || !input) {
        return;
    }


    button.addEventListener(
        "click",
        () => {
            input.click();
        }
    );


    input.addEventListener(
        "change",
        handler
    );
}


/* =========================================================
   EVENT SETUP
   ========================================================= */

function setupEvents() {

    /* ================= LOCATION ================= */

    const locationButton =
        document.getElementById(
            "checkLocationBtn"
        );


    if (locationButton) {

        locationButton.addEventListener(
            "click",
            checkLocation
        );
    }


    /* ================= FOTO MASUK ================= */

    setupPhotoButton(
        "checkInPhotoBtn",
        "checkInPhoto",
        handleCheckInPhoto
    );


    /* ================= FOTO PULANG ================= */

    setupPhotoButton(
        "checkOutPhotoBtn",
        "checkOutPhoto",
        handleCheckOutPhoto
    );


    /* ================= ABSEN MASUK ================= */

    const checkInButton =
        document.getElementById(
            "checkInBtn"
        );


    if (checkInButton) {

        checkInButton.addEventListener(
            "click",
            checkIn
        );
    }


    /* ================= ABSEN PULANG ================= */

    const checkOutButton =
        document.getElementById(
            "checkOutBtn"
        );


    if (checkOutButton) {

        checkOutButton.addEventListener(
            "click",
            checkOut
        );
    }


    /* ================= FILTER ================= */

    const filter =
        document.getElementById(
            "historyFilter"
        );


    if (filter) {

        filter.addEventListener(
            "change",
            loadAttendanceHistory
        );
    }
}


/* =========================================================
   FOTO MASUK
   ========================================================= */

function handleCheckInPhoto(event) {

    const file =
        event.target.files?.[0];


    if (!file) {
        return;
    }


    if (!file.type.startsWith("image/")) {

        showToast(
            "File yang dipilih harus berupa gambar.",
            "error"
        );

        return;
    }


    convertImageToBase64(
        file,
        base64 => {

            checkInPhotoBase64 =
                base64;


            const preview =
                document.getElementById(
                    "checkInPhotoPreview"
                );


            if (preview) {

                preview.innerHTML = `

                    <img
                        src="${base64}"
                        alt="Foto absen masuk"
                    >

                `;
            }


            showToast(
                "Foto absen masuk siap digunakan.",
                "success"
            );
        }
    );
}


/* =========================================================
   FOTO PULANG
   ========================================================= */

function handleCheckOutPhoto(event) {

    const file =
        event.target.files?.[0];


    if (!file) {
        return;
    }


    if (!file.type.startsWith("image/")) {

        showToast(
            "File yang dipilih harus berupa gambar.",
            "error"
        );

        return;
    }


    convertImageToBase64(
        file,
        base64 => {

            checkOutPhotoBase64 =
                base64;


            const preview =
                document.getElementById(
                    "checkOutPhotoPreview"
                );


            if (preview) {

                preview.innerHTML = `

                    <img
                        src="${base64}"
                        alt="Foto absen pulang"
                    >

                `;
            }


            showToast(
                "Foto absen pulang siap digunakan.",
                "success"
            );
        }
    );
}


/* =========================================================
   CONVERT IMAGE
   ========================================================= */

function convertImageToBase64(
    file,
    callback
) {

    const reader =
        new FileReader();


    reader.onload =
        event => {

            callback(
                event.target.result
            );
        };


    reader.onerror =
        () => {

            showToast(
                "Gagal membaca foto.",
                "error"
            );
        };


    reader.readAsDataURL(file);
}


/* =========================================================
   ABSEN MASUK
   ========================================================= */

async function checkIn() {

    if (!isLocationValid()) {

        showToast(
            "Periksa lokasi terlebih dahulu.",
            "error"
        );

        return;
    }


    if (!checkInPhotoBase64) {

        showToast(
            "Ambil foto masuk terlebih dahulu.",
            "error"
        );

        return;
    }


    if (
        attendanceToday &&
        attendanceToday.jam_masuk
    ) {

        showToast(
            "Kamu sudah melakukan absen masuk.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById(
            "checkInBtn"
        );


    if (!button) {
        return;
    }


    button.disabled =
        true;

    button.textContent =
        "Menyimpan...";


    try {

        const now =
            new Date();


        const status =
            calculateAttendanceStatus(
                now
            );


        const idAbsensi =
            "ABS" +
            Date.now();


        const data = {

            id_absensi:
                idAbsensi,

            id_karyawan:
                currentUser.profile.id_karyawan,

            id_site:
                currentEmployee.id_site,

            tanggal:
                getTodayDate(),

            jam_masuk:
                now
                    .toTimeString()
                    .substring(0, 8),

            jam_pulang:
                null,

            latitude_masuk:
                currentLocation.latitude,

            longitude_masuk:
                currentLocation.longitude,

            foto_masuk:
                checkInPhotoBase64,

            latitude_pulang:
                null,

            longitude_pulang:
                null,

            foto_pulang:
                null,

            status:
                status,

            keterangan:
                null
        };


        const {
            data: insertedData,
            error
        } = await db
            .from("absensi")
            .insert(data)
            .select()
            .single();


        if (error) {

            console.error(
                "Check In Error:",
                error
            );

            throw error;
        }


        attendanceToday =
            insertedData;


        checkInPhotoBase64 =
            null;


        resetPhotoPreview(
            "checkInPhotoPreview"
        );


        showToast(
            "Absen masuk berhasil disimpan.",
            "success"
        );


        updateAttendanceStatus();


        await loadAttendanceHistory();


    } catch (error) {

        console.error(
            "checkIn Error:",
            error
        );


        showToast(
            "Gagal menyimpan absen masuk: " +
            error.message,
            "error"
        );


        button.disabled =
            false;

    } finally {

        button.textContent =
            "✓ Absen Masuk";
    }
}


/* =========================================================
   ABSEN PULANG
   ========================================================= */

async function checkOut() {

    if (!isLocationValid()) {

        showToast(
            "Periksa lokasi terlebih dahulu.",
            "error"
        );

        return;
    }


    if (!checkOutPhotoBase64) {

        showToast(
            "Ambil foto pulang terlebih dahulu.",
            "error"
        );

        return;
    }


    if (
        !attendanceToday ||
        !attendanceToday.jam_masuk
    ) {

        showToast(
            "Kamu belum melakukan absen masuk.",
            "error"
        );

        return;
    }


    if (attendanceToday.jam_pulang) {

        showToast(
            "Kamu sudah melakukan absen pulang.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById(
            "checkOutBtn"
        );


    if (!button) {
        return;
    }


    button.disabled =
        true;

    button.textContent =
        "Menyimpan...";


    try {

        const now =
            new Date();


        const updateData = {

            jam_pulang:
                now
                    .toTimeString()
                    .substring(0, 8),

            latitude_pulang:
                currentLocation.latitude,

            longitude_pulang:
                currentLocation.longitude,

            foto_pulang:
                checkOutPhotoBase64
        };


        const {
            data,
            error
        } = await db
            .from("absensi")
            .update(updateData)
            .eq(
                "id_absensi",
                attendanceToday.id_absensi
            )
            .select()
            .single();


        if (error) {

            console.error(
                "Check Out Error:",
                error
            );

            throw error;
        }


        attendanceToday =
            data;


        checkOutPhotoBase64 =
            null;


        resetPhotoPreview(
            "checkOutPhotoPreview"
        );


        showToast(
            "Absen pulang berhasil disimpan.",
            "success"
        );


        updateAttendanceStatus();


        await loadAttendanceHistory();


    } catch (error) {

        console.error(
            "checkOut Error:",
            error
        );


        showToast(
            "Gagal menyimpan absen pulang: " +
            error.message,
            "error"
        );


        button.disabled =
            false;

    } finally {

        button.textContent =
            "→ Absen Pulang";
    }
}


/* =========================================================
   RESET PHOTO PREVIEW
   ========================================================= */

function resetPhotoPreview(
    elementId
) {

    const preview =
        document.getElementById(
            elementId
        );


    if (!preview) {
        return;
    }


    preview.innerHTML = `

        <span>
            📷
        </span>

        <p>
            Foto belum dipilih
        </p>

    `;
}


/* =========================================================
   ATTENDANCE STATUS
   ========================================================= */

function calculateAttendanceStatus(
    date
) {

    if (
        !currentSite ||
        !currentSite.batas_terlambat
    ) {

        return "HADIR";
    }


    const parts =
        String(
            currentSite.batas_terlambat
        ).split(":");


    const batasHour =
        Number(parts[0]);


    const batasMinute =
        Number(parts[1]);


    const currentHour =
        date.getHours();


    const currentMinute =
        date.getMinutes();


    if (
        currentHour > batasHour ||
        (
            currentHour === batasHour &&
            currentMinute > batasMinute
        )
    ) {

        return "TERLAMBAT";
    }


    return "HADIR";
}


/* =========================================================
   LOAD ATTENDANCE HISTORY
   ========================================================= */

async function loadAttendanceHistory() {

    const tbody =
        document.getElementById(
            "attendanceTableBody"
        );


    if (
        !tbody ||
        !currentUser?.profile?.id_karyawan
    ) {
        return;
    }


    const filterElement =
        document.getElementById(
            "historyFilter"
        );


    const filter =
        filterElement
            ? filterElement.value
            : "ALL";


    tbody.innerHTML = `

        <tr>
            <td colspan="5">
                Memuat data...
            </td>
        </tr>

    `;


    try {

        let query =
            db
                .from("absensi")
                .select("*")
                .eq(
                    "id_karyawan",
                    currentUser.profile.id_karyawan
                )
                .order(
                    "tanggal",
                    {
                        ascending: false
                    }
                );


        if (filter !== "ALL") {

            query =
                query.eq(
                    "status",
                    filter
                );
        }


        const {
            data,
            error
        } = await query;


        if (error) {

            console.error(
                "History Error:",
                error
            );

            throw error;
        }


        if (
            !data ||
            data.length === 0
        ) {

            tbody.innerHTML = `

                <tr>
                    <td colspan="5">
                        Belum ada riwayat absensi.
                    </td>
                </tr>

            `;

            return;
        }


        tbody.innerHTML =
            "";


        data.forEach(
            item => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const status =
                    item.status || "-";


                const statusClass =
                    getStatusClass(
                        status
                    );


                row.innerHTML = `

                    <td>
                        ${formatDate(
                            item.tanggal
                        )}
                    </td>

                    <td>
                        ${
                            item.jam_masuk
                                ? formatTime(
                                    item.jam_masuk
                                )
                                : "-"
                        }
                    </td>

                    <td>
                        ${
                            item.jam_pulang
                                ? formatTime(
                                    item.jam_pulang
                                )
                                : "-"
                        }
                    </td>

                    <td>
                        <span
                            class="status-pill ${statusClass}"
                        >
                            ${status}
                        </span>
                    </td>

                    <td>
                        ${
                            item.keterangan ||
                            "-"
                        }
                    </td>

                `;


                tbody.appendChild(
                    row
                );
            }
        );


    } catch (error) {

        console.error(
            "loadAttendanceHistory Error:",
            error
        );


        tbody.innerHTML = `

            <tr>
                <td colspan="5">
                    Gagal memuat riwayat absensi.
                </td>
            </tr>

        `;
    }
}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(
    status
) {

    switch (
        String(status).toUpperCase()
    ) {

        case "HADIR":
            return "success";

        case "TERLAMBAT":
            return "warning";

        case "IZIN":
            return "info";

        case "CUTI":
            return "info";

        default:
            return "neutral";
    }
}


/* =========================================================
   DISTANCE
   ========================================================= */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadius =
        6371000;


    const dLat =
        toRadians(
            lat2 - lat1
        );


    const dLon =
        toRadians(
            lon2 - lon1
        );


    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(
            toRadians(lat1)
        ) *

        Math.cos(
            toRadians(lat2)
        ) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;
}


function toRadians(
    degrees
) {

    return (
        degrees *
        Math.PI /
        180
    );
}


/* =========================================================
   TODAY
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


    return `${year}-${month}-${day}`;
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
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


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(
    timeString
) {

    if (!timeString) {
        return "-";
    }


    return String(
        timeString
    ).substring(
        0,
        8
    );
}


/* =========================================================
   DATE DISPLAY
   ========================================================= */

function updateDate() {

    const element =
        document.getElementById(
            "tanggalHariIni"
        );


    if (!element) {
        return;
    }


    const now =
        new Date();


    element.textContent =
        now.toLocaleDateString(
            "id-ID",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
}


/* =========================================================
   CLOCK
   ========================================================= */

function startClock() {

    updateClock();


    setInterval(
        updateClock,
        1000
    );
}


function updateClock() {

    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            "id-ID",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    const checkInTime =
        document.getElementById(
            "checkInTime"
        );


    const checkOutTime =
        document.getElementById(
            "checkOutTime"
        );


    /* ================= JAM MASUK ================= */

    if (
        checkInTime &&
        (
            !attendanceToday ||
            !attendanceToday.jam_masuk
        )
    ) {

        checkInTime.textContent =
            time;
    }


    /* ================= JAM PULANG ================= */

    if (
        checkOutTime &&
        attendanceToday &&
        attendanceToday.jam_masuk &&
        !attendanceToday.jam_pulang
    ) {

        checkOutTime.textContent =
            time;
    }
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type = "info"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.className =
        `toast ${type}`;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );
}


/* =========================================================
   HELPER TEXT
   ========================================================= */

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;
    }
}