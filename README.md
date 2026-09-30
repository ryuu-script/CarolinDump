<div align="center">

<img src="src/assets/carolindump_logo.png" alt="CarolinDump logo" width="160" />

# CarolinDump

**With CarolinDump, you'll never have to poop in an old, run-down-looking, under-maintained bathroom ever again.**

A DCISM-hosted web application that tracks all the comfort rooms in The University of San Carlos - Talamban Campus, and allows students to rate their experience after using the a certain bathroom.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-%E2%89%A5%2020-339933?logo=nodedotjs&logoColor=white)
![Status](https://img.shields.io/badge/status-in%20development-orange)

</div>

---

## Table of Contents

- [About](#about)
- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started (Contributors)](#getting-started-contributors)
- [Troubleshooting](#troubleshooting)
- [Developers](#developers)

---

## About

CarolinDump helps students find nearby restroom facilities on campus, and see whether they are usable. Administrators get their own view to keep track and verify review submissions of USC students.

The application has two roles, **Student** and **Admin**, chosen from the welcome screen.

## Screenshots

TBA

## Features

| Feature | Description | Status |
| --- | --- | :---: |
| Welcome screen | Branded landing page with logo, title, and role selection | ✔ |
| Role selection | Choose between **Student** and **Admin** entry points | ✔ |
| Animated loading screen | Progress bar with rotating status messages between page transitions | ✔ |
| Safe redirects | The loading page only accepts in-app paths (`/loading?to=/student`), so links cannot send users to external sites | ✔ |
| Contributor setup script | One command (`setup.sh`) to pull, install, and verify the environment | ✔ |

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI library | [React 19](https://react.dev/) |
| Routing | [React Router 7](https://reactrouter.com/) |
| Build tool / dev server | [Vite 8](https://vite.dev/) with [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) |
| Linting | [Oxlint](https://oxc.rs/docs/guide/usage/linter) (React and Oxc plugins) |
| Language | JavaScript (JSX) |
| Styling | Plain CSS, one stylesheet per component (`src/stylesheets/`) |
| Tooling | Bash setup script, npm |
| Hosting | DCISM Server |

## Project Structure

```
CarolinDump/
├── public/                 # Static assets served as-is (favicon)
├── src/
│   ├── assets/             # Images (logo)
│   ├── components/         # Reusable UI pieces
│   │   ├── Header.jsx
│   │   ├── LoadingScreen.jsx
│   │   ├── Logo.jsx
│   │   └── RoleSelect.jsx
│   ├── pages/              # Route-level pages
│   │   ├── WelcomePage.jsx
│   │   ├── LoadingPage.jsx
│   │   ├── DashboardStudent.jsx
│   │   └── DashboardAdmin.jsx
│   ├── stylesheets/        # CSS files (one per component or page)
│   ├── App.jsx             # Route definitions
│   └── Main.jsx            # App entry point
├── index.html
├── setup.sh                # Contributor setup script
├── .oxlintrc.json          # Lint configuration
└── package.json
```

### Routes

| Path | Page | Notes |
| --- | --- | --- |
| `/` | `WelcomePage` | Landing page and role selection |
| `/loading?to=<path>` | `LoadingPage` | Shows the loading screen, then redirects to `to` |
| `/student` | Student dashboard | Placeholder for now |
| `/admin` | Admin dashboard | Placeholder for now |

## Getting Started (Contributors)

### Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 20 or newer (LTS recommended) | Includes npm |
| [Git](https://git-scm.com/) | Any recent version | On Windows, this also provides **Git Bash** |
| Code editor | Any | [VS Code](https://code.visualstudio.com/) recommended |

### Quick start (recommended)

```bash
# 1. Clone the repository
git clone https://github.com/ryuu-script/CarolinDump.git
cd CarolinDump

# 2. Run the setup script and start the dev server
bash setup.sh --start
```

The app runs at **http://localhost:5173** by default. Vite prints the exact URL in the terminal.

> **Windows users:** run the script in **Git Bash**, not PowerShell or Command Prompt.

### What `setup.sh` does

1. Checks that Node.js (20+) and npm are installed.
2. Pulls the latest code with `git pull --ff-only`. This is skipped if you have uncommitted changes to tracked files.
3. Warns about stray `node_modules` or `package.json` files in parent folders, a common cause of the "Invalid hook call" error.
4. Installs dependencies, using `npm ci` on a fresh machine. It skips the install when nothing has changed.
5. Confirms required packages (such as `react-router-dom`) are present.
6. Verifies there is only one copy of React.
7. Clears the Vite cache.
8. Checks that the `Main.jsx` filename matches `index.html`, because Linux hosts are case-sensitive.

| Command | What it does |
| --- | --- |
| `bash setup.sh` | Pull, install, and run checks |
| `bash setup.sh --start` | Same as above, then start the dev server |
| `bash setup.sh --reinstall` | Delete `node_modules` and reinstall from scratch |
| `bash setup.sh --splash-only` | Show only the splash screen (for testing) |

### Manual setup

If you prefer to do it by hand:

```bash
git clone https://github.com/ryuu-script/CarolinDump.git
cd CarolinDump
npm install
npm run dev
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Invalid hook call` / two copies of React | Delete stray `node_modules` or `package.json` in parent folders, then run `npm dedupe` and `npm ls react` |
| `setup.sh` skips `git pull` | You have local changes. Commit them or run `git stash`, then run the script again |
| Import works on Windows but fails on the server | Filename casing mismatch. Match the exact casing (Linux is case-sensitive) |
| Weird cached behavior in dev | Run `bash setup.sh --reinstall` or delete `node_modules/.vite` |
| `Node vX is old` warning | Upgrade to Node 20 or newer |

## Developers

| # | Name | Role | GitHub |
| :---: | --- | --- | --- |
| 1 | _Salang, Christian Jule O._ | _Project Lead / Full-Stack_ | [@ryuu-script](https://github.com/ryuu-script) |
| 2 | _Full Name_ | _e.g. Front-End Developer_ | [@username](https://github.com/username) |
| 3 | _Full Name_ | _e.g. Back-End Developer_ | [@username](https://github.com/username) |
| 4 | _Full Name_ | _e.g. UI/UX and QA_ | [@username](https://github.com/username) |

---

<div align="center">

Made with care by students of the Department of Computer, Information Sciences and Mathematics (DCISM).

</div>
