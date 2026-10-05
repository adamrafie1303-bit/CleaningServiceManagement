const db = window.supabaseClient;

let currentUser = null;
let currentEmployee = null;
let currentSite = null;
let currentLocation = null;
let checkInPhotoBase64 = null;
let checkOutPhotoBase64 = null;
let attendanceToday = null;


// =====================================================
// DOM READY
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
    setupEvents();
    updateDate();
    startClock();

    await initPage();
});


// =====================================================
// INITIALIZATION
// =====================================================

async function initPage() {
    try {

        if (!db) {
            throw new Error("Supabase belum terhubung.");
        }

        const idKaryawan = sessionStorage.getItem("id_karyawan");
        const role = sessionStorage.getItem("role");

        if (!idKaryawan || role !== "KARYAWAN") {
            window.location.href = "../index.html";
            return;
        }

        currentUser = {
            id_karyawan: idKaryawan
        };

        setText("employeeId", idKaryawan);
        setText("topId", idKaryawan);

        await loadEmployee();
        await loadSite();
        await loadTodayAttendance();
        await loadAttendanceHistory();

    } catch (error) {

        console.error("Init error:", error);

        showToast(
            "Gagal memuat data absensi.",
            "error"
        );
    }
}


// =====================================================
// EVENT SETUP
// =====================================================

function setupEvents() {

    // Cek lokasi
    const checkLocationBtn =
        document.getElementById("checkLocationBtn");

    if (checkLocationBtn) {
        checkLocationBtn.addEventListener(
            "click",
            checkLocation
        );
    }


    // Foto masuk
    const checkInPhotoBtn =
        document.getElementById("checkInPhotoBtn");

    const checkInPhoto =
        document.getElementById("checkInPhoto");

    if (checkInPhotoBtn && checkInPhoto) {

        checkInPhotoBtn.addEventListener(
            "click",
            () => {
                checkInPhoto.click();
            }
        );

        checkInPhoto.addEventListener(
            "change",
            handleCheckInPhoto
        );
    }


    // Foto pulang
    const checkOutPhotoBtn =
        document.getElementById("checkOutPhotoBtn");

    const checkOutPhoto =
        document.getElementById("checkOutPhoto");

    if (checkOutPhotoBtn && checkOutPhoto) {

        checkOutPhotoBtn.addEventListener(
            "click",
            () => {
                checkOutPhoto.click();
            }
        );

        checkOutPhoto.addEventListener(
            "change",
            handleCheckOutPhoto
        );
    }


    // Absen masuk
    const checkInBtn =
        document.getElementById("checkInBtn");

    if (checkInBtn) {
        checkInBtn.addEventListener(
            "click",
            checkIn
        );
    }


    // Absen pulang
    const checkOutBtn =
        document.getElementById("checkOutBtn");

    if (checkOutBtn) {
        checkOutBtn.addEventListener(
            "click",
            checkOut
        );
    }


    // Filter riwayat
    const historyFilter =
        document.getElementById("historyFilter");

    if (historyFilter) {

        historyFilter.addEventListener(
            "change",
            loadAttendanceHistory
        );
    }


    // Logout
    // Tidak error kalau tombol logout tidak ada di HTML
    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );
    }


    // Mobile menu
    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const sidebar =
        document.querySelector(".sidebar");

    if (mobileMenuBtn && sidebar) {

        mobileMenuBtn.addEventListener(
            "click",
            () => {
                sidebar.classList.toggle("show");
            }
        );
    }
}


// =====================================================
// LOAD EMPLOYEE
// =====================================================

async function loadEmployee() {

    const idKaryawan =
        currentUser.id_karyawan;

    const { data, error } =
        await db
            .from("karyawan")
            .select("*")
            .eq("id_karyawan", idKaryawan)
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


    setText(
        "employeeId",
        data.id_karyawan || "-"
    );

    setText(
        "employeeName",
        data.nama || "-"
    );

    setText(
        "topNama",
        data.nama || "Karyawan"
    );

    setText(
        "topId",
        data.id_karyawan || "-"
    );
}


// =====================================================
// LOAD SITE
// =====================================================

async function loadSite() {

    if (
        !currentEmployee ||
        !currentEmployee.id_site
    ) {

        setText("siteName", "-");
        setText("siteAddress", "-");
        setText("siteRadius", "-");
        setText("siteJamMasuk", "-");

        return;
    }


    const { data, error } =
        await db
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


    if (!data) {
        throw new Error(
            "Data site tidak ditemukan."
        );
    }


    currentSite = data;


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
}


// =====================================================
// LOAD TODAY ATTENDANCE
// =====================================================

async function loadTodayAttendance() {

    if (!currentUser) return;


    const today =
        getTodayDate();


    const { data, error } =
        await db
            .from("absensi")
            .select("*")
            .eq(
                "id_karyawan",
                currentUser.id_karyawan
            )
            .eq(
                "tanggal",
                today
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Error load today attendance:",
            error
        );

        return;
    }


    attendanceToday = data;

    updateAttendanceStatus();
}


// =====================================================
// UPDATE ATTENDANCE STATUS
// =====================================================

function updateAttendanceStatus() {

    const checkInBtn =
        document.getElementById("checkInBtn");

    const checkOutBtn =
        document.getElementById("checkOutBtn");

    const checkInStatus =
        document.getElementById("checkInStatus");

    const checkOutStatus =
        document.getElementById("checkOutStatus");


    if (
        !checkInBtn ||
        !checkOutBtn ||
        !checkInStatus ||
        !checkOutStatus
    ) {
        return;
    }


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
            !currentLocation;

        checkOutBtn.disabled =
            true;

        return;
    }


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


        checkInBtn.disabled = true;
    }


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


        checkOutBtn.disabled = true;

    } else if (
        attendanceToday.jam_masuk
    ) {

        checkOutBtn.disabled =
            !currentLocation;
    }
}


// =====================================================
// CHECK LOCATION
// =====================================================

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


    if (!locationStatus) return;


    if (!navigator.geolocation) {

        locationStatus.textContent =
            "Browser tidak mendukung GPS.";

        locationStatus.className =
            "status-box error";

        return;
    }


    if (!currentSite) {

        locationStatus.textContent =
            "Data site belum tersedia.";

        locationStatus.className =
            "status-box error";

        return;
    }


    locationStatus.textContent =
        "Sedang mengambil lokasi...";

    locationStatus.className =
        "status-box neutral";


    navigator.geolocation.getCurrentPosition(

        async position => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            currentLocation = {
                latitude,
                longitude
            };


            const distance =
                calculateDistance(
                    latitude,
                    longitude,
                    Number(
                        currentSite.latitude
                    ),
                    Number(
                        currentSite.longitude
                    )
                );


            const radius =
                Number(
                    currentSite.radius_meter || 0
                );


            if (distanceStatus) {

                distanceStatus.textContent =
                    `Jarak dari site: ${Math.round(
                        distance
                    )} meter`;
            }


            if (distance <= radius) {

                locationStatus.textContent =
                    "Lokasi valid. Anda berada di area site.";

                locationStatus.className =
                    "status-box success";


                if (instruction) {

                    instruction.textContent =
                        "✅ Lokasi valid. Anda dapat melakukan absensi.";

                    instruction.className =
                        "instruction-box success";
                }


                enableAttendanceButtons();

            } else {

                locationStatus.textContent =
                    "Anda berada di luar area site.";

                locationStatus.className =
                    "status-box error";


                if (instruction) {

                    instruction.textContent =
                        "⚠️ Anda harus berada di dalam radius site untuk melakukan absensi.";

                    instruction.className =
                        "instruction-box error";
                }


                const checkInBtn =
                    document.getElementById(
                        "checkInBtn"
                    );

                const checkOutBtn =
                    document.getElementById(
                        "checkOutBtn"
                    );


                if (checkInBtn) {
                    checkInBtn.disabled = true;
                }

                if (checkOutBtn) {
                    checkOutBtn.disabled = true;
                }
            }
        },


        error => {

            console.error(
                "GPS error:",
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
        },


        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}


// =====================================================
// ENABLE ATTENDANCE BUTTONS
// =====================================================

function enableAttendanceButtons() {

    const checkInBtn =
        document.getElementById("checkInBtn");

    const checkOutBtn =
        document.getElementById("checkOutBtn");


    if (!checkInBtn || !checkOutBtn) {
        return;
    }


    if (!attendanceToday) {

        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;

        return;
    }


    if (!attendanceToday.jam_masuk) {
        checkInBtn.disabled = false;
    }


    if (
        attendanceToday.jam_masuk &&
        !attendanceToday.jam_pulang
    ) {

        checkOutBtn.disabled = false;
    }
}


// =====================================================
// FOTO ABSEN MASUK
// =====================================================

function handleCheckInPhoto(event) {

    const file =
        event.target.files[0];

    if (!file) return;


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

                preview.innerHTML =
                    `<img src="${base64}" alt="Foto masuk">`;
            }
        }
    );
}


// =====================================================
// FOTO ABSEN PULANG
// =====================================================

function handleCheckOutPhoto(event) {

    const file =
        event.target.files[0];

    if (!file) return;


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

                preview.innerHTML =
                    `<img src="${base64}" alt="Foto pulang">`;
            }
        }
    );
}


// =====================================================
// CONVERT IMAGE
// =====================================================

function convertImageToBase64(
    file,
    callback
) {

    const reader =
        new FileReader();


    reader.onload =
        function(event) {

            callback(
                event.target.result
            );
        };


    reader.onerror =
        function() {

            showToast(
                "Gagal membaca foto.",
                "error"
            );
        };


    reader.readAsDataURL(file);
}


// =====================================================
// ABSEN MASUK
// =====================================================

async function checkIn() {

    if (!currentLocation) {

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
            "Anda sudah melakukan absen masuk.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById(
            "checkInBtn"
        );


    if (!button) return;


    button.disabled = true;
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
            "ABS" + Date.now();


        const data = {

            id_absensi:
                idAbsensi,

            id_karyawan:
                currentUser.id_karyawan,

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
                "Error absen masuk:",
                error
            );

            throw error;
        }


        attendanceToday =
            insertedData;


        showToast(
            "Absen masuk berhasil disimpan.",
            "success"
        );


        setText(
            "checkInTime",
            formatTime(
                insertedData.jam_masuk
            )
        );


        checkInPhotoBase64 =
            null;


        updateAttendanceStatus();

        await loadAttendanceHistory();


    } catch (error) {

        console.error(error);


        showToast(
            "Gagal menyimpan absen masuk: " +
            error.message,
            "error"
        );


        button.disabled = false;
    }


    button.textContent =
        "🟢 Absen Masuk";
}


// =====================================================
// ABSEN PULANG
// =====================================================

async function checkOut() {

    if (!currentLocation) {

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
            "Anda belum melakukan absen masuk.",
            "error"
        );

        return;
    }


    if (attendanceToday.jam_pulang) {

        showToast(
            "Anda sudah melakukan absen pulang.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById(
            "checkOutBtn"
        );


    if (!button) return;


    button.disabled = true;

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
                "Error absen pulang:",
                error
            );

            throw error;
        }


        attendanceToday =
            data;


        showToast(
            "Absen pulang berhasil disimpan.",
            "success"
        );


        setText(
            "checkOutTime",
            formatTime(
                data.jam_pulang
            )
        );


        checkOutPhotoBase64 =
            null;


        updateAttendanceStatus();

        await loadAttendanceHistory();


    } catch (error) {

        console.error(error);


        showToast(
            "Gagal menyimpan absen pulang: " +
            error.message,
            "error"
        );


        button.disabled = false;
    }


    button.textContent =
        "🔴 Absen Pulang";
}


// =====================================================
// ATTENDANCE STATUS
// =====================================================

function calculateAttendanceStatus(date) {

    if (
        !currentSite ||
        !currentSite.batas_terlambat
    ) {

        return "HADIR";
    }


    const batas =
        currentSite.batas_terlambat;


    const parts =
        batas.split(":");


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


// =====================================================
// ATTENDANCE HISTORY
// =====================================================

async function loadAttendanceHistory() {

    const tbody =
        document.getElementById(
            "attendanceTableBody"
        );

    const filterElement =
        document.getElementById(
            "historyFilter"
        );


    if (!tbody || !currentUser) {
        return;
    }


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
                    currentUser.id_karyawan
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
                "Error history:",
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


        tbody.innerHTML = "";


        data.forEach(item => {

            const row =
                document.createElement(
                    "tr"
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
                    <span class="status-pill ${getStatusClass(
                        item.status
                    )}">
                        ${
                            item.status || "-"
                        }
                    </span>
                </td>

                <td>
                    ${
                        item.keterangan || "-"
                    }
                </td>

            `;


            tbody.appendChild(row);
        });


    } catch (error) {

        console.error(error);


        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    Gagal memuat riwayat.
                </td>
            </tr>
        `;
    }
}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {

    switch (status) {

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


// =====================================================
// DISTANCE
// =====================================================

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


function toRadians(degrees) {

    return degrees *
        Math.PI /
        180;
}


// =====================================================
// DATE
// =====================================================

function getTodayDate() {

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

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(
            dateString +
            "T00:00:00"
        );


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
// FORMAT TIME
// =====================================================

function formatTime(timeString) {

    if (!timeString) {
        return "-";
    }


    return String(
        timeString
    ).substring(0, 8);
}


// =====================================================
// UPDATE DATE
// =====================================================

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


// =====================================================
// CLOCK
// =====================================================

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


// =====================================================
// TOAST
// =====================================================

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


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3000);
}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    sessionStorage.clear();

    window.location.href =
        "../index.html";
}


// =====================================================
// HELPER TEXT
// =====================================================

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