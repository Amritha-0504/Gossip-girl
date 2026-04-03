// js/db.js – All Firestore CRUD operations

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    Timestamp,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { db } from "./firebase.js";

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function getUser(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function createUser(uid, data) {
    await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function setUserRole(uid, role) {
    await setDoc(doc(db, "users", uid), { role }, { merge: true });
}

export async function updatePenName(uid, penName) {
    await setDoc(doc(db, "users", uid), { penName }, { merge: true });
}

export async function updateProfile(uid, { penName, avatarEmoji, avatarColor, userId, authEmail, hasPassword } = {}) {
    const data = { profileSetupDone: true };
    if (penName !== undefined) data.penName = penName;
    if (avatarEmoji !== undefined) data.avatarEmoji = avatarEmoji;
    if (avatarColor !== undefined) data.avatarColor = avatarColor;
    if (userId !== undefined) data.userId = userId;
    if (authEmail !== undefined) data.authEmail = authEmail;
    if (hasPassword !== undefined) data.hasPassword = hasPassword;
    await setDoc(doc(db, "users", uid), data, { merge: true });
}

/** Returns true if no other user has this userId handle */
export async function isUserIdAvailable(handle) {
    const q = query(collection(db, "users"), where("userId", "==", handle));
    const snap = await getDocs(q);
    return snap.empty;
}

export async function updatePost(postId, content) {
    await updateDoc(doc(db, "posts", postId), { content, updatedAt: serverTimestamp() });
}

export async function getUserByUsername(username) {
    const q = query(
        collection(db, "users"),
        where("username", "==", username)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, ...d.data() };
}

/** Look up a user by their @userId handle */
export async function getUserByUserId(handle) {
    const q = query(
        collection(db, "users"),
        where("userId", "==", handle.toLowerCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, ...d.data() };
}

export async function fetchUsersByUids(uids) {
    if (!uids || uids.length === 0) return [];
    const results = [];
    for (const uid of uids) {
        const u = await getUser(uid);
        if (u) results.push(u);
    }
    return results;
}

export async function fetchAllUsers() {
    const snap = await getDocs(collection(db, "users"));
    const roleOrder = { admin: 0, author: 1, viewer: 2 };
    return snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => {
            const ro = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
            if (ro !== 0) return ro;
            return (a.penName || "").localeCompare(b.penName || "");
        });
}

// ─── POSTS ────────────────────────────────────────────────────────────────────

export async function createPost(authorId, content, dateStr) {
    const ref = await addDoc(collection(db, "posts"), {
        authorId,
        content,
        datePosted: dateStr,
        likes: [],
        unlikes: [],
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function fetchPostsByDate(dateStr) {
    const q = query(
        collection(db, "posts"),
        where("datePosted", "==", dateStr)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ postId: d.id, ...d.data() }))
        .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
        });
}

export async function fetchPostsByAuthor(authorId) {
    const q = query(
        collection(db, "posts"),
        where("authorId", "==", authorId)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ postId: d.id, ...d.data() }))
        .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
        });
}

export async function deletePost(postId) {
    await deleteDoc(doc(db, "posts", postId));
}

// ─── LIKES / UNLIKES ──────────────────────────────────────────────────────────

export async function toggleLike(postId, uid) {
    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const { likes = [], unlikes = [] } = snap.data();
    const alreadyLiked = likes.includes(uid);
    if (alreadyLiked) {
        await updateDoc(ref, { likes: arrayRemove(uid) });
    } else {
        await updateDoc(ref, {
            likes: arrayUnion(uid),
            unlikes: arrayRemove(uid),
        });
    }
}

export async function toggleUnlike(postId, uid) {
    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const { unlikes = [], likes = [] } = snap.data();
    const alreadyUnliked = unlikes.includes(uid);
    if (alreadyUnliked) {
        await updateDoc(ref, { unlikes: arrayRemove(uid) });
    } else {
        await updateDoc(ref, {
            unlikes: arrayUnion(uid),
            likes: arrayRemove(uid),
        });
    }
}

// ─── COMMENTS ─────────────────────────────────────────────────────────────────

export async function addComment(postId, userId, content, mentions = []) {
    const ref = await addDoc(collection(db, "comments"), {
        postId,
        userId,
        content,
        mentions,
        timestamp: serverTimestamp(),
    });
    return ref.id;
}

export async function fetchComments(postId) {
    const q = query(
        collection(db, "comments"),
        where("postId", "==", postId)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ commentId: d.id, ...d.data() }))
        .sort((a, b) => {
            const ta = a.timestamp?.toMillis?.() ?? 0;
            const tb = b.timestamp?.toMillis?.() ?? 0;
            return ta - tb;
        });
}

export async function deleteComment(commentId) {
    await deleteDoc(doc(db, "comments", commentId));
}

// ─── POST VIEWS ───────────────────────────────────────────────────────────────

export async function logView(postId, uid) {
    const ref = doc(db, "post_views", postId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        await updateDoc(ref, { viewedBy: arrayUnion(uid) });
    } else {
        await setDoc(ref, { postId, viewedBy: [uid] });
    }
}

export async function fetchViewers(postId) {
    const snap = await getDoc(doc(db, "post_views", postId));
    return snap.exists() ? snap.data().viewedBy || [] : [];
}

// ─── AUTHOR REQUESTS ──────────────────────────────────────────────────────────

export async function requestAuthorRole(uid, displayName = "") {
    const q = query(
        collection(db, "author_requests"),
        where("userId", "==", uid),
        where("status", "in", ["pending", "accepted"])
    );
    const existing = await getDocs(q);
    if (!existing.empty) return null;

    const ref = await addDoc(collection(db, "author_requests"), {
        userId: uid,
        displayName,
        status: "pending",
        requestDate: serverTimestamp(),
    });
    return ref.id;
}

export async function fetchAllRequests() {
    const snap = await getDocs(collection(db, "author_requests"));
    return snap.docs
        .map((d) => ({ requestId: d.id, ...d.data() }))
        .sort((a, b) => {
            const ta = a.requestDate?.toMillis?.() ?? 0;
            const tb = b.requestDate?.toMillis?.() ?? 0;
            return tb - ta;
        });
}

export async function fetchPendingRequests() {
    const q = query(
        collection(db, "author_requests"),
        where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ requestId: d.id, ...d.data() }))
        .sort((a, b) => {
            const ta = a.requestDate?.toMillis?.() ?? 0;
            const tb = b.requestDate?.toMillis?.() ?? 0;
            return ta - tb;
        });
}

export async function updateRequestStatus(requestId, status) {
    await updateDoc(doc(db, "author_requests", requestId), { status });
}

export async function hasRequestedAuthorRole(uid) {
    const q = query(
        collection(db, "author_requests"),
        where("userId", "==", uid)
    );
    const snap = await getDocs(q);
    return snap.docs.some((d) => ["pending", "accepted"].includes(d.data().status));
}

// ─── SINGLE POST ───────────────────────────────────────────────────────────────

export async function getPostById(postId) {
    const snap = await getDoc(doc(db, "posts", postId));
    return snap.exists() ? { postId: snap.id, ...snap.data() } : null;
}

// ─── ACCOUNT DELETION ─────────────────────────────────────────────────────────

/** Delete all Firestore data for a user (posts, comments, views, requests, user doc) */
export async function deleteUserAccount(uid) {
    // Delete user's posts
    const postsQ = query(collection(db, "posts"), where("authorId", "==", uid));
    const postsSnap = await getDocs(postsQ);
    for (const d of postsSnap.docs) await deleteDoc(d.ref);

    // Delete user's comments
    const commentsQ = query(collection(db, "comments"), where("userId", "==", uid));
    const commentsSnap = await getDocs(commentsQ);
    for (const d of commentsSnap.docs) await deleteDoc(d.ref);

    // Delete user's author requests
    const reqsQ = query(collection(db, "author_requests"), where("userId", "==", uid));
    const reqsSnap = await getDocs(reqsQ);
    for (const d of reqsSnap.docs) await deleteDoc(d.ref);

    // Delete user doc
    await deleteDoc(doc(db, "users", uid));
}
