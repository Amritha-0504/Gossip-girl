// js/pages/login.js – Login page with Google + userId/Password auth

import { signInWithGoogle, signInAnonymously, signInWithUserIdPassword } from "../auth.js";

export function renderLogin(container) {
  let mode = "welcome"; // "welcome" | "login"

  function render() {
    container.innerHTML = `
    <div class="gg-app" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;">
      <div class="gg-card" style="max-width:400px;width:100%;padding:2.5rem 2rem;text-align:center;">

        <!-- Logo -->
        <div style="margin-bottom:1.5rem;">
          <div class="brand-logo mx-auto" style="margin-bottom:0.75rem;">GG</div>
          <h1 style="color:#fff;font-family:'Playfair Display',serif;font-size:1.75rem;font-weight:900;margin:0;">Gossip Girl</h1>
          <p style="color:#a78bfa;font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;margin-top:0.35rem;">You know you love me. XOXO</p>
        </div>

        <div class="divider" style="margin:1.25rem 0;"></div>

        <p style="color:#9ca3af;font-size:0.88rem;margin-bottom:1.5rem;line-height:1.6;">
          The city's most scandalous feed.<br/>
          <span style="color:#f472b6;font-weight:600;">Who said what? We're not telling.</span>
        </p>

        ${mode === "welcome" ? renderWelcomeMode() : renderLoginMode()}

        <!-- Toggle link -->
        <div style="margin-top:1.25rem;">
          ${mode === "welcome"
        ? `<button id="btn-toggle-mode" class="gg-link-btn">Already have an account? <strong>Log in</strong></button>`
        : `<button id="btn-toggle-mode" class="gg-link-btn">New here? <strong>Sign up with Google</strong></button>`
      }
        </div>

        <p style="color:#4b5563;font-size:0.7rem;margin-top:1.5rem;">
          By continuing you agree to our
          <span style="color:#a78bfa;cursor:pointer;">Terms</span> and
          <span style="color:#a78bfa;cursor:pointer;">Privacy Policy</span>.
        </p>
      </div>
    </div>`;

    wireEvents();
  }

  function renderWelcomeMode() {
    return `
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        <button id="btn-google" class="gg-btn-google">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;flex-shrink:0;">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <button id="btn-anon" class="gg-btn-secondary">
          <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          Browse Anonymously
        </button>
      </div>

      <!-- Admin separator -->
      <div style="display:flex;align-items:center;gap:0.75rem;margin:1.25rem 0;">
        <div class="divider" style="flex:1;"></div>
        <span style="color:#4b5563;font-size:0.72rem;">or</span>
        <div class="divider" style="flex:1;"></div>
      </div>

      <button id="btn-admin" class="admin-login-btn" style="width:100%;justify-content:center;">
        <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
        Login as Admin
      </button>
      <p style="color:#4b5563;font-size:0.72rem;margin-top:0.35rem;">Only for site administrators</p>`;
  }

  function renderLoginMode() {
    return `
      <div style="display:flex;flex-direction:column;gap:0.85rem;text-align:left;">
        <div>
          <label class="gg-label">User ID</label>
          <div style="position:relative;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#a78bfa;font-weight:700;font-size:0.88rem;">@</span>
            <input id="login-userid" type="text" class="gg-input" placeholder="yourhandle" style="padding-left:28px;" autocomplete="username"/>
          </div>
        </div>
        <div>
          <label class="gg-label">Password</label>
          <input id="login-password" type="password" class="gg-input" placeholder="Enter your password" autocomplete="current-password"/>
        </div>
        <p id="login-error" style="color:#f87171;font-size:0.78rem;display:none;margin:0;"></p>
        <button id="btn-login" class="gg-btn-primary" style="width:100%;padding:0.7rem;font-size:0.95rem;margin-top:0.25rem;">
          Log In
        </button>
      </div>`;
  }

  function wireEvents() {
    // Toggle mode
    document.getElementById("btn-toggle-mode")?.addEventListener("click", () => {
      mode = mode === "welcome" ? "login" : "welcome";
      render();
    });

    if (mode === "welcome") {
      // Google sign-in
      document.getElementById("btn-google")?.addEventListener("click", async () => {
        const btn = document.getElementById("btn-google");
        btn.disabled = true; btn.textContent = "Signing in…";
        try {
          await signInWithGoogle();
        } catch (err) {
          console.error(err);
          btn.disabled = false; btn.textContent = "Sign in with Google";
          showToast("Sign-in failed. Please try again.", "error");
        }
      });

      // Anonymous
      document.getElementById("btn-anon")?.addEventListener("click", async () => {
        const btn = document.getElementById("btn-anon");
        btn.disabled = true; btn.textContent = "Loading…";
        try {
          await signInAnonymously();
        } catch (err) {
          console.error(err);
          btn.disabled = false; btn.textContent = "Browse Anonymously";
          showToast("Could not start anonymous session.", "error");
        }
      });

      // Admin login — Google sign-in, auto-detects admin email
      document.getElementById("btn-admin")?.addEventListener("click", async () => {
        const btn = document.getElementById("btn-admin");
        btn.disabled = true; btn.textContent = "🔐 Authenticating…";
        try {
          await signInWithGoogle();
        } catch (err) {
          console.error(err);
          btn.disabled = false; btn.textContent = "Login as Admin";
          showToast("Admin login failed.", "error");
        }
      });
    } else {
      // userId + password login
      document.getElementById("btn-login")?.addEventListener("click", handleLogin);
      document.getElementById("login-password")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleLogin();
      });
    }
  }

  async function handleLogin() {
    const userId = document.getElementById("login-userid").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");
    const btn = document.getElementById("btn-login");

    if (!userId || userId.length < 3) {
      errorEl.textContent = "Enter a valid @userId (min 3 chars).";
      errorEl.style.display = "block";
      return;
    }
    if (!password || password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      errorEl.style.display = "block";
      return;
    }

    errorEl.style.display = "none";
    btn.disabled = true; btn.textContent = "Logging in…";

    try {
      await signInWithUserIdPassword(userId, password);
      // onAuthStateChanged handles routing
    } catch (err) {
      console.error(err);
      let msg = "Login failed.";
      if (err.message?.includes("not found")) msg = "User @" + userId + " not found.";
      else if (err.message?.includes("password")) msg = "This account hasn't set a password yet. Sign in with Google first.";
      else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") msg = "Incorrect password.";
      else if (err.code === "auth/too-many-requests") msg = "Too many attempts. Try again later.";
      errorEl.textContent = msg;
      errorEl.style.display = "block";
      btn.disabled = false; btn.textContent = "Log In";
    }
  }

  render();
}

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
