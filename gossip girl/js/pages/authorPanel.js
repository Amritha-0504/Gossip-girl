// js/pages/authorPanel.js – Author panel: write/edit posts (within 1hr) + profile modal

import {
  createPost,
  fetchPostsByAuthor,
  getUser,
  deletePost,
  updatePost,
  updateProfile,
  fetchComments,
  deleteComment,
  addComment,
} from "../db.js";
import { signOut } from "../auth.js";
import { todayStr, formatDisplay, withinOneHour } from "../utils/dateUtils.js";
import { publicName, userAvatar, avatarColor } from "../utils/anonymity.js";
import { parseComment, extractMentions } from "../utils/tagging.js";

const EMOJIS = ["🦊", "🐱", "🦋", "🌸", "🎭", "🌙", "⭐", "🔮", "💎", "🐝", "🐧", "🦄"];
const COLORS = ["#7c3aed", "#db2777", "#059669", "#d97706", "#2563eb", "#dc2626"];

let currentUser = null;
let container = null;

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
          <!-- Clickable name/avatar opens profile modal -->
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
          <div class="mb-3">
            <label class="text-purple-300 text-xs uppercase tracking-widest mb-1 block">Date</label>
            <input type="date" id="post-date" value="${todayStr()}" max="${todayStr()}" class="input-field"/>
          </div>
          <textarea id="post-content" rows="5" maxlength="2000"
            placeholder="What's the gossip, darling?…"
            class="input-field w-full resize-none mb-2"></textarea>
          <div class="flex items-center justify-between">
            <span id="char-count" class="text-gray-500 text-xs">0 / 2000</span>
            <button id="btn-publish" class="btn-primary px-6">Publish</button>
          </div>
        </div>

        <!-- My Posts -->
        <div>
          <h2 class="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span class="text-purple-400">📋</span> My Posts
          </h2>
          <div id="my-posts" class="space-y-4">
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

  // Publish
  document.getElementById("btn-publish").addEventListener("click", handlePublish);

  // Profile modal
  wireProfileModal();

  await loadMyPosts();
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
    await loadMyPosts();
  } catch (err) {
    console.error(err);
    showToast("Failed to publish.", "error");
  } finally {
    btn.disabled = false; btn.textContent = "Publish";
  }
}

// ─── MY POSTS ────────────────────────────────────────────────────────────────

async function loadMyPosts() {
  const el = document.getElementById("my-posts");
  if (!el) return;
  el.innerHTML = `<div class="flex justify-center py-8"><div class="spinner"></div></div>`;
  const posts = await fetchPostsByAuthor(currentUser.uid);
  if (posts.length === 0) {
    el.innerHTML = `<div class="text-center py-8 text-gray-400">No posts yet. Spill the tea above! ☕</div>`;
    return;
  }
  el.innerHTML = "";
  for (const post of posts) el.appendChild(await buildMyPostCard(post));
}

async function buildMyPostCard(post) {
  const penName = publicName(currentUser);
  const av = userAvatar(currentUser);
  const col = avatarColor(currentUser);
  const canEdit = withinOneHour(post.createdAt);
  const canDelete = true; // authors can always delete their own posts
  const comments = await fetchComments(post.postId);

  const card = document.createElement("div");
  card.className = "post-card animate-fadeIn";
  card.innerHTML = `
    <div class="post-header">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white"
          style="background:${currentUser.avatarEmoji ? "#1e1b4b" : col}; font-size:${currentUser.avatarEmoji ? "1.2rem" : "0.9rem"}">
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
        <button class="delete-btn action-btn text-red-400" title="Delete post">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
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

    <!-- Stats -->
    <div class="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-gray-400">
      <span>❤️ ${post.likes?.length || 0}</span>
      <span>👎 ${post.unlikes?.length || 0}</span>
      <span>💬 ${comments.length}</span>
    </div>`;

  // Edit (within 1hr)
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
      // re-render content with tag parsing
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

  return card;
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
