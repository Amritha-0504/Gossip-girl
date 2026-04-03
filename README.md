<div align="center">

# Gossip Girl

**A role-based anonymous social feed web application**

[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://netlify.com)

[Live Demo](#) · [Report a Bug](../../issues) · [Request a Feature](../../issues)

</div>

---

## Overview

Gossip Girl is a full-stack web application built with vanilla JavaScript and Firebase. It provides a date-navigable, anonymous-capable social feed with a three-tier role system — viewers, authors, and administrators — each with a purpose-built interface.

The application runs entirely in the browser without a build step, using ES6 modules and Firebase's CDN SDK.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Data Model](#data-model)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Authentication & Authorization
- Google OAuth sign-in via Firebase Authentication
- Anonymous guest access (read-only)
- Immutable `@userId` handle chosen at first login
- Role-based routing — each role renders a separate, dedicated view

| Role | Capabilities |
|---|---|
| **Viewer** | Browse feed, read & write comments |
| **Author** | All viewer permissions + create, edit, and delete own posts |
| **Admin** | All author permissions + user management, moderation, author approvals |

### Social Feed
- Chronological feed with **date navigation** (previous / next day)
- `@userId` mention support — parsed and rendered as highlighted, interactive tags
- **Conditional anonymity** — authors may hide their identity per post
- Nested comment threads on all posts
- 1-hour edit window for authors on published posts

### Admin Panel
- Author request queue with approve / reject actions
- User directory with search across name, handle, and email
- Role promotion and demotion controls
- Pending request badge count on the navigation icon
- Admin profile editing (display name & avatar; `userId` is immutable)

### Author Panel
- Unified view of the author's own posts and the full public feed
- One-click author request submission for viewers

### Splash Screen
- Branded video intro with cinematic vignette overlay
- Auto-dismisses on video end; touch-to-skip on mobile
- 7-second safety fallback to prevent blocking the app

### Responsive Design
- Mobile-first layout using `100dvh` for correct viewport sizing on iOS Safari
- Adaptive splash video: `object-fit: cover` on portrait, `contain` on landscape
- Touch-optimised tap targets across all views

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | Vanilla CSS3 + Tailwind CSS (CDN) |
| Logic | JavaScript (ES6 Modules, no bundler) |
| Typography | Playfair Display, Inter (Google Fonts) |
| Authentication | Firebase Authentication — Google & Anonymous providers |
| Database | Cloud Firestore |
| Analytics | Firebase Analytics |
| Routing | Custom client-side role-based router |
| Hosting | Netlify |

---

## Project Structure

```
gossip-girl/
├── index.html                  # App shell, splash screen, Tailwind config
├── netlify.toml                # SPA redirect rule for client-side routing
├── styles/
│   └── main.css                # Global design system, tokens, and component styles
├── js/
│   ├── app.js                  # Entry point — initialises auth listener
│   ├── auth.js                 # Firebase Auth observer & user profile enrichment
│   ├── db.js                   # Firestore CRUD helpers (posts, comments, users, requests)
│   ├── firebase.js             # Firebase initialisation & ADMIN_EMAIL constant
│   ├── router.js               # Role-based view routing
│   ├── pages/
│   │   ├── login.js            # Login page (Google sign-in + anonymous entry)
│   │   ├── profileSetup.js     # First-time profile setup (@handle, display name, avatar)
│   │   ├── feed.js             # Public social feed
│   │   ├── authorPanel.js      # Author dashboard
│   │   └── adminPanel.js       # Admin control panel
│   └── utils/
│       ├── anonymity.js        # Conditional anonymity resolution helpers
│       ├── dateUtils.js        # Date navigation and formatting utilities
│       └── tagging.js          # @userId mention parser and renderer
└── video/
    └── Gossipgirl-03-26.mov    # Splash screen video asset
```

---

## Getting Started

### Prerequisites

- A [Firebase project](https://console.firebase.google.com/) with the following enabled:
  - **Authentication** — Google and Anonymous providers
  - **Cloud Firestore** — in production or test mode
- A static HTTP server for local development (ES6 modules require `http://`, not `file://`)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/your-username/gossip-girl.git
cd gossip-girl
```

**2. Configure Firebase credentials**

Open `js/firebase.js` and replace the placeholder config with your Firebase project's values (found in the Firebase Console under **Project Settings → General**):

```js
// js/firebase.js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

// The Google account with this email is always granted the admin role.
export const ADMIN_EMAIL = "your-admin@gmail.com";
```

> [!CAUTION]
> Never commit real API keys to a public repository. Consider using environment injection or a build step to keep credentials out of source control.

**3. Start a local development server**

```bash
# Node.js
npx http-server . -p 8080 --cors

# Python 3
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Configuration

### Firestore Security Rules

Navigate to **Firebase Console → Firestore → Rules** and define appropriate read/write rules. Below is a minimal example to get started:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.authorUid;
    }

    match /posts/{postId}/comments/{commentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /authorRequests/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

### Admin Account

The admin role is determined by the `ADMIN_EMAIL` constant in `js/firebase.js`. The first time that Google account signs in, it is automatically granted and stored with the `admin` role in Firestore.

---

## Data Model

```
users/{uid}
  displayName       string
  userId            string          // immutable @handle
  email             string
  photoURL          string
  role              "viewer" | "author" | "admin"
  profileSetupDone  boolean

posts/{postId}
  authorUid         string
  authorName        string
  anonymous         boolean
  content           string          // may contain @userId mentions
  createdAt         timestamp

  comments/{commentId}
    authorUid       string
    authorName      string
    content         string
    createdAt       timestamp

authorRequests/{uid}
  displayName       string
  userId            string
  requestedAt       timestamp
```

---

## Deployment

The repository includes a `netlify.toml` with a catch-all redirect rule, enabling client-side routing on Netlify:

```toml
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

**To deploy:**
1. Push the repository to GitHub.
2. Connect the repo to [Netlify](https://netlify.com) via **Add New Site → Import from Git**.
3. No build command or publish directory is required — Netlify serves the root directly.
4. The site will redeploy automatically on every push to the main branch.

---

## Contributing

Contributions are welcome. Please follow the steps below:

1. **Fork** the repository.
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes with a clear message:
   ```bash
   git commit -m "feat: add your feature description"
   ```
4. **Push** the branch and **open a Pull Request** against `main`.

Please open an issue before submitting large changes so the approach can be discussed first.

---

## License

This project is released for educational and personal use. It is not affiliated with, endorsed by, or connected to the *Gossip Girl* television series or its rights holders.
