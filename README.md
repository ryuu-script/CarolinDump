<div align="center">

<img src="src/assets/carolindump_logo.png" alt="CarolinDump logo" width="160" />

# CarolinDump

**Find a restroom. Check its status. Report problems. All in one place.**

A campus restroom locator and reporting web app for Carolinians, hosted on the DCISM server.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-%E2%89%A5%2020-339933?logo=nodedotjs&logoColor=white)
![Status](https://img.shields.io/badge/status-in%20development-orange)

</div>

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started (Contributors)](#getting-started-contributors)
- [Available Scripts](#available-scripts)
- [Contribution Workflow](#contribution-workflow)
- [Deployment (DCISM Server)](#deployment-dcism-server)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [Developers](#developers)

---

## About

CarolinDump helps students find nearby restroom facilities on campus, see whether they are usable, and report problems such as clogged toilets or missing supplies. Administrators get their own view to keep track of and resolve those reports.

The application has two roles, **Student** and **Admin**, chosen from the welcome screen.

## Features

Status legend: ✅ implemented, 🚧 in progress or planned.

### Core

| Feature | Description | Status |
| --- | --- | :---: |
| Welcome screen | Branded landing page with logo, title, and role selection | ✅ |
| Role selection | Choose between **Student** and **Admin** entry points | ✅ |
| Animated loading screen | Progress bar with rotating status messages between page transitions | ✅ |
| Safe redirects | The loading page only accepts in-app paths (`/loading?to=/student`), so links cannot send users to external sites | ✅ |
| Contributor setup script | One command (`setup.sh`) to pull, install, and verify the environment | ✅ |

### Student

| Feature | Description | Status |
| --- | --- | :---: |
| Restroom locator | Browse restroom locations across campus buildings | 🚧 |
| Availability | See the number of available stalls | 🚧 |
| Supply status | Check whether toilet paper and other supplies are available | 🚧 |
| Issue reporting | Report clogged toilets and other problems | 🚧 |

### Admin

| Feature | Description | Status |
| --- | --- | :---: |
| Report dashboard | View and manage student-submitted reports | 🚧 |
| Restroom management | Add, edit, and update restroom entries and their status | 🚧 |

> The Student and Admin dashboards currently render placeholder pages. See the [Roadmap](#roadmap).

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
| Hosting | DCISM school server |

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

## Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| Dev server | `npm run dev` | Start Vite with hot module replacement |
| Build | `npm run build` | Create a production build in `dist/` |
| Preview | `npm run preview` | Serve the production build locally |
| Lint | `npm run lint` | Run Oxlint across the project |

## Contribution Workflow

1. **Sync** your local `main` branch: `git checkout main && git pull`.
2. **Branch** off `main` using a descriptive name:
   ```bash
   git checkout -b feat/student-restroom-list
   ```
   Suggested prefixes: `feat/`, `fix/`, `chore/`, `docs/`.
3. **Code** your change. Keep components in `src/components/`, pages in `src/pages/`, and give each component its own stylesheet in `src/stylesheets/`.
4. **Lint** before committing: `npm run lint`.
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/), as in the existing history:
   ```
   feat: add restroom list to student dashboard
   fix: correct redirect on loading page
   chore: update dependencies
   docs: expand setup guide
   ```
6. **Push** your branch and open a **Pull Request** into `main`. Describe what changed and how to test it.
7. **Review:** at least one other developer should review and approve before merging.

### Guidelines

- Do not commit `.env` files, `node_modules`, or `dist/`. They are already in `.gitignore`.
- Use **npm** only. Yarn and pnpm lockfiles are git-ignored to avoid conflicts.
- If you add a dependency, commit both `package.json` and `package-lock.json`. Do this on your own machine, not by editing them on the server.
- File names are case-sensitive on the Linux server, so match the exact casing of imports (for example, `Main.jsx`).

## Deployment (DCISM Server)

CarolinDump is deployed to the school's **DCISM server**. Vite builds the front end into static files, which the server then serves.

> Replace the bracketed values below with the details for your DCISM account.

### 1. Build

```bash
npm ci
npm run build
```

This produces the production files in `dist/`.

### 2. Upload

Copy the contents of `dist/` to your web root on the server:

```bash
scp -r dist/* <username>@<dcism-server-host>:<web-root-path>/
```

### 3. Configure single-page app routing

React Router handles routes like `/student` and `/admin` in the browser, so the server must fall back to `index.html` for unknown paths. Otherwise, refreshing the page on `/student` returns a 404.

**Nginx**

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache** (`.htaccess` in the web root)

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### 4. Hosting under a sub-path

If the app is served from a sub-path (for example `https://<dcism-host>/~carolindump/`), set `base` in `vite.config.js` and add a matching `basename` to `BrowserRouter` before building:

```js
// vite.config.js
export default defineConfig({
  base: '/~carolindump/',
  // ...
})
```

### Server checklist

- [ ] Node.js 20+ is available if you build on the server (otherwise build locally and upload `dist/`)
- [ ] Web server is configured with the SPA fallback above
- [ ] HTTPS is enabled if the server supports it
- [ ] Environment variables (once a backend exists) are set on the server, never committed to Git

## Roadmap

- [x] Project scaffolding with React, Vite, and React Router
- [x] Welcome page, role selection, and loading screen
- [x] Contributor setup script
- [ ] Student dashboard: restroom list, stall availability, supply status
- [ ] Issue reporting form
- [ ] Admin dashboard: report management and restroom updates
- [ ] Authentication and role-based access
- [ ] Backend API and database on the DCISM server
- [ ] Automated tests
- [ ] Production deployment

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Invalid hook call` / two copies of React | Delete stray `node_modules` or `package.json` in parent folders, then run `npm dedupe` and `npm ls react` |
| `setup.sh` skips `git pull` | You have local changes. Commit them or run `git stash`, then run the script again |
| Blank page after deploying, 404 on refresh | Add the SPA fallback shown in [Deployment](#deployment-dcism-server) |
| Import works on Windows but fails on the server | Filename casing mismatch. Match the exact casing (Linux is case-sensitive) |
| Weird cached behavior in dev | Run `bash setup.sh --reinstall` or delete `node_modules/.vite` |
| `Node vX is old` warning | Upgrade to Node 20 or newer |

## Developers

| # | Name | Role | GitHub |
| :---: | --- | --- | --- |
| 1 | _Full Name_ | _e.g. Project Lead / Full-Stack_ | [@ryuu-script](https://github.com/ryuu-script) |
| 2 | _Full Name_ | _e.g. Front-End Developer_ | [@username](https://github.com/username) |
| 3 | _Full Name_ | _e.g. Back-End Developer_ | [@username](https://github.com/username) |
| 4 | _Full Name_ | _e.g. UI/UX and QA_ | [@username](https://github.com/username) |

---

<div align="center">

Made with care by students of the Department of Computer, Information Sciences and Mathematics (DCISM).

</div>