const db = window.supabaseClient;

let currentUser = null;
let currentUserData = null;
let currentEmployee = null;
let currentSite = null;

let todayChecklist = [];
let checklistTemplates = [];

const today = getLocalDate();

// ======================================================
// SAAT HALAMAN SIAP
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
try {
await initChecklist();
setupDateFilter();
setupButtons();
} catch (error) {
console.error("Checklist error:", error);

    showMessage(
        error?.message || "Terjadi kesalahan saat memuat checklist.",
        "error"
    );
}

});

// ======================================================
// INIT CHECKLIST
// ======================================================

async function initChecklist() {

if (!db) {
    throw new Error("Supabase belum terhubung.");
}

showMessage(
    "Memuat data checklist...",
    "info"
);

// --------------------------------------------------
// CEK LOGIN
// --------------------------------------------------

const {
    data: authData,
    error: authError
} = await db.auth.getUser();

if (authError) {
    throw authError;
}

const user = authData?.user;

if (!user) {
    window.location.href = "../index.html";
    return;
}

currentUser = user;


// --------------------------------------------------
// AMBIL DATA USERS
// --------------------------------------------------

const {
    data: userData,
    error: userError
} = await db
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

if (userError) {
    throw userError;
}

if (!userData) {
    throw new Error(
        "Data akun tidak ditemukan."
    );
}

currentUserData = userData;


// --------------------------------------------------
// CEK STATUS
// --------------------------------------------------

if (
    String(userData.status).toUpperCase() !== "AKTIF"
) {
    await db.auth.signOut();

    throw new Error(
        "Akun Anda tidak aktif."
    );
}


// --------------------------------------------------
// CEK ROLE
// --------------------------------------------------

if (
    String(userData.role).toUpperCase() !== "KARYAWAN"
) {
    throw new Error(
        "Halaman ini hanya untuk karyawan."
    );
}


// --------------------------------------------------
// CEK ID KARYAWAN
// --------------------------------------------------

if (!userData.id_karyawan) {
    throw new Error(
        "Akun belum terhubung dengan ID karyawan."
    );
}


// --------------------------------------------------
// AMBIL DATA KARYAWAN
// --------------------------------------------------

const {
    data: employeeData,
    error: employeeError
} = await db
    .from("karyawan")
    .select("*")
    .eq(
        "id_karyawan",
        userData.id_karyawan
    )
    .maybeSingle();

if (employeeError) {
    throw employeeError;
}

if (!employeeData) {
    throw new Error(
        "Data karyawan tidak ditemukan."
    );
}

currentEmployee = employeeData;


// --------------------------------------------------
// CEK SITE
// --------------------------------------------------

if (!employeeData.id_site) {
    throw new Error(
        "Karyawan belum memiliki site."
    );
}


// --------------------------------------------------
// AMBIL DATA SITE
// --------------------------------------------------

const {
    data: siteData,
    error: siteError
} = await db
    .from("site")
    .select("*")
    .eq(
        "id_site",
        employeeData.id_site
    )
    .maybeSingle();

if (siteError) {
    throw siteError;
}

if (!siteData) {
    throw new Error(
        "Data site tidak ditemukan."
    );
}

currentSite = siteData;


// --------------------------------------------------
// UPDATE INFORMASI HALAMAN
// --------------------------------------------------

updateEmployeeInfo();


setText(
    "todayDate",
    formatDate(today)
);


// --------------------------------------------------
// LOAD CHECKLIST HARI INI
// --------------------------------------------------

await loadTodayChecklist();


// --------------------------------------------------
// LOAD RIWAYAT
// --------------------------------------------------

await loadChecklistHistory();


hideMessage();

}

// ======================================================
// UPDATE INFORMASI KARYAWAN
// ======================================================

function updateEmployeeInfo() {

if (!currentEmployee) {
    return;
}

const employeeId =
    currentEmployee.id_karyawan || "-";

const employeeName =
    currentEmployee.nama || "-";

const siteName =
    currentSite?.nama_site ||
    currentEmployee.id_site ||
    "-";


document
    .querySelectorAll("[data-employee-id]")
    .forEach(element => {
        element.textContent = employeeId;
    });


document
    .querySelectorAll("[data-employee-name]")
    .forEach(element => {
        element.textContent = employeeName;
    });


const siteElement =
    document.getElementById("checklistSite");

if (siteElement) {
    siteElement.textContent =
        `Site: ${siteName}`;
}

}

// ======================================================
// LOAD CHECKLIST HARI INI
// ======================================================

async function loadTodayChecklist() {

if (!currentEmployee) {
    return;
}


const {
    data,
    error
} = await db
    .from("checklist_harian")
    .select("*")
    .eq(
        "id_karyawan",
        currentEmployee.id_karyawan
    )
    .eq(
        "tanggal",
        today
    )
    .order(
        "id_checklist",
        {
            ascending: true
        }
    );


if (error) {
    throw error;
}


todayChecklist = data || [];


// --------------------------------------------------
// JIKA BELUM ADA, BUAT DARI TEMPLATE
// --------------------------------------------------

if (todayChecklist.length === 0) {
    await generateTodayChecklist();
}


renderTodayChecklist();
updateSummary();

}

// ======================================================
// LOAD TEMPLATE CHECKLIST
// ======================================================

async function loadChecklistTemplates() {

const {
    data,
    error
} = await db
    .from("checklist_template")
    .select("*")
    .eq(
        "id_site",
        currentEmployee.id_site
    )
    .eq(
        "status",
        "AKTIF"
    )
    .order(
        "urutan",
        {
            ascending: true
        }
    );


if (error) {
    throw error;
}


checklistTemplates = data || [];

return checklistTemplates;

}

// ======================================================
// BUAT CHECKLIST HARI INI
// ======================================================

async function generateTodayChecklist() {

await loadChecklistTemplates();


if (checklistTemplates.length === 0) {

    showMessage(
        "Belum ada template checklist untuk site Anda.",
        "warning"
    );

    return;
}


const rows =
    checklistTemplates.map(template => ({
        id_template: template.id_template,
        id_karyawan: currentEmployee.id_karyawan,
        id_site: currentEmployee.id_site,
        tanggal: today,
        pekerjaan: template.pekerjaan,
        status: "BELUM_SELESAI",
        keterangan: null,
        foto: null
    }));


const {
    data,
    error
} = await db
    .from("checklist_harian")
    .insert(rows)
    .select("*");


if (error) {

    // Kalau data sudah dibuat sebelumnya,
    // ambil ulang saja.
    if (error.code === "23505") {

        const {
            data: existingData,
            error: existingError
        } = await db
            .from("checklist_harian")
            .select("*")
            .eq(
                "id_karyawan",
                currentEmployee.id_karyawan
            )
            .eq(
                "tanggal",
                today
            )
            .order(
                "id_checklist",
                {
                    ascending: true
                }
            );


        if (existingError) {
            throw existingError;
        }

        todayChecklist =
            existingData || [];

        return;
    }

    throw error;
}


todayChecklist =
    data || [];

}

// ======================================================
// TAMPILKAN CHECKLIST HARI INI
// ======================================================

function renderTodayChecklist() {

const container =
    document.getElementById(
        "checklistContainer"
    );


if (!container) {
    return;
}


if (todayChecklist.length === 0) {

    container.innerHTML = `
        <div class="empty-state">
            Belum ada checklist untuk hari ini.
        </div>
    `;

    return;
}


container.innerHTML = "";


todayChecklist.forEach((item, index) => {

    const completed =
        item.status === "SELESAI";


    const element =
        document.createElement("div");


    element.className =
        "checklist-item";


    element.innerHTML = `

        <div class="checklist-left">

            <input
                type="checkbox"
                class="checklist-checkbox"
                data-id="${item.id_checklist}"
                ${completed ? "checked" : ""}
            >

            <div class="checklist-info">

                <div class="checklist-number">
                    ${index + 1}
                </div>

                <div class="checklist-job">
                    ${escapeHtml(item.pekerjaan)}
                </div>

            </div>

        </div>

        <div class="checklist-status ${
            completed
                ? "status-selesai"
                : "status-belum"
        }">

            ${
                completed
                    ? "Selesai"
                    : "Belum selesai"
            }

        </div>
    `;


    container.appendChild(element);
});


document
    .querySelectorAll(".checklist-checkbox")
    .forEach(checkbox => {

        checkbox.addEventListener(
            "change",
            handleChecklistChange
        );
    });


updateSaveButton();

}

// ======================================================
// CHECKBOX BERUBAH
// ======================================================

function handleChecklistChange(event) {

const id =
    Number(
        event.target.dataset.id
    );


const item =
    todayChecklist.find(
        checklist =>
            Number(
                checklist.id_checklist
            ) === id
    );


if (!item) {
    return;
}


item.status =
    event.target.checked
        ? "SELESAI"
        : "BELUM_SELESAI";


updateChecklistVisual(
    event.target,
    item.status
);


updateSummary();
updateSaveButton();

}

// ======================================================
// UPDATE STATUS VISUAL
// ======================================================

function updateChecklistVisual(
checkbox,
status
) {

const itemElement =
    checkbox.closest(
        ".checklist-item"
    );


if (!itemElement) {
    return;
}


const statusElement =
    itemElement.querySelector(
        ".checklist-status"
    );


if (!statusElement) {
    return;
}


if (status === "SELESAI") {

    statusElement.textContent =
        "Selesai";

    statusElement.classList.remove(
        "status-belum"
    );

    statusElement.classList.add(
        "status-selesai"
    );

} else {

    statusElement.textContent =
        "Belum selesai";

    statusElement.classList.remove(
        "status-selesai"
    );

    statusElement.classList.add(
        "status-belum"
    );
}

}

// ======================================================
// SIMPAN CHECKLIST
// ======================================================

async function saveChecklist() {

if (
    !todayChecklist.length ||
    !currentEmployee
) {
    return;
}


const button =
    document.getElementById(
        "saveChecklistBtn"
    );


if (button) {

    button.disabled = true;
    button.textContent = "Menyimpan...";
}


try {

    for (
        const item of todayChecklist
    ) {

        const {
            error
        } = await db
            .from("checklist_harian")
            .update({
                status: item.status,
                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "id_checklist",
                item.id_checklist
            )
            .eq(
                "id_karyawan",
                currentEmployee.id_karyawan
            );


        if (error) {
            throw error;
        }
    }


    showMessage(
        "Checklist berhasil disimpan.",
        "success"
    );


    await loadTodayChecklist();
    await loadChecklistHistory();


} catch (error) {

    console.error(
        "Save checklist error:",
        error
    );


    showMessage(
        error?.message ||
        "Checklist gagal disimpan.",
        "error"
    );


} finally {

    if (button) {

        button.disabled = false;
        button.textContent =
            "Simpan Checklist";
    }
}

}

// ======================================================
// UPDATE RINGKASAN
// ======================================================

function updateSummary() {

const total =
    todayChecklist.length;


const completed =
    todayChecklist.filter(
        item =>
            item.status === "SELESAI"
    ).length;


const pending =
    total - completed;


const progress =
    total > 0
        ? Math.round(
            (completed / total) * 100
        )
        : 0;


setText(
    "totalChecklist",
    total
);


setText(
    "completedChecklist",
    completed
);


setText(
    "pendingChecklist",
    pending
);


setText(
    "checklistProgress",
    `${progress}%`
);

}

// ======================================================
// UPDATE TOMBOL SIMPAN
// ======================================================

function updateSaveButton() {

const button =
    document.getElementById(
        "saveChecklistBtn"
    );


if (!button) {
    return;
}


button.disabled =
    todayChecklist.length === 0;

}

// ======================================================
// LOAD RIWAYAT
// ======================================================

async function loadChecklistHistory() {

if (!currentEmployee) {
    return;
}


const filter =
    document.getElementById(
        "checklistDateFilter"
    );


const selectedDate =
    filter?.value || "";


let query =
    db
        .from("checklist_harian")
        .select("*")
        .eq(
            "id_karyawan",
            currentEmployee.id_karyawan
        )
        .order(
            "tanggal",
            {
                ascending: false
            }
        )
        .order(
            "id_checklist",
            {
                ascending: true
            }
        );


if (selectedDate) {

    query =
        query.eq(
            "tanggal",
            selectedDate
        );
}


const {
    data,
    error
} = await query;


if (error) {
    throw error;
}


renderHistory(
    data || []
);

}

// ======================================================
// TAMPILKAN RIWAYAT
// ======================================================

function renderHistory(data) {

const tbody =
    document.getElementById(
        "checklistTableBody"
    );


const count =
    document.getElementById(
        "checklistCount"
    );


if (!tbody) {
    return;
}


if (data.length === 0) {

    tbody.innerHTML = `
        <tr>
            <td colspan="4">
                Belum ada riwayat checklist.
            </td>
        </tr>
    `;


    if (count) {
        count.textContent =
            "0 catatan";
    }

    return;
}


tbody.innerHTML =
    data.map(item => {

        const completed =
            item.status === "SELESAI";


        return `
            <tr>

                <td>
                    ${formatDate(item.tanggal)}
                </td>

                <td>
                    ${escapeHtml(item.pekerjaan)}
                </td>

                <td>

                    <span class="${
                        completed
                            ? "status-selesai"
                            : "status-belum"
                    }">

                        ${
                            completed
                                ? "Selesai"
                                : "Belum selesai"
                        }

                    </span>

                </td>

                <td>
                    ${escapeHtml(
                        item.keterangan || "-"
                    )}
                </td>

            </tr>
        `;

    }).join("");


if (count) {

    count.textContent =
        `${data.length} catatan`;
}

}

// ======================================================
// FILTER TANGGAL
// ======================================================

function setupDateFilter() {

const filter =
    document.getElementById(
        "checklistDateFilter"
    );


if (!filter) {
    return;
}


filter.addEventListener(
    "change",
    async () => {

        try {

            await loadChecklistHistory();

        } catch (error) {

            console.error(
                "Filter history error:",
                error
            );


            showMessage(
                error?.message ||
                "Gagal memuat riwayat.",
                "error"
            );
        }
    }
);

}

// ======================================================
// BUTTON
// ======================================================

function setupButtons() {

const refreshButton =
    document.getElementById(
        "refreshChecklistBtn"
    );


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        async () => {

            try {

                showMessage(
                    "Memuat ulang...",
                    "info"
                );

                await loadTodayChecklist();
                await loadChecklistHistory();

                hideMessage();

            } catch (error) {

                console.error(
                    "Refresh error:",
                    error
                );


                showMessage(
                    error?.message ||
                    "Gagal memuat checklist.",
                    "error"
                );
            }
        }
    );
}


const saveButton =
    document.getElementById(
        "saveChecklistBtn"
    );


if (saveButton) {

    saveButton.addEventListener(
        "click",
        saveChecklist
    );
}


const clearButton =
    document.getElementById(
        "clearChecklistFilter"
    );


if (clearButton) {

    clearButton.addEventListener(
        "click",
        async () => {

            const filter =
                document.getElementById(
                    "checklistDateFilter"
                );


            if (filter) {
                filter.value = "";
            }


            try {

                await loadChecklistHistory();

            } catch (error) {

                console.error(
                    "Clear filter error:",
                    error
                );
            }
        }
    );
}


const logoutButton =
    document.querySelector(
        ".logout-btn"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );
}

}

// ======================================================
// LOGOUT
// ======================================================

async function logout() {

try {

    await db.auth.signOut();

    sessionStorage.clear();

    window.location.href =
        "../index.html";

} catch (error) {

    console.error(
        "Logout error:",
        error
    );


    showMessage(
        "Gagal logout.",
        "error"
    );
}

}

// ======================================================
// LOCAL DATE
// ======================================================

function getLocalDate() {

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

// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(dateString) {

if (!dateString) {
    return "-";
}


const date =
    new Date(
        `${dateString}T00:00:00`
    );


return date.toLocaleDateString(
    "id-ID",
    {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }
);

}

// ======================================================
// SET TEXT
// ======================================================

function setText(id, value) {

const element =
    document.getElementById(id);


if (element) {
    element.textContent = value;
}

}

// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {

if (
    value === null ||
    value === undefined
) {
    return "";
}


return String(value)
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

// ======================================================
// MESSAGE
// ======================================================

function showMessage(
message,
type = "info"
) {

const element =
    document.getElementById(
        "checklistMessage"
    );


if (!element) {
    return;
}


element.textContent =
    message;


element.className =
    `message-box ${type}`;


element.style.display =
    "block";

}

// ======================================================
// HIDE MESSAGE
// ======================================================

function hideMessage() {

const element =
    document.getElementById(
        "checklistMessage"
    );


if (element) {
    element.style.display =
        "none";
}

}