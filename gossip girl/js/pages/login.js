// js/pages/login.js – Login landing page

import { signInWithGoogle, signInAnonymously } from "../auth.js";

export function renderLogin(container) {
    container.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] px-4">
      <div class="glass-card w-full max-w-sm text-center py-12 px-8 animate-fadeIn">

        <!-- Logo / Brand -->
        <div class="mb-6">
          <div class="brand-logo mx-auto mb-3">GG</div>
          <h1 class="text-4xl font-extrabold tracking-tight text-white font-display">Gossip Girl</h1>
          <p class="text-purple-300 mt-2 text-sm tracking-widest uppercase">You know you love me. XOXO</p>
        </div>

        <div class="divider my-6"></div>

        <p class="text-gray-300 text-sm mb-8 leading-relaxed">
          The city's most scandalous feed.<br/>
          <span class="text-pink-400 font-semibold">Who said what? We're not telling.</span>
        </p>

        <!-- Regular login buttons -->
        <div class="flex flex-col gap-3">
          <button id="btn-google" class="btn-primary flex items-center justify-center gap-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <button id="btn-anon" class="btn-ghost flex items-center justify-center gap-2">
            <svg class="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Browse Anonymously
          </button>
        </div>

        <!-- Admin separator -->
        <div class="flex items-center gap-3 my-6">
          <div class="divider flex-1"></div>
          <span class="text-gray-600 text-xs shrink-0">or</span>
          <div class="divider flex-1"></div>
        </div>

        <!-- Admin login — visually distinct -->
        <button id="btn-admin" class="admin-login-btn w-full flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Login as Admin
        </button>
        <p class="text-gray-600 text-xs mt-2">Only for site administrators</p>

        <p class="text-gray-500 text-xs mt-8">
          By continuing you agree to our
          <span class="text-purple-400 cursor-pointer hover:underline">Terms</span> and
          <span class="text-purple-400 cursor-pointer hover:underline">Privacy Policy</span>.
        </p>
      </div>
    </div>`;

    // Regular Google sign-in
    document.getElementById("btn-google").addEventListener("click", async () => {
        const btn = document.getElementById("btn-google");
        btn.disabled = true; btn.textContent = "Signing in…";
        try {
            await signInWithGoogle();
            // onAuthStateChanged in app.js handles routing
        } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg> Sign in with Google`;
            showToast("Sign-in failed. Please try again.", "error");
        }
    });

    // Anonymous
    document.getElementById("btn-anon").addEventListener("click", async () => {
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

    // Admin login — same Google flow, auto-promotes by email in auth.js
    document.getElementById("btn-admin").addEventListener("click", async () => {
        const btn = document.getElementById("btn-admin");
        btn.disabled = true; btn.textContent = "🔐 Authenticating…";
        try {
            await signInWithGoogle();
            // auth.js will auto-detect admin email and set role = "admin"
        } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg> Login as Admin`;
            showToast("Admin login failed. Are you using the correct account?", "error");
        }
    });
}

function showToast(msg, type = "info") {
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
