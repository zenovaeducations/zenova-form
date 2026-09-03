console.log("Auth.js Loaded");
import { auth, db } from "./firebase.js";

import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const googleBtn = document.getElementById("googleLoginBtn");

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
    prompt: "select_account"
});


// -------------------------------
// Google Login
// -------------------------------

if (googleBtn) {

    googleBtn.addEventListener("click", async () => {

        try {

            googleBtn.disabled = true;
            googleBtn.innerHTML = "Signing In...";

            const result = await signInWithPopup(auth, provider);

            const user = result.user;

            const studentRef = doc(db, "students", user.uid);

            const studentSnap = await getDoc(studentRef);

            // First Login
            if (!studentSnap.exists()) {

                await setDoc(studentRef, {

                    uid: user.uid,

                    displayName: user.displayName || "",

                    email: user.email || "",

                    photoURL: user.photoURL || "",

                    profileComplete: false,

                    createdAt: serverTimestamp(),

                    lastLogin: serverTimestamp()

                });

                window.location.href = "onboarding/index.html";

            }

            // Existing Student
            else {

                await setDoc(studentRef, {

                    lastLogin: serverTimestamp()

                }, { merge: true });

                const data = studentSnap.data();

                if (data.profileComplete) {

                    window.location.href = "home.html";

                } else {

                    window.location.href = "onboarding/index.html";

                }

            }

        }

        catch (error) {

            console.error(error);

            alert(error.message);

            googleBtn.disabled = false;

            googleBtn.innerHTML = "Continue with Google";

        }

    });

}



// ------------------------------------
// Already Logged In
// ------------------------------------

onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    const studentRef = doc(db, "students", user.uid);

    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) return;

    const data = studentSnap.data();

    if (data.profileComplete) {

        window.location.href = "home.html";

    } else {

        window.location.href = "onboarding/index.html";

    }

});
