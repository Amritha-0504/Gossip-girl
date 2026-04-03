// js/router.js – Role-based view routing

import { renderLogin } from "./pages/login.js";
import { renderProfileSetup } from "./pages/profileSetup.js";
import { renderFeed } from "./pages/feed.js";
import { renderAuthorPanel } from "./pages/authorPanel.js";
import { renderAdminPanel } from "./pages/adminPanel.js";

const appEl = () => document.getElementById("app");

export function navigate(user) {
    const app = appEl();
    app.innerHTML = "";

    if (!user) {
        renderLogin(app);
        return;
    }

    // Non-anonymous users who haven't completed profile setup → show setup screen
    if (!user.isAnonymous && !user.profileSetupDone) {
        renderProfileSetup(app, user);
        return;
    }

    switch (user.role) {
        case "admin":
            renderAdminPanel(app, user);
            break;
        case "author":
            renderAuthorPanel(app, user);
            break;
        default:
            renderFeed(app, user);
    }
}
