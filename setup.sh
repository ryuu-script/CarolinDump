#!/usr/bin/env bash
# CarolinDump setup script

# Usage:   bash setup.sh                    pull latest code, install what's needed, run checks
#               bash setup.sh --start            pull latest code, install what's needed, run checks, then start the dev server
#               bash setup.sh --reinstall        wipe node_modules and reinstall from scratch
#               bash setup.sh --splash-only      show only the splash screen (for testing)
#
# Run it from anywhere; it moves into its own folder (the one with package.json).
# On Windows, run it in Git Bash (installed with Git for Windows).

set -e
cd "$(dirname "$0")"

# ---------- Read flags ----------
START=0; REINSTALL=0; SPLASH_ONLY=0
for arg in "$@"; do
    case "$arg" in
        --start)       START=1 ;;
        --reinstall)   REINSTALL=1 ;;
        --splash-only) SPLASH_ONLY=1 ;;
    esac
done

# ---------- Splash screen (runs before the real setup) ----------
BANNER_TEXT="All-in-one solution sa mga tapulan mo setup sa project."
WAIT_SECONDS=5

show_banner() {
    printf '\n\033[1;33m'
    # Quoted heredoc: backslashes are printed exactly as written
    cat <<'ASCII'
  _______       _     __  _           ____        _      __ 
 / ___/ /  ____(_)__ / /_(_)__ ____  / __/_______(_)__  / /_
/ /__/ _ \/ __/ (_-</ __/ / _ `/ _ \_\ \/ __/ __/ / _ \/ __/
\___/_//_/_/ /_/___/\__/_/\_,_/_//_/___/\__/_/ /_/ .__/\__/ 
                                                /_/
ASCII
    printf '\n  %s\n\033[0m\n' "$BANNER_TEXT"
}

splash() {
    show_banner
    local i
    for ((i = WAIT_SECONDS; i > 0; i--)); do
        printf '\r  Starting in %d... ' "$i"
        sleep 1
    done
    printf '\r%30s\r\n' ''
}

# Don't replay the splash if the script restarted itself after a git pull
if [ -z "$SETUP_RERAN" ]; then
    splash
fi
[ "$SPLASH_ONLY" -eq 1 ] && exit 0   # test the splash without running setup


ok()   { printf '\033[32m✔\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }
fail() { printf '\033[31m✖\033[0m %s\n' "$1"; exit 1; }

echo "Setting up CarolinDump in: $(pwd)"
echo

# 1. Node and npm
command -v node >/dev/null 2>&1 || fail "Node.js not found. Install the LTS version from https://nodejs.org (or use nvm) and run this again."
command -v npm  >/dev/null 2>&1 || fail "npm not found. Reinstall Node.js from https://nodejs.org."
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 20 ] || warn "Node $(node -v) is old. Vite needs Node 20 or newer; please upgrade."
ok "Node $(node -v), npm $(npm -v)"

# 2. Right folder?
[ -f package.json ] || fail "No package.json here. Run this script from the project folder."
ok "Found package.json"

# 2b. Pull the latest code (only works if this folder is a git clone)
if [ -d .git ] && command -v git >/dev/null 2>&1; then
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
        warn "You have local changes to tracked files, so I'm skipping git pull."
        warn "Commit or stash them first (git stash), then run this again."
    else
        OLD=$(git rev-parse HEAD)
        if git pull --ff-only; then
            NEW=$(git rev-parse HEAD)
            if [ "$OLD" != "$NEW" ]; then
                ok "Updated ${OLD:0:7} -> ${NEW:0:7}"
                # setup.sh itself may have changed, so restart with the new copy
                if [ -z "$SETUP_RERAN" ]; then
                    SETUP_RERAN=1 exec bash "./$(basename "$0")" "$@"
                fi
            else
                ok "Already up to date"
            fi
        else
            warn "git pull failed (no network, bad credentials, or diverged history). Continuing with the current code."
        fi
    fi
else
    warn "Not a git repository (or git missing), skipping update."
fi

# 3. Stray installs in parent folders (cause the 'two copies of React' error)
STRAY=""
for d in .. ../..; do
    if [ -d "$d/node_modules" ] || [ -f "$d/package.json" ]; then
        STRAY="$STRAY $(cd "$d" && pwd)"
    fi
done
if [ -n "$STRAY" ]; then
    warn "Found node_modules or package.json in:$STRAY"
    warn "That can cause 'Invalid hook call' errors. Delete them there if you didn't mean to create them."
fi

# 4. Install dependencies (skipped if nothing changed since the last run)
STAMP="node_modules/.setup-stamp"
fingerprint() { cat package.json package-lock.json 2>/dev/null | cksum; }

if [ "$REINSTALL" -eq 1 ]; then
    warn "--reinstall given, wiping node_modules"
    rm -rf node_modules
fi

if [ -d node_modules ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$(fingerprint)" ]; then
    ok "Dependencies already installed and unchanged, skipping"
else
    if [ -f package-lock.json ] && [ ! -d node_modules ]; then
        # Fresh machine: exact versions from the lockfile
        npm ci || { warn "npm ci failed, falling back to npm install"; npm install; }
    else
        # node_modules exists but is out of date: npm install only adds/updates what changed
        npm install
    fi
    mkdir -p node_modules && fingerprint > "$STAMP"
    ok "Dependencies installed"
fi

# 5. Make sure specific packages are present (skip the ones already installed)
REQUIRED_PKGS="react-router-dom"   # space-separated, add more here
for pkg in $REQUIRED_PKGS; do
    if [ -d "node_modules/$pkg" ]; then
        ok "$pkg already installed, skipping"
    else
        warn "$pkg is missing, installing it"
        npm install "$pkg"
        fingerprint > "$STAMP"   # package.json changed, so refresh the stamp
        ok "$pkg installed"
    fi
done
if [ -d .git ] && [ -n "$(git status --porcelain package.json 2>/dev/null)" ]; then
    warn "package.json was modified on this machine. Add the package on your own PC, commit and push,"
    warn "otherwise the next git pull will be skipped because of local changes."
fi

# 6. Only one copy of React?
REACT_COPIES=$(npm ls react --all --parseable 2>/dev/null | grep -c '/node_modules/react$' || true)
if [ "${REACT_COPIES:-0}" -gt 1 ]; then
    warn "Found $REACT_COPIES copies of React. Try: npm dedupe   (then: npm ls react)"
elif npm ls react react-dom >/dev/null 2>&1; then
    ok "Single copy of React"
else
    warn "npm reports a React version problem. Run: npm ls react react-dom"
fi

# 7. Clear Vite's cache
rm -rf node_modules/.vite
ok "Vite cache cleared"

# 8. main.jsx filename must match index.html exactly (Linux hosts are case-sensitive)
if grep -q "/src/main.jsx" index.html 2>/dev/null && ! ls src | grep -qx "main.jsx"; then
    warn "index.html loads src/main.jsx but the file is named differently (check capital letters)."
fi

# 9. Environment file: holds the Google sign-in client ID. It is gitignored, so every machine needs its own.
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" <<'ENV'
# Google OAuth "Web application" client ID (Google Cloud Console > APIs & Services > Credentials).
# Authorized redirect URI to add there: <your site>/auth/callback
# e.g. http://localhost:5173/auth/callback
VITE_GOOGLE_CLIENT_ID=
ENV
    ok "Created .env (client ID left blank)"
elif ! grep -q '^VITE_GOOGLE_CLIENT_ID=' "$ENV_FILE"; then
    # .env exists but doesn't have the variable yet; add it without touching anything else
    printf '\nVITE_GOOGLE_CLIENT_ID=\n' >> "$ENV_FILE"
    ok "Added a blank VITE_GOOGLE_CLIENT_ID to your existing .env"
fi

if grep -Eq '^VITE_GOOGLE_CLIENT_ID=[[:space:]]*$' "$ENV_FILE"; then
    warn "VITE_GOOGLE_CLIENT_ID in .env is blank, so Google sign-in won't work yet."
    warn "Paste your client ID after the = sign, then restart the dev server."
else
    ok ".env has a Google client ID"
fi

echo
ok "Setup complete"

if [ "$START" -eq 1 ]; then
    echo "Starting dev server..."
    npm run dev -- --force
else
    echo "Start the app with:  npm run dev"
fi