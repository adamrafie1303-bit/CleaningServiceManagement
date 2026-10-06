"use strict";

/* =========================================================
   CHECKLIST KARYAWAN
   PT. Ardend Adhikara Pandita
   ========================================================= */

const db = window.supabaseClient;

let currentUser = null;
let currentEmployee = null;
let currentSite = null;
let checklistData = [];
let isSaving = false;


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    updateDate();
    setupEvents();
    initPage();
});


async function initPage() {
    try {
        if (!db) {
            showToast("Koneksi sistem tidak tersedia.", "error");
            return;
        }

        const userLoaded = await loadLoginUser();

        if (!userLoaded) {
            return;
        }

        const employeeLoaded = await loadEmployee();

        if (!employeeLoaded) {
            return;
        }

        const siteLoaded = await loadSite();

        if (!siteLoaded) {
            return;
        }

        await loadChecklist();

    } catch (error) {
        console.error("Checklist Init Error:", error);
        showToast("Gagal memuat halaman checklist.", "error");
    }
}


/* =========================================================
   LOAD USER
   ========================================================= */

async function loadLoginUser() {
    try {
        const authResult = await db.auth.getUser();

        const authData = authResult.data;
        const authError = authResult.error;

        if (
            authError ||
            !authData ||
            !authData.user
        ) {
            window.location.href = "../index.html";
            return false;
        }

        currentUser = authData.user;

        const userResult = await db
            .from("users")
            .select("*")
            .eq("auth_user_id", currentUser.id)
            .maybeSingle();

        const userData = userResult.data;
        const userError = userResult.error;

        if (userError) {
            console.error("Users Error:", userError);
            showToast("Data akun tidak dapat dibaca.", "error");
            return false;
        }

        if (!userData) {
            showToast("Data akun tidak ditemukan.", "error");
            return false;
        }

        if (
            userData.status &&
            userData.status !== "AKTIF"
        ) {
            showToast("Akun kamu tidak aktif.", "error");

            await db.auth.signOut();

            setTimeout(function () {
                window.location.href = "../index.html";
            }, 1500);

            return false;
        }

        if (
            userData.role &&
            userData.role !== "KARYAWAN"
        ) {
            showToast("Akun ini bukan akun karyawan.", "error");
            return false;
        }

        if (!userData.id_karyawan) {
            showToast(
                "Akun belum terhubung dengan data karyawan.",
                "error"
            );

            return false;
        }

        currentUser.profile = userData;

        return true;

    } catch (error) {
        console.error("loadLoginUser Error:", error);
        showToast("Gagal memeriksa akun.", "error");
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
            showToast("ID karyawan tidak ditemukan.", "error");
            return false;
        }

        const result = await db
            .from("karyawan")
            .select("*")
            .eq("id_karyawan", employeeId)
            .maybeSingle();

        const data = result.data;
        const error = result.error;

        if (error) {
            console.error("Karyawan Error:", error);
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

        currentEmployee = data;

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

        updateAvatar(data.nama);

        return true;

    } catch (error) {
        console.error("loadEmployee Error:", error);
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

        const result = await db
            .from("site")
            .select("*")
            .eq("id_site", siteId)
            .maybeSingle();

        const data = result.data;
        const error = result.error;

        if (error) {
            console.error("Site Error:", error);

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

        currentSite = data;

        setText(
            "siteName",
            data.nama_site || "-"
        );

        setText(
            "siteAddress",
            data.alamat || "-"
        );

        const siteStatus =
            document.getElementById("siteStatus");

        if (siteStatus) {
            siteStatus.textContent =
                data.status || "AKTIF";
        }

        return true;

    } catch (error) {
        console.error("loadSite Error:", error);
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
        document.getElementById("siteStatus");

    if (siteStatus) {
        siteStatus.textContent =
            "TIDAK TERSEDIA";
    }
}


/* =========================================================
   LOAD CHECKLIST
   ========================================================= */

async function loadChecklist() {
    const list =
        document.getElementById("checklistList");

    if (!list) {
        return;
    }

    list.innerHTML =
        "<div class=\"loading-state\">" +
            "<div class=\"loading-spinner\"></div>" +
            "<p>Memuat checklist...</p>" +
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

        const today =
            getTodayDate();


        /* =================================================
           TEMPLATE
           ================================================= */

        const templateResult = await db
            .from("checklist_template")
            .select(
                "id_template,id_site,pekerjaan,urutan,wajib,status"
            )
            .eq("id_site", siteId)
            .eq("status", "AKTIF")
            .order("urutan", {
                ascending: true
            });

        const templates =
            templateResult.data;

        const templateError =
            templateResult.error;

        if (templateError) {
            console.error(
                "Template Error:",
                templateError
            );

            throw templateError;
        }


        /* =================================================
           CHECKLIST HARIAN
           ================================================= */

        const dailyResult = await db
            .from("checklist_harian")
            .select(
                "id_checklist,id_template,id_karyawan,id_site,tanggal,pekerjaan,status,keterangan,foto"
            )
            .eq("id_karyawan", employeeId)
            .eq("id_site", siteId)
            .eq("tanggal", today)
            .order("id_template", {
                ascending: true
            });

        const dailyData =
            dailyResult.data;

        const dailyError =
            dailyResult.error;

        if (dailyError) {
            console.error(
                "Daily Checklist Error:",
                dailyError
            );

            throw dailyError;
        }


        /* =================================================
           GABUNGKAN DATA
           ================================================= */

        checklistData = [];

        for (let i = 0; i < (templates || []).length; i++) {
            const template =
                templates[i];

            let daily = null;

            for (let j = 0; j < (dailyData || []).length; j++) {
                if (
                    Number(dailyData[j].id_template) ===
                    Number(template.id_template)
                ) {
                    daily = dailyData[j];
                    break;
                }
            }

            checklistData.push({
                id_template: template.id_template,
                id_site: template.id_site,
                pekerjaan: template.pekerjaan,
                urutan: template.urutan,
                wajib: template.wajib,
                status: template.status,
                daily: daily
            });
        }

        renderChecklist();

    } catch (error) {
        console.error(
            "loadChecklist Error:",
            error
        );

        list.innerHTML =
            "<div class=\"empty-state\">" +
                "<div class=\"empty-state-icon\">⚠️</div>" +
                "<strong>Checklist tidak dapat dimuat</strong>" +
                "<p>" +
                    escapeHtml(
                        error.message ||
                        "Terjadi kesalahan."
                    ) +
                "</p>" +
            "</div>";

        showToast(
            "Gagal memuat checklist.",
            "error"
        );
    }
}


/* =========================================================
   RENDER
   ========================================================= */

function renderChecklist() {
    const list =
        document.getElementById("checklistList");

    if (!list) {
        return;
    }

    if (
        !checklistData ||
        checklistData.length === 0
    ) {
        list.innerHTML =
            "<div class=\"empty-state\">" +
                "<div class=\"empty-state-icon\">📋</div>" +
                "<strong>Belum ada checklist</strong>" +
                "<p>Belum ada tugas aktif untuk site ini.</p>" +
            "</div>";

        updateProgress();
        updateTaskCount();
        updateSaveButton();

        return;
    }

    list.innerHTML = "";

    for (let i = 0; i < checklistData.length; i++) {
        const item =
            checklistData[i];

        const completed =
            item.daily &&
            String(item.daily.status).toUpperCase() === "SELESAI";

        const element =
            document.createElement("div");

        element.className =
            completed
                ? "checklist-item completed"
                : "checklist-item";

        element.dataset.templateId =
            item.id_template;

        element.dataset.checklistId =
            item.daily
                ? item.daily.id_checklist
                : "";

        let badge = "";

        if (isRequired(item)) {
            badge =
                "<span class=\"required-badge\">Wajib</span>";
        }

        const check =
            completed
                ? "✓"
                : "";

        const description =
            isRequired(item)
                ? "Tugas wajib diselesaikan"
                : "Tugas tambahan";

        element.innerHTML =
            "<div class=\"checklist-checkbox\">" +
                check +
            "</div>" +

            "<div class=\"checklist-content\">" +
                "<div class=\"checklist-title\">" +
                    escapeHtml(item.pekerjaan) +
                "</div>" +

                "<div class=\"checklist-description\">" +
                    description +
                "</div>" +
            "</div>" +

            badge;

        element.addEventListener(
            "click",
            function () {
                toggleChecklist(element);
            }
        );

        list.appendChild(element);
    }

    updateTaskCount();
    updateProgress();
    updateSaveButton();
}


/* =========================================================
   TOGGLE
   ========================================================= */

function toggleChecklist(element) {
    if (isSaving) {
        return;
    }

    const checkbox =
        element.querySelector(
            ".checklist-checkbox"
        );

    const completed =
        element.classList.contains(
            "completed"
        );

    if (completed) {
        element.classList.remove(
            "completed"
        );

        if (checkbox) {
            checkbox.textContent = "";
        }

    } else {
        element.classList.add(
            "completed"
        );

        if (checkbox) {
            checkbox.textContent = "✓";
        }
    }

    updateProgress();
    updateSaveButton();
}


/* =========================================================
   SAVE
   ========================================================= */

async function saveChecklist() {
    if (isSaving) {
        return;
    }

    const list =
        document.getElementById(
            "checklistList"
        );

    if (!list) {
        return;
    }

    const items =
        list.querySelectorAll(
            ".checklist-item"
        );

    if (items.length === 0) {
        showToast(
            "Tidak ada checklist.",
            "warning"
        );

        return;
    }


    /* =====================================================
       CEK TUGAS WAJIB
       ===================================================== */

    let incompleteRequired = 0;

    for (let i = 0; i < checklistData.length; i++) {
        const item =
            checklistData[i];

        if (!isRequired(item)) {
            continue;
        }

        const element =
            list.querySelector(
                "[data-template-id=\"" +
                item.id_template +
                "\"]"
            );

        if (
            !element ||
            !element.classList.contains("completed")
        ) {
            incompleteRequired++;
        }
    }

    if (incompleteRequired > 0) {
        showToast(
            "Masih ada " +
            incompleteRequired +
            " tugas wajib yang belum selesai.",
            "warning"
        );

        return;
    }


    isSaving = true;

    const button =
        document.getElementById(
            "saveChecklistBtn"
        );

    if (button) {
        button.disabled = true;
        button.textContent = "Menyimpan...";
    }


    try {
        for (let i = 0; i < checklistData.length; i++) {
            const item =
                checklistData[i];

            if (!item.daily) {
                console.warn(
                    "Tidak ada row harian:",
                    item
                );

                continue;
            }

            const element =
                list.querySelector(
                    "[data-template-id=\"" +
                    item.id_template +
                    "\"]"
                );

            const completed =
                element &&
                element.classList.contains(
                    "completed"
                );

            const newStatus =
                completed
                    ? "SELESAI"
                    : "BELUM_SELESAI";

            const updateResult =
                await db
                    .from("checklist_harian")
                    .update({
                        status: newStatus,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id_checklist",
                        item.daily.id_checklist
                    );

            if (updateResult.error) {
                console.error(
                    "Update Checklist Error:",
                    updateResult.error
                );

                throw updateResult.error;
            }
        }

        showToast(
            "Checklist berhasil disimpan.",
            "success"
        );

        await loadChecklist();

    } catch (error) {
        console.error(
            "saveChecklist Error:",
            error
        );

        showToast(
            "Gagal menyimpan checklist: " +
            (
                error.message ||
                "Terjadi kesalahan."
            ),
            "error"
        );

    } finally {
        isSaving = false;

        if (button) {
            button.textContent =
                "Simpan Checklist";

            updateSaveButton();
        }
    }
}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress() {
    const elements =
        document.querySelectorAll(
            ".checklist-item"
        );

    const total =
        elements.length;

    const completed =
        document.querySelectorAll(
            ".checklist-item.completed"
        ).length;

    let percentage = 0;

    if (total > 0) {
        percentage =
            Math.round(
                (completed / total) * 100
            );
    }

    setText(
        "completedCount",
        completed
    );

    setText(
        "totalCount",
        total
    );

    setText(
        "progressPercent",
        percentage + "%"
    );

    const fill =
        document.getElementById(
            "progressFill"
        );

    if (fill) {
        fill.style.width =
            percentage + "%";
    }

    const message =
        document.getElementById(
            "progressMessage"
        );

    if (!message) {
        return;
    }

    if (total === 0) {
        message.textContent =
            "Belum ada tugas checklist.";

    } else if (percentage === 100) {
        message.textContent =
            "Semua tugas sudah selesai. Mantap!";

    } else if (percentage > 0) {
        message.textContent =
            "Sebagian tugas sudah selesai. Lanjutkan sampai selesai.";

    } else {
        message.textContent =
            "Silakan kerjakan checklist sesuai tugas hari ini.";
    }
}


/* =========================================================
   TASK COUNT
   ========================================================= */

function updateTaskCount() {
    const count =
        document.querySelectorAll(
            ".checklist-item"
        ).length;

    setText(
        "taskCount",
        count + " tugas"
    );
}


/* =========================================================
   SAVE BUTTON
   ========================================================= */

function updateSaveButton() {
    const button =
        document.getElementById(
            "saveChecklistBtn"
        );

    if (!button) {
        return;
    }

    if (isSaving) {
        button.disabled = true;
        return;
    }

    const items =
        document.querySelectorAll(
            ".checklist-item"
        );

    button.disabled =
        items.length === 0;
}


/* =========================================================
   REQUIRED
   ========================================================= */

function isRequired(item) {
    return (
        item.wajib === true ||
        item.wajib === "true" ||
        item.wajib === "TRUE" ||
        item.wajib === 1 ||
        item.wajib === "1"
    );
}


/* =========================================================
   AVATAR
   ========================================================= */

function updateAvatar(name) {
    const avatar =
        document.getElementById(
            "employeeAvatar"
        );

    if (!avatar || !name) {
        return;
    }

    avatar.textContent =
        String(name)
            .trim()
            .charAt(0)
            .toUpperCase();
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {
    const button =
        document.getElementById(
            "saveChecklistBtn"
        );

    if (button) {
        button.addEventListener(
            "click",
            saveChecklist
        );
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
        "toast " + type;

    toast.classList.add(
        "show"
    );

    setTimeout(function () {
        toast.classList.remove(
            "show"
        );
    }, 3000);
}


/* =========================================================
   SET TEXT
   ========================================================= */

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


function updateDate() {
    const element =
        document.getElementById(
            "tanggalHariIni"
        );

    if (!element) {
        return;
    }

    element.textContent =
        new Date().toLocaleDateString(
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
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {
    let text =
        String(value == null ? "" : value);

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