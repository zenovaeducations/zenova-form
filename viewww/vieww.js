import { db } from "../firebase-config.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    updateDoc,
    addDoc,
    doc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* =========================================
   PASSWORD
========================================= */

const VIEW_PASSWORD = "123456";


/* =========================================
   ELEMENTS
========================================= */

const loginScreen =
    document.getElementById("loginScreen");

const mainPage =
    document.getElementById("mainPage");

const passwordInput =
    document.getElementById("passwordInput");

const loginButton =
    document.getElementById("loginButton");

const loginError =
    document.getElementById("loginError");

const submissionsTable =
    document.getElementById("submissionsTable");

const totalCount =
    document.getElementById("totalCount");

const searchInput =
    document.getElementById("searchInput");

const refreshButton =
    document.getElementById("refreshButton");

const excelButton =
    document.getElementById("excelButton");

const pdfButton =
    document.getElementById("pdfButton");


/* =========================================
   VILLAGE ELEMENTS
========================================= */

const addVillageButton =
    document.getElementById("addVillageButton");

const addVillageArea =
    document.getElementById("addVillageArea");

const villageNameInput =
    document.getElementById("villageNameInput");

const saveVillageButton =
    document.getElementById("saveVillageButton");

const cancelVillageButton =
    document.getElementById("cancelVillageButton");


const emptyMessage =
    document.getElementById("emptyMessage");


/* =========================================
   DATA
========================================= */

let allSubmissions = [];

let villages = [];


/* =========================================
   LOGIN
========================================= */

loginButton.addEventListener(
    "click",
    login
);


passwordInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            login();

        }

    }
);


function login() {

    if (
        passwordInput.value.trim() ===
        VIEW_PASSWORD
    ) {

        loginError.textContent = "";

        loginScreen.style.display = "none";

        mainPage.style.display = "block";

        loadVillages();

        loadSubmissions();

    } else {

        loginError.textContent =
            "Incorrect password.";

        passwordInput.value = "";

        passwordInput.focus();

    }

}


/* =========================================
   LOAD VILLAGES
========================================= */

async function loadVillages() {

    try {

        const villagesQuery =
            query(
                collection(db, "villages"),
                orderBy("name", "asc")
            );


        const snapshot =
            await getDocs(villagesQuery);


        villages = [];


        snapshot.forEach(
            (firebaseDocument) => {

                villages.push({

                    id:
                        firebaseDocument.id,

                    ...firebaseDocument.data()

                });

            }
        );


        displaySubmissions(
            filterSubmissions(
                searchInput.value
                    .trim()
                    .toLowerCase()
            )
        );


    } catch (error) {

        console.error(
            "Error loading villages:",
            error
        );

    }

}


/* =========================================
   ADD VILLAGE UI
========================================= */

addVillageButton.addEventListener(
    "click",
    function () {

        addVillageArea.style.display =
            "flex";

        villageNameInput.focus();

    }
);


cancelVillageButton.addEventListener(
    "click",
    function () {

        addVillageArea.style.display =
            "none";

        villageNameInput.value = "";

    }
);


saveVillageButton.addEventListener(
    "click",
    saveVillage
);


villageNameInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            saveVillage();

        }

    }
);


/* =========================================
   SAVE VILLAGE
========================================= */

async function saveVillage() {

    const name =
        villageNameInput.value.trim();


    if (!name) {

        alert(
            "Please enter a village name."
        );

        villageNameInput.focus();

        return;

    }


    const alreadyExists =
        villages.some(
            village =>
                String(village.name || "")
                    .trim()
                    .toLowerCase() ===
                name.toLowerCase()
        );


    if (alreadyExists) {

        alert(
            "This village already exists."
        );

        return;

    }


    try {

        const villageDocument =
            await addDoc(
                collection(
                    db,
                    "villages"
                ),
                {
                    name: name,

                    createdAt:
                        new Date()
                }
            );


        villages.push({

            id: villageDocument.id,

            name: name

        });


        villages.sort(
            (a, b) =>
                String(a.name)
                    .localeCompare(
                        String(b.name)
                    )
        );


        villageNameInput.value = "";

        addVillageArea.style.display =
            "none";


        displaySubmissions(
            filterSubmissions(
                searchInput.value
                    .trim()
                    .toLowerCase()
            )
        );


        alert(
            `"${name}" added successfully.`
        );


    } catch (error) {

        console.error(
            "Error saving village:",
            error
        );


        alert(
            "Unable to save village:\n" +
            error.message
        );

    }

}


/* =========================================
   LOAD SUBMISSIONS
========================================= */

async function loadSubmissions() {

    submissionsTable.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="loading"
            >
                Loading submissions...
            </td>
        </tr>
    `;


    emptyMessage.style.display =
        "none";


    try {

        const submissionsQuery =
            query(
                collection(
                    db,
                    "submissions"
                ),
                orderBy(
                    "submittedAt",
                    "desc"
                )
            );


        const snapshot =
            await getDocs(
                submissionsQuery
            );


        allSubmissions = [];


        snapshot.forEach(
            (firebaseDocument) => {

                allSubmissions.push({

                    id:
                        firebaseDocument.id,

                    ...firebaseDocument.data()

                });

            }
        );


        totalCount.textContent =
            allSubmissions.length;


        displaySubmissions(
            allSubmissions
        );


    } catch (error) {

        console.error(
            "Error loading submissions:",
            error
        );


        submissionsTable.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="loading"
                >
                    Unable to load submissions.
                    <br>
                    <small>
                        ${escapeHTML(
                            error.message
                        )}
                    </small>
                </td>
            </tr>
        `;

    }

}


/* =========================================
   DISPLAY
========================================= */

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
        data.map(
            (student, index) => {

                const coming =
                    student.comingTomorrow === true;


                /* EXISTING VILLAGE */

                const village =
                    student.village ||
                    student.villageName ||
                    "";


                /* EXISTING VILLAGE STOP */

                const villageStop =
                    student.villageStop || "";


                /* TARGET */

                const target =
                    student.targetPercentage ??
                    student.targetPercentageValue ??
                    "";


                /* NEW ASSIGNED VILLAGE */

                const assignedVillage =
                    student.assignedVillage ||
                    "";


                return `

                    <tr>

                        <!-- NUMBER -->

                        <td>
                            ${index + 1}
                        </td>


                        <!-- NAME -->

                        <td class="name-cell">

                            ${escapeHTML(
                                student.name || "-"
                            )}

                        </td>


                        <!-- PHONE -->

                        <td>

                            <div class="phone-cell">

                                <a
                                    href="tel:${escapeAttribute(
                                        student.phone || ""
                                    )}"
                                    class="call-button"
                                    title="Call student"
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


                        <!-- WHATSAPP -->

                        <td>

                            <a
                                href="${getWhatsAppLink(
                                    student.phone
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="whatsapp-button"
                                title="Send WhatsApp message"
                            >
                                <span>
                                    WhatsApp
                                </span>
                            </a>

                        </td>


                        <!-- TARGET -->

                        <td class="target-cell">

                            ${
                                target !== ""
                                    ? escapeHTML(target) + "%"
                                    : "-"
                            }

                        </td>


                        <!-- COMING TOMORROW -->

                        <td>

                            <div class="coming-wrapper">

                                <label class="toggle">

                                    <input
                                        type="checkbox"
                                        class="coming-checkbox"
                                        data-id="${student.id}"
                                        ${
                                            coming
                                                ? "checked"
                                                : ""
                                        }
                                    >

                                    <span class="slider"></span>

                                </label>


                                <span
                                    class="status ${
                                        coming
                                            ? "yes"
                                            : "no"
                                    }"
                                    id="status-${student.id}"
                                >

                                    ${
                                        coming
                                            ? "YES"
                                            : "NO"
                                    }

                                </span>

                            </div>

                        </td>


                        <!-- VILLAGE STOP -->

                        <td>

                            <input
                                type="text"
                                class="village-stop-input"
                                data-id="${student.id}"
                                value="${escapeAttribute(
                                    villageStop
                                )}"
                                placeholder="Enter stop"
                            >

                        </td>


                        <!-- EXISTING VILLAGE -->

                        <td class="village-cell">

                            ${escapeHTML(
                                village || "-"
                            )}

                        </td>


                        <!-- NEW ASSIGNED VILLAGE -->

                        <td>

                            <select
                                class="assigned-village-select"
                                data-id="${student.id}"
                            >

                                <option value="">
                                    Select village
                                </option>

                                ${villages.map(
                                    villageItem => {

                                        const selected =
                                            String(
                                                villageItem.name
                                            ) ===
                                            String(
                                                assignedVillage
                                            )
                                                ? "selected"
                                                : "";

                                        return `
                                            <option
                                                value="${escapeAttribute(
                                                    villageItem.name
                                                )}"
                                                ${selected}
                                            >
                                                ${escapeHTML(
                                                    villageItem.name
                                                )}
                                            </option>
                                        `;

                                    }
                                ).join("")}

                            </select>

                        </td>


                        <!-- DELETE -->

                        <td>

                            <button
                                class="delete-button"
                                data-id="${student.id}"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");


    attachRowEvents();

}


/* =========================================
   ROW EVENTS
========================================= */

function attachRowEvents() {


    /* Coming Tomorrow */

    document
        .querySelectorAll(
            ".coming-checkbox"
        )
        .forEach(
            (checkbox) => {

                checkbox.addEventListener(
                    "change",
                    function () {

                        updateComingTomorrow(
                            checkbox.dataset.id,
                            checkbox.checked
                        );

                    }
                );

            }
        );


    /* Village Stop */

    document
        .querySelectorAll(
            ".village-stop-input"
        )
        .forEach(
            (input) => {

                input.addEventListener(
                    "change",
                    function () {

                        updateVillageStop(
                            input.dataset.id,
                            input.value.trim()
                        );

                    }
                );

            }
        );


    /* Assigned Village */

    document
        .querySelectorAll(
            ".assigned-village-select"
        )
        .forEach(
            (select) => {

                select.addEventListener(
                    "change",
                    function () {

                        updateAssignedVillage(
                            select.dataset.id,
                            select.value
                        );

                    }
                );

            }
        );


    /* Delete */

    document
        .querySelectorAll(
            ".delete-button"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    function () {

                        deleteSubmission(
                            button.dataset.id
                        );

                    }
                );

            }
        );

}


/* =========================================
   UPDATE COMING TOMORROW
========================================= */

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
                value
                    ? "YES"
                    : "NO";


            status.className =
                `status ${
                    value
                        ? "yes"
                        : "no"
                }`;

        }


    } catch (error) {

        console.error(error);

        alert(
            "Unable to save Coming Tomorrow status."
        );

    }

}


/* =========================================
   UPDATE VILLAGE STOP
========================================= */

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
            "Unable to save Village Stop."
        );

    }

}


/* =========================================
   UPDATE ASSIGNED VILLAGE
========================================= */

async function updateAssignedVillage(
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
                assignedVillage: value
            }
        );


        const student =
            allSubmissions.find(
                item => item.id === id
            );


        if (student) {

            student.assignedVillage =
                value;

        }


    } catch (error) {

        console.error(
            "Error updating assigned village:",
            error
        );


        alert(
            "Unable to save Assigned Village."
        );

    }

}


/* =========================================
   DELETE
========================================= */

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


        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        displaySubmissions(
            filterSubmissions(search)
        );


    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete submission:\n" +
            error.message
        );

    }

}


/* =========================================
   SEARCH
========================================= */

searchInput.addEventListener(
    "input",
    function () {

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
        (student) => {

            const name =
                String(
                    student.name || ""
                ).toLowerCase();


            const phone =
                String(
                    student.phone || ""
                ).toLowerCase();


            const village =
                String(
                    student.village ||
                    student.villageName ||
                    ""
                ).toLowerCase();


            const villageStop =
                String(
                    student.villageStop || ""
                ).toLowerCase();


            const assignedVillage =
                String(
                    student.assignedVillage || ""
                ).toLowerCase();


            return (

                name.includes(search) ||

                phone.includes(search) ||

                village.includes(search) ||

                villageStop.includes(search) ||

                assignedVillage.includes(search)

            );

        }
    );

}


/* =========================================
   REFRESH
========================================= */

refreshButton.addEventListener(
    "click",
    async function () {

        await loadVillages();

        await loadSubmissions();

    }
);


/* =========================================
   EXCEL
========================================= */

excelButton.addEventListener(
    "click",
    exportExcel
);


function exportExcel() {

    if (!allSubmissions.length) {

        alert(
            "No submissions to export."
        );

        return;

    }


    const rows =
        allSubmissions.map(
            (student, index) => {

                return {

                    "#":
                        index + 1,

                    "Name":
                        student.name || "",

                    "Phone":
                        student.phone || "",

                    "SSLC Target %":
                        student.targetPercentage || "",

                    "Coming Tomorrow":
                        student.comingTomorrow
                            ? "YES"
                            : "NO",

                    "Village Stop":
                        student.villageStop || "",

                    "Village":
                        student.village ||
                        student.villageName ||
                        "",

                    "Assigned Village":
                        student.assignedVillage || ""

                };

            }
        );


    const worksheet =
        XLSX.utils.json_to_sheet(rows);


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Submissions"
    );


    XLSX.writeFile(
        workbook,
        "Zenova-Submissions.xlsx"
    );

}


/* =========================================
   PDF
========================================= */

pdfButton.addEventListener(
    "click",
    exportPDF
);


function exportPDF() {

    if (!allSubmissions.length) {

        alert(
            "No submissions to export."
        );

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


    pdf.setFontSize(18);


    pdf.text(
        "ZENOVA EDUCATIONS - SSLC 2026",
        14,
        15
    );


    pdf.setFontSize(10);


    pdf.text(
        `Total Students: ${allSubmissions.length}`,
        14,
        22
    );


    const rows =
        allSubmissions.map(
            (student, index) => [

                index + 1,

                student.name || "-",

                student.phone || "-",

                student.targetPercentage || "-",

                student.comingTomorrow
                    ? "YES"
                    : "NO",

                student.villageStop || "-",

                student.village ||
                    student.villageName ||
                    "-",

                student.assignedVillage || "-"

            ]
        );


    pdf.autoTable({

        startY: 28,

        head: [[

            "#",

            "Name",

            "Phone",

            "Target %",

            "Coming",

            "Village Stop",

            "Village",

            "Assigned Village"

        ]],

        body: rows,

        styles: {

            fontSize: 8

        },

        headStyles: {

            fontSize: 8

        },

        margin: {

            left: 10,

            right: 10

        }

    });


    pdf.save(
        "Zenova-Submissions.pdf"
    );

}


/* =========================================
   SECURITY / HTML HELPERS
========================================= */

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


function escapeAttribute(value) {

    return escapeHTML(value);

}


/* =========================================
   WHATSAPP
========================================= */

function getWhatsAppLink(phone) {

    const cleanPhone =
        String(phone || "")
            .replace(/\D/g, "");


    let whatsappNumber =
        cleanPhone;


    // If Indian number is stored as 10 digits,
    // automatically add +91.

    if (
        whatsappNumber.length === 10
    ) {

        whatsappNumber =
            "91" +
            whatsappNumber;

    }


    const message =
        "Hello, We are from Zenova Educations kindly fill this form https://zenovaeducations.github.io/zenova-form/submissions";


    return (
        "https://wa.me/" +
        whatsappNumber +
        "?text=" +
        encodeURIComponent(message)
    );

    }
