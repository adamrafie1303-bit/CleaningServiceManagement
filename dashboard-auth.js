/* =========================================
   DASHBOARD AUTH
   PT. ARDEND ADHIKARA PANDITA
========================================= */

(async function () {

    /* =========================================
       PATH LOGIN
       dashboard-auth.js dipakai oleh halaman
       yang berada di dalam folder ADMIN
    ========================================= */

    const LOGIN_PAGE = "../index.html";


    /* =========================================
       CEK SUPABASE CLIENT
    ========================================= */

    if (!window.supabaseClient) {

        console.error(
            "Supabase client tidak ditemukan."
        );

        window.location.replace(LOGIN_PAGE);

        return;
    }


    /* =========================================
       CEK SESSION
    ========================================= */

    try {

        const {
            data: sessionData,
            error: sessionError
        } = await window.supabaseClient.auth.getSession();


        if (sessionError) {

            console.error(
                "Gagal mengecek session:",
                sessionError
            );

            window.location.replace(LOGIN_PAGE);

            return;
        }


        const session =
            sessionData?.session;


        /* =========================================
           BELUM LOGIN
        ========================================= */

        if (!session) {

            sessionStorage.clear();

            window.location.replace(LOGIN_PAGE);

            return;
        }


        /* =========================================
           AMBIL USER AUTH
        ========================================= */

        const {
            data: authData,
            error: authError
        } = await window.supabaseClient.auth.getUser();


        if (
            authError ||
            !authData ||
            !authData.user
        ) {

            console.error(
                "User Auth tidak ditemukan:",
                authError
            );

            await window.supabaseClient.auth.signOut({
                scope: "local"
            });

            sessionStorage.clear();

            window.location.replace(LOGIN_PAGE);

            return;
        }


        const authUserId =
            authData.user.id;


        /* =========================================
           AMBIL DATA USER
        ========================================= */

        const {
            data: userData,
            error: userError
        } = await window.supabaseClient
            .from("users")
            .select(
                "id_user, username, role, status, auth_user_id"
            )
            .eq(
                "auth_user_id",
                authUserId
            )
            .single();


        if (
            userError ||
            !userData
        ) {

            console.error(
                "Data user tidak ditemukan:",
                userError
            );

            await window.supabaseClient.auth.signOut({
                scope: "local"
            });

            sessionStorage.clear();

            window.location.replace(LOGIN_PAGE);

            return;
        }


        /* =========================================
           CEK STATUS
        ========================================= */

        if (
            String(userData.status).toUpperCase() !==
            "AKTIF"
        ) {

            alert(
                "Akun Anda tidak aktif."
            );

            await window.supabaseClient.auth.signOut({
                scope: "local"
            });

            sessionStorage.clear();

            window.location.replace(LOGIN_PAGE);

            return;
        }


        /* =========================================
           CEK ROLE ADMIN
        ========================================= */

        if (
            String(userData.role).toUpperCase() !==
            "ADMIN"
        ) {

            alert(
                "Anda tidak memiliki akses ke halaman Admin."
            );

            await window.supabaseClient.auth.signOut({
                scope: "local"
            });

            sessionStorage.clear();

            window.location.replace(LOGIN_PAGE);

            return;
        }


        /* =========================================
           SIMPAN SESSION APLIKASI
        ========================================= */

        sessionStorage.setItem(
            "id_user",
            userData.id_user
        );

        sessionStorage.setItem(
            "username",
            userData.username
        );

        sessionStorage.setItem(
            "role",
            userData.role
        );

        sessionStorage.setItem(
            "status",
            userData.status
        );


        /* =========================================
           TAMPILKAN USERNAME
        ========================================= */

        const usernameElements =
            document.querySelectorAll(
                "[data-user-username]"
            );


        usernameElements.forEach(
            function (element) {

                element.textContent =
                    userData.username;

            }
        );


        /* =========================================
           TAMPILKAN ROLE
        ========================================= */

        const roleElements =
            document.querySelectorAll(
                "[data-user-role]"
            );


        roleElements.forEach(
            function (element) {

                element.textContent =
                    userData.role;

            }
        );


        console.log(
            "Dashboard aman. Login sebagai:",
            userData.username
        );


        /* =========================================
           LOGOUT
        ========================================= */

        const logoutButtons =
            document.querySelectorAll(
                ".logout-btn"
            );


        logoutButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    async function (event) {

                        event.preventDefault();


                        const originalHTML =
                            button.innerHTML;


                        button.disabled =
                            true;


                        button.innerHTML =
                            "<span>↪</span><span>Keluar...</span>";


                        try {

                            const {
                                error
                            } =
                                await window.supabaseClient.auth.signOut({
                                    scope: "local"
                                });


                            if (error) {

                                throw error;

                            }


                            /* =================================
                               HAPUS SESSION APLIKASI
                            ================================= */

                            sessionStorage.clear();


                            /* =================================
                               KEMBALI KE LOGIN
                            ================================= */

                            window.location.replace(
                                LOGIN_PAGE
                            );


                        } catch (error) {

                            console.error(
                                "Logout error:",
                                error
                            );


                            button.disabled =
                                false;


                            button.innerHTML =
                                originalHTML;


                            alert(
                                "Logout gagal: " +
                                error.message
                            );

                        }

                    }
                );

            }
        );


    } catch (error) {

        console.error(
            "Dashboard authentication error:",
            error
        );

        sessionStorage.clear();

        window.location.replace(
            LOGIN_PAGE
        );

    }

})();