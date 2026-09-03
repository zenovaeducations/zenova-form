import { db } from "../firebase-config.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
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

const emptyMessage =
    document.getElementById("emptyMessage");


let allSubmissions = [];


/* =========================
   LOGIN
========================= */

loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        login();
    }

});


function login() {

    const password =
        passwordInput.value.trim();

    if (password === VIEW_PASSWORD) {

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
   LOAD DATA
========================= */

async function loadSubmissions() {

    submissionsTable.innerHTML = `
        <tr>
            <td colspan="7" class="loading">
                Loading submissions...
            </td>
        </tr>
    `;

    emptyMessage.style.display = "none";


    try {

        const q = query(
            collection(db, "submissions"),
            orderBy("submittedAt", "desc")
        );

        const snapshot =
            await getDocs(q);


        allSubmissions = [];

        snapshot.forEach((document) => {

            allSubmissions.push({
                id: document.id,
                ...document.data()
            });

        });


        totalCount.textContent =
            allSubmissions.length;


        displaySubmissions(allSubmissions);


    } catch (error) {

        console.error(
            "Error loading submissions:",
            error
        );

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
   DISPLAY TABLE
========================= */

function displaySubmissions(data) {

    if (data.length === 0) {

        submissionsTable.innerHTML = "";

        emptyMessage.style.display = "block";

        return;

    }

    emptyMessage.style.display = "none";


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

                } catch (error) {

                    submittedTime =
                        "Time unavailable";

                }

            }


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
                        ${escapeHTML(
                            student.phone || "-"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.village || "-"
                        )}
                    </td>


                    <td class="target-cell">
                        ${escapeHTML(
                            student.targetPercentage || "-"
                        )}%
                    </td>


                    <td>
                        ${submittedTime}
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


    /* Attach delete buttons */

    document
        .querySelectorAll(".delete-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => deleteSubmission(button.dataset.id)
            );

        });

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
            `Delete the submission of ${student.name || "this student"}?\n\nThis cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(db, "submissions", id)
        );


        /* Remove locally */

        allSubmissions =
            allSubmissions.filter(
                item => item.id !== id
            );


        totalCount.textContent =
            allSubmissions.length;


        /* Re-display */

        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        const filtered =
            filterSubmissions(search);


        displaySubmissions(filtered);


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );

        alert(
            "Unable to delete this submission."
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
   HTML SECURITY
========================= */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}
