// js/app.js – Main entry point

import { onAuthStateChanged } from "./auth.js";
import { navigate } from "./router.js";

// Boot the application
onAuthStateChanged((user) => {
    navigate(user);
});
