"use strict";

const db = window.supabaseClient;

let currentUser = null;
let currentEmployee = null;
let currentSite = null;


// =====================================
// SAAT HALAMAN DIBUKA
// =====================================

document.addEventListener("DOMContentLoaded", function () {
    startProfile();
});


// =====================================
// START PROFILE
// =====================================

async function startProfile() {
    bindSidebar();
    bindLogout();
    bindPasswordModal();

    if (!db) {
        showPageMessage("Supabase belum terhubung.", "error");
        return;
    }

    try {
        await loadLoginUser();

        if (!currentUser) return;

        await loadEmployee();

        if (!currentEmployee) return;

        await loadSite();

        renderProfile();

        hidePageMessage();

    } catch (error) {
        console.error("Gagal memuat profil:", error);

        showPageMessage(
            "Profil gagal dimuat. Periksa koneksi Supabase.",
            "error"
        );
    }
}


// =====================================
// CEK SESSION DAN USER LOGIN
// =====================================

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
        showPageMessage("Data akun tidak ditemukan.", "error");
        return;
    }

    currentUser = userResult.data;

    const status = String(currentUser.status || "").toUpperCase();
    const role = String(currentUser.role || "").toUpperCase();

    if (status !== "AKTIF") {
        await db.auth.signOut();
        window.location.href = "../index.html";
        return;
    }

    if (role !== "KARYAWAN") {
        showPageMessage("Akun ini bukan akun karyawan.", "error");
        return;
    }

    if (!currentUser.id_karyawan) {
        showPageMessage("Akun belum memiliki ID karyawan.", "error");
        return;
    }
}


// =====================================
// AMBIL DATA KARYAWAN
// =====================================

async function loadEmployee() {
    const result = await db
        .from("karyawan")
        .select("*")
        .eq("id_karyawan", currentUser.id_karyawan)
        .maybeSingle();

    if (result.error) {
        throw result.error;
    }

    if (!result.data) {
        showPageMessage("Data karyawan tidak ditemukan.", "error");
        return;
    }

    currentEmployee = result.data;
}


// =====================================
// AMBIL DATA SITE
// =====================================

async function loadSite() {
    if (!currentEmployee.id_site) {
        currentSite = null;
        return;
    }

    const result = await db
        .from("site")
        .select("*")
        .eq("id_site", currentEmployee.id_site)
        .maybeSingle();

    if (result.error) {
        throw result.error;
    }

    currentSite = result.data;
}


// =====================================
// TAMPILKAN DATA PROFIL
// =====================================

function renderProfile() {
    const nama = currentEmployee.nama || "Karyawan";
    const idKaryawan = currentEmployee.id_karyawan || "—";
    const jabatan = currentEmployee.jabatan || "Cleaning Service";
    const noHp = currentEmployee.no_hp || "Belum tersedia";

    const username = currentUser.username || "—";
    const statusAkun = currentUser.status || "—";
    const statusKaryawan = currentEmployee.status || "—";

    const initials = getInitials(nama);

    setText("profileName", nama);
    setText("profilePosition", jabatan);
    setText("profileEmployeeId", idKaryawan);

    setText("infoName", nama);
    setText("infoEmployeeId", idKaryawan);
    setText("infoPhone", noHp);
    setText("infoPosition", jabatan);

    setText("accountUsername", username);
    setText("accountStatus", statusAkun);

    setText("profileStatus", statusKaryawan);

    setText("headerEmployeeName", nama);
    setText("headerEmployeeId", idKaryawan);

    setText("headerAvatar", initials);
    setText("profileAvatar", initials);

    renderSite();
}


// =====================================
// TAMPILKAN SITE
// =====================================

function renderSite() {
    if (!currentSite) {
        setText("infoSite", "Belum ditentukan");
        setText("siteName", "Belum ditentukan");
        setText("siteAddress", "Site belum ditentukan.");
        return;
    }

    const namaSite =
        currentSite.nama_site ||
        currentSite.id_site ||
        "Site";

    const alamatSite =
        currentSite.alamat ||
        "Alamat belum tersedia.";

    setText("infoSite", namaSite);
    setText("siteName", namaSite);
    setText("siteAddress", alamatSite);
}


// =====================================
// INISIAL NAMA
// =====================================

function getInitials(nama) {
    if (!nama) return "CS";

    return String(nama)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function (word) {
            return word.charAt(0).toUpperCase();
        })
        .join("");
}


// =====================================
// SIDEBAR MOBILE
// =====================================

function bindSidebar() {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");

            if (overlay) {
                overlay.classList.toggle("active");
            }
        });
    }

    if (overlay && sidebar) {
        overlay.addEventListener("click", function () {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }
}


// =====================================
// LOGOUT
// =====================================

function bindLogout() {
    const buttons = document.querySelectorAll(".logout-btn");

    buttons.forEach(function (button) {
        button.addEventListener("click", logout);
    });
}

async function logout() {
    if (!db) {
        window.location.href = "../index.html";
        return;
    }

    const result = await db.auth.signOut();

    if (result.error) {
        console.error("Logout gagal:", result.error);
        alert("Logout gagal. Silakan coba lagi.");
        return;
    }

    sessionStorage.clear();

    window.location.href = "../index.html";
}


// =====================================
// MODAL UBAH PASSWORD
// =====================================

function bindPasswordModal() {
    const modal = document.getElementById("passwordModal");
    const openButton = document.getElementById("changePasswordBtn");
    const closeButton = document.getElementById("closePasswordModal");
    const cancelButton = document.getElementById("cancelPasswordBtn");
    const form = document.getElementById("changePasswordForm");

    if (openButton && modal) {
        openButton.addEventListener("click", function () {
            modal.hidden = false;
            clearPasswordForm();
        });
    }

    if (closeButton && modal) {
        closeButton.addEventListener("click", closePasswordModal);
    }

    if (cancelButton && modal) {
        cancelButton.addEventListener("click", closePasswordModal);
    }

    if (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closePasswordModal();
            }
        });
    }

    if (form) {
        form.addEventListener("submit", changePassword);
    }
}

function closePasswordModal() {
    const modal = document.getElementById("passwordModal");

    if (modal) {
        modal.hidden = true;
    }

    clearPasswordForm();
}

function clearPasswordForm() {
    const form = document.getElementById("changePasswordForm");

    if (form) {
        form.reset();
    }

    setPasswordMessage("");
}


// =====================================
// UBAH PASSWORD SUPABASE AUTH
// =====================================

async function changePassword(event) {
    event.preventDefault();

    if (!db) {
        setPasswordMessage("Supabase belum terhubung.", "error");
        return;
    }

    const oldPassword =
        document.getElementById("oldPassword")?.value || "";

    const newPassword =
        document.getElementById("newPassword")?.value || "";

    const confirmPassword =
        document.getElementById("confirmPassword")?.value || "";

    const messageElement =
        document.getElementById("passwordMessage");

    const submitButton =
        document.querySelector(
            "#changePasswordForm button[type='submit']"
        );

    if (!oldPassword || !newPassword || !confirmPassword) {
        setPasswordMessage("Semua kolom wajib diisi.", "error");
        return;
    }

    if (newPassword.length < 8) {
        setPasswordMessage(
            "Password baru minimal 8 karakter.",
            "error"
        );
        return;
    }

    if (newPassword !== confirmPassword) {
        setPasswordMessage(
            "Konfirmasi password tidak cocok.",
            "error"
        );
        return;
    }

    if (oldPassword === newPassword) {
        setPasswordMessage(
            "Password baru harus berbeda dari password lama.",
            "error"
        );
        return;
    }

    const authResult = await db.auth.getUser();

    if (authResult.error || !authResult.data.user) {
        setPasswordMessage(
            "Sesi login tidak ditemukan. Silakan login ulang.",
            "error"
        );
        return;
    }

    const authUser = authResult.data.user;

    if (!authUser.email) {
        setPasswordMessage(
            "Akun ini tidak memiliki email untuk verifikasi password lama. Hubungi admin untuk mengganti password.",
            "error"
        );
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
    }

    try {
        // Verifikasi password lama dengan login ulang.
        const verifyResult = await db.auth.signInWithPassword({
            email: authUser.email,
            password: oldPassword
        });

        if (verifyResult.error) {
            setPasswordMessage(
                "Password lama salah atau tidak dapat diverifikasi.",
                "error"
            );
            return;
        }

        // Perbarui password pada Supabase Auth.
        const updateResult = await db.auth.updateUser({
            password: newPassword
        });

        if (updateResult.error) {
            throw updateResult.error;
        }

        setPasswordMessage(
            "Password berhasil diperbarui.",
            "success"
        );

        const form = document.getElementById("changePasswordForm");

        if (form) {
            form.reset();
        }

        setTimeout(function () {
            closePasswordModal();
        }, 1200);

    } catch (error) {
        console.error("Gagal mengubah password:", error);

        setPasswordMessage(
            "Gagal mengubah password. Silakan coba lagi.",
            "error"
        );

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Simpan Password";
        }
    }
}


// =====================================
// PESAN MODAL PASSWORD
// =====================================

function setPasswordMessage(message, type) {
    const element = document.getElementById("passwordMessage");

    if (!element) return;

    element.textContent = message;
    element.className = "form-message";

    if (type) {
        element.classList.add(type);
    }
}


// =====================================
// PESAN HALAMAN
// =====================================

function showPageMessage(message, type) {
    let element = document.getElementById("profileMessageBox");

    if (!element) {
        element = document.createElement("div");
        element.id = "profileMessageBox";
        element.style.cssText =
            "margin:16px 0;padding:12px 16px;border-radius:10px;font-size:14px;";

        const pageContent = document.querySelector(".page-content");

        if (pageContent) {
            pageContent.prepend(element);
        } else {
            document.body.prepend(element);
        }
    }

    element.textContent = message;
    element.style.display = "block";

    if (type === "error") {
        element.style.background = "#FEE2E2";
        element.style.color = "#991B1B";
    } else {
        element.style.background = "#DCFCE7";
        element.style.color = "#166534";
    }
}

function hidePageMessage() {
    const element = document.getElementById("profileMessageBox");

    if (element) {
        element.style.display = "none";
    }
}


// =====================================
// HELPER SET TEXT
// =====================================

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent =
            value === null || value === undefined || value === ""
                ? "—"
                : value;
    }
}