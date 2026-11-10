<div align="center">

<img src="src/assets/carolindump_logo.png" alt="CarolinDump logo" width="160" />

# CarolinDump

**With CarolinDump, you'll never have to poop in an old, run-down-looking, under-maintained bathroom ever again.**

A DCISM-hosted web application that tracks the comfort rooms of the University of San Carlos, Talamban Campus, and lets students rate their experience after using a bathroom.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-database-4479A1?logo=mysql&logoColor=white)
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
- [Configuration](#configuration)
- [Available Scripts](#available-scripts)
- [Deploying Updates to the Server](#deploying-updates-to-the-server)
- [Troubleshooting](#troubleshooting)
- [Developers](#developers)

---

## About

CarolinDump helps students find nearby restroom facilities on campus and see whether they are usable. Administrators get their own view to keep track of, and verify, review submissions from USC students.

The application has two roles, **Student** and **Admin**, chosen from the welcome screen:

| Role | Sign-in | Entry point |
| --- | --- | --- |
| Student | Google sign-in, limited to `usc.edu.ph` accounts | `/student` |
| Admin | Email and password, checked against the `admins` table | `/admin` |

## Screenshots

TBA

## Features

| Feature | Description | Status |
| --- | --- | :---: |
| Welcome screen | Branded landing page with logo, title, and role selection | Done |
| Role selection | Choose between **Student** and **Admin** entry points | Done |
| Animated loading screen | Progress bar with rotating status messages between page transitions | Done |
| Safe redirects | The loading page only accepts in-app paths (`/loading?to=/student`), so links cannot send users to external sites | Done |
| Interactive campus map | Zoomable map of the campus; pick a building to see its bathrooms | Done |
| Building pages | Bathroom cards with photos, room code, unit, and rating, sortable by rating or floor | Done |
| Google sign-in for students | Restricted to university (`usc.edu.ph`) accounts | Done |
| Admin login | Email and password check with hashed passwords and rate limiting on failed attempts | Done |
| Protected admin routes | Admin-only pages redirect to the admin login when not signed in | Done |
| Express and MySQL API | Serves bathroom data per building and verifies admin logins | Done |
| Contributor quickstart script | One command (`qstart.sh`) to set up, tunnel to the database, and run the app | Done |
| Review submission and listing | Students submit reviews; admins verify them | Planned |

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI library | [React 19](https://react.dev/) |
| Routing | [React Router 7](https://reactrouter.com/) |
| Build tool / dev server | [Vite 8](https://vite.dev/) with [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) |
| API server | [Express 5](https://expressjs.com/) with [`cors`](https://github.com/expressjs/cors) |
| Database | MySQL, accessed through [`mysql2`](https://sidorares.github.io/node-mysql2/docs) |
| Configuration | [`dotenv`](https://github.com/motdotla/dotenv) |
| Linting | [Oxlint](https://oxc.rs/docs/guide/usage/linter) (React and Oxc plugins) |
| Language | JavaScript (JSX) |
| Styling | Plain CSS, one stylesheet per page or component (`src/stylesheets/`) |
| Process manager | [PM2](https://pm2.keymetrics.io/) (production) |
| Tooling | Bash quickstart script, npm |
| Hosting | DCISM Server |

## Project Structure

```
CarolinDump/
├── server-api/               # Express API and database tooling
│   ├── server_connect.js     # API server, also serves the built frontend
│   ├── bathrooms.js          # Frontend helper for fetching bathroom data
│   ├── database_seeder.js    # Creates tables and seeds sample data
│   └── password_manager.js   # Password hashing and verification
├── src/
│   ├── assets/               # Images (logo, guest avatar)
│   ├── authentication/       # Google sign-in and admin login helpers
│   ├── components/           # Reusable UI pieces
│   │   ├── Header.jsx
│   │   ├── Logo.jsx
│   │   ├── Role_Select.jsx
│   │   ├── Loading_Screen.jsx
│   │   ├── Page_Transition.jsx
│   │   ├── Campus_Map.jsx
│   │   ├── Dash_Elements.jsx
│   │   ├── Bathroom_Card.jsx
│   │   ├── Sort_Controls.jsx
│   │   └── Require_Admin.jsx
│   ├── data/
│   │   └── buildings.js      # Building ids, database codes, and names
│   ├── pages/                # Route-level pages
│   │   ├── Page_Start.jsx
│   │   ├── Page_Loading.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Building_Current.jsx
│   │   ├── Login_Admin.jsx
│   │   └── Login_Google.jsx
│   ├── stylesheets/          # CSS files (one per page or component group)
│   ├── App.jsx               # Route definitions
│   └── Main.jsx              # App entry point
├── index.html
├── qstart.sh                 # Contributor setup and quickstart script
├── ecosystem.config.cjs      # PM2 configuration for the server
├── vite.config.js            # Vite config (proxies /api to the API in dev)
├── .oxlintrc.json            # Lint configuration
└── package.json
```

### Routes

| Path | Page | Notes |
| --- | --- | --- |
| `/` | `Page_Start` | Landing page and role selection |
| `/loading?to=<path>` | `Page_Loading` | Shows the loading screen, then redirects to `to` |
| `/student` | `Dashboard` (student) | Campus map and student menu |
| `/admin/login` | `Login_Admin` | Admin email and password sign-in |
| `/admin` | `Dashboard` (admin) | Admin only; redirects to `/admin/login` when signed out |
| `/building/:buildingId` | `Building_Current` | Sortable list of a building's bathrooms |
| `/auth/callback` | `Login_Google` | Google sign-in landing page |
| `/reviews`, `/reviews/submit` | Placeholder | Not built yet |
| `/sudo` | Placeholder | Admin only; not built yet |

### API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/bathrooms/:building` | All bathrooms for a building code (`LB`, `AF`, `MR`, `CHURCH`, `JB`, `ES`, `FO`, `EO`, `SM`, `PE`, `RH`) |
| `POST` | `/api/admin/login` | Verifies admin credentials; limited to 5 failed attempts per 10 minutes |

In production the same Express server also serves the built frontend from `dist/`.

## Getting Started (Contributors)

### Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 20 or newer (LTS recommended) | Includes npm |
| [Git](https://git-scm.com/) | Any recent version | On Windows, this also provides **Git Bash** |
| SSH access | DCISM server account | Needed to tunnel to the shared MySQL database |
| Code editor | Any | [VS Code](https://code.visualstudio.com/) recommended |

### Quick start (recommended)

```bash
# 1. Clone the repository
git clone https://github.com/ryuu-script/CarolinDump.git
cd CarolinDump

# 2. Set up the project, then run it
bash qstart.sh --all
```

The app runs at **http://localhost:5173** by default. Vite prints the exact URL in the terminal.

> **Windows users:** run the script in **Git Bash**, not PowerShell or Command Prompt.

On the first run, `--set` creates a `.env` file with blank values. Fill in the blanks (see [Configuration](#configuration)), then run `bash qstart.sh --run` again.

### qstart.sh modes

| Command | What it does |
| --- | --- |
| `bash qstart.sh --set` | Pull the latest code, run checks, install dependencies, create `.env`, and seed the database |
| `bash qstart.sh --run` | Open the SSH tunnel, connect to the database, and start the Vite dev server and API server |
| `bash qstart.sh --all` | Run `--set`, then `--run` |
| `bash qstart.sh --set --reinstall` | Delete `node_modules` and reinstall from scratch |
| `bash qstart.sh --help` | Show usage |

### What `--set` does

1. Checks that Node.js (20+) and npm are installed.
2. Looks for `package.json`, then pulls the latest code with `git pull --ff-only`. The pull is skipped if you have uncommitted changes to tracked files.
3. Warns about stray `node_modules` or `package.json` files in parent folders, a common cause of the "Invalid hook call" error.
4. Installs dependencies, using `npm ci` on a fresh machine. It skips the install when nothing has changed.
5. Confirms required packages (such as `react-router-dom`) are present.
6. Verifies there is only one copy of React.
7. Clears the Vite cache.
8. Checks that the `Main.jsx` filename matches `index.html`, because Linux hosts are case-sensitive.
9. Creates or completes the `.env` file and warns about blank values.
10. Seeds the database, if the database login is filled in.

### Manual setup

If you prefer to do it by hand, you need a reachable MySQL database and a filled-in `.env` first:

```bash
git clone https://github.com/ryuu-script/CarolinDump.git
cd CarolinDump
npm install
npm run seed       # first-time database setup
npm run server     # API server (terminal 1)
npm run dev        # Vite dev server (terminal 2)
```

## Configuration

Secrets live in a `.env` file at the project root. It is gitignored, so it is never committed and never overwritten by `git pull`.

| Variable | Purpose |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for student sign-in. Baked into the frontend at build time |
| `DB_HOST` | Database host (`127.0.0.1` when using the SSH tunnel) |
| `DB_PORT` | Database port (`3307` for the SSH tunnel's local end, `3306` otherwise) |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `CORS_ORIGIN` | Optional. Allowed origin for API requests (defaults to `http://localhost:5173`) |
| `PORT` | Optional. API port (defaults to `3001`; PM2 sets `20304` on the server) |

Notes:

- Use no quotes and no spaces around values.
- Vite only reads `.env` when it starts, so restart the dev server after editing.
- Variables prefixed with `VITE_` are exposed to the browser. Never put secrets in them.

## Available Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server (proxies `/api` to `localhost:3001`) |
| `npm run server` | Start the API server with auto-restart on file changes |
| `npm run build` | Build the frontend into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |
| `npm run seed` | Create tables and insert sample data. Does nothing if bathrooms already exist |
| `npm run seed:fresh` | Wipe reviews and bathrooms, then reseed. **Destroys existing data** |

## Deploying Updates to the Server

The production app runs on the school server at `~/carolindump.dcism.org/CarolinDump` under PM2 (process name `carolindump`).

1. **Push your changes from your PC** to GitHub as usual.

2. **On the school server, go to the project folder:**
   ```bash
   cd ~/carolindump.dcism.org/CarolinDump
   ```

3. **Pull the latest code:**
   ```bash
   git pull
   ```

4. **Install packages, but only if `package.json` changed:**
   ```bash
   npm install
   ```
   If you are not sure, run it anyway. It is harmless.

5. **Rebuild the frontend.** This is required whenever any frontend code (`src/`) changed:
   ```bash
   npm run build
   ```

6. **Restart the app:**
   ```bash
   pm2 restart carolindump
   ```

7. **Check that it started properly:**
   ```bash
   pm2 logs carolindump --lines 10 --nostream
   ```
   Look for `Database connection OK`, then hard refresh the site (Ctrl+Shift+R).

### Quick reference

| What changed | What to run |
| --- | --- |
| Any code | `git pull`, `npm run build`, `pm2 restart carolindump` |
| New packages added | also `npm install` before building |
| Only database values in `.env` | edit `.env`, then `pm2 restart carolindump` |
| `VITE_GOOGLE_CLIENT_ID` in `.env` | edit `.env`, then `npm run build` and `pm2 restart carolindump` |
| Seed data changed | `npm run seed:fresh` (**wipes the database**) |

### Deployment notes

- **`.env` is never touched by `git pull`**, since it is gitignored. Your secrets stay on the server.
- **Do not run `npm run seed:fresh`** unless you want to erase the database and start over. The normal `npm run seed` is for first-time setup only.
- **If `git pull` complains about local changes**, a file was edited on the server. Run `git status` to see which one. Make your edits on your PC and push them, not on the server.
- **If something breaks after an update**, check `pm2 logs carolindump` first. The error message usually says what is wrong.
- **If the server reboots** and the app does not come back, run `pm2 resurrect`, or ask the server admins whether auto-start (`pm2 startup`) is supported.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Invalid hook call` / two copies of React | Delete stray `node_modules` or `package.json` in parent folders, then run `npm dedupe` and `npm ls react` |
| `qstart.sh` skips `git pull` | You have local changes. Commit them or run `git stash`, then run the script again |
| Import works on Windows but fails on the server | Filename casing mismatch. Match the exact casing (Linux is case-sensitive) |
| Weird cached behavior in dev | Run `bash qstart.sh --set --reinstall` or delete `node_modules/.vite` |
| `Node vX is old` warning | Upgrade to Node 20 or newer |
| API cannot reach MySQL | Check `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` in `.env`, and that the SSH tunnel is open (`bash qstart.sh --run`) |
| Google sign-in says it is not set up | Add `VITE_GOOGLE_CLIENT_ID` to `.env`, then restart the dev server (or rebuild on the server) |
| Site looks outdated after a deploy | Run `npm run build` on the server, restart with PM2, and hard refresh (Ctrl+Shift+R) |

## Developers

| # | Name | Role | GitHub |
| :---: | --- | --- | --- |
| 1 | _Salang, Christian Jule Ong_ | _Project Lead / Developer_ | [@ryuu-script](https://github.com/ryuu-script) |
| 2 | _Rubi, Joshua Stephen Dale_ | _Developer_ | [@Lostconfii](https://github.com/Lostconfii) |
| 3 | _Perilla, Leopert Bryan_ | _Developer_ | [@httpsleobryn](https://github.com/httpsleobryn) |
| 4 | _Dominguez, Jireh_ | _Developer_ | [@KyojuroRengoku-sudo](https://github.com/KyojuroRengoku-sudo) |
| 5 | _Taoy, Lance Vincent_ | _Documentation Specialist_ | [@username](https://github.com/username) |


---

<div align="center">

Created by: DCISM's Tubolinians.

</div>
