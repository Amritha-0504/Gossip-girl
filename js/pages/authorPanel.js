// js/pages/authorPanel.js – Author panel: write/edit posts (within 1hr) + profile modal

import {
  createPost,
  fetchPostsByAuthor,
  fetchPostsByDate,
  getUser,
  deletePost,
  updatePost,
  updateProfile,
  fetchComments,
  deleteComment,
  addComment,
  logView,
} from "../db.js";
import { signOut } from "../auth.js";
import { todayStr, formatDisplay, withinOneHour, prevDay, nextDay, isFuture } from "../utils/dateUtils.js";
import { publicName, userAvatar, avatarColor } from "../utils/anonymity.js";
import { parseComment, extractMentions } from "../utils/tagging.js";

const EMOJIS = ["🦊", "🐱", "🦋", "🌸", "🎭", "🌙", "⭐", "🔮", "💎", "🐝", "🐧", "🦄"];
const COLORS = ["#7c3aed", "#db2777", "#059669", "#d97706", "#2563eb", "#dc2626"];

let currentUser = null;
let container = null;
let currentDate = todayStr();

export async function renderAuthorPanel(el, user) {
  container = el;
  currentUser = user;

  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <!-- Nav -->
      <nav class="glass-nav flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-3">
          <div class="brand-logo-sm">GG</div>
          <span class="text-white font-extrabold text-xl font-display">Gossip Girl</span>
          <span class="role-badge badge-author">Author</span>
        </div>
        <div class="flex items-center gap-3">
          <button id="nav-identity" class="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Edit profile">
            ${renderAvatarHtml(user, "w-8 h-8 text-sm")}
            <span class="text-purple-200 text-sm hidden sm:block font-medium" id="nav-name">
              ${escapeHtml(publicName(user))}
            </span>
          </button>
          <button id="btn-signout" class="btn-ghost-sm">Sign Out</button>
        </div>
      </nav>

      <div class="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <!-- Write Post -->
        <div class="glass-card p-6">
          <h2 class="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span class="text-pink-400">✍️</span> Spill the Tea ☕
          </h2>

          <!-- Mobile-friendly date picker -->
          <div class="mb-3">
            <label class="text-purple-300 text-xs uppercase tracking-widest mb-2 block">Date</label>
            <div class="flex items-center gap-2">
              <button id="write-date-prev" class="w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <div class="flex-1 text-center">
                <div id="write-date-display" class="text-white font-semibold text-base"></div>
                <input type="date" id="post-date" class="sr-only" value="${todayStr()}" max="${todayStr()}"/>
              </div>
              <button id="write-date-next" class="w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
          <textarea id="post-content" rows="5" maxlength="2000"
            placeholder="What's the gossip, darling?…"
            class="input-field w-full resize-none mb-2"></textarea>
          <div class="flex items-center justify-between">
            <span id="char-count" class="text-gray-500 text-xs">0 / 2000</span>
            <button id="btn-publish" class="btn-primary px-6">Publish</button>
          </div>
        </div>

        <!-- Date Nav for Feed -->
        <div class="flex items-center justify-between gap-3">
          <button id="btn-prev" class="date-nav-btn">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Prev
          </button>
          <div class="text-center">
            <p class="text-purple-300 text-xs uppercase tracking-widest">Gossip for</p>
            <p id="date-label" class="text-white font-bold text-lg"></p>
          </div>
          <button id="btn-next" class="date-nav-btn">
            Next
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <!-- All Posts Feed -->
        <div>
          <h2 class="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span class="text-purple-400">📰</span> Today's Gossip
          </h2>
          <div id="all-posts" class="space-y-4">
            <div class="flex justify-center py-8"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Profile Modal -->
    ${renderProfileModalHtml(user)}`;

  // Nav
  document.getElementById("btn-signout").addEventListener("click", () => signOut());
  document.getElementById("nav-identity").addEventListener("click", () => {
    document.getElementById("profile-modal").classList.remove("hidden");
  });

  // Char count
  const contentEl = document.getElementById("post-content");
  contentEl.addEventListener("input", () => {
    document.getElementById("char-count").textContent = `${contentEl.value.length} / 2000`;
  });

  // Publish date nav wiring
  const writeDateDisplay = document.getElementById('write-date-display');
  const postDateInput = document.getElementById('post-date');
  let writeDate = todayStr();

  function updateWriteDateDisplay() {
    if (writeDateDisplay) writeDateDisplay.textContent = formatDisplay(writeDate);
    if (postDateInput) postDateInput.value = writeDate;
  }
  updateWriteDateDisplay();

  document.getElementById('write-date-prev')?.addEventListener('click', () => {
    writeDate = prevDay(writeDate);
    updateWriteDateDisplay();
  });
  document.getElementById('write-date-next')?.addEventListener('click', () => {
    const nd = nextDay(writeDate);
    if (!isFuture(nd)) { writeDate = nd; updateWriteDateDisplay(); }
  });

  // Publish
  document.getElementById("btn-publish").addEventListener("click", handlePublish);

  // Date nav
  updateDateLabel();
  document.getElementById("btn-prev").addEventListener("click", async () => {
    currentDate = prevDay(currentDate);
    updateDateLabel();
    await loadAllPosts();
  });
  document.getElementById("btn-next").addEventListener("click", async () => {
    const nd = nextDay(currentDate);
    if (!isFuture(nd)) {
      currentDate = nd;
      updateDateLabel();
      await loadAllPosts();
    }
  });

  // Profile modal
  wireProfileModal();

  await loadAllPosts();
}

function updateDateLabel() {
  const el = document.getElementById("date-label");
  if (el) el.textContent = formatDisplay(currentDate);
}

// ─── PUBLISH ──────────────────────────────────────────────────────────────────

async function handlePublish() {
  const content = document.getElementById("post-content").value.trim();
  const dateStr = document.getElementById("post-date").value;
  if (!content) return showToast("Content cannot be empty!", "error");
  const btn = document.getElementById("btn-publish");
  btn.disabled = true; btn.textContent = "Publishing…";
  try {
    await createPost(currentUser.uid, content, dateStr);
    document.getElementById("post-content").value = "";
    document.getElementById("char-count").textContent = "0 / 2000";
    showToast("🎉 Published!", "success");
    // Reload the feed so the new post appears immediately
    await loadAllPosts();
  } catch (err) {
    console.error(err);
    showToast("Failed to publish.", "error");
  } finally {
    btn.disabled = false; btn.textContent = "Publish";
  }
}

// ─── ALL POSTS FEED (replaces My Posts) ─────────────────────────────────────

async function loadAllPosts() {
  const el = document.getElementById("all-posts");
  if (!el) return;
  el.innerHTML = `<div class="flex justify-center py-8"><div class="spinner"></div></div>`;
  const posts = await fetchPostsByDate(currentDate);
  if (posts.length === 0) {
    el.innerHTML = `<div class="text-center py-8 text-gray-400">🤫 No gossip yet for this day.</div>`;
    return;
  }
  // Pre-fetch all authors
  const authorUids = [...new Set(posts.map(p => p.authorId))];
  const authorMap = {};
  await Promise.all(authorUids.map(uid => getUser(uid).then(u => { authorMap[uid] = u; })));

  // Log views for all posts
  for (const post of posts) logView(post.postId, currentUser.uid).catch(() => {});

  el.innerHTML = "";
  for (const post of posts) {
    el.appendChild(buildMyPostCard(post, authorMap[post.authorId]));
  }
}

function buildMyPostCard(post, author) {
  // Use author data if passed (feed mode), fall back to currentUser (own posts)
  const postAuthor = author || currentUser;
  const penName = publicName(postAuthor);
  const av = userAvatar(postAuthor);
  const col = avatarColor(postAuthor);
  const isOwnPost = post.authorId === currentUser.uid;
  const canEdit = isOwnPost && withinOneHour(post.createdAt);

  const card = document.createElement("div");
  card.className = "post-card animate-fadeIn";
  card.innerHTML = `
    <div class="post-header">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white"
          style="background:${postAuthor.avatarEmoji ? "#1e1b4b" : col}; font-size:${postAuthor.avatarEmoji ? "1.2rem" : "0.9rem"}">
          ${escapeHtml(av)}
        </div>
        <div>
          <p class="text-white font-semibold text-sm">${escapeHtml(penName)}</p>
          <p class="text-purple-400 text-xs">${formatDisplay(post.datePosted)}${post.updatedAt ? " · edited" : ""}</p>
        </div>
      </div>
      <div class="ml-auto flex gap-2">
        ${canEdit ? `
        <button class="edit-btn action-btn text-blue-400" title="Edit post (within 1hr)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>` : ""}
        ${isOwnPost ? `
        <button class="delete-btn action-btn text-red-400" title="Delete post">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>` : ""}
      </div>
    </div>

    <!-- Post content (editable in-place) -->
    <div class="post-content-area mt-3">
      <p class="post-content-text text-gray-100 leading-relaxed">${parseComment(post.content)}</p>
      ${canEdit ? `
      <div class="edit-area hidden mt-2">
        <textarea class="edit-textarea input-field w-full resize-none" rows="4" maxlength="2000">${escapeHtml(post.content)}</textarea>
        <div class="flex justify-end gap-2 mt-2">
          <button class="cancel-edit-btn btn-ghost-sm px-3 py-1.5 text-sm">Cancel</button>
          <button class="save-edit-btn btn-primary px-4 py-1.5 text-sm">Save</button>
        </div>
      </div>` : ""}
    </div>

    <!-- Stats + comment toggle -->
    <div class="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-gray-400">
      <span>❤️ ${post.likes?.length || 0}</span>
      <span>👎 ${post.unlikes?.length || 0}</span>
      <button class="comments-toggle flex items-center gap-1 hover:text-purple-300 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span class="comment-count-label">Comments</span>
      </button>
    </div>

    <!-- Collapsible Comments Section -->
    <div class="comments-section hidden mt-3 pt-3 border-t border-white/10">
      <div class="comments-list space-y-2 mb-3">
        <div class="flex justify-center py-2"><div class="spinner-sm"></div></div>
      </div>
      <div class="flex items-center gap-2 mt-2">
        <div class="ig-avatar-sm" style="background:${currentUser.avatarEmoji ? "#1e1b4b" : col}; font-size:${currentUser.avatarEmoji ? "0.75rem" : "0.6rem"}">
          ${escapeHtml(av)}
        </div>
        <input class="comment-input ig-comment-input flex-1" placeholder="Reply to your readers…" maxlength="500"/>
        <button class="comment-send text-purple-400 text-sm font-semibold hover:text-white transition-colors">Post</button>
      </div>
    </div>`;

  card.querySelector(".ig-avatar-sm").style.cssText += "; background:" + (postAuthor.avatarEmoji ? "#1e1b4b" : col) + "; font-size:" + (postAuthor.avatarEmoji ? "0.75rem" : "0.6rem");

  // Edit (within 1hr, own posts only)
  if (canEdit) {
    const editBtn = card.querySelector(".edit-btn");
    const contentText = card.querySelector(".post-content-text");
    const editArea = card.querySelector(".edit-area");
    const textarea = card.querySelector(".edit-textarea");

    editBtn?.addEventListener("click", () => {
      contentText.classList.add("hidden");
      editArea.classList.remove("hidden");
    });
    card.querySelector(".cancel-edit-btn")?.addEventListener("click", () => {
      contentText.classList.remove("hidden");
      editArea.classList.add("hidden");
    });
    card.querySelector(".save-edit-btn")?.addEventListener("click", async () => {
      const newContent = textarea.value.trim();
      if (!newContent) return;
      await updatePost(post.postId, newContent);
      contentText.innerHTML = parseComment(newContent);
      contentText.classList.remove("hidden");
      editArea.classList.add("hidden");
      showToast("✅ Post updated.", "success");
    });
  }

  // Delete — always available for own posts
  card.querySelector(".delete-btn")?.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    await deletePost(post.postId);
    card.remove();
    showToast("Post deleted.", "info");
  });

  // Comments: lazy-load on toggle
  let commentsLoaded = false;
  card.querySelector(".comments-toggle")?.addEventListener("click", async () => {
    const section = card.querySelector(".comments-section");
    section.classList.toggle("hidden");
    if (!section.classList.contains("hidden") && !commentsLoaded) {
      commentsLoaded = true;
      await loadAuthorComments(post.postId, card);
    }
  });

  // Send comment
  card.querySelector(".comment-send")?.addEventListener("click", () => handleAuthorComment(post.postId, card));
  card.querySelector(".comment-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAuthorComment(post.postId, card); }
  });

  return card;
}

async function loadAuthorComments(postId, card) {
  const list = card.querySelector(".comments-list");
  const comments = await fetchComments(postId);
  const label = card.querySelector(".comment-count-label");
  if (label) label.textContent = `${comments.length} comment${comments.length !== 1 ? "s" : ""}`;

  if (comments.length === 0) {
    list.innerHTML = `<p class="text-gray-500 text-xs italic text-center py-2">No comments yet.</p>`;
    return;
  }

  const commenterUids = [...new Set(comments.map(c => c.userId))];
  const userMap = {};
  await Promise.all(commenterUids.map(uid => getUser(uid).then(u => { userMap[uid] = u; })));

  list.innerHTML = comments.map(c => {
    const cUser = userMap[c.userId];
    const cName = escapeHtml(publicName(cUser));
    const cAv = escapeHtml(userAvatar(cUser));
    const cCol = avatarColor(cUser);
    const isEmojiC = !!(cUser?.avatarEmoji);
    return `
      <div class="comment-item flex gap-2 items-start group" data-comment-id="${c.commentId}">
        <div class="ig-avatar-sm" style="background:${isEmojiC ? "#1e1b4b" : cCol}; font-size:${isEmojiC ? "0.75rem" : "0.6rem"}">
          ${cAv}
        </div>
        <div class="flex-1 min-w-0">
          <span class="text-purple-300 text-xs font-semibold mr-1">${cName}</span>
          <span class="text-gray-200 text-sm break-words">${parseComment(c.content)}</span>
        </div>
        <button class="delete-comment-btn opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0"
          data-comment-id="${c.commentId}" title="Delete comment">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>`;
  }).join("");

  list.querySelectorAll(".delete-comment-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await deleteComment(btn.dataset.commentId);
      await loadAuthorComments(postId, card);
    });
  });
}

async function handleAuthorComment(postId, card) {
  const input = card.querySelector(".comment-input");
  const text = input.value.trim();
  if (!text) return;
  const sendBtn = card.querySelector(".comment-send");
  sendBtn.disabled = true; sendBtn.textContent = "…";
  const mentions = extractMentions(text);
  await addComment(postId, currentUser.uid, text, mentions);
  input.value = "";
  sendBtn.disabled = false; sendBtn.textContent = "Post";
  await loadAuthorComments(postId, card);
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
    await updateProfile(currentUser.uid, { penName: newName, avatarEmoji: selEmoji || null, avatarColor: selColor || "#7c3aed" });
    currentUser.penName = newName;
    currentUser.avatarEmoji = selEmoji;
    currentUser.avatarColor = selColor;
    document.getElementById("nav-name").textContent = newName;
    document.getElementById("profile-modal").classList.add("hidden");
    btn.disabled = false; btn.textContent = "Save";
    showToast("✅ Profile updated!", "success");
    await loadMyPosts();
  });
}

function renderAvatarHtml(user, sizeClass = "w-8 h-8") {
  const av = userAvatar(user);
  const col = avatarColor(user);
  const isEmoji = !!(user?.avatarEmoji);
  return `<div class="${sizeClass} rounded-full flex items-center justify-center font-bold text-white"
      style="background:${isEmoji ? "#1e1b4b" : col}; font-size:${isEmoji ? "1rem" : "0.75rem"}">${escapeHtml(av)}</div>`;
}

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
