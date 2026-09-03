// ===============================
// Firebase SDK Imports
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";


// ===============================
// Firebase Configuration
// Replace with your Firebase values
// ===============================

const firebaseConfig = {
    apiKey: "AIzaSyAcqxS2SIpMyaY-jYOz0Y-t67Taa04Fy1o",
    authDomain: "zenova-educations.firebaseapp.com",
    projectId: "zenova-educations",
    storageBucket: "zenova-educations.firebasestorage.app",
    messagingSenderId: "66782392979",
    appId: "1:66782392979:web:2e0c7e70b688401b4f5366",
    measurementId: "G-7JL1SFKDHE"

};


// ===============================
// Initialize Firebase
// ===============================

const app = initializeApp(firebaseConfig);


// ===============================
// Firebase Services
// ===============================

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);


// ===============================
// Export Services
// ===============================

export {

    auth,

    db,

    storage

};
