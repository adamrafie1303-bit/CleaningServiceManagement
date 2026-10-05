/* =========================================
   DASHBOARD DATA
   PT. ARDEND ADHIKARA PANDITA
========================================= */

(function () {

    /* =========================================
       KONFIGURASI
    ========================================= */

    const supabase = window.supabaseClient;

    if (!supabase) {

        console.error(
            "Supabase client tidak ditemukan."
        );

        return;
    }


    /* =========================================
       ELEMENT DASHBOARD
    ========================================= */

    const totalKaryawanElement =
        document.getElementById("totalKaryawan");

    const totalKaryawanLabelElement =
        document.getElementById("totalKaryawanLabel");

    const totalSiteElement =
        document.getElementById("totalSite");

    const totalSiteLabelElement =
        document.getElementById("totalSiteLabel");

    const hadirHariIniElement =
        document.getElementById("hadirHariIni");

    const hadirHariIniLabelElement =
        document.getElementById("hadirHariIniLabel");

    const laporanHariIniElement =
        document.getElementById("laporanHariIni");

    const laporanHariIniLabelElement =
        document.getElementById("laporanHariIniLabel");

    const checklistHariIniElement =
        document.getElementById("checklistHariIni");

    const checklistHariIniLabelElement =
        document.getElementById("checklistHariIniLabel");

    const attendancePercentageElement =
        document.getElementById("attendancePercentage");

    const attendanceHadirElement =
        document.getElementById("attendanceHadir");

    const attendanceTerlambatElement =
        document.getElementById("attendanceTerlambat");

    const attendanceBelumElement =
        document.getElementById("attendanceBelum");

    const siteListElement =
        document.getElementById("siteList");

    const reportTableBodyElement =
        document.getElementById("reportTableBody");


    /* =========================================
       FORMAT TANGGAL INDONESIA
    ========================================= */

    function getTodayJakarta() {

        return new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "Asia/Jakarta",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).format(new Date());

    }


    /* =========================================
       FORMAT WAKTU
    ========================================= */

    function formatTime(value) {

        if (!value) {

            return "-";

        }


        const text =
            String(value);


        if (
            text.includes(":")
        ) {

            return text.substring(
                0,
                5
            );

        }


        return text;

    }


    /* =========================================
       HITUNG SELISIH / JAM
    ========================================= */

    function timeToMinutes(value) {

        if (!value) {

            return null;

        }


        const text =
            String(value)
                .substring(0, 5);


        const parts =
            text.split(":");


        if (parts.length < 2) {

            return null;

        }


        const hour =
            Number(parts[0]);

        const minute =
            Number(parts[1]);


        if (
            Number.isNaN(hour) ||
            Number.isNaN(minute)
        ) {

            return null;

        }


        return (
            hour * 60 +
            minute
        );

    }


    /* =========================================
       CEK TERLAMBAT
    ========================================= */

    function isLate(
        jamMasuk,
        batasTerlambat
    ) {

        const masuk =
            timeToMinutes(jamMasuk);

        const batas =
            timeToMinutes(batasTerlambat);


        if (
            masuk === null ||
            batas === null
        ) {

            return false;

        }


        return masuk > batas;

    }


    /* =========================================
       LOADING STATISTIK
    ========================================= */

    function setLoadingState() {

        if (totalKaryawanElement) {

            totalKaryawanElement.textContent =
                "...";

        }


        if (totalSiteElement) {

            totalSiteElement.textContent =
                "...";

        }


        if (hadirHariIniElement) {

            hadirHariIniElement.textContent =
                "...";

        }


        if (laporanHariIniElement) {

            laporanHariIniElement.textContent =
                "...";

        }


        if (checklistHariIniElement) {

            checklistHariIniElement.textContent =
                "...";

        }

    }


    /* =========================================
       LOAD TOTAL KARYAWAN
    ========================================= */

    async function loadTotalKaryawan() {

        const {
            count,
            error
        } = await supabase
            .from("karyawan")
            .select(
                "id_karyawan",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "AKTIF"
            );


        if (error) {

            throw new Error(
                "Gagal mengambil data karyawan: " +
                error.message
            );

        }


        const total =
            count || 0;


        if (totalKaryawanElement) {

            totalKaryawanElement.textContent =
                total;

        }


        if (totalKaryawanLabelElement) {

            totalKaryawanLabelElement.textContent =
                "Karyawan aktif";

        }


        return total;

    }


    /* =========================================
       LOAD TOTAL SITE
    ========================================= */

    async function loadTotalSite() {

        const {
            count,
            error
        } = await supabase
            .from("site")
            .select(
                "id_site",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "AKTIF"
            );


        if (error) {

            throw new Error(
                "Gagal mengambil data site: " +
                error.message
            );

        }


        const total =
            count || 0;


        if (totalSiteElement) {

            totalSiteElement.textContent =
                total;

        }


        if (totalSiteLabelElement) {

            totalSiteLabelElement.textContent =
                "Site aktif";

        }


        return total;

    }


    /* =========================================
       LOAD ABSENSI HARI INI
    ========================================= */

    async function loadAttendance(
        totalKaryawan
    ) {

        const today =
            getTodayJakarta();


        /* =========================================
           AMBIL DATA SITE
        ========================================= */

        const {
            data: sites,
            error: siteError
        } = await supabase
            .from("site")
            .select(
                "id_site, nama_site, batas_terlambat"
            );


        if (siteError) {

            throw new Error(
                "Gagal mengambil site untuk absensi: " +
                siteError.message
            );

        }


        const siteMap =
            new Map();


        (sites || []).forEach(
            function (site) {

                siteMap.set(
                    String(site.id_site),
                    site
                );

            }
        );


        /* =========================================
           AMBIL ABSENSI HARI INI
        ========================================= */

        const {
            data: attendanceData,
            error: attendanceError
        } = await supabase
            .from("absensi")
            .select(
                "id_absensi, id_karyawan, id_site, tanggal, jam_masuk"
            )
            .eq(
                "tanggal",
                today
            );


        if (attendanceError) {

            throw new Error(
                "Gagal mengambil data absensi: " +
                attendanceError.message
            );

        }


        const attendance =
            attendanceData || [];


        /* =========================================
           HITUNG KARYAWAN UNIK
        ========================================= */

        const employeeAttendance =
            new Map();


        attendance.forEach(
            function (item) {

                const employeeId =
                    String(
                        item.id_karyawan
                    );


                if (
                    !employeeAttendance.has(
                        employeeId
                    )
                ) {

                    employeeAttendance.set(
                        employeeId,
                        item
                    );

                }

            }
        );


        const hadir =
            employeeAttendance.size;


        /* =========================================
           HITUNG TERLAMBAT
        ========================================= */

        let terlambat = 0;


        employeeAttendance.forEach(
            function (item) {

                const site =
                    siteMap.get(
                        String(item.id_site)
                    );


                if (
                    site &&
                    isLate(
                        item.jam_masuk,
                        site.batas_terlambat
                    )
                ) {

                    terlambat++;

                }

            }
        );


        /* =========================================
           HITUNG BELUM ABSEN
        ========================================= */

        const belumAbsen =
            Math.max(
                totalKaryawan - hadir,
                0
            );


        /* =========================================
           PERSENTASE
        ========================================= */

        let percentage = 0;


        if (
            totalKaryawan > 0
        ) {

            percentage =
                Math.round(
                    (
                        hadir /
                        totalKaryawan
                    ) * 100
                );

        }


        /* =========================================
           UPDATE DASHBOARD
        ========================================= */

        if (hadirHariIniElement) {

            hadirHariIniElement.textContent =
                hadir;

        }


        if (hadirHariIniLabelElement) {

            hadirHariIniLabelElement.textContent =
                "Dari " +
                totalKaryawan +
                " karyawan";

        }


        if (attendancePercentageElement) {

            attendancePercentageElement.textContent =
                percentage +
                "%";

        }


        if (attendanceHadirElement) {

            attendanceHadirElement.textContent =
                hadir;

        }


        if (attendanceTerlambatElement) {

            attendanceTerlambatElement.textContent =
                terlambat;

        }


        if (attendanceBelumElement) {

            attendanceBelumElement.textContent =
                belumAbsen;

        }


        return {

            hadir,
            terlambat,
            belumAbsen,
            percentage

        };

    }


    /* =========================================
       LOAD LAPORAN HARI INI
    ========================================= */

    async function loadLaporanHariIni() {

        const today =
            getTodayJakarta();


        const {
            count,
            error
        } = await supabase
            .from("laporan")
            .select(
                "id_laporan",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "tanggal",
                today
            );


        if (error) {

            throw new Error(
                "Gagal mengambil jumlah laporan: " +
                error.message
            );

        }


        const total =
            count || 0;


        if (laporanHariIniElement) {

            laporanHariIniElement.textContent =
                total;

        }


        if (laporanHariIniLabelElement) {

            laporanHariIniLabelElement.textContent =
                "Laporan masuk hari ini";

        }


        return total;

    }


    /* =========================================
       LOAD CHECKLIST
       CATATAN:
       TABEL CHECKLIST BELUM ADA TANGGAL
    ========================================= */

    async function loadChecklist() {

        const {
            data,
            error
        } = await supabase
            .from("checklist")
            .select(
                "id_checklist, status"
            );


        if (error) {

            throw new Error(
                "Gagal mengambil data checklist: " +
                error.message
            );

        }


        const checklist =
            data || [];


        const selesai =
            checklist.filter(
                function (item) {

                    const status =
                        String(
                            item.status || ""
                        ).toUpperCase();


                    return (
                        status === "SELESAI" ||
                        status === "DONE" ||
                        status === "COMPLETED"
                    );

                }
            ).length;


        if (checklistHariIniElement) {

            checklistHariIniElement.textContent =
                selesai;

        }


        if (checklistHariIniLabelElement) {

            checklistHariIniLabelElement.textContent =
                "Checklist selesai";

        }


        return selesai;

    }


    /* =========================================
       LOAD STATUS SITE
    ========================================= */

    async function loadSiteStatus() {

        const {
            data: sites,
            error: siteError
        } = await supabase
            .from("site")
            .select(
                "id_site, nama_site, status"
            )
            .order(
                "nama_site",
                {
                    ascending: true
                }
            );


        if (siteError) {

            throw new Error(
                "Gagal mengambil daftar site: " +
                siteError.message
            );

        }


        const {
            data: employees,
            error: employeeError
        } = await supabase
            .from("karyawan")
            .select(
                "id_karyawan, id_site, status"
            )
            .eq(
                "status",
                "AKTIF"
            );


        if (employeeError) {

            throw new Error(
                "Gagal mengambil jumlah karyawan site: " +
                employeeError.message
            );

        }


        const employeeCountMap =
            new Map();


        (employees || []).forEach(
            function (employee) {

                const siteId =
                    String(
                        employee.id_site
                    );


                const current =
                    employeeCountMap.get(
                        siteId
                    ) || 0;


                employeeCountMap.set(
                    siteId,
                    current + 1
                );

            }
        );


        if (!siteListElement) {

            return;

        }


        if (
            !sites ||
            sites.length === 0
        ) {

            siteListElement.innerHTML = `
                <div class="site-item">
                    <div class="site-name">
                        <strong>Belum ada site</strong>
                        <span>Data site belum tersedia</span>
                    </div>
                    <span class="status-badge warning">
                        Kosong
                    </span>
                </div>
            `;

            return;

        }


        /* =========================================
           TAMPILKAN MAKSIMAL 4 SITE
        ========================================= */

        const visibleSites =
            sites.slice(
                0,
                4
            );


        siteListElement.innerHTML =
            visibleSites
                .map(
                    function (site) {

                        const employeeTotal =
                            employeeCountMap.get(
                                String(site.id_site)
                            ) || 0;


                        const active =
                            String(
                                site.status || ""
                            ).toUpperCase() ===
                            "AKTIF";


                        const statusClass =
                            active
                                ? "active"
                                : "warning";


                        const statusText =
                            active
                                ? "Aktif"
                                : "Nonaktif";


                        return `
                            <div class="site-item">

                                <div class="site-name">

                                    <strong>
                                        ${escapeHTML(
                                            site.nama_site ||
                                            "Tanpa Nama"
                                        )}
                                    </strong>

                                    <span>
                                        ${employeeTotal}
                                        karyawan
                                    </span>

                                </div>

                                <span class="status-badge ${statusClass}">
                                    ${statusText}
                                </span>

                            </div>
                        `;

                    }
                )
                .join("");

    }


    /* =========================================
       LOAD LAPORAN TERBARU
    ========================================= */

    async function loadLatestReports() {

        const {
            data: reports,
            error: reportError
        } = await supabase
            .from("laporan")
            .select(
                "id_laporan, id_karyawan, id_site, tanggal, area, pekerjaan, waktu, status"
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
            .limit(5);


        if (reportError) {

            throw new Error(
                "Gagal mengambil laporan terbaru: " +
                reportError.message
            );

        }


        if (!reportTableBodyElement) {

            return;

        }


        if (
            !reports ||
            reports.length === 0
        ) {

            reportTableBodyElement.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">
                        Belum ada laporan.
                    </td>
                </tr>
            `;

            return;

        }


        /* =========================================
           AMBIL ID KARYAWAN
        ========================================= */

        const employeeIds =
            [
                ...new Set(
                    reports
                        .map(
                            function (item) {

                                return item.id_karyawan;

                            }
                        )
                        .filter(Boolean)
                )
            ];


        /* =========================================
           AMBIL ID SITE
        ========================================= */

        const siteIds =
            [
                ...new Set(
                    reports
                        .map(
                            function (item) {

                                return item.id_site;

                            }
                        )
                        .filter(Boolean)
                )
            ];


        /* =========================================
           QUERY KARYAWAN
        ========================================= */

        let employees = [];


        if (
            employeeIds.length > 0
        ) {

            const {
                data,
                error
            } = await supabase
                .from("karyawan")
                .select(
                    "id_karyawan, nama"
                )
                .in(
                    "id_karyawan",
                    employeeIds
                );


            if (error) {

                throw new Error(
                    "Gagal mengambil nama karyawan laporan: " +
                    error.message
                );

            }


            employees =
                data || [];

        }


        /* =========================================
           QUERY SITE
        ========================================= */

        let sites = [];


        if (
            siteIds.length > 0
        ) {

            const {
                data,
                error
            } = await supabase
                .from("site")
                .select(
                    "id_site, nama_site"
                )
                .in(
                    "id_site",
                    siteIds
                );


            if (error) {

                throw new Error(
                    "Gagal mengambil nama site laporan: " +
                    error.message
                );

            }


            sites =
                data || [];

        }


        /* =========================================
           MAP DATA
        ========================================= */

        const employeeMap =
            new Map();


        employees.forEach(
            function (employee) {

                employeeMap.set(
                    String(
                        employee.id_karyawan
                    ),
                    employee.nama
                );

            }
        );


        const siteMap =
            new Map();


        sites.forEach(
            function (site) {

                siteMap.set(
                    String(
                        site.id_site
                    ),
                    site.nama_site
                );

            }
        );


        /* =========================================
           RENDER TABLE
        ========================================= */

        reportTableBodyElement.innerHTML =
            reports
                .map(
                    function (report) {

                        const employeeName =
                            employeeMap.get(
                                String(
                                    report.id_karyawan
                                )
                            ) ||
                            "Tidak diketahui";


                        const siteName =
                            siteMap.get(
                                String(
                                    report.id_site
                                )
                            ) ||
                            "Tidak diketahui";


                        const status =
                            String(
                                report.status || ""
                            ).toUpperCase();


                        let statusClass =
                            "warning";


                        let statusText =
                            report.status ||
                            "Proses";


                        if (
                            status === "SELESAI" ||
                            status === "DONE" ||
                            status === "COMPLETED"
                        ) {

                            statusClass =
                                "active";

                            statusText =
                                "Selesai";

                        }


                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            employeeName
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        siteName
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        report.pekerjaan ||
                                        report.area ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${formatTime(
                                        report.waktu
                                    )}
                                </td>

                                <td>

                                    <span class="status-badge ${statusClass}">
                                        ${escapeHTML(
                                            statusText
                                        )}
                                    </span>

                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");

    }


    /* =========================================
       ESCAPE HTML
       AGAR DATA DATABASE TIDAK LANGSUNG
       MENJADI HTML
    ========================================= */

    function escapeHTML(value) {

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


    /* =========================================
       LOAD SEMUA DATA DASHBOARD
    ========================================= */

    async function loadDashboard() {

        try {

            setLoadingState();


            /* =========================================
               PASTIKAN SESSION MASIH ADA
            ========================================= */

            const {
                data: sessionData
            } = await supabase.auth.getSession();


            if (
                !sessionData ||
                !sessionData.session
            ) {

                console.warn(
                    "Session belum tersedia."
                );

                return;

            }


            /* =========================================
               TOTAL KARYAWAN
            ========================================= */

            const totalKaryawan =
                await loadTotalKaryawan();


            /* =========================================
               TOTAL SITE
            ========================================= */

            await loadTotalSite();


            /* =========================================
               ABSENSI
            ========================================= */

            await loadAttendance(
                totalKaryawan
            );


            /* =========================================
               LAPORAN HARI INI
            ========================================= */

            await loadLaporanHariIni();


            /* =========================================
               CHECKLIST
            ========================================= */

            await loadChecklist();


            /* =========================================
               STATUS SITE
            ========================================= */

            await loadSiteStatus();


            /* =========================================
               LAPORAN TERBARU
            ========================================= */

            await loadLatestReports();


            console.log(
                "Dashboard berhasil memuat data Supabase."
            );

        } catch (error) {

            console.error(
                "Dashboard data error:",
                error
            );


            showDashboardError(
                error.message
            );

        }

    }


    /* =========================================
       TAMPILKAN ERROR
    ========================================= */

    function showDashboardError(
        message
    ) {

        console.error(
            "Dashboard error:",
            message
        );


        if (totalKaryawanElement) {

            totalKaryawanElement.textContent =
                "!";

        }


        if (totalSiteElement) {

            totalSiteElement.textContent =
                "!";

        }


        if (hadirHariIniElement) {

            hadirHariIniElement.textContent =
                "!";

        }


        if (laporanHariIniElement) {

            laporanHariIniElement.textContent =
                "!";

        }


        console.error(
            "Detail error:",
            message
        );

    }


    /* =========================================
       JALANKAN DASHBOARD
    ========================================= */

    loadDashboard();

})();

console.log("🔥 DASHBOARD.JS TERLOAD");