// js/pages/feed.js – Viewer/everyone feed: IG-style cards, inline comments, profile modal

import {
  fetchPostsByDate,
  toggleLike,
  toggleUnlike,
  addComment,
  fetchComments,
  logView,
  requestAuthorRole,
  hasRequestedAuthorRole,
  getUser,
  deleteComment,
  deletePost,
  getPostById,
  fetchViewers,
  updateProfile,
  deleteUserAccount,
} from "../db.js";
import { signOut, deleteCurrentUser } from "../auth.js";
import { todayStr, prevDay, nextDay, formatDisplay, isFuture } from "../utils/dateUtils.js";
import { publicName, userAvatar, avatarColor, canRevealIdentities } from "../utils/anonymity.js";
import { parseComment, extractMentions } from "../utils/tagging.js";
import { navigate } from "../router.js";

const EMOJIS = ["🦊", "🐱", "🦋", "🌸", "🎭", "🌙", "⭐", "🔮", "💎", "🐝", "🐧", "🦄"];
const COLORS = ["#7c3aed", "#db2777", "#059669", "#d97706", "#2563eb", "#dc2626"];

let currentDate = todayStr();
let currentUser = null;
let container = null;

// ─── RENDER ENTRY ─────────────────────────────────────────────────────────────

export async function renderFeed(el, user) {
  container = el;
  currentUser = user;
  currentDate = todayStr();
  await buildFeed();
}

// ─── BUILD PAGE SHELL ─────────────────────────────────────────────────────────

async function buildFeed() {
  container.innerHTML = `
    <div class="gg-app">

      <!-- IG-style Top Nav -->
      <header class="gg-header">
        <div class="gg-header-left">
          <div class="brand-logo-sm">GG</div>
          <span class="gg-brand-name">Gossip Girl</span>
        </div>
        <div class="gg-header-right">
          <button id="nav-identity" class="gg-avatar-btn" title="Edit your profile">
            ${renderAvatarHtml(currentUser, 32)}
          </button>
          <button id="btn-signout" class="gg-signout-btn">Sign Out</button>
        </div>
      </header>

      <!-- Request Banner (viewers only) -->
      <div id="request-banner"></div>

      <!-- Date Nav -->
      <div class="gg-date-nav">
        <button id="btn-prev" class="gg-date-arrow">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="gg-date-pill">
          <span class="gg-date-label-sm">Gossip for</span>
          <span id="date-label" class="gg-date-value"></span>
        </div>
        <button id="btn-next" class="gg-date-arrow">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Posts -->
      <main id="posts-container" class="max-w-xl mx-auto px-4 pb-16 space-y-0">
        <div class="flex justify-center py-12"><div class="spinner"></div></div>
      </main>
    </div>

    <!-- Profile Modal -->
    ${renderProfileModalHtml()}

    <!-- Admin Identity Popup -->
    <div id="identity-popup" class="gg-popup hidden">
      <div id="identity-popup-content"></div>
    </div>`;

  // Wire nav
  document.getElementById("btn-signout").addEventListener("click", () => signOut());
  document.getElementById("nav-identity").addEventListener("click", () => openProfileModal());

  // Date nav
  document.getElementById("btn-prev").addEventListener("click", async () => {
    currentDate = prevDay(currentDate);
    updateDateLabel();
    await loadPosts();
  });
  document.getElementById("btn-next").addEventListener("click", async () => {
    const nd = nextDay(currentDate);
    if (!isFuture(nd)) {
      currentDate = nd;
      updateDateLabel();
      await loadPosts();
    }
  });

  // Profile modal
  wireProfileModal();

  // Admin: close popup on outside click
  document.addEventListener("click", closeIdentityPopup, { capture: true });

  updateDateLabel();
  await buildRequestBanner();
  await loadPosts();
}

function updateDateLabel() {
  const el = document.getElementById("date-label");
  if (el) el.textContent = formatDisplay(currentDate);
}

// ─── REQUEST BANNER ───────────────────────────────────────────────────────────

async function buildRequestBanner() {
  if (currentUser.isAnonymous || currentUser.role !== "viewer") return;
  const el = document.getElementById("request-banner");
  if (!el) return;
  const already = await hasRequestedAuthorRole(currentUser.uid);
  if (already) {
    el.innerHTML = `<div class="max-w-xl mx-auto px-4 pb-3">
      <div class="gg-card py-3 text-center text-purple-300 text-sm">✅ Author request sent — hang tight!</div>
    </div>`;
  } else {
    el.innerHTML = `<div class="max-w-xl mx-auto px-4 pb-3">
      <div class="gg-card py-3 flex items-center justify-between gap-3">
        <p class="text-purple-200 text-sm">Want to post gossip? Request author access.</p>
        <button id="btn-request-author" class="btn-accent-sm shrink-0">Request Access</button>
      </div>
    </div>`;
    document.getElementById("btn-request-author").addEventListener("click", async (e) => {
      e.target.disabled = true; e.target.textContent = "Sending…";
      await requestAuthorRole(currentUser.uid, currentUser.penName || currentUser.username);
      await buildRequestBanner();
    });
  }
}

// ─── LOAD POSTS ───────────────────────────────────────────────────────────────

async function loadPosts() {
  const el = document.getElementById("posts-container");
  if (!el) return;
  el.innerHTML = `<div class="flex justify-center py-12"><div class="spinner"></div></div>`;

  const posts = await fetchPostsByDate(currentDate);

  if (posts.length === 0) {
    el.innerHTML = `<div class="text-center py-16 text-gray-400">
      <p class="text-4xl mb-3">🤫</p>
      <p>No gossip yet for this day.</p>
    </div>`;
    return;
  }

  // Pre-fetch authors in parallel
  const authorUids = [...new Set(posts.map(p => p.authorId))];
  const authorMap = {};
  await Promise.all(authorUids.map(uid => getUser(uid).then(u => { authorMap[uid] = u; })));

  // Log views
  for (const post of posts) logView(post.postId, currentUser.uid).catch(() => { });

  el.innerHTML = "";
  for (const post of posts) {
    const card = buildPostCard(post, authorMap[post.authorId]);
    el.appendChild(card);
  }
}

// ─── IG POST CARD ─────────────────────────────────────────────────────────────

function buildPostCard(post, author) {
  const name = escapeHtml(publicName(author));
  const av = userAvatar(author);
  const col = avatarColor(author);
  const isEmoji = !!(author?.avatarEmoji);
  const likeCount = post.likes?.length || 0;
  const unlikeCount = post.unlikes?.length || 0;
  const isLiked = post.likes?.includes(currentUser.uid);
  const isUnliked = post.unlikes?.includes(currentUser.uid);
  const isOwnPost = currentUser.uid === post.authorId;
  const isAdmin = canRevealIdentities(currentUser);

  const card = document.createElement("div");
  card.className = "ig-post-card animate-fadeIn";
  card.dataset.postId = post.postId;

  card.innerHTML = `
    <!-- IG-style post header -->
    <div class="ig-post-header">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="ig-story-ring ${isAdmin ? "cursor-pointer" : ""}">
          <div class="ig-avatar" style="background:${isEmoji ? "#1e1b4b" : col}; font-size:${isEmoji ? "1.1rem" : "0.85rem"}">
            ${escapeHtml(av)}
          </div>
        </div>
        <div class="min-w-0">
          <p class="text-white font-semibold text-sm leading-tight truncate">${name}</p>
          <p class="text-gray-500 text-xs">${formatDisplay(post.datePosted)}${post.updatedAt ? " · edited" : ""}</p>
        </div>
      </div>
      <!-- Admin / own post actions -->
      <div class="flex items-center gap-1 shrink-0">
        ${isAdmin ? `
        <button class="admin-view-btn ig-btn-ghost text-green-400 text-xs flex items-center gap-1" title="See viewers">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>` : ""}
        ${(isAdmin || isOwnPost) ? `
        <button class="delete-post-btn ig-btn-ghost text-red-400" title="Delete post">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>` : ""}
      </div>
    </div>

    <!-- Post content -->
    <div class="ig-post-content">${parseComment(post.content)}</div>

    <!-- IG action bar -->
    <div class="ig-action-bar">
      <button class="like-btn ig-action-icon ${isLiked ? "ig-liked" : ""}" title="Like">
        <svg class="w-6 h-6" fill="${isLiked ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
        </svg>
      </button>
      <button class="comments-toggle ig-action-icon" title="Comments">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </button>
      <button class="unlike-btn ig-action-icon ${isUnliked ? "ig-unliked" : ""}" title="Dislike">
        <svg class="w-6 h-6" fill="${isUnliked ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/>
        </svg>
      </button>
    </div>

    <!-- Counts row -->
    <div class="px-4 pb-1">
      <p class="text-white text-sm font-semibold">
        <span class="like-count">${likeCount}</span> likes
        ${unlikeCount > 0 ? `<span class="text-gray-500 font-normal"> · <span class="unlike-count">${unlikeCount}</span> 👎</span>` : `<span class="unlike-count hidden">${unlikeCount}</span>`}
      </p>
      <button class="comments-toggle text-gray-500 text-xs mt-0.5 hover:text-gray-300 transition-colors">
        View <span class="comment-count-label">all comments</span>
      </button>
    </div>

    <!-- Inline Comments Section (hidden until toggled) -->
    <div class="comments-section hidden px-4 pt-3 pb-2 border-t border-white/5 mt-2">
      <div class="comments-list space-y-2 mb-3">
        <div class="flex justify-center py-2"><div class="spinner-sm"></div></div>
      </div>
      ${!currentUser.isAnonymous ? `
      <div class="flex items-center gap-2 mt-2">
        <div class="ig-avatar-sm" style="background:${currentUser.avatarEmoji ? "#1e1b4b" : avatarColor(currentUser)}; font-size:${currentUser.avatarEmoji ? "0.75rem" : "0.6rem"}">
          ${escapeHtml(userAvatar(currentUser))}
        </div>
        <input class="comment-input ig-comment-input flex-1" placeholder="Add a comment…" maxlength="500"/>
        <button class="comment-send text-purple-400 text-sm font-semibold hover:text-white transition-colors">Post</button>
      </div>` : ""}
    </div>`;

  // Like
  card.querySelector(".like-btn").addEventListener("click", () => handleLike(post.postId, card));
  // Unlike
  card.querySelector(".unlike-btn").addEventListener("click", () => handleUnlike(post.postId, card));

  // Toggle comments (both icon + "View all" link)
  let commentsLoaded = false;
  card.querySelectorAll(".comments-toggle").forEach(btn => {
    btn.addEventListener("click", async () => {
      const section = card.querySelector(".comments-section");
      section.classList.toggle("hidden");
      if (!section.classList.contains("hidden") && !commentsLoaded) {
        commentsLoaded = true;
        await loadInlineComments(post.postId, card);
      }
    });
  });

  // Send comment
  const sendBtn = card.querySelector(".comment-send");
  if (sendBtn) {
    sendBtn.addEventListener("click", () => handleComment(post.postId, card));
    card.querySelector(".comment-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(post.postId, card); }
    });
  }

  // Admin: story ring / avatar click → identity popup
  if (isAdmin) {
    card.querySelector(".ig-story-ring")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await showIdentityPopup(post.authorId, e.currentTarget);
    });
    card.querySelector(".admin-view-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showViewersPopup(post.postId, e.currentTarget);
    });
  }

  // Delete
  if (isAdmin || isOwnPost) {
    card.querySelector(".delete-post-btn")?.addEventListener("click", async () => {
      if (!confirm("Delete this post?")) return;
      await deletePost(post.postId);
      card.remove();
      showToast("Post deleted.", "info");
    });
  }

  return card;
}

// ─── LIKE / UNLIKE ────────────────────────────────────────────────────────────

async function handleLike(postId, card) {
  await toggleLike(postId, currentUser.uid);
  const post = await getPostById(postId);
  if (post) updateCardCounts(card, post);
}

async function handleUnlike(postId, card) {
  await toggleUnlike(postId, currentUser.uid);
  const post = await getPostById(postId);
  if (post) updateCardCounts(card, post);
}

function updateCardCounts(card, post) {
  const isLiked = post.likes?.includes(currentUser.uid);
  const isUnliked = post.unlikes?.includes(currentUser.uid);
  const likeCount = post.likes?.length || 0;
  const unlikeCount = post.unlikes?.length || 0;

  const likeBtn = card.querySelector(".like-btn");
  const unlikeBtn = card.querySelector(".unlike-btn");
  likeBtn.classList.toggle("ig-liked", isLiked);
  unlikeBtn.classList.toggle("ig-unliked", isUnliked);
  likeBtn.querySelector("svg").setAttribute("fill", isLiked ? "currentColor" : "none");
  unlikeBtn.querySelector("svg").setAttribute("fill", isUnliked ? "currentColor" : "none");
  card.querySelector(".like-count").textContent = likeCount;
  const unlikeEl = card.querySelector(".unlike-count");
  if (unlikeEl) unlikeEl.textContent = unlikeCount;
}

// ─── INLINE COMMENTS ──────────────────────────────────────────────────────────

async function loadInlineComments(postId, card) {
  const list = card.querySelector(".comments-list");
  const comments = await fetchComments(postId);
  const countLabel = card.querySelector(".comment-count-label");
  if (countLabel) countLabel.textContent = `${comments.length} comment${comments.length !== 1 ? "s" : ""}`;

  if (comments.length === 0) {
    list.innerHTML = `<p class="text-gray-500 text-xs italic text-center py-2">No comments yet — be first!</p>`;
    return;
  }

  const commenterUids = [...new Set(comments.map(c => c.userId))];
  const userMap = {};
  await Promise.all(commenterUids.map(uid => getUser(uid).then(u => { userMap[uid] = u; })));

  list.innerHTML = comments.map(c => {
    const cUser = userMap[c.userId];
    const cName = escapeHtml(publicName(cUser));
    const cAv = userAvatar(cUser);
    const cCol = avatarColor(cUser);
    const isEmojiC = !!(cUser?.avatarEmoji);
    const isAdmin = canRevealIdentities(currentUser);
    const isMine = c.userId === currentUser.uid;

    return `
      <div class="comment-item flex gap-2 items-start group" data-comment-id="${c.commentId}" data-user-id="${c.userId}">
        <div class="ig-avatar-sm ${isAdmin ? "cursor-pointer hover:ring-2 hover:ring-purple-400 commenter-avatar" : ""}"
          style="background:${isEmojiC ? "#1e1b4b" : cCol}; font-size:${isEmojiC ? "0.75rem" : "0.6rem"}"
          data-user-id="${c.userId}">
          ${escapeHtml(cAv)}
        </div>
        <div class="flex-1 min-w-0">
          <span class="text-purple-300 text-xs font-semibold ${isAdmin ? "cursor-pointer hover:text-purple-200 commenter-name-btn" : ""} mr-1"
            data-user-id="${c.userId}">${cName}</span>
          <span class="text-gray-200 text-sm break-words">${parseComment(c.content)}</span>
        </div>
        ${(isMine || canRevealIdentities(currentUser)) ? `
        <button class="delete-comment-btn opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0"
          data-comment-id="${c.commentId}" title="Delete comment">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>` : ""}
      </div>`;
  }).join("");

  // Admin: clicking avatar or name shows identity popup
  if (canRevealIdentities(currentUser)) {
    list.querySelectorAll(".commenter-avatar, .commenter-name-btn").forEach(el => {
      el.addEventListener("click", async (e) => {
        e.stopPropagation();
        const uid = el.closest("[data-user-id]")?.dataset.userId || el.dataset.userId;
        await showIdentityPopup(uid, e.currentTarget);
      });
    });
  }

  // Delete comment
  list.querySelectorAll(".delete-comment-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await deleteComment(btn.dataset.commentId);
      await loadInlineComments(postId, card);
    });
  });
}

async function handleComment(postId, card) {
  const input = card.querySelector(".comment-input");
  const text = input.value.trim();
  if (!text) return;
  const sendBtn = card.querySelector(".comment-send");
  sendBtn.disabled = true; sendBtn.textContent = "…";
  const mentions = extractMentions(text);
  await addComment(postId, currentUser.uid, text, mentions);
  input.value = "";
  sendBtn.disabled = false; sendBtn.textContent = "Post";
  await loadInlineComments(postId, card);
}

// ─── ADMIN IDENTITY POPUP ─────────────────────────────────────────────────────

async function showIdentityPopup(uid, anchorEl) {
  const popup = document.getElementById("identity-popup");
  const content = document.getElementById("identity-popup-content");
  content.innerHTML = `<div class="flex justify-center py-2"><div class="spinner-sm"></div></div>`;
  popup.classList.remove("hidden");

  const u = await getUser(uid);
  const realName = u?.realName || "—";
  const email = u?.email || "—";
  const pen = publicName(u);
  const role = u?.role || "viewer";
  const handle = u?.userId ? `@${u.userId}` : "—";

  content.innerHTML = `
    <p class="text-purple-300 text-xs uppercase tracking-widest mb-2">Identity • Admin View</p>
    <div class="flex items-center gap-2 mb-2">
      <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
        style="background:${avatarColor(u)}">${escapeHtml(userAvatar(u))}</div>
      <div>
        <p class="text-white font-semibold text-sm">${escapeHtml(pen)}</p>
        <span class="role-badge badge-${role} text-xs">${role}</span>
      </div>
    </div>
    <div class="space-y-1 text-xs">
      <p class="text-gray-400">Handle: <span class="text-purple-300 font-mono">${escapeHtml(handle)}</span></p>
      <p class="text-gray-400">Real name: <span class="text-white font-medium">${escapeHtml(realName)}</span></p>
      <p class="text-gray-400">Email: <span class="text-white font-medium">${escapeHtml(email)}</span></p>
    </div>`;

  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = `${rect.bottom + window.scrollY + 8}px`;
  popup.style.left = `${Math.max(8, rect.left - 60)}px`;
}

async function showViewersPopup(postId, anchorEl) {
  const popup = document.getElementById("identity-popup");
  const content = document.getElementById("identity-popup-content");
  content.innerHTML = `<div class="flex justify-center py-2"><div class="spinner-sm"></div></div>`;
  popup.classList.remove("hidden");

  const viewerUids = await fetchViewers(postId);
  const users = await Promise.all(viewerUids.map(uid => getUser(uid)));

  content.innerHTML = `
    <p class="text-green-400 text-xs uppercase tracking-widest mb-2">👀 Viewed by ${viewerUids.length}</p>
    <div class="space-y-1.5 max-h-48 overflow-y-auto">
      ${users.map(u => `
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style="background:${avatarColor(u)}">${escapeHtml(userAvatar(u))}</div>
          <div>
            <p class="text-white text-xs font-medium">${escapeHtml(u?.realName || u?.email || publicName(u))}</p>
            <p class="text-gray-500 text-xs">${escapeHtml(u?.email || "")}</p>
          </div>
        </div>`).join("") || `<p class="text-gray-500 text-xs italic">No views yet</p>`}
    </div>`;

  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = `${rect.bottom + window.scrollY + 8}px`;
  popup.style.left = `${Math.max(8, rect.left - 80)}px`;
}

function closeIdentityPopup(e) {
  const popup = document.getElementById("identity-popup");
  if (!popup || popup.classList.contains("hidden")) return;
  if (!popup.contains(e.target)) popup.classList.add("hidden");
}

// ─── PROFILE MODAL ────────────────────────────────────────────────────────────

function renderProfileModalHtml() {
  const av = userAvatar(currentUser);
  const col = avatarColor(currentUser);
  const isEmoji = !!(currentUser?.avatarEmoji);
  return `
    <div id="profile-modal" class="modal-overlay hidden">
      <div class="modal-card max-w-sm w-full">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-white font-bold text-lg">✨ Edit Profile</h3>
          <button id="close-profile-modal" class="text-gray-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="flex justify-center mb-4">
          <div id="modal-avatar-preview"
            class="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white shadow-glow transition-all"
            style="background:${isEmoji ? "#1e1b4b" : col}; font-size:${isEmoji ? "2rem" : "1.3rem"}">
            ${escapeHtml(av)}
          </div>
        </div>

        <div id="modal-emoji-grid" class="grid grid-cols-6 gap-1.5 mb-3">
          ${EMOJIS.map(e => `
            <button class="modal-emoji-opt w-9 h-9 rounded-lg flex items-center justify-center text-xl
              hover:scale-110 transition-transform border border-transparent hover:border-purple-400
              ${currentUser.avatarEmoji === e ? "border-purple-400 bg-purple-900/40" : ""}"
              data-emoji="${e}">${e}</button>`).join("")}
        </div>
        <div id="modal-color-grid" class="flex gap-2 mb-4">
          ${COLORS.map(c => `
            <button class="modal-color-opt w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform"
              data-color="${c}" style="background:${c}; border-color:${!currentUser.avatarEmoji && currentUser.avatarColor === c ? "white" : "transparent"}"></button>`).join("")}
        </div>

        ${currentUser.userId ? `
        <div class="mb-3 flex items-center gap-2">
          <span class="text-purple-300 text-xs uppercase tracking-widest">Your ID</span>
          <span class="bg-purple-900/40 border border-purple-500/30 text-purple-200 text-xs font-mono px-3 py-1 rounded-full">@${escapeHtml(currentUser.userId)}</span>
          <span class="text-gray-500 text-xs">· permanent</span>
        </div>` : ""}
        <label class="text-purple-300 text-xs uppercase tracking-widest mb-1 block">Display Name</label>
        <input id="modal-pen-name" type="text" maxlength="30" class="input-field w-full mb-4"
          value="${escapeHtml(publicName(currentUser))}"/>

        <button id="save-profile-btn" class="btn-primary w-full">Save</button>

        <!-- Delete Account -->
        <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.08);">
          <button id="delete-account-btn" style="width:100%;padding:0.55rem;border-radius:10px;border:1px solid rgba(239,68,68,0.3);background:transparent;color:#f87171;font-size:0.82rem;font-weight:600;cursor:pointer;transition:all 0.2s;">
            🗑️ Permanently Delete Account
          </button>
        </div>
      </div>
    </div>`;
}

function openProfileModal() {
  document.getElementById("profile-modal")?.classList.remove("hidden");
}

function wireProfileModal() {
  let selEmoji = currentUser.avatarEmoji || null;
  let selColor = currentUser.avatarColor || "#7c3aed";
  const preview = document.getElementById("modal-avatar-preview");

  document.getElementById("close-profile-modal")?.addEventListener("click", () => {
    document.getElementById("profile-modal").classList.add("hidden");
  });

  document.getElementById("modal-emoji-grid")?.addEventListener("click", e => {
    const btn = e.target.closest(".modal-emoji-opt"); if (!btn) return;
    selEmoji = btn.dataset.emoji; selColor = null;
    document.querySelectorAll(".modal-emoji-opt").forEach(b => b.classList.remove("border-purple-400", "bg-purple-900/40"));
    document.querySelectorAll(".modal-color-opt").forEach(b => b.style.borderColor = "transparent");
    btn.classList.add("border-purple-400", "bg-purple-900/40");
    preview.style.background = "#1e1b4b";
    preview.textContent = selEmoji;
    preview.style.fontSize = "2rem";
  });

  document.getElementById("modal-color-grid")?.addEventListener("click", e => {
    const btn = e.target.closest(".modal-color-opt"); if (!btn) return;
    selEmoji = null; selColor = btn.dataset.color;
    document.querySelectorAll(".modal-emoji-opt").forEach(b => b.classList.remove("border-purple-400", "bg-purple-900/40"));
    document.querySelectorAll(".modal-color-opt").forEach(b => b.style.borderColor = "transparent");
    btn.style.borderColor = "white";
    const name = document.getElementById("modal-pen-name").value;
    preview.style.background = selColor;
    preview.textContent = (name || "?").charAt(0).toUpperCase();
    preview.style.fontSize = "1.3rem";
  });

  document.getElementById("modal-pen-name")?.addEventListener("input", e => {
    if (!selEmoji) preview.textContent = (e.target.value || "?").charAt(0).toUpperCase();
  });

  document.getElementById("save-profile-btn")?.addEventListener("click", async () => {
    const newName = document.getElementById("modal-pen-name").value.trim();
    if (!newName) return;
    const btn = document.getElementById("save-profile-btn");
    btn.disabled = true; btn.textContent = "Saving…";

    await updateProfile(currentUser.uid, {
      penName: newName,
      avatarEmoji: selEmoji || null,
      avatarColor: selColor || "#7c3aed",
    });

    currentUser.penName = newName;
    currentUser.avatarEmoji = selEmoji;
    currentUser.avatarColor = selColor;

    // Update nav avatar
    const navBtn = document.getElementById("nav-identity");
    if (navBtn) navBtn.innerHTML = renderAvatarHtml(currentUser, 32);

    document.getElementById("profile-modal").classList.add("hidden");
    btn.disabled = false; btn.textContent = "Save";
    showToast("✅ Profile updated!", "success");
  });

  // Delete account
  document.getElementById("delete-account-btn")?.addEventListener("click", async () => {
    if (!confirm("⚠️ This will permanently delete your account, all your posts, and comments. This cannot be undone. Are you sure?")) return;
    if (!confirm("FINAL WARNING: This action is irreversible. Delete everything?")) return;
    const btn = document.getElementById("delete-account-btn");
    btn.disabled = true; btn.textContent = "Deleting…";
    try {
      await deleteUserAccount(currentUser.uid);
      await deleteCurrentUser();
      showToast("Account deleted. Goodbye.", "info");
    } catch (err) {
      console.error("Account deletion failed:", err);
      showToast("Deletion failed: " + (err.message || "Try again."), "error");
      btn.disabled = false; btn.textContent = "🗑️ Permanently Delete Account";
    }
  });
}

// ─── AVATAR HTML HELPER ───────────────────────────────────────────────────────

function renderAvatarHtml(user, size = 32) {
  const av = userAvatar(user);
  const col = avatarColor(user);
  const isEmoji = !!(user?.avatarEmoji);
  const px = `${size}px`;
  const fs = isEmoji ? (size >= 40 ? "1.4rem" : "0.9rem") : (size >= 40 ? "1rem" : "0.75rem");
  return `<div style="width:${px};height:${px};border-radius:50%;background:${isEmoji ? "#1e1b4b" : col};display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:${fs};flex-shrink:0">
    ${escapeHtml(av)}</div>`;
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
