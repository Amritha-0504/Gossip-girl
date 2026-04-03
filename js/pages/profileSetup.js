// js/pages/profileSetup.js – First-login profile setup screen (with password)

import { updateProfile, isUserIdAvailable } from "../db.js";
import { linkPasswordToAccount } from "../auth.js";
import { navigate } from "../router.js";

const EMOJIS = ["🦊", "🐱", "🦋", "🌸", "🎭", "🌙", "⭐", "🔮", "💎", "🐝", "🐧", "🦄"];
const COLORS = ["#7c3aed", "#db2777", "#059669", "#d97706", "#2563eb", "#dc2626"];
const COLOR_NAMES = ["Purple", "Pink", "Green", "Amber", "Blue", "Red"];

export async function renderProfileSetup(el, user) {
  let selectedEmoji = null;
  let selectedColor = COLORS[0];
  let userIdValid = false;
  let checkTimer = null;

  const defaultHandle = (user.email || "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

  el.innerHTML = `
    <div class="gg-app" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;">
      <div class="gg-card" style="max-width:440px;width:100%;padding:2rem;">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:1.5rem;">
          <div class="brand-logo mx-auto" style="margin-bottom:0.75rem;">GG</div>
          <h1 style="color:#fff;font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:900;margin:0 0 0.25rem;">Create Your Identity</h1>
          <p style="color:#a78bfa;font-size:0.82rem;">Set your name, avatar, ID & password — just once.</p>
        </div>

        <!-- Avatar Preview -->
        <div style="display:flex;justify-content:center;margin-bottom:1.25rem;">
          <div id="avatar-preview"
            style="width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;box-shadow:0 0 24px rgba(147,51,234,0.5);transition:all 0.3s;background:#7c3aed;font-size:2.5rem;">
            ?
          </div>
        </div>

        <!-- Emoji Picker -->
        <div style="margin-bottom:1rem;">
          <p class="gg-label">Pick an Avatar</p>
          <div id="emoji-grid" class="grid grid-cols-6 gap-2">
            ${EMOJIS.map(e => `
              <button class="emoji-opt" style="width:40px;height:40px;border-radius:10px;border:1px solid transparent;background:transparent;font-size:1.4rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;"
                data-emoji="${e}">${e}</button>
            `).join("")}
          </div>
          <p class="gg-label" style="margin-top:0.75rem;">…or a colour</p>
          <div id="color-grid" style="display:flex;gap:0.5rem;">
            ${COLORS.map((c, i) => `
              <button class="color-opt" style="width:36px;height:36px;border-radius:50%;border:2px solid ${i === 0 ? "white" : "transparent"};background:${c};cursor:pointer;transition:all 0.15s;"
                data-color="${c}" title="${COLOR_NAMES[i]}"></button>
            `).join("")}
          </div>
        </div>

        <!-- Display Name -->
        <div style="margin-bottom:1rem;">
          <label class="gg-label">Display Name <span style="color:#f472b6;">*</span></label>
          <input id="pen-name-input" type="text" maxlength="30"
            placeholder="What shall we call you?"
            class="gg-input"
            value="${user.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : ""}"/>
          <p style="color:#6b7280;font-size:0.72rem;margin-top:0.25rem;">Your public alias — not your Google name.</p>
        </div>

        <!-- Unique User ID -->
        <div style="margin-bottom:1rem;">
          <label class="gg-label">
            User ID <span style="color:#f472b6;">*</span>
            <span style="color:#6b7280;text-transform:none;letter-spacing:normal;font-weight:400;margin-left:0.4rem;">— unique, cannot be changed later</span>
          </label>
          <div style="position:relative;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#a78bfa;font-weight:700;font-size:0.88rem;">@</span>
            <input id="user-id-input" type="text" maxlength="20"
              placeholder="yourhandle"
              class="gg-input" style="padding-left:28px;"
              value="${defaultHandle}"/>
            <span id="user-id-status" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:1rem;"></span>
          </div>
          <p id="user-id-msg" style="color:#6b7280;font-size:0.72rem;margin-top:0.25rem;">Letters, numbers, underscores only. Min 3 chars.</p>
        </div>

        <!-- Password -->
        <div style="margin-bottom:1.5rem;">
          <label class="gg-label">Password <span style="color:#f472b6;">*</span></label>
          <input id="password-input" type="password" minlength="6" maxlength="64"
            placeholder="Min 6 characters"
            class="gg-input"
            autocomplete="new-password"/>
          <p style="color:#6b7280;font-size:0.72rem;margin-top:0.25rem;">You'll use this with your @userId to log in next time.</p>
        </div>

        <!-- CTA -->
        <button id="btn-enter" class="gg-btn-primary" style="width:100%;padding:0.75rem;font-size:0.95rem;" disabled>
          Enter Gossip Girl ✨
        </button>
        <p id="form-error" style="color:#f87171;font-size:0.78rem;text-align:center;margin-top:0.5rem;display:none;"></p>
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
    document.querySelectorAll(".emoji-opt").forEach(b => { b.style.borderColor = "transparent"; b.style.background = "transparent"; });
    document.querySelectorAll(".color-opt").forEach(b => b.style.borderColor = "transparent");
    btn.style.borderColor = "#a78bfa";
    btn.style.background = "rgba(88,28,135,0.4)";
    preview.style.background = "#1e1b4b";
    preview.textContent = selectedEmoji;
    preview.style.fontSize = "2.5rem";
  });

  // ── Avatar: Color selection ─────────────────────────────────────────────────
  document.getElementById("color-grid").addEventListener("click", e => {
    const btn = e.target.closest(".color-opt"); if (!btn) return;
    selectedEmoji = null;
    selectedColor = btn.dataset.color;
    document.querySelectorAll(".emoji-opt").forEach(b => { b.style.borderColor = "transparent"; b.style.background = "transparent"; });
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

  // ── User ID: Real-time uniqueness check ────────────────────────────────────
  const validateHandle = async (raw) => {
    const handle = raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    userIdInput.value = handle;

    if (handle.length < 3) {
      userIdStatus.textContent = "";
      userIdMsg.textContent = "Min 3 characters.";
      userIdMsg.style.color = "#6b7280";
      userIdValid = false;
      enterBtn.disabled = true;
      return;
    }

    userIdStatus.textContent = "⏳";
    userIdMsg.textContent = "Checking availability…";
    userIdMsg.style.color = "#9ca3af";

    const available = await isUserIdAvailable(handle);
    if (available) {
      userIdStatus.textContent = "✅";
      userIdMsg.textContent = `@${handle} is available!`;
      userIdMsg.style.color = "#4ade80";
      userIdValid = true;
      enterBtn.disabled = false;
    } else {
      userIdStatus.textContent = "❌";
      userIdMsg.textContent = `@${handle} is already taken.`;
      userIdMsg.style.color = "#f87171";
      userIdValid = false;
      enterBtn.disabled = true;
    }
  };

  userIdInput.addEventListener("input", e => {
    clearTimeout(checkTimer);
    enterBtn.disabled = true;
    checkTimer = setTimeout(() => validateHandle(e.target.value), 500);
  });

  if (defaultHandle.length >= 3) {
    setTimeout(() => validateHandle(defaultHandle), 300);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  enterBtn.addEventListener("click", async () => {
    const penName = document.getElementById("pen-name-input").value.trim();
    const handle = userIdInput.value.trim();
    const password = document.getElementById("password-input").value;
    const formError = document.getElementById("form-error");

    if (!penName) {
      formError.textContent = "Please enter a display name.";
      formError.style.display = "block";
      return;
    }
    if (!userIdValid || handle.length < 3) {
      formError.textContent = "Please choose a valid, available User ID.";
      formError.style.display = "block";
      return;
    }
    if (!password || password.length < 6) {
      formError.textContent = "Password must be at least 6 characters.";
      formError.style.display = "block";
      return;
    }

    formError.style.display = "none";
    enterBtn.disabled = true;
    enterBtn.textContent = "Setting up…";

    // Final availability check
    const stillAvailable = await isUserIdAvailable(handle);
    if (!stillAvailable) {
      userIdStatus.textContent = "❌";
      userIdMsg.textContent = `@${handle} was just taken. Choose another.`;
      userIdMsg.style.color = "#f87171";
      userIdValid = false;
      enterBtn.disabled = false;
      enterBtn.textContent = "Enter Gossip Girl ✨";
      return;
    }

    try {
      // Link password credential to the Firebase account
      const authEmail = await linkPasswordToAccount(password);

      await updateProfile(user.uid, {
        penName,
        userId: handle,
        avatarEmoji: selectedEmoji || null,
        avatarColor: selectedColor || "#7c3aed",
        authEmail,
        hasPassword: true,
      });

      user.penName = penName;
      user.userId = handle;
      user.avatarEmoji = selectedEmoji || null;
      user.avatarColor = selectedColor || "#7c3aed";
      user.profileSetupDone = true;
      user.hasPassword = true;
      navigate(user);
    } catch (err) {
      console.error("Profile setup failed:", err);
      formError.textContent = `Setup failed: ${err.message || "Check Firebase config."}`;
      formError.style.display = "block";
      enterBtn.disabled = false;
      enterBtn.textContent = "Enter Gossip Girl ✨";
    }
  });

  // Select first color by default
  preview.style.background = COLORS[0];
  preview.textContent = "?";
}
