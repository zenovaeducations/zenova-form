import { db } from "../firebase-config.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/*
    =========================================================
    ZENOVA CRM ATTENDANCE
    =========================================================

    Existing student collection:
        submissions

    Attendance collection:
        attendance

    Attendance document ID:
        YYYY-MM-DD__studentFirebaseId

    Example:
        2026-10-05__abc123xyz

    This allows one attendance record per student per date.
*/

const VIEW_PASSWORD = "123456";

/* =========================================================
   STATE
========================================================= */

let students = [];

let attendanceRecords = {};

let currentIndex = -1;

let sessionStarted = false;

let studentStartedAt = null;

let timerInterval = null;

let selectedDate = "";

/* =========================================================
   DOM
========================================================= */

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

const attendanceDate =
    document.getElementById("attendanceDate");

const startButton =
    document.getElementById("startButton");

const refreshButton =
    document.getElementById("refreshButton");

const totalCount =
    document.getElementById("totalCount");

const presentCount =
    document.getElementById("presentCount");

const absentCount =
    document.getElementById("absentCount");

const pendingCount =
    document.getElementById("pendingCount");

const attendancePanel =
    document.getElementById("attendancePanel");

const progressText =
    document.getElementById("progressText");

const progressBar =
    document.getElementById("progressBar");

const timer =
    document.getElementById("timer");

const studentCard =
    document.getElementById("studentCard");

const attendanceActions =
    document.getElementById("attendanceActions");

const presentButton =
    document.getElementById("presentButton");

const absentButton =
    document.getElementById("absentButton");

const completionCard =
    document.getElementById("completionCard");

const completionText =
    document.getElementById("completionText");

const restartButton =
    document.getElementById("restartButton");

const attendanceTable =
    document.getElementById("attendanceTable");

const clearSessionButton =
    document.getElementById("clearSessionButton");

const toast =
    document.getElementById("toast");

/* =========================================================
   LOGIN EVENTS
========================================================= */

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

/* =========================================================
   DATE CHANGE
========================================================= */

attendanceDate.addEventListener(
    "change",
    async function () {

        stopSession(false);

        selectedDate =
            attendanceDate.value;

        await loadAttendanceForDate();

        renderTable();

        updateSummary();

    }
);

/* =========================================================
   BUTTON EVENTS
========================================================= */

startButton.addEventListener(
    "click",
    startAttendance
);

presentButton.addEventListener(
    "click",
    function () {

        markAttendance(
            "Present"
        );

    }
);

absentButton.addEventListener(
    "click",
    function () {

        markAttendance(
            "Absent"
        );

    }
);

refreshButton.addEventListener(
    "click",
    refreshAll
);

restartButton.addEventListener(
    "click",
    startAttendance
);

clearSessionButton.addEventListener(
    "click",
    function () {

        stopSession(false);

        showReadyCard();

        showToast(
            "Current attendance session reset."
        );

    }
);

/* =========================================================
   LOGIN
========================================================= */

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

    loginScreen.style.display =
        "none";

    mainPage.style.display =
        "block";

    selectedDate =
        todayString();

    attendanceDate.value =
        selectedDate;

    loadAttendancePage();

}

/* =========================================================
   LOAD ATTENDANCE PAGE
========================================================= */

async function loadAttendancePage() {

    attendanceTable.innerHTML = `
        <tr>
            <td
                colspan="8"
                class="loading"
            >
                Loading Zenova students...
            </td>
        </tr>
    `;

    try {

        await loadStudents();

        await loadAttendanceForDate();

        updateSummary();

        renderTable();

        showReadyCard();

    }

    catch (error) {

        console.error(
            "ATTENDANCE LOAD ERROR:",
            error
        );

        attendanceTable.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="loading"
                >

                    Unable to load attendance.

                    <br><br>

                    ${escapeHTML(
                        error.message
                    )}

                </td>
            </tr>
        `;

    }

}

/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {

    const ref =
        collection(
            db,
            "submissions"
        );

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

    }

    catch {

        snapshot =
            await getDocs(ref);

    }

    students = [];

    snapshot.forEach(
        firebaseDocument => {

            const data =
                firebaseDocument.data();

            students.push({

                id:
                    firebaseDocument.id,

                ...data

            });

        }
    );

    /*
        Only students having a valid
        numeric student code are included.
    */

    students =
        students
            .filter(
                student =>
                    getCodeNumber(
                        student
                    ) !== null
            )
            .sort(
                compareStudentCode
            );

}

/* =========================================================
   LOAD ATTENDANCE FOR SELECTED DATE
========================================================= */

async function loadAttendanceForDate() {

    attendanceRecords = {};

    if (!selectedDate) {

        return;

    }

    const ref =
        collection(
            db,
            "attendance"
        );

    /*
        Reading the attendance collection
        and filtering by date in JavaScript.

        This avoids requiring a Firestore
        composite index.
    */

    const snapshot =
        await getDocs(ref);

    snapshot.forEach(
        firebaseDocument => {

            const data =
                firebaseDocument.data();

            if (

                String(
                    data.date || ""
                ) ===
                selectedDate

                &&

                data.studentId

            ) {

                attendanceRecords[
                    data.studentId
                ] = {

                    id:
                        firebaseDocument.id,

                    ...data

                };

            }

        }
    );

}

/* =========================================================
   STUDENT CODE NUMBER
========================================================= */

function getCodeNumber(
    student
) {

    if (
        !student ||
        !student.studentCode
    ) {

        return null;

    }

    const code =
        String(
            student.studentCode
        );

    let match =
        code.match(
            /^ZNV\/SSLCM\+(\d+)$/i
        );

    /*
        Fallback:
        If code is not exactly
        ZNV/SSLCM+2701,
        use the final number.
    */

    if (!match) {

        match =
            code.match(
                /(\d+)$/
            );

    }

    if (!match) {

        return null;

    }

    try {

        return BigInt(
            match[1]
        );

    }

    catch {

        return null;

    }

}

/* =========================================================
   DISPLAY CODE
========================================================= */

function getDisplayCode(
    student
) {

    const number =
        getCodeNumber(
            student
        );

    if (
        number === null
    ) {

        return (
            student.studentCode ||
            "Not assigned"
        );

    }

    return (
        `ZNV/SSLCM+${number.toString()}`
    );

}

/* =========================================================
   SORT STUDENTS BY CODE
========================================================= */

function compareStudentCode(
    a,
    b
) {

    const codeA =
        getCodeNumber(a);

    const codeB =
        getCodeNumber(b);

    if (
        codeA === null &&
        codeB === null
    ) {

        return String(
            a.name || ""
        ).localeCompare(
            String(
                b.name || ""
            )
        );

    }

    if (
        codeA === null
    ) {

        return 1;

    }

    if (
        codeB === null
    ) {

        return -1;

    }

    if (
        codeA < codeB
    ) {

        return -1;

    }

    if (
        codeA > codeB
    ) {

        return 1;

    }

    return String(
        a.name || ""
    ).localeCompare(
        String(
            b.name || ""
        )
    );

}

/* =========================================================
   STUDENT VILLAGE
========================================================= */

function getStudentVillage(
    student
) {

    return firstValue(

        student.village,

        student.villageName,

        student.studentVillage,

        student.assignedVillage,

        student.assignedVillageName

    );

}

/* =========================================================
   STUDENT SCHOOL
========================================================= */

function getStudentSchool(
    student
) {

    return firstValue(

        student.school,

        student.schoolName,

        student.studentSchool,

        student.school_name

    );

}

/* =========================================================
   STUDENT NAME
========================================================= */

function getStudentName(
    student
) {

    return firstValue(

        student.name,

        student.studentName,

        student.fullName,

        "Unnamed Student"

    );

}

/* =========================================================
   FIRST VALUE
========================================================= */

function firstValue(
    ...values
) {

    for (
        const value of values
    ) {

        if (

            value !== undefined

            &&

            value !== null

            &&

            String(
                value
            ).trim() !== ""

        ) {

            return String(
                value
            ).trim();

        }

    }

    return "-";

}

/* =========================================================
   START ATTENDANCE
========================================================= */

function startAttendance() {

    if (
        !students.length
    ) {

        showToast(
            "No coded students found."
        );

        return;

    }

    selectedDate =
        attendanceDate.value ||
        todayString();

    attendanceDate.value =
        selectedDate;

    sessionStarted =
        true;

    currentIndex =
        findNextPendingIndex(
            -1
        );

    completionCard.classList.add(
        "hidden"
    );

    if (
        currentIndex === -1
    ) {

        showCompletion();

        return;

    }

    showCurrentStudent();

}

/* =========================================================
   FIND NEXT PENDING STUDENT
========================================================= */

function findNextPendingIndex(
    afterIndex
) {

    for (
        let i = afterIndex + 1;
        i < students.length;
        i++
    ) {

        const student =
            students[i];

        if (
            !attendanceRecords[
                student.id
            ]
        ) {

            return i;

        }

    }

    return -1;

}

/* =========================================================
   SHOW CURRENT STUDENT
========================================================= */

function showCurrentStudent() {

    if (

        currentIndex < 0

        ||

        currentIndex >=
        students.length

    ) {

        showCompletion();

        return;

    }

    const student =
        students[
            currentIndex
        ];

    sessionStarted =
        true;

    studentStartedAt =
        Date.now();

    startTimer();

    const percent =
        Math.round(

            (
                currentIndex /
                students.length
            ) * 100

        );

    progressText.textContent =
        `${currentIndex + 1} of ${students.length} — ${getDisplayCode(student)}`;

    progressBar.style.width =
        `${percent}%`;

    studentCard.className =
        "student-card";

    studentCard.innerHTML = `

        <div class="student-main">

            <div class="student-code">

                ${escapeHTML(
                    getDisplayCode(
                        student
                    )
                )}

            </div>

            <div class="student-name">

                ${escapeHTML(
                    getStudentName(
                        student
                    )
                )}

            </div>

            <div class="student-info">

                <div class="info-box">

                    <span>
                        Village
                    </span>

                    <strong>

                        ${escapeHTML(
                            getStudentVillage(
                                student
                            )
                        )}

                    </strong>

                </div>

                <div class="info-box">

                    <span>
                        School
                    </span>

                    <strong>

                        ${escapeHTML(
                            getStudentSchool(
                                student
                            )
                        )}

                    </strong>

                </div>

                <div class="info-box">

                    <span>
                        Date
                    </span>

                    <strong>

                        ${escapeHTML(
                            formatDateLong(
                                selectedDate
                            )
                        )}

                    </strong>

                </div>

            </div>

        </div>

    `;

    attendanceActions.classList.remove(
        "hidden"
    );

    completionCard.classList.add(
        "hidden"
    );

}

/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    stopTimer();

    timer.textContent =
        "00:00";

    timerInterval =
        setInterval(
            function () {

                if (
                    !studentStartedAt
                ) {

                    return;

                }

                const seconds =
                    Math.floor(

                        (
                            Date.now() -
                            studentStartedAt
                        ) / 1000

                    );

                timer.textContent =
                    formatDuration(
                        seconds
                    );

            },
            250
        );

}

/* =========================================================
   STOP TIMER
========================================================= */

function stopTimer() {

    if (
        timerInterval
    ) {

        clearInterval(
            timerInterval
        );

        timerInterval =
            null;

    }

}

/* =========================================================
   MARK ATTENDANCE
========================================================= */

async function markAttendance(
    status
) {

    if (

        !sessionStarted

        ||

        currentIndex < 0

    ) {

        return;

    }

    const student =
        students[
            currentIndex
        ];

    const markedAtClient =
        new Date();

    const elapsedSeconds =
        studentStartedAt

            ?

            Math.max(

                0,

                Math.floor(

                    (
                        Date.now() -
                        studentStartedAt
                    ) / 1000

                )

            )

            :

            0;

    presentButton.disabled =
        true;

    absentButton.disabled =
        true;

    try {

        /*
            Unique document ID:

            DATE + STUDENT ID
        */

        const documentId =
            `${selectedDate}__${student.id}`;

        const attendanceData = {

            date:
                selectedDate,

            studentId:
                student.id,

            studentCode:
                getDisplayCode(
                    student
                ),

            studentName:
                getStudentName(
                    student
                ),

            village:
                getStudentVillage(
                    student
                ),

            school:
                getStudentSchool(
                    student
                ),

            status:
                status,

            /*
                How long the staff member
                took to mark this student.
            */

            attendanceTimeSeconds:
                elapsedSeconds,

            attendanceTime:
                formatDuration(
                    elapsedSeconds
                ),

            markedAt:
                serverTimestamp(),

            markedAtClient:
                markedAtClient.toISOString(),

            updatedAt:
                serverTimestamp()

        };

        await setDoc(

            doc(
                db,
                "attendance",
                documentId
            ),

            attendanceData,

            {
                merge: true
            }

        );

        /*
            Update local attendance data
        */

        attendanceRecords[
            student.id
        ] = {

            id:
                documentId,

            ...attendanceData,

            markedAtClient:
                markedAtClient.toISOString()

        };

        stopTimer();

        showToast(

            `${getDisplayCode(
                student
            )} marked ${status}.`

        );

        updateSummary();

        renderTable();

        /*
            Automatically go to
            next student.

            2701
            ↓
            2702
            ↓
            2703
            ↓
            2704
        */

        currentIndex =
            findNextPendingIndex(
                currentIndex
            );

        if (
            currentIndex === -1
        ) {

            showCompletion();

        }

        else {

            showCurrentStudent();

        }

    }

    catch (error) {

        console.error(
            "ATTENDANCE SAVE ERROR:",
            error
        );

        showToast(
            "Unable to save attendance: " +
            error.message
        );

    }

    finally {

        presentButton.disabled =
            false;

        absentButton.disabled =
            false;

    }

}

/* =========================================================
   COMPLETION
========================================================= */

function showCompletion() {

    stopTimer();

    sessionStarted =
        false;

    studentStartedAt =
        null;

    attendanceActions.classList.add(
        "hidden"
    );

    const present =
        countStatus(
            "Present"
        );

    const absent =
        countStatus(
            "Absent"
        );

    progressText.textContent =
        "Completed";

    progressBar.style.width =
        "100%";

    timer.textContent =
        "00:00";

    studentCard.className =
        "student-card empty-card";

    studentCard.innerHTML = `

        <div class="empty-icon">

            <i class="ri-check-double-line"></i>

        </div>

        <h2>
            All students completed
        </h2>

        <p>

            ${present}
            present ·
            ${absent}
            absent

        </p>

    `;

    completionText.textContent =

        `${formatDateLong(
            selectedDate
        )} — ${present} Present, ${absent} Absent.`;

    completionCard.classList.remove(
        "hidden"
    );

    renderTable();

    updateSummary();

}

/* =========================================================
   READY CARD
========================================================= */

function showReadyCard() {

    stopTimer();

    sessionStarted =
        false;

    studentStartedAt =
        null;

    currentIndex =
        -1;

    attendanceActions.classList.add(
        "hidden"
    );

    completionCard.classList.add(
        "hidden"
    );

    progressText.textContent =
        "Ready";

    progressBar.style.width =
        "0%";

    timer.textContent =
        "00:00";

    studentCard.className =
        "student-card empty-card";

    studentCard.innerHTML = `

        <div class="empty-icon">

            <i class="ri-user-search-line"></i>

        </div>

        <h2>
            Attendance is not started
        </h2>

        <p>

            Select the date and click
            <b>Start Attendance</b>.

        </p>

    `;

}

/* =========================================================
   STOP SESSION
========================================================= */

function stopSession(
    showReady = true
) {

    stopTimer();

    sessionStarted =
        false;

    studentStartedAt =
        null;

    currentIndex =
        -1;

    if (
        showReady
    ) {

        showReadyCard();

    }

}

/* =========================================================
   COUNTER
========================================================= */

function countStatus(
    status
) {

    return Object
        .values(
            attendanceRecords
        )
        .filter(
            record =>
                record.status ===
                status
        )
        .length;

}

/* =========================================================
   UPDATE SUMMARY
========================================================= */

function updateSummary() {

    const total =
        students.length;

    const present =
        countStatus(
            "Present"
        );

    const absent =
        countStatus(
            "Absent"
        );

    const pending =
        Math.max(

            0,

            total -
            present -
            absent

        );

    totalCount.textContent =
        total;

    presentCount.textContent =
        present;

    absentCount.textContent =
        absent;

    pendingCount.textContent =
        pending;

}

/* =========================================================
   RENDER ATTENDANCE TABLE
========================================================= */

function renderTable() {

    if (
        !students.length
    ) {

        attendanceTable.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="empty"
                >

                    No students with
                    student codes found.

                </td>

            </tr>

        `;

        return;

    }

    attendanceTable.innerHTML =

        students.map(

            (
                student,
                index
            ) => {

                const record =
                    attendanceRecords[
                        student.id
                    ];

                let statusHTML = `

                    <span
                        class="
                            status-badge
                            status-pending
                        "
                    >

                        Pending

                    </span>

                `;

                let timeTaken = `

                    <span
                        class="muted"
                    >
                        —
                    </span>

                `;

                let markedAt = `

                    <span
                        class="muted"
                    >
                        —
                    </span>

                `;

                if (
                    record
                ) {

                    const cls =

                        record.status ===
                        "Present"

                            ?

                            "status-present"

                            :

                            "status-absent";

                    const icon =

                        record.status ===
                        "Present"

                            ?

                            "ri-checkbox-circle-fill"

                            :

                            "ri-close-circle-fill";

                    statusHTML = `

                        <span
                            class="
                                status-badge
                                ${cls}
                            "
                        >

                            <i
                                class="${icon}"
                            ></i>

                            &nbsp;

                            ${escapeHTML(
                                record.status
                            )}

                        </span>

                    `;

                    timeTaken =
                        escapeHTML(

                            record.attendanceTime

                            ||

                            formatDuration(

                                Number(
                                    record.attendanceTimeSeconds ||
                                    0
                                )

                            )

                        );

                    markedAt =
                        formatMarkedAt(
                            record
                        );

                }

                return `

                    <tr>

                        <td>

                            <strong>
                                ${index + 1}
                            </strong>

                        </td>

                        <td
                            class="code"
                        >

                            ${escapeHTML(
                                getDisplayCode(
                                    student
                                )
                            )}

                        </td>

                        <td>

                            <strong>

                                ${escapeHTML(
                                    getStudentName(
                                        student
                                    )
                                )}

                            </strong>

                        </td>

                        <td>

                            ${escapeHTML(
                                getStudentVillage(
                                    student
                                )
                            )}

                        </td>

                        <td>

                            ${escapeHTML(
                                getStudentSchool(
                                    student
                                )
                            )}

                        </td>

                        <td>

                            ${statusHTML}

                        </td>

                        <td>

                            ${timeTaken}

                        </td>

                        <td>

                            ${markedAt}

                        </td>

                    </tr>

                `;

            }

        ).join("");

}

/* =========================================================
   MARKED TIME
========================================================= */

function formatMarkedAt(
    record
) {

    const raw =
        record.markedAtClient;

    if (
        raw
    ) {

        const date =
            new Date(
                raw
            );

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date.toLocaleTimeString(
                "en-IN",
                {

                    hour:
                        "2-digit",

                    minute:
                        "2-digit",

                    second:
                        "2-digit"

                }
            );

        }

    }

    if (
        record.markedAt?.toDate
    ) {

        return record.markedAt
            .toDate()
            .toLocaleTimeString(
                "en-IN",
                {

                    hour:
                        "2-digit",

                    minute:
                        "2-digit",

                    second:
                        "2-digit"

                }
            );

    }

    return "Saved";

}

/* =========================================================
   REFRESH
========================================================= */

async function refreshAll() {

    if (
        !selectedDate
    ) {

        selectedDate =
            todayString();

        attendanceDate.value =
            selectedDate;

    }

    stopSession(false);

    refreshButton.disabled =
        true;

    refreshButton.innerHTML = `

        <i
            class="ri-loader-4-line"
        ></i>

        Refreshing

    `;

    try {

        await loadStudents();

        await loadAttendanceForDate();

        updateSummary();

        renderTable();

        showReadyCard();

        showToast(
            "Attendance refreshed."
        );

    }

    catch (error) {

        console.error(
            error
        );

        showToast(
            "Refresh failed: " +
            error.message
        );

    }

    finally {

        refreshButton.disabled =
            false;

        refreshButton.innerHTML = `

            <i
                class="ri-refresh-line"
            ></i>

            Refresh

        `;

    }

}

/* =========================================================
   TODAY
========================================================= */

function todayString() {

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

        `${year}-${month}-${day}`

    );

}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDateLong(
    dateString
) {

    if (
        !dateString
    ) {

        return "-";

    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.toLocaleDateString(
        "en-IN",
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"

        }
    );

}

/* =========================================================
   FORMAT TIMER
========================================================= */

function formatDuration(
    totalSeconds
) {

    const seconds =
        Math.max(
            0,
            Number(
                totalSeconds
            ) || 0
        );

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (
                seconds % 3600
            ) / 60
        );

    const remaining =
        seconds % 60;

    if (
        hours > 0
    ) {

        return (

            `${String(
                hours
            ).padStart(
                2,
                "0"
            )}:` +

            `${String(
                minutes
            ).padStart(
                2,
                "0"
            )}:` +

            `${String(
                remaining
            ).padStart(
                2,
                "0"
            )}`

        );

    }

    return (

        `${String(
            minutes
        ).padStart(
            2,
            "0"
        )}:` +

        `${String(
            remaining
        ).padStart(
            2,
            "0"
        )}`

    );

}

/* =========================================================
   TOAST
========================================================= */

let toastTimeout = null;

function showToast(
    message
) {

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimeout
    );

    toastTimeout =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            2600
        );

}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

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
