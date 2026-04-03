// js/pages/profileSetup.js – First-login profile setup screen

import { updateProfile, isUserIdAvailable } from "../db.js";
import { navigate } from "../router.js";

const EMOJIS = ["🦊", "🐱", "🦋", "🌸", "🎭", "🌙", "⭐", "🔮", "💎", "🐝", "🐧", "🦄"];
const COLORS = ["#7c3aed", "#db2777", "#059669", "#d97706", "#2563eb", "#dc2626"];
const COLOR_NAMES = ["Purple", "Pink", "Green", "Amber", "Blue", "Red"];

export async function renderProfileSetup(el, user) {
  let selectedEmoji = null;
  let selectedColor = COLORS[0];
  let userIdValid = false; // tracks whether the handle passed uniqueness check
  let checkTimer = null;

  // Derive a default handle suggestion from email
  const defaultHandle = (user.email || "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

  el.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
      <div class="glass-card max-w-md w-full p-8 animate-fadeIn">

        <!-- Header -->
        <div class="text-center mb-6">
          <div class="brand-logo mx-auto mb-4">GG</div>
          <h1 class="text-white font-extrabold text-2xl font-display mb-1">Create Your Identity</h1>
          <p class="text-purple-300 text-sm">Set your name, avatar, and a unique ID — just once.</p>
        </div>

        <!-- Avatar Preview -->
        <div class="flex justify-center mb-5">
          <div id="avatar-preview"
            class="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold shadow-glow transition-all duration-300"
            style="background: #7c3aed; font-size: 2.5rem;">
            ?
          </div>
        </div>

        <!-- Emoji Picker -->
        <div class="mb-4">
          <p class="text-purple-300 text-xs uppercase tracking-widest mb-2">Pick an Avatar</p>
          <div id="emoji-grid" class="grid grid-cols-6 gap-2">
            ${EMOJIS.map(e => `
              <button class="emoji-opt w-10 h-10 rounded-xl flex items-center justify-center text-2xl
                hover:scale-110 transition-transform border border-transparent hover:border-purple-400"
                data-emoji="${e}">${e}</button>
            `).join("")}
          </div>
          <p class="text-purple-300 text-xs uppercase tracking-widest mt-3 mb-2">…or a colour</p>
          <div id="color-grid" class="flex gap-2">
            ${COLORS.map((c, i) => `
              <button class="color-opt w-9 h-9 rounded-full border-2 hover:scale-110 transition-transform"
                data-color="${c}" title="${COLOR_NAMES[i]}"
                style="background:${c}; border-color:${i === 0 ? "white" : "transparent"}"></button>
            `).join("")}
          </div>
        </div>

        <!-- Display Name -->
        <div class="mb-4">
          <label class="text-purple-300 text-xs uppercase tracking-widest mb-1 block">Display Name <span class="text-pink-400">*</span></label>
          <input id="pen-name-input" type="text" maxlength="30"
            placeholder="What shall we call you?"
            class="input-field w-full"
            value="${user.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : ""}"/>
          <p class="text-gray-500 text-xs mt-1">Your public alias — not your Google name.</p>
        </div>

        <!-- Unique User ID -->
        <div class="mb-6">
          <label class="text-purple-300 text-xs uppercase tracking-widest mb-1 block">
            User ID <span class="text-pink-400">*</span>
            <span class="text-gray-500 normal-case tracking-normal font-normal ml-2">— unique, cannot be changed later</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-sm select-none">@</span>
            <input id="user-id-input" type="text" maxlength="20"
              placeholder="yourhandle"
              class="input-field w-full pl-7"
              value="${defaultHandle}"/>
            <span id="user-id-status" class="absolute right-3 top-1/2 -translate-y-1/2 text-lg"></span>
          </div>
          <p id="user-id-msg" class="text-gray-500 text-xs mt-1">Letters, numbers, underscores only. Min 3 chars.</p>
        </div>

        <!-- CTA -->
        <button id="btn-enter" class="btn-primary w-full py-3 text-base font-bold" disabled>
          Enter Gossip Girl ✨
        </button>
        <p id="form-error" class="text-red-400 text-xs text-center mt-2 hidden"></p>
      </div>
    </div>`;

  const preview = document.getElementById("avatar-preview");
  const enterBtn = document.getElementById("btn-enter");
  const userIdInput = document.getElementById("user-id-input");
  const userIdStatus = document.getElementById("user-id-status");
  const userIdMsg = document.getElementById("user-id-msg");

  // ── Avatar: Emoji selection ─────────────────────────────────────────────────
  document.getElementById("emoji-grid").addEventListener("click", e => {
    const btn = e.target.closest(".emoji-opt"); if (!btn) return;
    selectedEmoji = btn.dataset.emoji;
    selectedColor = null;
    document.querySelectorAll(".emoji-opt").forEach(b => b.classList.remove("border-purple-400", "bg-purple-900/40"));
    document.querySelectorAll(".color-opt").forEach(b => b.style.borderColor = "transparent");
    btn.classList.add("border-purple-400", "bg-purple-900/40");
    preview.style.background = "#1e1b4b";
    preview.textContent = selectedEmoji;
    preview.style.fontSize = "2.5rem";
  });

  // ── Avatar: Color selection ─────────────────────────────────────────────────
  document.getElementById("color-grid").addEventListener("click", e => {
    const btn = e.target.closest(".color-opt"); if (!btn) return;
    selectedEmoji = null;
    selectedColor = btn.dataset.color;
    document.querySelectorAll(".emoji-opt").forEach(b => b.classList.remove("border-purple-400", "bg-purple-900/40"));
    document.querySelectorAll(".color-opt").forEach(b => b.style.borderColor = "transparent");
    btn.style.borderColor = "white";
    preview.style.background = selectedColor;
    preview.textContent = (document.getElementById("pen-name-input").value || "?").charAt(0).toUpperCase();
    preview.style.fontSize = "2rem";
  });

  // ── Name: Updates preview letter ────────────────────────────────────────────
  document.getElementById("pen-name-input").addEventListener("input", e => {
    if (!selectedEmoji) {
      preview.textContent = (e.target.value || "?").charAt(0).toUpperCase();
    }
  });

  // ── User ID: Real-time uniqueness check (debounced 500ms) ──────────────────
  const validateHandle = async (raw) => {
    const handle = raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    userIdInput.value = handle; // auto-clean as you type

    if (handle.length < 3) {
      userIdStatus.textContent = "";
      userIdMsg.textContent = "Min 3 characters.";
      userIdMsg.className = "text-gray-500 text-xs mt-1";
      userIdValid = false;
      enterBtn.disabled = true;
      return;
    }

    userIdStatus.textContent = "⏳";
    userIdMsg.textContent = "Checking availability…";
    userIdMsg.className = "text-gray-400 text-xs mt-1";

    const available = await isUserIdAvailable(handle);
    if (available) {
      userIdStatus.textContent = "✅";
      userIdMsg.textContent = `@${handle} is available!`;
      userIdMsg.className = "text-green-400 text-xs mt-1";
      userIdValid = true;
      enterBtn.disabled = false;
    } else {
      userIdStatus.textContent = "❌";
      userIdMsg.textContent = `@${handle} is already taken.`;
      userIdMsg.className = "text-red-400 text-xs mt-1";
      userIdValid = false;
      enterBtn.disabled = true;
    }
  };

  userIdInput.addEventListener("input", e => {
    clearTimeout(checkTimer);
    enterBtn.disabled = true;
    checkTimer = setTimeout(() => validateHandle(e.target.value), 500);
  });

  // Trigger initial check on the default handle
  if (defaultHandle.length >= 3) {
    setTimeout(() => validateHandle(defaultHandle), 300);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  enterBtn.addEventListener("click", async () => {
    const penName = document.getElementById("pen-name-input").value.trim();
    const handle = userIdInput.value.trim();
    const formError = document.getElementById("form-error");

    if (!penName) {
      formError.textContent = "Please enter a display name.";
      formError.classList.remove("hidden");
      return;
    }
    if (!userIdValid || handle.length < 3) {
      formError.textContent = "Please choose a valid, available User ID.";
      formError.classList.remove("hidden");
      return;
    }

    formError.classList.add("hidden");
    enterBtn.disabled = true;
    enterBtn.textContent = "Setting up…";

    // Final availability check before saving (prevent race conditions)
    const stillAvailable = await isUserIdAvailable(handle);
    if (!stillAvailable) {
      userIdStatus.textContent = "❌";
      userIdMsg.textContent = `@${handle} was just taken. Choose another.`;
      userIdMsg.className = "text-red-400 text-xs mt-1";
      userIdValid = false;
      enterBtn.disabled = false;
      enterBtn.textContent = "Enter Gossip Girl ✨";
      return;
    }

    try {
      await updateProfile(user.uid, {
        penName,
        userId: handle,
        avatarEmoji: selectedEmoji || null,
        avatarColor: selectedColor || "#7c3aed",
      });

      user.penName = penName;
      user.userId = handle;
      user.avatarEmoji = selectedEmoji || null;
      user.avatarColor = selectedColor || "#7c3aed";
      user.profileSetupDone = true;
      navigate(user);
    } catch (err) {
      console.error("Profile setup failed:", err);
      formError.textContent = `Setup failed: ${err.message || "Check Firestore rules & Firebase auth domains."}`;
      formError.classList.remove("hidden");
      enterBtn.disabled = false;
      enterBtn.textContent = "Enter Gossip Girl ✨";
    }
  });

  // Select first color by default
  preview.style.background = COLORS[0];
  preview.textContent = "?";
}
