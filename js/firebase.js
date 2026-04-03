// js/firebase.js – Firebase initialisation singleton

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyBHGBkPMTN-eGPlhUQDFy1gVmrnBU5hvcI",
    authDomain: "gossip-girl-2505.firebaseapp.com",
    projectId: "gossip-girl-2505",
    storageBucket: "gossip-girl-2505.firebasestorage.app",
    messagingSenderId: "856773642772",
    appId: "1:856773642772:web:d2d467460bf966353e3501",
    measurementId: "G-Q3034BLXWL",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// ── Admin Configuration ────────────────────────────────────────────────────────
// The Google account with this email is always the admin.
// Change this to your own Gmail address.
export const ADMIN_EMAIL = "05amritha2004@gmail.com";
