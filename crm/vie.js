import { db } from "../firebase-config.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* =====================================================
   CONFIG
===================================================== */

const VIEW_PASSWORD = "123456";


/* =====================================================
   STATE
===================================================== */

let students = [];

let villages = [];

let selectedStudent = null;


/* =====================================================
   ELEMENTS
===================================================== */

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

const refreshButton =
    document.getElementById("refreshButton");

const studentsTable =
    document.getElementById("studentsTable");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const paymentFilter =
    document.getElementById("paymentFilter");

const villageFilter =
    document.getElementById("villageFilter");

const totalStudents =
    document.getElementById("totalStudents");

const totalAdmissions =
    document.getElementById("totalAdmissions");

const totalFollowups =
    document.getElementById("totalFollowups");

const totalCollected =
    document.getElementById("totalCollected");

const totalBalance =
    document.getElementById("totalBalance");

const totalComing =
    document.getElementById("totalComing");

const villageCards =
    document.getElementById("villageCards");

const followupList =
    document.getElementById("followupList");

const newVillageInput =
    document.getElementById("newVillageInput");

const addVillageButton =
    document.getElementById("addVillageButton");

const studentModal =
    document.getElementById("studentModal");

const closeModal =
    document.getElementById("closeModal");

const studentDetails =
    document.getElementById("studentDetails");


/* =====================================================
   LOGIN
===================================================== */

loginButton.addEventListener(
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
        passwordInput.value.trim() !==
        VIEW_PASSWORD
    ) {

        loginError.textContent =
            "Incorrect password.";

        passwordInput.value = "";

        passwordInput.focus();

        return;

    }


    loginError.textContent = "";

    loginScreen.style.display = "none";

    mainPage.style.display = "block";

    loadCRM();

}


/* =====================================================
   INITIAL LOAD
===================================================== */

async function loadCRM() {

    try {

        studentsTable.innerHTML = `
            <tr>
                <td colspan="11" class="loading">
                    Loading Zenova CRM...
                </td>
            </tr>
        `;


        await Promise.all([
            loadStudents(),
            loadVillages()
        ]);


        updateDashboard();

        populateVillageFilter();

        renderStudents();

        renderVillages();

        renderFollowups();


    } catch (error) {

        console.error(error);

        studentsTable.innerHTML = `
            <tr>
                <td colspan="11" class="loading">
                    Unable to load CRM.
                    <br><br>
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

    }

}


/* =====================================================
   LOAD STUDENTS
===================================================== */

async function loadStudents() {

    const ref =
        collection(db, "submissions");


    let snapshot;


    try {

        const q =
            query(
                ref,
                orderBy(
                    "submittedAt",
                    "desc"
                )
            );

        snapshot =
            await getDocs(q);

    } catch {

        /*
         * Fallback if old documents don't have
         * submittedAt correctly.
         */

        snapshot =
            await getDocs(ref);

    }


    students = [];


    snapshot.forEach(firebaseDocument => {

        const data =
            firebaseDocument.data();


        students.push({

            id:
                firebaseDocument.id,

            ...data

        });

    });

}


/* =====================================================
   LOAD VILLAGES
===================================================== */

async function loadVillages() {

    const ref =
        collection(db, "villages");


    let snapshot;


    try {

        const q =
            query(
                ref,
                orderBy("name", "asc")
            );

        snapshot =
            await getDocs(q);

    } catch {

        snapshot =
            await getDocs(ref);

    }


    villages = [];


    snapshot.forEach(firebaseDocument => {

        villages.push({

            id:
                firebaseDocument.id,

            ...firebaseDocument.data()

        });

    });

}


/* =====================================================
   DASHBOARD
===================================================== */

function updateDashboard() {

    totalStudents.textContent =
        students.length;


    const admissions =
        students.filter(
            student =>
                getAdmissionStatus(student) ===
                "Admission Done"
        );


    totalAdmissions.textContent =
        admissions.length;


    const followups =
        students.filter(
            student =>
                student.nextFollowUp
        );


    totalFollowups.textContent =
        followups.length;


    const collected =
        students.reduce(
            (total, student) =>
                total +
                getPaidAmount(student),
            0
        );


    const balance =
        students.reduce(
            (total, student) =>
                total +
                getBalance(student),
            0
        );


    const coming =
        students.filter(
            student =>
                student.comingTomorrow === true ||
                student.visitStatus === "Coming Today" ||
                student.visitStatus === "Coming Tomorrow"
        );


    totalCollected.textContent =
        formatMoney(collected);


    totalBalance.textContent =
        formatMoney(balance);


    totalComing.textContent =
        coming.length;

}


/* =====================================================
   STUDENT TABLE
===================================================== */

function renderStudents() {

    let data =
        [...students];


    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    if (search) {

        data =
            data.filter(student => {

                const text = [

                    student.name,

                    student.phone,

                    student.village,

                    student.villageName,

                    student.assignedVillage,

                    student.assignedVillageName

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return text.includes(search);

            });

    }


    if (statusFilter.value) {

        data =
            data.filter(
                student =>
                    getLeadStatus(student) ===
                    statusFilter.value
            );

    }


    if (paymentFilter.value) {

        data =
            data.filter(
                student =>
                    getPaymentStatus(student) ===
                    paymentFilter.value
            );

    }


    if (villageFilter.value) {

        data =
            data.filter(
                student =>
                    getAssignedVillage(student)
                        .toLowerCase() ===
                    villageFilter.value
                        .toLowerCase()
            );

    }


    if (!data.length) {

        studentsTable.innerHTML = `
            <tr>
                <td
                    colspan="11"
                    class="empty"
                >
                    No students found.
                </td>
            </tr>
        `;

        return;

    }


    studentsTable.innerHTML =
        data.map(
            (student, index) =>
                createStudentRow(
                    student,
                    index
                )
        ).join("");

}


/* =====================================================
   STUDENT ROW
===================================================== */

function createStudentRow(
    student,
    index
) {

    const leadStatus =
        getLeadStatus(student);


    const admissionStatus =
        getAdmissionStatus(student);


    const paid =
        getPaidAmount(student);


    const balance =
        getBalance(student);


    const paymentStatus =
        getPaymentStatus(student);


    const followup =
        formatDate(
            student.nextFollowUp
        );


    return `

        <tr>

            <td>
                ${index + 1}
            </td>


            <td>

                <button
                    class="student-name"
                    onclick="openStudent('${student.id}')"
                >

                    ${escapeHTML(
                        student.name || "Unnamed"
                    )}

                </button>

                <small>
                    Target:
                    ${
                        student.targetPercentage ??
                        student.targetPercentageValue ??
                        "-"
                    }%
                </small>

            </td>


            <td>

                <div class="phone">

                    <a
                        href="tel:${escapeAttribute(
                            student.phone || ""
                        )}"
                    >
                        <i class="ri-phone-line"></i>
                    </a>

                    ${escapeHTML(
                        student.phone || "-"
                    )}

                </div>

            </td>


            <td>

                <span class="village-text">

                    ${escapeHTML(
                        getStudentVillage(student) || "-"
                    )}

                </span>

            </td>


            <td>

                <select
                    class="inline-select"
                    onchange="changeAssignedVillage(
                        '${student.id}',
                        this.value
                    )"
                >

                    <option value="">
                        Assign Village
                    </option>

                    ${
                        villages.map(
                            village => `
                                <option
                                    value="${escapeAttribute(
                                        village.name
                                    )}"
                                    ${
                                        getAssignedVillage(student)
                                            .toLowerCase() ===
                                        String(village.name)
                                            .toLowerCase()
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escapeHTML(
                                        village.name
                                    )}
                                </option>
                            `
                        ).join("")
                    }

                </select>

            </td>


            <td>

                <select
                    class="inline-select"
                    onchange="changeLeadStatus(
                        '${student.id}',
                        this.value
                    )"
                >

                    ${leadStatusOptions(
                        leadStatus
                    )}

                </select>

            </td>


            <td>

                <select
                    class="inline-select"
                    onchange="changeAdmissionStatus(
                        '${student.id}',
                        this.value
                    )"
                >

                    ${admissionOptions(
                        admissionStatus
                    )}

                </select>

            </td>


            <td>

                <div class="money-cell">

                    <strong>
                        ${formatMoney(paid)}
                    </strong>

                    <span class="payment-badge ${paymentClass(paymentStatus)}">

                        ${paymentStatus}

                    </span>

                </div>

            </td>


            <td>

                <strong
                    class="${balance > 0 ? "balance-due" : "balance-clear"}"
                >

                    ${formatMoney(balance)}

                </strong>

            </td>


            <td>

                <span class="followup-date">

                    ${followup || "—"}

                </span>

            </td>


            <td>

                <button
                    class="view-button"
                    onclick="openStudent('${student.id}')"
                >

                    View

                </button>

            </td>

        </tr>

    `;

}


/* =====================================================
   STATUS OPTIONS
===================================================== */

function leadStatusOptions(selected) {

    const statuses = [

        "New",
        "Contacted",
        "Not Answered",
        "Interested",
        "Follow-up",
        "Not Interested",
        "Coming",
        "Admission Done",
        "Lost"

    ];


    return statuses.map(
        status => `

            <option
                value="${status}"
                ${selected === status ? "selected" : ""}
            >
                ${status}
            </option>

        `
    ).join("");

}


function admissionOptions(selected) {

    const statuses = [

        "Not Enrolled",
        "Admission Confirmed",
        "Admission Done",
        "Admission Cancelled"

    ];


    return statuses.map(
        status => `

            <option
                value="${status}"
                ${selected === status ? "selected" : ""}
            >
                ${status}
            </option>

        `
    ).join("");

}


/* =====================================================
   UPDATE LEAD STATUS
===================================================== */

window.changeLeadStatus =
    async function(
        studentId,
        status
    ) {

        await updateStudent(
            studentId,
            {
                leadStatus: status
            }
        );

    };


/* =====================================================
   UPDATE ADMISSION
===================================================== */

window.changeAdmissionStatus =
    async function(
        studentId,
        status
    ) {

        await updateStudent(
            studentId,
            {
                admissionStatus: status
            }
        );

    };


/* =====================================================
   ASSIGN VILLAGE
===================================================== */

window.changeAssignedVillage =
    async function(
        studentId,
        village
    ) {

        await updateStudent(
            studentId,
            {
                assignedVillage: village
            }
        );

    };


/* =====================================================
   UPDATE STUDENT
===================================================== */

async function updateStudent(
    studentId,
    fields
) {

    try {

        await updateDoc(
            doc(
                db,
                "submissions",
                studentId
            ),
            {
                ...fields,
                updatedAt:
                    serverTimestamp()
            }
        );


        const index =
            students.findIndex(
                student =>
                    student.id ===
                    studentId
            );


        if (index !== -1) {

            students[index] = {

                ...students[index],

                ...fields

            };

        }


        updateDashboard();

        renderStudents();

        renderVillages();

        renderFollowups();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to update student.\n\n" +
            error.message
        );

    }

}


/* =====================================================
   VILLAGE FILTER
===================================================== */

function populateVillageFilter() {

    const current =
        villageFilter.value;


    villageFilter.innerHTML = `
        <option value="">
            All Villages
        </option>
    `;


    villages.forEach(village => {

        const option =
            document.createElement("option");


        option.value =
            village.name;

        option.textContent =
            village.name;


        villageFilter.appendChild(
            option
        );

    });


    villageFilter.value =
        current;

}


/* =====================================================
   VILLAGE CARDS
===================================================== */

function renderVillages() {

    if (!villages.length) {

        villageCards.innerHTML = `

            <div class="empty-card">

                No villages created yet.

            </div>

        `;

        return;

    }


    villageCards.innerHTML =
        villages.map(
            village =>
                createVillageCard(
                    village
                )
        ).join("");

}


function createVillageCard(
    village
) {

    const name =
        String(
            village.name || ""
        );


    const villageStudents =
        students.filter(
            student =>
                getAssignedVillage(student)
                    .toLowerCase() ===
                name.toLowerCase()
        );


    const admissions =
        villageStudents.filter(
            student =>
                getAdmissionStatus(student) ===
                "Admission Done" ||
                getAdmissionStatus(student) ===
                "Admission Confirmed"
        ).length;


    const paid =
        villageStudents.reduce(
            (sum, student) =>
                sum +
                getPaidAmount(student),
            0
        );


    const balance =
        villageStudents.reduce(
            (sum, student) =>
                sum +
                getBalance(student),
            0
        );


    return `

        <div
            class="village-card"
            onclick="openVillage('${escapeAttribute(name)}')"
        >

            <div class="village-card-top">

                <div class="village-icon">

                    <i class="ri-map-pin-line"></i>

                </div>

                <div>

                    <h3>
                        ${escapeHTML(name)}
                    </h3>

                    <span>
                        ${villageStudents.length}
                        students
                    </span>

                </div>

            </div>


            <div class="village-stats">

                <div>

                    <span>Admissions</span>

                    <strong>
                        ${admissions}
                    </strong>

                </div>


                <div>

                    <span>Collected</span>

                    <strong>
                        ${formatMoney(paid)}
                    </strong>

                </div>


                <div>

                    <span>Balance</span>

                    <strong>
                        ${formatMoney(balance)}
                    </strong>

                </div>

            </div>


            <div class="view-village">

                View Village
                <i class="ri-arrow-right-line"></i>

            </div>

        </div>

    `;

}


/* =====================================================
   OPEN VILLAGE
===================================================== */

window.openVillage =
    function(name) {

        document.querySelector(
            '[data-tab="students"]'
        ).click();


        villageFilter.value =
            name;


        renderStudents();

    };


/* =====================================================
   ADD VILLAGE
===================================================== */

addVillageButton.addEventListener(
    "click",
    addVillage
);


newVillageInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            addVillage();

        }

    }
);


async function addVillage() {

    const name =
        newVillageInput.value.trim();


    if (!name) {

        alert(
            "Enter village name."
        );

        return;

    }


    const exists =
        villages.some(
            village =>
                String(village.name)
                    .toLowerCase() ===
                name.toLowerCase()
        );


    if (exists) {

        alert(
            "Village already exists."
        );

        return;

    }


    try {

        const villageRef =
            await addDoc(
                collection(
                    db,
                    "villages"
                ),
                {

                    name,

                    createdAt:
                        serverTimestamp()

                }
            );


        villages.push({

            id:
                villageRef.id,

            name

        });


        villages.sort(
            (a, b) =>
                String(a.name)
                    .localeCompare(
                        String(b.name)
                    )
        );


        newVillageInput.value = "";


        populateVillageFilter();

        renderVillages();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to create village.\n\n" +
            error.message
        );

    }

}


/* =====================================================
   FOLLOWUPS
===================================================== */

function renderFollowups() {

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    const list =
        students
            .filter(
                student =>
                    student.nextFollowUp
            )
            .sort(
                (a, b) =>
                    getDateValue(
                        a.nextFollowUp
                    ) -
                    getDateValue(
                        b.nextFollowUp
                    )
            );


    if (!list.length) {

        followupList.innerHTML = `

            <div class="empty-card">

                No follow-ups scheduled.

            </div>

        `;

        return;

    }


    followupList.innerHTML =
        list.map(
            student => {

                const date =
                    getDateValue(
                        student.nextFollowUp
                    );


                const isOverdue =
                    date < today;


                return `

                    <div
                        class="followup-card
                        ${isOverdue ? "overdue" : ""}"
                    >

                        <div>

                            <strong>
                                ${escapeHTML(
                                    student.name || "-"
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    student.phone || "-"
                                )}
                            </span>

                        </div>


                        <div>

                            <span>
                                ${escapeHTML(
                                    getAssignedVillage(student) ||
                                    getStudentVillage(student) ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div>

                            <strong>
                                ${formatDate(
                                    student.nextFollowUp
                                )}
                            </strong>

                            ${
                                isOverdue
                                    ? `
                                        <span class="overdue-label">
                                            OVERDUE
                                        </span>
                                    `
                                    : ""
                            }

                        </div>


                        <button
                            onclick="openStudent('${student.id}')"
                        >
                            View
                        </button>

                    </div>

                `;

            }
        ).join("");

}


/* =====================================================
   STUDENT PROFILE
===================================================== */

window.openStudent =
    function(studentId) {

        const student =
            students.find(
                item =>
                    item.id ===
                    studentId
            );


        if (!student) return;


        selectedStudent =
            student;


        const paid =
            getPaidAmount(student);


        const balance =
            getBalance(student);


        studentDetails.innerHTML = `

            <div class="profile-header">

                <div>

                    <span class="profile-label">
                        STUDENT
                    </span>

                    <h2>
                        ${escapeHTML(
                            student.name || "Unnamed"
                        )}
                    </h2>

                    <p>
                        ${escapeHTML(
                            student.phone || "-"
                        )}
                    </p>

                </div>


                <div class="profile-actions">

                    <a
                        class="call-action"
                        href="tel:${escapeAttribute(
                            student.phone || ""
                        )}"
                    >
                        <i class="ri-phone-line"></i>
                        Call
                    </a>


                    <a
                        class="whatsapp-action"
                        href="${getWhatsAppLink(
                            student.phone
                        )}"
                        target="_blank"
                    >
                        <i class="ri-whatsapp-line"></i>
                        WhatsApp
                    </a>

                </div>

            </div>


            <div class="profile-grid">


                <!-- BASIC -->

                <div class="profile-section">

                    <h3>
                        Student Information
                    </h3>


                    ${profileField(
                        "Target %",
                        (
                            student.targetPercentage ??
                            student.targetPercentageValue ??
                            "-"
                        ) + "%"
                    )}


                    ${profileField(
                        "Student Village",
                        getStudentVillage(student) || "-"
                    )}


                    ${profileField(
                        "Assigned Village",
                        getAssignedVillage(student) || "-"
                    )}


                    ${profileField(
                        "Village Stop",
                        student.villageStop || "-"
                    )}

                </div>


                <!-- CRM -->

                <div class="profile-section">

                    <h3>
                        CRM Status
                    </h3>


                    <label>
                        Lead Status
                    </label>

                    <select
                        id="profileLeadStatus"
                        class="profile-input"
                    >

                        ${leadStatusOptions(
                            getLeadStatus(student)
                        )}

                    </select>


                    <label>
                        Admission
                    </label>

                    <select
                        id="profileAdmissionStatus"
                        class="profile-input"
                    >

                        ${admissionOptions(
                            getAdmissionStatus(student)
                        )}

                    </select>


                    <label>
                        Visit Status
                    </label>

                    <select
                        id="profileVisitStatus"
                        class="profile-input"
                    >

                        ${visitStatusOptions(
                            student.visitStatus
                        )}

                    </select>

                </div>


                <!-- FEES -->

                <div class="profile-section">

                    <h3>
                        Fees
                    </h3>


                    <label>
                        Total Fee
                    </label>

                    <input
                        id="profileTotalFee"
                        class="profile-input"
                        type="number"
                        value="${Number(
                            student.totalFee || 0
                        )}"
                    >


                    <label>
                        Amount Paid
                    </label>

                    <input
                        id="profilePaid"
                        class="profile-input"
                        type="number"
                        value="${paid}"
                    >


                    <div class="fee-summary">

                        <span>
                            Balance
                        </span>

                        <strong>
                            ${formatMoney(balance)}
                        </strong>

                    </div>

                </div>


                <!-- FOLLOW UP -->

                <div class="profile-section">

                    <h3>
                        Follow-up
                    </h3>


                    <label>
                        Next Follow-up
                    </label>

                    <input
                        id="profileFollowup"
                        class="profile-input"
                        type="date"
                        value="${dateInputValue(
                            student.nextFollowUp
                        )}"
                    >


                    <label>
                        Follow-up Notes
                    </label>

                    <textarea
                        id="profileNotes"
                        class="profile-input"
                        rows="4"
                    >${escapeHTML(
                        student.followUpNotes ||
                        student.notes ||
                        ""
                    )}</textarea>

                </div>

            </div>


            <div class="profile-footer">

                <button
                    id="saveStudentButton"
                    class="save-button"
                >
                    <i class="ri-save-line"></i>
                    Save Changes
                </button>

            </div>

        `;


        studentModal.classList.add(
            "show"
        );


        document
            .getElementById(
                "saveStudentButton"
            )
            .addEventListener(
                "click",
                saveStudentProfile
            );

    };


/* =====================================================
   SAVE PROFILE
===================================================== */

async function saveStudentProfile() {

    if (!selectedStudent) return;


    const totalFee =
        Number(
            document.getElementById(
                "profileTotalFee"
            ).value || 0
        );


    const paid =
        Number(
            document.getElementById(
                "profilePaid"
            ).value || 0
        );


    const balance =
        Math.max(
            0,
            totalFee - paid
        );


    const fields = {

        leadStatus:
            document.getElementById(
                "profileLeadStatus"
            ).value,

        admissionStatus:
            document.getElementById(
                "profileAdmissionStatus"
            ).value,

        visitStatus:
            document.getElementById(
                "profileVisitStatus"
            ).value,

        totalFee,

        totalPaid:
            paid,

        balance,

        nextFollowUp:
            document.getElementById(
                "profileFollowup"
            ).value || "",

        followUpNotes:
            document.getElementById(
                "profileNotes"
            ).value.trim(),

        updatedAt:
            serverTimestamp()

    };


    try {

        await updateDoc(
            doc(
                db,
                "submissions",
                selectedStudent.id
            ),
            fields
        );


        Object.assign(
            selectedStudent,
            fields
        );


        const index =
            students.findIndex(
                student =>
                    student.id ===
                    selectedStudent.id
            );


        if (index !== -1) {

            students[index] =
                {
                    ...students[index],
                    ...fields
                };

        }


        closeStudentModal();

        updateDashboard();

        renderStudents();

        renderVillages();

        renderFollowups();


        alert(
            "Student updated successfully."
        );


    } catch (error) {

        console.error(error);

        alert(
            "Unable to save student.\n\n" +
            error.message
        );

    }

}


/* =====================================================
   CLOSE MODAL
===================================================== */

closeModal.addEventListener(
    "click",
    closeStudentModal
);


studentModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            studentModal
        ) {

            closeStudentModal();

        }

    }
);


function closeStudentModal() {

    studentModal.classList.remove(
        "show"
    );

    selectedStudent = null;

}


/* =====================================================
   TAB SYSTEM
===================================================== */

document
    .querySelectorAll(".tab")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".tab")
                    .forEach(
                        tab =>
                            tab.classList.remove(
                                "active"
                            )
                    );


                document
                    .querySelectorAll(".tab-content")
                    .forEach(
                        content =>
                            content.classList.remove(
                                "active"
                            )
                    );


                button.classList.add(
                    "active"
                );


                const target =
                    button.dataset.tab;


                document
                    .getElementById(
                        target + "Tab"
                    )
                    .classList.add(
                        "active"
                    );

            }
        );

    });


/* =====================================================
   FILTERS
===================================================== */

searchInput.addEventListener(
    "input",
    renderStudents
);


statusFilter.addEventListener(
    "change",
    renderStudents
);


paymentFilter.addEventListener(
    "change",
    renderStudents
);


villageFilter.addEventListener(
    "change",
    renderStudents
);


/* =====================================================
   REFRESH
===================================================== */

refreshButton.addEventListener(
    "click",
    loadCRM
);


/* =====================================================
   DATA HELPERS
===================================================== */

function getStudentVillage(student) {

    return (
        student.village ||
        student.villageName ||
        ""
    );

}


function getAssignedVillage(student) {

    return (
        student.assignedVillage ||
        student.assignedVillageName ||
        ""
    );

}


function getLeadStatus(student) {

    return (
        student.leadStatus ||
        "New"
    );

}


function getAdmissionStatus(student) {

    return (
        student.admissionStatus ||
        "Not Enrolled"
    );

}


function getPaidAmount(student) {

    return Number(
        student.totalPaid ??
        student.amountPaid ??
        student.paidAmount ??
        0
    );

}


function getTotalFee(student) {

    return Number(
        student.totalFee ??
        0
    );

}


function getBalance(student) {

    const stored =
        student.balance;


    if (
        stored !== undefined &&
        stored !== null &&
        stored !== ""
    ) {

        return Math.max(
            0,
            Number(stored)
        );

    }


    return Math.max(
        0,
        getTotalFee(student) -
        getPaidAmount(student)
    );

}


function getPaymentStatus(student) {

    const total =
        getTotalFee(student);


    const paid =
        getPaidAmount(student);


    if (
        paid <= 0
    ) {

        return "Not Paid";

    }


    if (
        total > 0 &&
        paid >= total
    ) {

        return "Paid";

    }


    return "Partial";

}


/* =====================================================
   VISIT STATUS
===================================================== */

function visitStatusOptions(
    selected
) {

    const statuses = [

        "",
        "Not Planned",
        "Coming Today",
        "Coming Tomorrow",
        "Visited",
        "Did Not Come",
        "Rescheduled"

    ];


    return statuses.map(
        status => `

            <option
                value="${status}"
                ${
                    selected === status
                        ? "selected"
                        : ""
                }
            >
                ${
                    status ||
                    "Select visit status"
                }
            </option>

        `
    ).join("");

}


/* =====================================================
   FORMATTING
===================================================== */

function formatMoney(
    amount
) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(
        Number(amount || 0)
    );

}


function formatDate(
    value
) {

    if (!value) return "";


    let date;


    if (
        typeof value === "object" &&
        value.toDate
    ) {

        date =
            value.toDate();

    } else {

        date =
            new Date(value);

    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function dateInputValue(
    value
) {

    if (!value) return "";


    let date;


    if (
        typeof value === "object" &&
        value.toDate
    ) {

        date =
            value.toDate();

    } else {

        date =
            new Date(value);

    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date
        .toISOString()
        .slice(
            0,
            10
        );

}


function getDateValue(
    value
) {

    if (!value) return Infinity;


    let date;


    if (
        typeof value === "object" &&
        value.toDate
    ) {

        date =
            value.toDate();

    } else {

        date =
            new Date(value);

    }


    return date.getTime();

}


function paymentClass(
    status
) {

    if (status === "Paid")
        return "paid";

    if (status === "Partial")
        return "partial";

    return "unpaid";

}


/* =====================================================
   WHATSAPP
===================================================== */

function getWhatsAppLink(
    phone
) {

    let number =
        String(phone || "")
            .replace(
                /\D/g,
                ""
            );


    if (
        number.length === 10
    ) {

        number =
            "91" + number;

    }


    const message =
        "Hello, We are from Zenova Educations.";


    return (
        "https://wa.me/" +
        number +
        "?text=" +
        encodeURIComponent(
            message
        )
    );

}


/* =====================================================
   HTML SECURITY
===================================================== */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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


function escapeAttribute(
    value
) {

    return escapeHTML(value);

}


/* =====================================================
   GLOBAL FUNCTIONS
===================================================== */

window.openStudent =
    window.openStudent;
