// js/auth.js – Authentication helpers

import {
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously as fbSignInAnonymously,
    signOut as fbSignOut,
    onAuthStateChanged as fbOnAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { auth, ADMIN_EMAIL } from "./firebase.js";
import { getUser, createUser, setUserRole } from "./db.js";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
    const result = await signInWithPopup(auth, provider);
    return result.user;
}

export async function signInAnonymously() {
    const result = await fbSignInAnonymously(auth);
    return result.user;
}

export async function signOut() {
    await fbSignOut(auth);
}

export function onAuthStateChanged(callback) {
    return fbOnAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) { callback(null); return; }

        const isAdminEmail = firebaseUser.email === ADMIN_EMAIL;

        const baseline = {
            uid: firebaseUser.uid,
            realName: firebaseUser.displayName || null,
            email: firebaseUser.email || null,
            username: firebaseUser.email
                ? firebaseUser.email.split("@")[0].toLowerCase()
                : `anon_${firebaseUser.uid.slice(0, 6)}`,
            penName: null,
            avatarEmoji: null,
            avatarColor: isAdminEmail ? "#dc2626" : "#7c3aed", // red default for admin
            profileSetupDone: false,
            role: isAdminEmail ? "admin" : "viewer",
            isAnonymous: firebaseUser.isAnonymous,
        };

        let firestoreUser = await getUser(firebaseUser.uid);

        if (!firestoreUser) {
            // First login — create doc
            await createUser(firebaseUser.uid, baseline);
            firestoreUser = baseline;
        }

        // Always enforce admin role for the designated admin email
        if (isAdminEmail && firestoreUser.role !== "admin") {
            await setUserRole(firebaseUser.uid, "admin");
            firestoreUser.role = "admin";
        }

        const merged = {
            ...baseline,
            ...firestoreUser,
            uid: firebaseUser.uid,
            realName: firebaseUser.displayName || firestoreUser.realName || null,
            email: firebaseUser.email || firestoreUser.email || null,
            // Admin email always gets admin role — cannot be overridden
            role: isAdminEmail ? "admin" : (firestoreUser.role || "viewer"),
        };

        callback(merged);
    });
}
