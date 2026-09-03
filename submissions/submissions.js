// ==========================================================
// ZENOVA EDUCATIONS
// STUDENT SUBMISSIONS
// ==========================================================

import { db } from "../firebase-config.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// ==========================================================
// ELEMENTS
// ==========================================================

const form =
    document.getElementById(
        "submissionForm"
    );

const nameInput =
    document.getElementById(
        "name"
    );

const phoneInput =
    document.getElementById(
        "phone"
    );

const villageInput =
    document.getElementById(
        "village"
    );

const targetInput =
    document.getElementById(
        "targetPercentage"
    );

const submitButton =
    document.getElementById(
        "submitButton"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const successMessage =
    document.getElementById(
        "successMessage"
    );


// ==========================================================
// PHONE — ONLY NUMBERS
// ==========================================================

phoneInput.addEventListener(
    "input",
    () => {

        phoneInput.value =
            phoneInput.value
                .replace(/\D/g, "")
                .slice(0,10);

    }
);


// ==========================================================
// TARGET VALIDATION
// ==========================================================

targetInput.addEventListener(
    "input",
    () => {

        let value =
            Number(
                targetInput.value
            );


        if(value > 100){

            targetInput.value = "100";

        }

        if(value < 0){

            targetInput.value = "0";

        }

    }
);


// ==========================================================
// SUBMIT
// ==========================================================

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        hideMessages();


        const name =
            nameInput.value.trim();

        const phone =
            phoneInput.value.trim();

        const village =
            villageInput.value.trim();

        const targetPercentage =
            Number(
                targetInput.value
            );


        // ------------------------------------------
        // VALIDATION
        // ------------------------------------------

        if(!name){

            showError(
                "Please enter your name."
            );

            nameInput.focus();

            return;

        }


        if(!/^[0-9]{10}$/.test(phone)){

            showError(
                "Please enter a valid 10-digit phone number."
            );

            phoneInput.focus();

            return;

        }


        if(!village){

            showError(
                "Please enter your village name."
            );

            villageInput.focus();

            return;

        }


        if(
            !Number.isFinite(
                targetPercentage
            ) ||
            targetPercentage < 0 ||
            targetPercentage > 100
        ){

            showError(
                "Target percentage must be between 0 and 100."
            );

            targetInput.focus();

            return;

        }


        // ------------------------------------------
        // LOADING
        // ------------------------------------------

        submitButton.disabled =
            true;

        submitButton.innerHTML = `
            <i class="ri-loader-4-line"></i>
            <span>Submitting...</span>
        `;


        try{

            // --------------------------------------
            // SAVE
            // --------------------------------------

            await addDoc(
    collection(db, "submissions"),
    {
        name,
        phone,
        village,
        targetPercentage,
        submittedAt: serverTimestamp()
    }
);

form.reset();

/* Show full-screen success */
const successScreen = document.getElementById("successScreen");

successScreen.classList.add("show");

/* Return to form after 3 seconds */
setTimeout(() => {
    successScreen.classList.remove("show");
}, 3000);

            // --------------------------------------
            // RESET FORM
            // --------------------------------------

            form.reset();


            // Ready for next student

            nameInput.focus();


        }
        catch(error){

            console.error(
                "Submission error:",
                error
            );


            showError(
                "Unable to submit. Please try again."
            );

        }
        finally{

            submitButton.disabled =
                false;

            submitButton.innerHTML = `
                <span>Submit Details</span>
                <i class="ri-arrow-right-line"></i>
            `;

        }

    }
);


// ==========================================================
// ERROR
// ==========================================================

function showError(
    message
){

    errorMessage.textContent =
        message;

    errorMessage.classList.add(
        "show"
    );

}


// ==========================================================
// SUCCESS
// ==========================================================

function showSuccess(
    message
){

    successMessage.textContent =
        message;

    successMessage.classList.add(
        "show"
    );

}


// ==========================================================
// HIDE MESSAGES
// ==========================================================

function hideMessages(){

    errorMessage.classList.remove(
        "show"
    );

    successMessage.classList.remove(
        "show"
    );

}
