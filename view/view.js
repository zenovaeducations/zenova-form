import { db } from "../firebase-config.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* =========================
   PASSWORD
========================= */

const VIEW_PASSWORD = "123456";


const loginScreen = document.getElementById("loginScreen");
const mainPage = document.getElementById("mainPage");

const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const submissionsList =
    document.getElementById("submissionsList");

const totalCount =
    document.getElementById("totalCount");

const searchInput =
    document.getElementById("searchInput");


let allSubmissions = [];


/* =========================
   LOGIN
========================= */

loginBtn.addEventListener("click", () => {

    const password = passwordInput.value.trim();

    if (password === VIEW_PASSWORD) {

        loginScreen.style.display = "none";
        mainPage.style.display = "block";

        loadSubmissions();

    } else {

        loginError.textContent = "Incorrect password.";
        passwordInput.value = "";
        passwordInput.focus();

    }
});


passwordInput.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {
        loginBtn.click();
    }

});


/* =========================
   LOAD SUBMISSIONS
========================= */

async function loadSubmissions() {

    submissionsList.innerHTML = `
        <div class="loading">
            Loading submissions...
        </div>
    `;

    try {

        const q = query(
            collection(db, "submissions"),
            orderBy("submittedAt", "desc")
        );

        const snapshot = await getDocs(q);

        allSubmissions = [];

        snapshot.forEach((doc) => {

            allSubmissions.push({
                id: doc.id,
                ...doc.data()
            });

        });

        totalCount.textContent = allSubmissions.length;

        displaySubmissions(allSubmissions);

    } catch (error) {

        console.error(error);

        submissionsList.innerHTML = `
            <div class="empty">
                Unable to load submissions.
            </div>
        `;

    }
}


/* =========================
   DISPLAY
========================= */

function displaySubmissions(data) {

    if (data.length === 0) {

        submissionsList.innerHTML = `
            <div class="empty">
                No submissions found.
            </div>
        `;

        return;
    }


    submissionsList.innerHTML = data.map(student => {

        let submittedTime = "Time unavailable";

        if (student.submittedAt) {

            submittedTime =
                student.submittedAt.toDate()
                .toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });

        }


        return `
            <div class="submission-card">

                <div class="student-top">

                    <div class="student-name">
                        ${escapeHTML(student.name || "-")}
                    </div>

                    <div class="student-time">
                        ${submittedTime}
                    </div>

                </div>


                <div class="details">

                    <div>
                        <div class="detail-label">
                            PHONE NUMBER
                        </div>

                        <div class="detail-value">
                            ${escapeHTML(student.phone || "-")}
                        </div>
                    </div>


                    <div>
                        <div class="detail-label">
                            VILLAGE
                        </div>

                        <div class="detail-value">
                            ${escapeHTML(student.village || "-")}
                        </div>
                    </div>


                    <div>
                        <div class="detail-label">
                            SSLC TARGET
                        </div>

                        <div class="detail-value">
                            <span class="target">
                                ${escapeHTML(student.targetPercentage || "-")}%
                            </span>
                        </div>
                    </div>

                </div>

            </div>
        `;

    }).join("");
}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener("input", () => {

    const search =
        searchInput.value.trim().toLowerCase();

    const filtered = allSubmissions.filter(student => {

        return (
            (student.name || "").toLowerCase().includes(search) ||
            (student.phone || "").toLowerCase().includes(search) ||
            (student.village || "").toLowerCase().includes(search)
        );

    });

    displaySubmissions(filtered);

});


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
