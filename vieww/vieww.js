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


/* =========================
   PASSWORD
========================= */

const VIEW_PASSWORD = "123456";


/* =========================
   ELEMENTS
========================= */

const loginScreen =
    document.getElementById("loginScreen");

const mainPage =
    document.getElementById("mainPage");

const passwordInput =
    document.getElementById("password");

const loginBtn =
    document.getElementById("loginBtn");

const loginError =
    document.getElementById("loginError");

const submissionsTable =
    document.getElementById("submissionsTable");

const totalCount =
    document.getElementById("totalCount");

const searchInput =
    document.getElementById("searchInput");

const refreshBtn =
    document.getElementById("refreshBtn");

const excelBtn =
    document.getElementById("excelBtn");

const pdfBtn =
    document.getElementById("pdfBtn");

const emptyMessage =
    document.getElementById("emptyMessage");


let allSubmissions = [];


/* =========================
   LOGIN
========================= */

loginBtn.addEventListener(
    "click",
    login
);


passwordInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            login();
        }

    }
);


function login() {

    if (
        passwordInput.value.trim()
        === VIEW_PASSWORD
    ) {

        loginScreen.style.display = "none";

        mainPage.style.display = "block";

        loadSubmissions();

    } else {

        loginError.textContent =
            "Incorrect password.";

        passwordInput.value = "";

        passwordInput.focus();

    }

}


/* =========================
   LOAD
========================= */

async function loadSubmissions() {

    submissionsTable.innerHTML = `
        <tr>
            <td colspan="7" class="loading">
                Loading submissions...
            </td>
        </tr>
    `;


    try {

        const q = query(
            collection(db, "submissions"),
            orderBy("submittedAt", "desc")
        );


        const snapshot =
            await getDocs(q);


        allSubmissions = [];


        snapshot.forEach(document => {

            allSubmissions.push({

                id: document.id,

                ...document.data()

            });

        });


        totalCount.textContent =
            allSubmissions.length;


        displaySubmissions(
            allSubmissions
        );


    } catch (error) {

        console.error(error);

        submissionsTable.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    Unable to load submissions.
                </td>
            </tr>
        `;

    }

}


/* =========================
   DISPLAY
========================= */

function displaySubmissions(data) {

    if (!data.length) {

        submissionsTable.innerHTML = "";

        emptyMessage.style.display =
            "block";

        return;

    }


    emptyMessage.style.display =
        "none";


    submissionsTable.innerHTML =
        data.map((student, index) => {

            let submittedTime =
                "Time unavailable";


            if (student.submittedAt) {

                try {

                    submittedTime =
                        student.submittedAt
                            .toDate()
                            .toLocaleString(
                                "en-IN",
                                {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            );

                } catch {}

            }


            const coming =
                student.comingTomorrow === true;


            return `

                <tr>

                    <td>
                        ${index + 1}
                    </td>


                    <td class="name-cell">
                        ${escapeHTML(
                            student.name || "-"
                        )}
                    </td>


                    <td>

                        <div class="phone-cell">

                            <a
                                class="call-btn"
                                href="tel:${escapeHTML(
                                    student.phone || ""
                                )}"
                                title="Call"
                            >
                                ☎
                            </a>

                            <span>
                                ${escapeHTML(
                                    student.phone || "-"
                                )}
                            </span>

                        </div>

                    </td>


                    <td class="target-cell">

                        ${escapeHTML(
                            student.targetPercentage || "-"
                        )}%

                    </td>


                    <td>

                        <div class="coming-toggle">

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
                                class="yes-no ${
                                    coming
                                        ? "yes"
                                        : "no"
                                }"
                                id="status-${student.id}"
                            >

                                ${coming ? "YES" : "NO"}

                            </span>

                        </div>

                    </td>


                    <td>

                        <input
                            type="text"
                            class="village-stop-input"
                            data-id="${student.id}"
                            value="${escapeAttribute(
                                student.villageStop || ""
                            )}"
                            placeholder="Enter stop"
                        >

                    </td>


                    <td>

                        <button
                            class="delete-btn"
                            data-id="${student.id}"
                        >
                            Delete
                        </button>

                    </td>

                </tr>

            `;

        }).join("");


    /* Coming tomorrow */

    document
        .querySelectorAll(".coming-checkbox")
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                () => updateComingTomorrow(
                    checkbox.dataset.id,
                    checkbox.checked
                )
            );

        });


    /* Village stop */

    document
        .querySelectorAll(".village-stop-input")
        .forEach(input => {

            input.addEventListener(
                "change",
                () => updateVillageStop(
                    input.dataset.id,
                    input.value.trim()
                )
            );

        });


    /* Delete */

    document
        .querySelectorAll(".delete-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => deleteSubmission(
                    button.dataset.id
                )
            );

        });

}


/* =========================
   COMING TOMORROW
========================= */

async function updateComingTomorrow(
    id,
    value
) {

    try {

        await updateDoc(
            doc(
                db,
                "submissions",
                id
            ),
            {
                comingTomorrow: value
            }
        );


        const student =
            allSubmissions.find(
                item => item.id === id
            );


        if (student) {

            student.comingTomorrow =
                value;

        }


        const status =
            document.getElementById(
                `status-${id}`
            );


        if (status) {

            status.textContent =
                value ? "YES" : "NO";


            status.className =
                `yes-no ${
                    value ? "yes" : "no"
                }`;

        }


    } catch (error) {

        console.error(error);

        alert(
            "Unable to save Coming Tomorrow status."
        );

    }

}


/* =========================
   VILLAGE STOP
========================= */

async function updateVillageStop(
    id,
    value
) {

    try {

        await updateDoc(
            doc(
                db,
                "submissions",
                id
            ),
            {
                villageStop: value
            }
        );


        const student =
            allSubmissions.find(
                item => item.id === id
            );


        if (student) {

            student.villageStop =
                value;

        }


    } catch (error) {

        console.error(error);

        alert(
            "Unable to save village stop."
        );

    }

}


/* =========================
   DELETE
========================= */

async function deleteSubmission(id) {

    const student =
        allSubmissions.find(
            item => item.id === id
        );


    if (!student) {
        return;
    }


    const confirmed =
        confirm(
            `Delete the submission of ${
                student.name || "this student"
            }?\n\nThis cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "submissions",
                id
            )
        );


        allSubmissions =
            allSubmissions.filter(
                item => item.id !== id
            );


        totalCount.textContent =
            allSubmissions.length;


        displaySubmissions(
            filterSubmissions(
                searchInput.value
                    .trim()
                    .toLowerCase()
            )
        );


    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete: " +
            error.message
        );

    }

}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
    "input",
    () => {

        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        displaySubmissions(
            filterSubmissions(search)
        );

    }
);


function filterSubmissions(search) {

    if (!search) {
        return allSubmissions;
    }


    return allSubmissions.filter(
        student => {

            return (

                (student.name || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (student.phone || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (student.village || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (student.villageStop || "")
                    .toLowerCase()
                    .includes(search)

            );

        }
    );

}


/* =========================
   REFRESH
========================= */

refreshBtn.addEventListener(
    "click",
    loadSubmissions
);


/* =========================
   EXCEL DOWNLOAD
========================= */

excelBtn.addEventListener(
    "click",
    downloadExcel
);


function downloadExcel() {

    if (!allSubmissions.length) {

        alert("There are no submissions to download.");

        return;
    }


    const rows = allSubmissions.map(
        (student, index) => ({

            "#":
                index + 1,

            "Name":
                student.name || "",

            "Phone Number":
                student.phone || "",

            "SSLC Target %":
                student.targetPercentage
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


    /* Add title rows */

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


    worksheet["!cols"] = [

        { wch: 6 },
        { wch: 25 },
        { wch: 17 },
        { wch: 17 },
        { wch: 20 },
        { wch: 25 },
        { wch: 25 }

    ];


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "SSLC 2026"
    );


    XLSX.writeFile(
        workbook,
        "Zenova_SSLC_2026_Submissions.xlsx"
    );

}


/* =========================
   PDF DOWNLOAD
========================= */

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


    /* Heading */

    pdf.setFontSize(20);

    pdf.setFont(undefined, "bold");

    pdf.text(
        "ZENOVA EDUCATIONS",
        148,
        15,
        {
            align: "center"
        }
    );


    pdf.setFontSize(14);

    pdf.text(
        "SSLC 2026 - STUDENT SUBMISSIONS",
        148,
        23,
        {
            align: "center"
        }
    );


    pdf.setFontSize(10);

    pdf.setFont(undefined, "normal");

    pdf.text(
        "Coming Tomorrow / Village Stop List",
        148,
        30,
        {
            align: "center"
        }
    );


    const tableRows =
        allSubmissions.map(
            (student, index) => [

                index + 1,

                student.name || "",

                student.phone || "",

                student.targetPercentage
                    ? student.targetPercentage + "%"
                    : "",

                student.comingTomorrow === true
                    ? "YES"
                    : "NO",

                student.villageStop || "",

                formatSubmittedTime(
                    student.submittedAt
                )

            ]
        );


    pdf.autoTable({

        startY: 36,

        head: [[

            "#",
            "Name",
            "Phone",
            "SSLC Target %",
            "Coming Tomorrow",
            "Village Stop",
            "Submitted Time"

        ]],

        body: tableRows,

        theme: "grid",

        styles: {
            fontSize: 8,
            cellPadding: 3,
            overflow: "linebreak"
        },

        headStyles: {
            fontStyle: "bold"
        },

        margin: {
            left: 8,
            right: 8
        }

    });


    pdf.save(
        "Zenova_SSLC_2026_Submissions.pdf"
    );

}


/* =========================
   TIME
========================= */

function formatSubmittedTime(
    timestamp
) {

    if (!timestamp) {
        return "";
    }


    try {

        return timestamp
            .toDate()
            .toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

    } catch {

        return "";

    }

}


/* =========================
   SECURITY
========================= */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/"/g, "&quot;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;");

      }
