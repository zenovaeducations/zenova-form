import { db } from "../firebase-config.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// ===============================
// SETTINGS
// ===============================

const VIEW_PASSWORD = "123456";


// ===============================
// VARIABLES
// ===============================

let allSubmissions = [];
let isLoggedIn = false;


// ===============================
// ELEMENTS
// ===============================

const loginScreen = document.getElementById("loginScreen");
const mainPage = document.getElementById("mainPage");

const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

const excelBtn = document.getElementById("excelBtn");
const pdfBtn = document.getElementById("pdfBtn");

const submissionsTable = document.getElementById("submissionsTable");
const emptyMessage = document.getElementById("emptyMessage");
const totalCount = document.getElementById("totalCount");


// ===============================
// LOGIN
// ===============================

loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        login();
    }
});

function login() {

    const password = passwordInput.value.trim();

    if (password === VIEW_PASSWORD) {

        isLoggedIn = true;

        loginError.textContent = "";

        loginScreen.style.display = "none";
        mainPage.style.display = "block";

        loadSubmissions();

    } else {

        loginError.textContent = "Incorrect password.";

        passwordInput.value = "";
        passwordInput.focus();
    }
}


// ===============================
// LOAD SUBMISSIONS
// ===============================

async function loadSubmissions() {

    submissionsTable.innerHTML = `
        <tr>
            <td colspan="8" class="loading">
                Loading submissions...
            </td>
        </tr>
    `;

    emptyMessage.style.display = "none";

    try {

        const submissionsRef = collection(db, "submissions");

        let snapshot;

        try {

            const q = query(
                submissionsRef,
                orderBy("submittedAt", "desc")
            );

            snapshot = await getDocs(q);

        } catch (error) {

            console.warn(
                "Ordered query failed. Loading without order.",
                error
            );

            snapshot = await getDocs(submissionsRef);
        }

        allSubmissions = [];

        snapshot.forEach((documentSnapshot) => {

            const data = documentSnapshot.data();

            allSubmissions.push({
                id: documentSnapshot.id,

                name: data.name || "",

                phone: data.phone || "",

                // ORIGINAL VILLAGE ENTERED BY STUDENT
                village: data.village || "",

                targetPercentage:
                    data.targetPercentage ?? "",

                // SEPARATE EDITABLE VILLAGE STOP
                villageStop:
                    data.villageStop || "",

                comingTomorrow:
                    data.comingTomorrow === true,

                submittedAt:
                    data.submittedAt || null
            });
        });

        updateTotalCount();

        renderTable(allSubmissions);

    } catch (error) {

        console.error("Error loading submissions:", error);

        submissionsTable.innerHTML = `
            <tr>
                <td colspan="8" class="loading">
                    Could not load submissions.
                </td>
            </tr>
        `;

        alert(
            "Could not load submissions.\n\n" +
            error.message
        );
    }
}


// ===============================
// TOTAL COUNT
// ===============================

function updateTotalCount() {

    totalCount.textContent = allSubmissions.length;
}


// ===============================
// RENDER TABLE
// ===============================

function renderTable(list) {

    submissionsTable.innerHTML = "";

    if (!list || list.length === 0) {

        emptyMessage.style.display = "block";

        return;
    }

    emptyMessage.style.display = "none";

    list.forEach((student, index) => {

        const row = document.createElement("tr");

        const coming =
            student.comingTomorrow === true;

        row.innerHTML = `

            <!-- NUMBER -->

            <td class="serial-number">
                ${index + 1}
            </td>


            <!-- NAME -->

            <td class="student-name">
                ${escapeHTML(student.name)}
            </td>


            <!-- PHONE -->

            <td>

                <div class="phone-cell">

                    <span>
                        ${escapeHTML(student.phone)}
                    </span>

                    <a
                        class="call-btn"
                        href="tel:${escapeAttribute(student.phone)}"
                        title="Call"
                    >
                        ☎
                    </a>

                </div>

            </td>


            <!-- ORIGINAL VILLAGE NAME -->

            <td class="village-name">

                ${escapeHTML(student.village)}

            </td>


            <!-- SSLC TARGET -->

            <td>

                ${
                    student.targetPercentage !== ""
                        ? escapeHTML(
                            String(student.targetPercentage)
                          ) + "%"
                        : ""
                }

            </td>


            <!-- COMING TOMORROW -->

            <td>

                <div class="coming-cell">

                    <label class="toggle">

                        <input
                            type="checkbox"
                            class="coming-checkbox"
                            data-id="${student.id}"
                            ${coming ? "checked" : ""}
                        >

                        <span class="slider"></span>

                    </label>


                    <span
                        class="yes-no ${coming ? "yes" : "no"}"
                        id="status-${student.id}"
                    >
                        ${coming ? "YES" : "NO"}
                    </span>

                </div>

            </td>


            <!-- VILLAGE STOP -->

            <td>

                <input
                    type="text"
                    class="village-stop-input"
                    data-id="${student.id}"
                    value="${escapeAttribute(student.villageStop)}"
                    placeholder="Enter stop"
                >

            </td>


            <!-- DELETE -->

            <td>

                <button
                    class="delete-btn"
                    data-id="${student.id}"
                    title="Delete"
                >
                    🗑
                </button>

            </td>

        `;

        submissionsTable.appendChild(row);
    });


    // ===========================
    // COMING TOMORROW EVENTS
    // ===========================

    document
        .querySelectorAll(".coming-checkbox")
        .forEach((checkbox) => {

            checkbox.addEventListener(
                "change",
                async function () {

                    const id = this.dataset.id;

                    const value = this.checked;

                    await updateComingTomorrow(
                        id,
                        value
                    );
                }
            );
        });


    // ===========================
    // VILLAGE STOP EVENTS
    // ===========================

    document
        .querySelectorAll(".village-stop-input")
        .forEach((input) => {

            input.addEventListener(
                "change",
                async function () {

                    const id = this.dataset.id;

                    const value =
                        this.value.trim();

                    await updateVillageStop(
                        id,
                        value
                    );
                }
            );


            // Also save when pressing Enter

            input.addEventListener(
                "keydown",
                async function (event) {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        this.blur();
                    }
                }
            );
        });


    // ===========================
    // DELETE EVENTS
    // ===========================

    document
        .querySelectorAll(".delete-btn")
        .forEach((button) => {

            button.addEventListener(
                "click",
                async function () {

                    const id =
                        this.dataset.id;

                    await deleteSubmission(id);
                }
            );
        });
}


// ===============================
// UPDATE COMING TOMORROW
// ===============================

async function updateComingTomorrow(
    id,
    value
) {

    try {

        await updateDoc(
            doc(db, "submissions", id),
            {
                comingTomorrow: value
            }
        );


        // Update local data

        const student =
            allSubmissions.find(
                (item) => item.id === id
            );

        if (student) {

            student.comingTomorrow = value;
        }


        // Update displayed YES / NO

        const status =
            document.getElementById(
                `status-${id}`
            );

        if (status) {

            status.textContent =
                value ? "YES" : "NO";

            status.className =
                `yes-no ${value ? "yes" : "no"}`;
        }

    } catch (error) {

        console.error(
            "Coming Tomorrow save error:",
            error
        );

        alert(
            "Could not save Coming Tomorrow.\n\n" +
            error.message
        );

        // Reload to restore original value

        renderTable(
            getFilteredSubmissions()
        );
    }
}


// ===============================
// UPDATE VILLAGE STOP
// ===============================

async function updateVillageStop(
    id,
    value
) {

    try {

        await updateDoc(
            doc(db, "submissions", id),
            {
                villageStop: value
            }
        );


        // Update local data

        const student =
            allSubmissions.find(
                (item) => item.id === id
            );

        if (student) {

            student.villageStop = value;
        }

        console.log(
            "Village Stop saved:",
            id,
            value
        );

    } catch (error) {

        console.error(
            "Village Stop save error:",
            error
        );

        alert(
            "Could not save Village Stop.\n\n" +
            error.message
        );
    }
}


// ===============================
// DELETE SUBMISSION
// ===============================

async function deleteSubmission(id) {

    const student =
        allSubmissions.find(
            (item) => item.id === id
        );

    const name =
        student?.name || "this student";


    const confirmed = confirm(
        `Are you sure you want to delete ${name}'s submission?\n\nThis cannot be undone.`
    );

    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(db, "submissions", id)
        );


        // Remove from local array

        allSubmissions =
            allSubmissions.filter(
                (item) => item.id !== id
            );


        updateTotalCount();

        renderTable(
            getFilteredSubmissions()
        );


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );

        alert(
            "Could not delete submission.\n\n" +
            error.message
        );
    }
}


// ===============================
// SEARCH
// ===============================

searchInput.addEventListener(
    "input",
    function () {

        const filtered =
            getFilteredSubmissions();

        renderTable(filtered);
    }
);


function getFilteredSubmissions() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    if (!search) {

        return allSubmissions;
    }


    return allSubmissions.filter(
        (student) => {

            const name =
                String(student.name || "")
                    .toLowerCase();

            const phone =
                String(student.phone || "")
                    .toLowerCase();

            const village =
                String(student.village || "")
                    .toLowerCase();

            const villageStop =
                String(student.villageStop || "")
                    .toLowerCase();

            const target =
                String(student.targetPercentage || "")
                    .toLowerCase();


            return (
                name.includes(search) ||
                phone.includes(search) ||
                village.includes(search) ||
                villageStop.includes(search) ||
                target.includes(search)
            );
        }
    );
}


// ===============================
// REFRESH
// ===============================

refreshBtn.addEventListener(
    "click",
    () => {

        loadSubmissions();
    }
);


// ===============================
// EXCEL DOWNLOAD
// ===============================

excelBtn.addEventListener(
    "click",
    downloadExcel
);


function downloadExcel() {

    if (!allSubmissions.length) {

        alert("There are no submissions to download.");

        return;
    }


    const rows =
        allSubmissions.map(
            (student, index) => ({

                "#":
                    index + 1,

                "Name":
                    student.name || "",

                "Phone Number":
                    student.phone || "",

                "Village Name":
                    student.village || "",

                "SSLC Target %":
                    student.targetPercentage !== ""
                        ? student.targetPercentage + "%"
                        : "",

                "Coming Tomorrow":
                    student.comingTomorrow === true
                        ? "YES"
                        : "NO",

                "Village Stop":
                    student.villageStop || "",

                "Submitted Time":
                    formatSubmittedTime(
                        student.submittedAt
                    )
            })
        );


    const worksheet =
        XLSX.utils.json_to_sheet(rows);


    // Heading

    XLSX.utils.sheet_add_aoa(
        worksheet,
        [
            ["ZENOVA EDUCATIONS"],
            ["SSLC 2026 - STUDENT SUBMISSIONS"],
            ["Coming Tomorrow / Village Stop List"],
            []
        ],
        {
            origin: "A1"
        }
    );


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Submissions"
    );


    XLSX.writeFile(
        workbook,
        "ZENOVA_SSLC_2026_SUBMISSIONS.xlsx"
    );
}


// ===============================
// PDF DOWNLOAD
// ===============================

pdfBtn.addEventListener(
    "click",
    downloadPDF
);


function downloadPDF() {

    if (!allSubmissions.length) {

        alert("There are no submissions to download.");

        return;
    }


    const {
        jsPDF
    } = window.jspdf;


    const pdf =
        new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });


    // ===========================
    // TITLE
    // ===========================

    pdf.setFontSize(18);

    pdf.text(
        "ZENOVA EDUCATIONS",
        148,
        15,
        {
            align: "center"
        }
    );


    pdf.setFontSize(13);

    pdf.text(
        "SSLC 2026 - STUDENT SUBMISSIONS",
        148,
        23,
        {
            align: "center"
        }
    );


    pdf.setFontSize(10);

    pdf.text(
        "Coming Tomorrow / Village Stop List",
        148,
        30,
        {
            align: "center"
        }
    );


    // ===========================
    // TABLE
    // ===========================

    const headers = [

        "#",

        "Name",

        "Phone",

        "Village Name",

        "SSLC Target %",

        "Coming Tomorrow",

        "Village Stop"

    ];


    const body =
        allSubmissions.map(
            (student, index) => [

                index + 1,

                student.name || "",

                student.phone || "",

                student.village || "",

                student.targetPercentage !== ""
                    ? student.targetPercentage + "%"
                    : "",

                student.comingTomorrow === true
                    ? "YES"
                    : "NO",

                student.villageStop || ""

            ]
        );


    pdf.autoTable({

        head: [headers],

        body: body,

        startY: 36,

        theme: "grid",

        styles: {

            fontSize: 8,

            cellPadding: 2,

            overflow: "linebreak",

            valign: "middle"

        },

        headStyles: {

            fontSize: 8,

            fontStyle: "bold"

        },

        columnStyles: {

            0: {
                cellWidth: 10
            },

            1: {
                cellWidth: 40
            },

            2: {
                cellWidth: 32
            },

            3: {
                cellWidth: 40
            },

            4: {
                cellWidth: 25
            },

            5: {
                cellWidth: 35
            },

            6: {
                cellWidth: 45
            }

        }
    });


    // ===========================
    // SAVE
    // ===========================

    pdf.save(
        "ZENOVA_SSLC_2026_SUBMISSIONS.pdf"
    );
}


// ===============================
// FORMAT DATE / TIME
// ===============================

function formatSubmittedTime(timestamp) {

    if (!timestamp) {
        return "";
    }


    try {

        let date;


        // Firestore Timestamp

        if (
            timestamp &&
            typeof timestamp.toDate === "function"
        ) {

            date =
                timestamp.toDate();

        }

        // JavaScript Date

        else if (
            timestamp instanceof Date
        ) {

            date = timestamp;

        }

        // String / number

        else {

            date =
                new Date(timestamp);
        }


        if (
            !date ||
            isNaN(date.getTime())
        ) {

            return "";
        }


        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch (error) {

        console.error(
            "Date formatting error:",
            error
        );

        return "";
    }
}


// ===============================
// HTML ESCAPE
// ===============================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ===============================
// ATTRIBUTE ESCAPE
// ===============================

function escapeAttribute(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
            }
