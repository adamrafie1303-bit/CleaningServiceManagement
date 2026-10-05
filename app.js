
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const forgotPassword = document.getElementById("forgotPassword");

// Tampilkan / sembunyikan password
togglePassword.addEventListener("click", function () {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "🙈";
        togglePassword.setAttribute(
            "aria-label",
            "Sembunyikan password"
        );
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "👁";
        togglePassword.setAttribute(
            "aria-label",
            "Tampilkan password"
        );
    }
});

// Proses login menggunakan username
loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = usernameInput.value.trim().toUpperCase();
    const password = passwordInput.value;

    if (!username || !password) {
        showLoginMessage("Username dan password wajib diisi.", false);
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Memproses...";
    showLoginMessage("", true);

    try {
        // Langkah 1: Cari email Auth berdasarkan username
        const {
            data: lookupData,
            error: lookupError
        } = await window.supabaseClient.functions.invoke(
            "rapid-function",
            {
                body: {
                    username: username
                }
            }
        );

        if (lookupError) {
            console.error("Username lookup error:", lookupError);
            throw new Error(
                "Gagal menghubungi layanan login. Coba lagi."
            );
        }

        if (!lookupData || !lookupData.success || !lookupData.email) {
            throw new Error(
                lookupData?.message ||
                "Username tidak ditemukan atau akun tidak aktif."
            );
        }

        // Langkah 2: Validasi password melalui Supabase Auth
        const {
            data: authData,
            error: authError
        } = await window.supabaseClient.auth.signInWithPassword({
            email: lookupData.email,
            password: password
        });

        if (authError) {
            throw new Error("Username atau password salah.");
        }

        if (!authData.user) {
            throw new Error("Akun login tidak ditemukan.");
        }

        // Langkah 3: Validasi data akun aplikasi
        const userData = lookupData.user;

        if (!userData) {
            await window.supabaseClient.auth.signOut();
            throw new Error("Data akun aplikasi tidak ditemukan.");
        }

        if (userData.status !== "AKTIF") {
            await window.supabaseClient.auth.signOut();
            throw new Error("Akun tidak aktif.");
        }

        const role = String(userData.role || "").toUpperCase();

        if (role !== "ADMIN" && role !== "KARYAWAN") {
            await window.supabaseClient.auth.signOut();
            throw new Error("Role akun tidak dikenali.");
        }

        if (role === "KARYAWAN" && !userData.id_karyawan) {
            await window.supabaseClient.auth.signOut();
            throw new Error(
                "Akun karyawan belum terhubung dengan data karyawan."
            );
        }

        // Langkah 4: Simpan data sesi aplikasi
        sessionStorage.setItem("id_user", userData.id_user || "");
        sessionStorage.setItem("username", userData.username || "");
        sessionStorage.setItem("role", role);
        sessionStorage.setItem("status", userData.status || "");
        sessionStorage.setItem("id_karyawan", userData.id_karyawan || "");

        showLoginMessage(
            "Login berhasil. Mengarahkan ke dashboard...",
            true
        );

        // Langkah 5: Arahkan sesuai role
        if (role === "ADMIN") {
            window.location.href = "ADMIN/dashboard.html";
        } else {
            window.location.href = "KARYAWAN/dashboard-karyawan.html";
        }

    } catch (error) {
        console.error("Login error:", error);

        showLoginMessage(
            error.message || "Login gagal. Silakan coba lagi.",
            false
        );

        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});

function showLoginMessage(message, success) {
    loginMessage.textContent = message;
    loginMessage.style.color = success ? "#19a96b" : "#f05252";
}

// Tombol lupa password sementara
forgotPassword.addEventListener("click", function () {
    showLoginMessage(
        "Fitur lupa kata sandi akan dibuat setelah sistem login utama selesai.",
        true
    );
});