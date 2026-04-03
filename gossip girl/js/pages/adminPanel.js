// js/pages/adminPanel.js – Admin dashboard: feed + write post + requests + users

import {
  fetchPendingRequests,
  fetchAllRequests,
  updateRequestStatus,
  setUserRole,
  fetchPostsByDate,
  fetchComments,
  fetchViewers,
  getUser,
  deletePost,
  deleteComment,
  addComment,
  updateProfile,
  fetchAllUsers,
  createPost,
  toggleLike,
  toggleUnlike,
  getPostById,
} from "../db.js";
import { signOut } from "../auth.js";
import { todayStr, formatDisplay, prevDay, nextDay, isFuture } from "../utils/dateUtils.js";
import { parseComment, extractMentions } from "../utils/tagging.js";
import { publicName, userAvatar, avatarColor } from "../utils/anonymity.js";

const EMOJIS = ["🦊", "🐱", "🦋", "🌸", "🎭", "🌙", "⭐", "🔮", "💎", "🐝", "🐧", "🦄"];
const COLORS = ["#7c3aed", "#db2777", "#059669", "#d97706", "#2563eb", "#dc2626"];

let currentUser = null;
let container = null;
let currentDate = todayStr();

export async function renderAdminPanel(el, user) {
  container = el;
  currentUser = user;
  currentDate = todayStr();

  container.innerHTML = `
    <div class="gg-app">
      <!-- IG-style Top Nav -->
      <header class="gg-header">
        <div class="gg-header-left">
          <div class="brand-logo-sm">GG</div>
          <span class="gg-brand-name">Gossip Girl</span>
          <span class="role-badge badge-admin">Admin</span>
        </div>
        <div class="gg-header-right">
          <!-- Write Post -->
          <button id="nav-write" class="gg-icon-btn" title="Spill the Tea">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <!-- Requests icon -->
          <button id="nav-requests" class="gg-icon-btn relative" title="Author Requests">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span id="pending-badge" class="hidden badge-count absolute -top-1 -right-1">0</span>
          </button>
          <!-- Users icon -->
          <button id="nav-users" class="gg-icon-btn" title="All Users">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </button>
          <!-- Profile -->
          <button id="nav-identity" class="gg-avatar-btn" title="Edit profile">
            ${renderAvatarHtml(user, 32)}
          </button>
          <button id="btn-signout" class="gg-signout-btn">Sign Out</button>
        </div>
      </header>

      <!-- Main content -->
      <main class="gg-main">
        <!-- Write Panel (hidden by default) -->
        <div id="write-panel" class="hidden max-w-xl mx-auto px-4 pt-6">
          <div class="gg-card">
            <div class="flex items-center gap-3 mb-4">
              ${renderAvatarHtml(user, 40)}
              <div>
                <p class="text-white font-semibold text-sm">${escapeHtml(publicName(user))}</p>
                <span class="role-badge badge-admin text-xs">Admin</span>
              </div>
            </div>
            <h3 class="text-white font-bold text-base mb-4 flex items-center gap-2">
              <span>✍️</span> Spill the Tea ☕
            </h3>
            <div class="mb-3">
              <label class="gg-label">Date</label>
              <input type="date" id="admin-post-date" value="${todayStr()}" max="${todayStr()}" class="gg-input"/>
            </div>
            <textarea id="admin-post-content" rows="5" maxlength="2000"
              placeholder="What's the gossip, darling?…"
              class="gg-input w-full resize-none mb-2"></textarea>
            <div class="flex items-center justify-between">
              <span id="admin-char-count" class="text-gray-500 text-xs">0 / 2000</span>
              <button id="admin-btn-publish" class="gg-btn-primary">Publish ✨</button>
            </div>
          </div>
        </div>

        <!-- Feed Panel -->
        <div id="feed-panel" class="max-w-xl mx-auto px-4">
          <!-- Date navigation -->
          <div id="feed-date-nav" class="gg-date-nav">
            <button id="btn-prev" class="gg-date-arrow" title="Previous day">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div class="gg-date-pill">
              <span class="gg-date-label-sm">Gossip for</span>
              <span id="date-label" class="gg-date-value">${formatDisplay(currentDate)}</span>
            </div>
            <button id="btn-next" class="gg-date-arrow" title="Next day">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <div id="panel-content" class="space-y-4 pb-16"></div>
        </div>
      </main>
    </div>

    <!-- Profile Modal -->
    ${renderProfileModalHtml(user)}

    <!-- Identity Popup -->
    <div id="identity-popup" class="gg-popup hidden">
      <div id="identity-popup-content"></div>
    </div>

    <!-- Side Panel (requests / users) -->
    <div id="side-panel" class="hidden fixed inset-0 z-40 flex justify-end">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" id="side-panel-backdrop"></div>
      <div class="relative z-50 w-full max-w-lg h-full bg-[#111] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 id="side-panel-title" class="text-white font-bold text-lg"></h2>
          <button id="close-side-panel" class="text-gray-400 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>
        <div id="side-panel-content" class="flex-1 overflow-y-auto p-6"></div>
      </div>
    </div>`;

  // ── Wire events ──
  document.getElementById("btn-signout").addEventListener("click", () => signOut());
  document.getElementById("nav-identity").addEventListener("click", () => {
    document.getElementById("profile-modal").classList.remove("hidden");
  });
  document.getElementById("nav-write").addEventListener("click", () => toggleWritePanel());
  document.getElementById("nav-requests").addEventListener("click", () => openSidePanel("requests"));
  document.getElementById("nav-users").addEventListener("click", () => openSidePanel("users"));
  document.getElementById("close-side-panel").addEventListener("click", closeSidePanel);
  document.getElementById("side-panel-backdrop").addEventListener("click", closeSidePanel);

  // Date navigation
  document.getElementById("btn-prev").addEventListener("click", async () => {
    currentDate = prevDay(currentDate);
    document.getElementById("date-label").textContent = formatDisplay(currentDate);
    await loadAdminPosts();
  });
  document.getElementById("btn-next").addEventListener("click", async () => {
    const nd = nextDay(currentDate);
    if (!isFuture(nd)) {
      currentDate = nd;
      document.getElementById("date-label").textContent = formatDisplay(currentDate);
      await loadAdminPosts();
    }
  });

  // Write post
  const contentEl = document.getElementById("admin-post-content");
  contentEl?.addEventListener("input", () => {
    document.getElementById("admin-char-count").textContent = `${contentEl.value.length} / 2000`;
  });
  document.getElementById("admin-btn-publish")?.addEventListener("click", handleAdminPublish);

  // Close identity popup on outside click
  document.addEventListener("click", (e) => {
    const popup = document.getElementById("identity-popup");
    if (popup && !popup.classList.contains("hidden") && !popup.contains(e.target)) {
      popup.classList.add("hidden");
    }
  }, { capture: true });

  wireProfileModal();
  await loadPendingBadge();
  await loadAdminPosts();
}

// ─── WRITE PANEL TOGGLE ───────────────────────────────────────────────────────

function toggleWritePanel() {
  const wp = document.getElementById("write-panel");
  const fp = document.getElementById("feed-panel");
  const btn = document.getElementById("nav-write");
  const isHidden = wp.classList.contains("hidden");
  if (isHidden) {
    wp.classList.remove("hidden");
    fp.classList.add("hidden");
    btn.classList.add("gg-icon-btn--active");
  } else {
    wp.classList.add("hidden");
    fp.classList.remove("hidden");
    btn.classList.remove("gg-icon-btn--active");
  }
}

// ─── PUBLISH ──────────────────────────────────────────────────────────────────

async function handleAdminPublish() {
  const content = document.getElementById("admin-post-content").value.trim();
  const dateStr = document.getElementById("admin-post-date").value;
  if (!content) return showToast("Content cannot be empty!", "error");
  const btn = document.getElementById("admin-btn-publish");
  btn.disabled = true; btn.textContent = "Publishing…";
  try {
    await createPost(currentUser.uid, content, dateStr);
    document.getElementById("admin-post-content").value = "";
    document.getElementById("admin-char-count").textContent = "0 / 2000";
    showToast("🎉 Published!", "success");
    // Switch back to feed and reload if same date
    toggleWritePanel();
    if (dateStr === currentDate) await loadAdminPosts();
  } catch (err) {
    console.error(err);
    showToast("Failed to publish.", "error");
  } finally {
    btn.disabled = false; btn.textContent = "Publish ✨";
  }
}

// ─── LOAD POSTS ───────────────────────────────────────────────────────────────

async function loadAdminPosts() {
  const el = document.getElementById("panel-content");
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

  // Pre-fetch authors
  const authorUids = [...new Set(posts.map(p => p.authorId))];
  const authorMap = {};
  for (const uid of authorUids) authorMap[uid] = await getUser(uid);

  el.innerHTML = "";
  for (const post of posts) {
    const card = buildAdminPostCard(post, authorMap[post.authorId]);
    el.appendChild(card);
  }
}

// ─── POST CARD ────────────────────────────────────────────────────────────────

function buildAdminPostCard(post, author) {
  const name = escapeHtml(publicName(author));
  const av = userAvatar(author);
  const col = avatarColor(author);
  const isEmoji = !!(author?.avatarEmoji);
  const likeCount = post.likes?.length || 0;
  const unlikeCount = post.unlikes?.length || 0;
  const isLiked = post.likes?.includes(currentUser.uid);
  const isUnliked = post.unlikes?.includes(currentUser.uid);

  const card = document.createElement("div");
  card.className = "ig-post-card animate-fadeIn";
  card.dataset.postId = post.postId;

  card.innerHTML = `
    <!-- IG-style header -->
    <div class="ig-post-header">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="ig-story-ring">
          <div class="ig-avatar" style="background:${isEmoji ? "#1e1b4b" : col}; font-size:${isEmoji ? "1.1rem" : "0.85rem"}">
            ${escapeHtml(av)}
          </div>
        </div>
        <div class="min-w-0">
          <p class="text-white font-semibold text-sm leading-tight truncate">${name}</p>
          <p class="text-gray-500 text-xs">${formatDisplay(post.datePosted)}${post.updatedAt ? " · edited" : ""}</p>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button class="admin-view-btn ig-btn-ghost text-green-400 text-xs flex items-center gap-1" title="See viewers">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
        <button class="delete-post-btn ig-btn-ghost text-red-400" title="Delete post">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Post content -->
    <div class="ig-post-content">${parseComment(post.content)}</div>

    <!-- IG Action bar -->
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

    <!-- Counts -->
    <div class="px-4 pb-1">
      <p class="text-white text-sm font-semibold">
        <span class="like-count">${likeCount}</span> likes
        ${unlikeCount > 0 ? `· <span class="unlike-count text-gray-400 font-normal">${unlikeCount} 👎</span>` : `<span class="unlike-count hidden">${unlikeCount}</span>`}
      </p>
      <button class="comments-toggle text-gray-500 text-xs mt-0.5 hover:text-gray-300 transition-colors">
        View <span class="comment-count-label">all comments</span>
      </button>
    </div>

    <!-- Inline Comments Section -->
    <div class="comments-section hidden px-4 pt-2 pb-2 border-t border-white/5 mt-2">
      <div class="comments-list space-y-2 mb-3">
        <div class="flex justify-center py-2"><div class="spinner-sm"></div></div>
      </div>
      <div class="flex gap-2 items-center mt-2">
        <div class="ig-avatar-sm" style="background:${currentUser.avatarEmoji ? "#1e1b4b" : avatarColor(currentUser)}; font-size:${currentUser.avatarEmoji ? "0.75rem" : "0.6rem"}">
          ${escapeHtml(userAvatar(currentUser))}
        </div>
        <input class="comment-input ig-comment-input flex-1" placeholder="Add a comment as admin…" maxlength="500"/>
        <button class="comment-send text-purple-400 text-sm font-semibold hover:text-white transition-colors">Post</button>
      </div>
    </div>`;

  // Like
  card.querySelector(".like-btn").addEventListener("click", async () => {
    await toggleLike(post.postId, currentUser.uid);
    const updated = await getPostById(post.postId);
    if (updated) updateAdminCardCounts(card, updated);
  });

  // Unlike
  card.querySelector(".unlike-btn").addEventListener("click", async () => {
    await toggleUnlike(post.postId, currentUser.uid);
    const updated = await getPostById(post.postId);
    if (updated) updateAdminCardCounts(card, updated);
  });

  // Toggle comments (both the icon and the "View all" text button)
  let commentsLoaded = false;
  card.querySelectorAll(".comments-toggle").forEach(btn => {
    btn.addEventListener("click", async () => {
      const section = card.querySelector(".comments-section");
      section.classList.toggle("hidden");
      if (!section.classList.contains("hidden") && !commentsLoaded) {
        commentsLoaded = true;
        await loadAdminInlineComments(post.postId, card);
      }
    });
  });

  // Send comment
  const sendBtn = card.querySelector(".comment-send");
  sendBtn?.addEventListener("click", () => handleAdminComment(post.postId, card));
  card.querySelector(".comment-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdminComment(post.postId, card); }
  });

  // Viewers popup
  card.querySelector(".admin-view-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    showViewersPopup(post.postId, e.currentTarget);
  });

  // Delete
  card.querySelector(".delete-post-btn")?.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    await deletePost(post.postId);
    card.remove();
    showToast("Post deleted.", "info");
  });

  return card;
}

function updateAdminCardCounts(card, post) {
  const isLiked = post.likes?.includes(currentUser.uid);
  const isUnliked = post.unlikes?.includes(currentUser.uid);
  const likeCount = post.likes?.length || 0;
  const unlikeCount = post.unlikes?.length || 0;

  const likeBtn = card.querySelector(".like-btn");
  const unlikeBtn = card.querySelector(".unlike-btn");
  const likeCountEl = card.querySelector(".like-count");
  const unlikeCountEl = card.querySelector(".unlike-count");

  likeBtn.classList.toggle("ig-liked", isLiked);
  unlikeBtn.classList.toggle("ig-unliked", isUnliked);
  likeBtn.querySelector("svg").setAttribute("fill", isLiked ? "currentColor" : "none");
  unlikeBtn.querySelector("svg").setAttribute("fill", isUnliked ? "currentColor" : "none");
  if (likeCountEl) likeCountEl.textContent = likeCount;
  if (unlikeCountEl) unlikeCountEl.textContent = unlikeCount;
}

// ─── INLINE COMMENTS ──────────────────────────────────────────────────────────

async function loadAdminInlineComments(postId, card) {
  const list = card.querySelector(".comments-list");
  const comments = await fetchComments(postId);
  const countLabel = card.querySelector(".comment-count-label");
  if (countLabel) countLabel.textContent = `${comments.length} comment${comments.length !== 1 ? "s" : ""}`;

  if (comments.length === 0) {
    list.innerHTML = `<p class="text-gray-500 text-xs italic">No comments yet.</p>`;
    return;
  }

  const commenterUids = [...new Set(comments.map(c => c.userId))];
  const userMap = {};
  for (const uid of commenterUids) userMap[uid] = await getUser(uid);

  list.innerHTML = comments.map(c => {
    const cUser = userMap[c.userId];
    const cName = escapeHtml(publicName(cUser));
    const cAv = userAvatar(cUser);
    const cCol = avatarColor(cUser);
    const isEmojiC = !!(cUser?.avatarEmoji);
    const isMine = c.userId === currentUser.uid;

    return `
      <div class="comment-item flex gap-2 items-start group" data-comment-id="${c.commentId}" data-user-id="${c.userId}">
        <div class="ig-avatar-sm cursor-pointer hover:ring-2 hover:ring-purple-400 commenter-avatar"
          style="background:${isEmojiC ? "#1e1b4b" : cCol}; font-size:${isEmojiC ? "0.75rem" : "0.6rem"}"
          data-user-id="${c.userId}">
          ${escapeHtml(cAv)}
        </div>
        <div class="flex-1 min-w-0">
          <span class="text-purple-300 text-xs font-semibold commenter-name-btn cursor-pointer hover:text-purple-200 mr-1"
            data-user-id="${c.userId}">${cName}</span>
          <span class="text-gray-200 text-sm break-words">${parseComment(c.content)}</span>
        </div>
        <button class="delete-comment-btn opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0"
          data-comment-id="${c.commentId}" title="Delete">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>`;
  }).join("");

  // Identity reveal on avatar/name click
  list.querySelectorAll(".commenter-avatar, .commenter-name-btn").forEach(el => {
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      const uid = el.closest("[data-user-id]")?.dataset.userId || el.dataset.userId;
      await showIdentityPopup(uid, e.currentTarget);
    });
  });

  // Delete comment
  list.querySelectorAll(".delete-comment-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await deleteComment(btn.dataset.commentId);
      await loadAdminInlineComments(postId, card);
    });
  });
}

async function handleAdminComment(postId, card) {
  const input = card.querySelector(".comment-input");
  const text = input.value.trim();
  if (!text) return;
  const sendBtn = card.querySelector(".comment-send");
  sendBtn.disabled = true; sendBtn.textContent = "…";
  const mentions = extractMentions(text);
  await addComment(postId, currentUser.uid, text, mentions);
  input.value = "";
  sendBtn.disabled = false; sendBtn.textContent = "Post";
  await loadAdminInlineComments(postId, card);
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
        style="background:${avatarColor(u)}">
        ${escapeHtml(userAvatar(u))}
      </div>
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

// ─── PENDING BADGE ────────────────────────────────────────────────────────────

async function loadPendingBadge() {
  const pending = await fetchPendingRequests();
  const badge = document.getElementById("pending-badge");
  if (!badge) return;
  if (pending.length > 0) {
    badge.textContent = pending.length;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// ─── SIDE PANEL ───────────────────────────────────────────────────────────────

function openSidePanel(type) {
  document.getElementById("side-panel").classList.remove("hidden");
  if (type === "requests") {
    document.getElementById("side-panel-title").textContent = "✉️ Author Requests";
    renderRequests();
  } else {
    document.getElementById("side-panel-title").textContent = "👥 All Users";
    renderUsers();
  }
}

function closeSidePanel() {
  document.getElementById("side-panel").classList.add("hidden");
}

async function renderRequests() {
  const el = document.getElementById("side-panel-content");
  el.innerHTML = `<div class="flex justify-center py-8"><div class="spinner"></div></div>`;
  const reqs = await fetchAllRequests();
  const userIds = [...new Set(reqs.map(r => r.userId))];
  const userMap = {};
  for (const uid of userIds) userMap[uid] = await getUser(uid);

  if (reqs.length === 0) {
    el.innerHTML = `<p class="text-gray-400 text-center py-8">No requests yet.</p>`;
    return;
  }

  el.innerHTML = reqs.map(r => {
    const u = userMap[r.userId];
    const name = escapeHtml(publicName(u));
    const av = userAvatar(u);
    const col = avatarColor(u);
    const isEmoji = !!(u?.avatarEmoji);
    const statusClass = `badge-${r.status}`;
    return `
      <div class="gg-card mb-3 flex items-center gap-3" data-request-id="${r.requestId}">
        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
          style="background:${isEmoji ? "#1e1b4b" : col}; font-size:${isEmoji ? "1.2rem" : "0.9rem"}">
          ${escapeHtml(av)}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white font-semibold text-sm truncate">${name}</p>
          <p class="text-gray-400 text-xs truncate">${escapeHtml(u?.email || u?.userId || "")}</p>
          <span class="role-badge ${statusClass} text-xs mt-1 inline-block">${r.status}</span>
        </div>
        ${r.status === "pending" ? `
        <div class="flex gap-2 shrink-0">
          <button class="accept-btn gg-btn-accept" data-uid="${r.userId}" data-rid="${r.requestId}">✓ Accept</button>
          <button class="reject-btn gg-btn-reject" data-uid="${r.userId}" data-rid="${r.requestId}">✕ Reject</button>
        </div>` : ""}
      </div>`;
  }).join("");

  // Accept / Reject handlers
  el.querySelectorAll(".accept-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { uid, rid } = btn.dataset;
      btn.disabled = true; btn.textContent = "…";
      await updateRequestStatus(rid, "accepted");
      await setUserRole(uid, "author");
      showToast("✅ Author role granted!", "success");
      await renderRequests();
      await loadPendingBadge();
    });
  });

  el.querySelectorAll(".reject-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { rid } = btn.dataset;
      btn.disabled = true; btn.textContent = "…";
      await updateRequestStatus(rid, "rejected");
      showToast("Request rejected.", "info");
      await renderRequests();
      await loadPendingBadge();
    });
  });
}

async function renderUsers() {
  const el = document.getElementById("side-panel-content");
  el.innerHTML = `<div class="flex justify-center py-8"><div class="spinner"></div></div>`;
  const users = await fetchAllUsers();

  el.innerHTML = `
    <input id="user-search" class="gg-input mb-4" placeholder="Search by name, @id or email…"/>
    <div id="user-list" class="space-y-2"></div>`;

  const listEl = document.getElementById("user-list");

  function renderList(filter = "") {
    const filtered = filter
      ? users.filter(u =>
        publicName(u).toLowerCase().includes(filter.toLowerCase()) ||
        (u.userId || "").toLowerCase().includes(filter.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(filter.toLowerCase()))
      : users;

    listEl.innerHTML = filtered.map(u => {
      const av = userAvatar(u);
      const col = avatarColor(u);
      const isEmoji = !!(u?.avatarEmoji);
      return `
        <div class="gg-card flex items-center gap-3">
          <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shrink-0"
            style="background:${isEmoji ? "#1e1b4b" : col}; font-size:${isEmoji ? "1.1rem" : "0.85rem"}">
            ${escapeHtml(av)}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-semibold truncate">${escapeHtml(publicName(u))}</p>
            ${u.userId ? `<p class="text-purple-400 text-xs font-mono">@${escapeHtml(u.userId)}</p>` : ""}
            <p class="text-gray-500 text-xs truncate">${escapeHtml(u.email || "")}</p>
          </div>
          <span class="role-badge badge-${u.role || "viewer"} text-xs shrink-0">${u.role || "viewer"}</span>
        </div>`;
    }).join("") || `<p class="text-gray-400 text-sm text-center py-4">No users found.</p>`;
  }

  renderList();
  document.getElementById("user-search").addEventListener("input", e => renderList(e.target.value));
}

// ─── PROFILE MODAL ────────────────────────────────────────────────────────────

function renderProfileModalHtml(user) {
  const av = userAvatar(user);
  const col = avatarColor(user);
  const isEmoji = !!(user?.avatarEmoji);
  return `
    <div id="profile-modal" class="modal-overlay hidden">
      <div class="modal-card max-w-sm w-full">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-white font-bold text-lg">✨ Edit Profile</h3>
          <button id="close-profile-modal" class="text-gray-400 hover:text-white">✕</button>
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
              ${user.avatarEmoji === e ? "border-purple-400 bg-purple-900/40" : ""}"
              data-emoji="${e}">${e}</button>`).join("")}
        </div>
        <div id="modal-color-grid" class="flex gap-2 mb-4">
          ${COLORS.map(c => `
            <button class="modal-color-opt w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform"
              data-color="${c}" style="background:${c}; border-color:${!user.avatarEmoji && user.avatarColor === c ? "white" : "transparent"}"></button>`).join("")}
        </div>
        ${user.userId ? `
        <div class="mb-3 flex items-center gap-2">
          <span class="text-purple-300 text-xs uppercase tracking-widest">Your ID</span>
          <span class="bg-purple-900/40 border border-purple-500/30 text-purple-200 text-xs font-mono px-3 py-1 rounded-full">@${escapeHtml(user.userId)}</span>
          <span class="text-gray-500 text-xs">· permanent</span>
        </div>` : ""}
        <label class="text-purple-300 text-xs uppercase tracking-widest mb-1 block">Display Name</label>
        <input id="modal-pen-name" type="text" maxlength="30" class="input-field w-full mb-4"
          value="${escapeHtml(publicName(user))}"/>
        <button id="save-profile-btn" class="btn-primary w-full">Save</button>
      </div>
    </div>`;
}

function wireProfileModal() {
  let selEmoji = currentUser.avatarEmoji || null;
  let selColor = currentUser.avatarColor || "#7c3aed";
  const preview = () => document.getElementById("modal-avatar-preview");

  document.getElementById("close-profile-modal")?.addEventListener("click", () => {
    document.getElementById("profile-modal").classList.add("hidden");
  });

  document.getElementById("modal-emoji-grid")?.addEventListener("click", e => {
    const btn = e.target.closest(".modal-emoji-opt"); if (!btn) return;
    selEmoji = btn.dataset.emoji; selColor = null;
    document.querySelectorAll(".modal-emoji-opt").forEach(b => b.classList.remove("border-purple-400", "bg-purple-900/40"));
    document.querySelectorAll(".modal-color-opt").forEach(b => b.style.borderColor = "transparent");
    btn.classList.add("border-purple-400", "bg-purple-900/40");
    preview().style.background = "#1e1b4b";
    preview().textContent = selEmoji;
    preview().style.fontSize = "2rem";
  });

  document.getElementById("modal-color-grid")?.addEventListener("click", e => {
    const btn = e.target.closest(".modal-color-opt"); if (!btn) return;
    selEmoji = null; selColor = btn.dataset.color;
    document.querySelectorAll(".modal-emoji-opt").forEach(b => b.classList.remove("border-purple-400", "bg-purple-900/40"));
    document.querySelectorAll(".modal-color-opt").forEach(b => b.style.borderColor = "transparent");
    btn.style.borderColor = "white";
    const name = document.getElementById("modal-pen-name").value;
    preview().style.background = selColor;
    preview().textContent = (name || "?").charAt(0).toUpperCase();
    preview().style.fontSize = "1.3rem";
  });

  document.getElementById("modal-pen-name")?.addEventListener("input", e => {
    if (!selEmoji) preview().textContent = (e.target.value || "?").charAt(0).toUpperCase();
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
    document.getElementById("profile-modal").classList.add("hidden");
    btn.disabled = false; btn.textContent = "Save";
    showToast("✅ Profile updated!", "success");
  });
}

// ─── AVATAR HTML HELPER ───────────────────────────────────────────────────────

function renderAvatarHtml(user, size = 32) {
  const av = userAvatar(user);
  const col = avatarColor(user);
  const isEmoji = !!(user?.avatarEmoji);
  const px = typeof size === "number" ? `${size}px` : size;
  const fs = isEmoji
    ? (size >= 40 ? "1.4rem" : "0.9rem")
    : (size >= 40 ? "1rem" : "0.75rem");
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
