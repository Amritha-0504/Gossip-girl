// js/auth.js – Authentication helpers (Google + userId/Password)

import {
    GoogleAuthProvider,
    EmailAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    linkWithCredential,
    signInAnonymously as fbSignInAnonymously,
    signOut as fbSignOut,
    onAuthStateChanged as fbOnAuthStateChanged,
    deleteUser as fbDeleteUser,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { auth, ADMIN_EMAIL } from "./firebase.js";
import { getUser, createUser, setUserRole, getUserByUserId } from "./db.js";

const googleProvider = new GoogleAuthProvider();

// ─── Google Sign-In ───────────────────────────────────────────────────────────
export async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

// ─── Anonymous Sign-In ────────────────────────────────────────────────────────
export async function signInAnonymously() {
    const result = await fbSignInAnonymously(auth);
    return result.user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut() {
    await fbSignOut(auth);
}

// ─── Sign In with @userId + Password ──────────────────────────────────────────
export async function signInWithUserIdPassword(userId, password) {
    // Look up the user in Firestore to find their linked email
    const user = await getUserByUserId(userId);
    if (!user) throw new Error("User @" + userId + " not found.");
    if (!user.authEmail) throw new Error("This account hasn't set a password yet. Please sign in with Google first.");
    return signInWithEmailAndPassword(auth, user.authEmail, password);
}

// ─── Link Password to Google Account ──────────────────────────────────────────
// Called during profile setup or from profile modal
export async function linkPasswordToAccount(password) {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("Not signed in.");
    // Create a synthetic email from the uid for password auth
    const authEmail = `${firebaseUser.uid}@gossip-girl-2505.firebaseapp.com`;
    const credential = EmailAuthProvider.credential(authEmail, password);
    try {
        await linkWithCredential(firebaseUser, credential);
    } catch (err) {
        // If already linked, that's fine
        if (err.code === "auth/provider-already-linked") return authEmail;
        throw err;
    }
    return authEmail;
}

// ─── Delete Firebase Auth User ────────────────────────────────────────────────
export async function deleteCurrentUser() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("Not signed in.");
    await fbDeleteUser(firebaseUser);
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
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
            avatarColor: isAdminEmail ? "#dc2626" : "#7c3aed",
            profileSetupDone: false,
            role: isAdminEmail ? "admin" : "viewer",
            isAnonymous: firebaseUser.isAnonymous,
        };

        let firestoreUser = await getUser(firebaseUser.uid);

        if (!firestoreUser) {
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
            role: isAdminEmail ? "admin" : (firestoreUser.role || "viewer"),
        };

        callback(merged);
    });
}
