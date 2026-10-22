#!/usr/bin/env bash
# CarolinDump Setup Script

# Usage:   bash setup.sh                    pull latest code, install what's needed, run checks
#          bash setup.sh --reinstall        wipe node_modules and reinstall from scratch

set -eE
cd "$(dirname "$0")" || { echo "Cannot move into the script's folder: $(dirname "$0")"; exit 1; }

# Output helpers
CURRENT_STEP="starting up"
FAIL_HANDLED=""
LAST_FAILED_CMD=""
LAST_FAILED_LINE=""

ok()   { printf '\033[32m[PASS]\033[0m %s\n' "$1"; }
warn() { printf '\033[33m[WARNING]\033[0m %s\n' "$1"; }
hint() { printf '    \033[2m[HINT] %s\033[0m\n' "$1"; }

env_report() {
    echo
    echo "  Environment (copy this when asking for help):"
    hint "OS:        $(uname -s 2>/dev/null || echo '?') $(uname -r 2>/dev/null || echo '')"
    hint "Folder:    $(pwd)"
    hint "Node:      $(node -v 2>/dev/null || echo 'not found') ($(command -v node 2>/dev/null || echo 'no path'))"
    hint "npm:       $(npm -v 2>/dev/null || echo 'not found')"
    hint "Registry:  $(npm config get registry 2>/dev/null || echo 'unknown')"
    hint "Git:       $(git --version 2>/dev/null || echo 'not found')"
    hint "Branch:    $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'not a git repo')"
    hint "Commit:    $(git log -1 --format='%h %s' 2>/dev/null || echo 'n/a')"
    echo
}

fail() {
    FAIL_HANDLED=1
    printf '\033[31m✖\033[0m %s\n' "$1"
    shift
    local line
    for line in "$@"; do hint "$line"; done
    echo
    printf '  Failed during step: %s\n' "$CURRENT_STEP"
    env_report
    exit 1
}

trap 'LAST_FAILED_CMD=$BASH_COMMAND; LAST_FAILED_LINE=$LINENO' ERR
on_exit() {
    local rc=$?
    if [ "$rc" -ne 0 ] && [ "$rc" -ne 130 ] && [ -z "$FAIL_HANDLED" ]; then
        echo
        printf '\033[31m✖\033[0m Setup stopped unexpectedly (exit code %s).\n' "$rc"
        hint "Step:     $CURRENT_STEP"
        if [ -n "$LAST_FAILED_CMD" ]; then
            hint "Command:  $LAST_FAILED_CMD"
            hint "Line:     $LAST_FAILED_LINE in setup.sh"
        fi
        hint "Tip: re-run with  bash -x setup.sh  to see every command as it runs."
        env_report
    fi
}
trap on_exit EXIT

run_npm() {
    local log status
    log=$(mktemp 2>/dev/null || echo "${TMPDIR:-/tmp}/carolindump-npm.log")
    npm "$@" 2>&1 | tee "$log"
    status=${PIPESTATUS[0]}
    if [ "$status" -eq 0 ]; then
        rm -f "$log"
        return 0
    fi

    echo
    printf '\033[31m✖\033[0m "npm %s" failed (exit code %s).\n' "$*" "$status"
    echo "  What this usually means:"
    local matched=0
    if grep -qE 'EBADENGINE|Unsupported engine|requires a peer of node|engine "node"' "$log"; then
        matched=1
        hint "- A package needs a newer Node than the one installed ($(node -v 2>/dev/null))."
        hint "  Install the current LTS from https://nodejs.org (or: nvm install --lts && nvm use --lts)."
    fi
    if grep -qE 'ERESOLVE|peer dep|Could not resolve dependency' "$log"; then
        matched=1
        hint "- Version conflict: package.json and package-lock.json disagree (or two packages need different versions)."
        hint "  On your main PC run: npm install, then commit package.json + package-lock.json and push."
        hint "  Temporary workaround on this PC only: npm install --legacy-peer-deps"
    fi
    if grep -qE 'npm ci can only install|package.json and package-lock.json .* not in sync|lock file.*out of sync|Missing: .* from lock file' "$log"; then
        matched=1
        hint "- package-lock.json is out of sync with package.json."
        hint "  On your main PC run: npm install, then commit package-lock.json and push."
    fi
    if grep -qE 'ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|network|socket hang up|FETCH_ERROR' "$log"; then
        matched=1
        hint "- Network problem reaching the npm registry ($(npm config get registry 2>/dev/null))."
        hint "  Check your internet / VPN / proxy / school or office firewall, then run this again."
        hint "  Proxy check: npm config get proxy ; npm config get https-proxy"
    fi
    if grep -qE 'EACCES|EPERM|operation not permitted' "$log"; then
        matched=1
        hint "- Permission problem writing to node_modules or the npm cache."
        hint "  Close the dev server, your editor and antivirus scans, then run: bash setup.sh --reinstall"
        hint "  Avoid using sudo; it creates root-owned files that cause more of these errors."
    fi
    if grep -qE 'EBUSY|resource busy|EMFILE' "$log"; then
        matched=1
        hint "- A file is locked by another program (common on Windows)."
        hint "  Stop 'npm run dev', close editors/terminals using this folder, then run: bash setup.sh --reinstall"
    fi
    if grep -qE 'ENOSPC|no space left' "$log"; then
        matched=1
        hint "- The disk is full. Free some space, then run this again."
    fi
    if grep -qE 'E404|404 Not Found|code E404' "$log"; then
        matched=1
        hint "- A package or version was not found in the registry. Check the name/version in package.json for typos."
    fi
    if grep -qE 'ENOTEMPTY|EEXIST|corrupt|integrity|EINTEGRITY|Invalid Version' "$log"; then
        matched=1
        hint "- Corrupted cache or half-finished install."
        hint "  Fix: npm cache clean --force ; then: bash setup.sh --reinstall"
    fi
    if [ "$matched" -eq 0 ]; then
        hint "- No known cause matched. Read the first 'npm error' line in the output above; that is usually the real cause."
        hint "  Last resort: bash setup.sh --reinstall"
    fi
    echo
    hint "Full npm output saved to: $log"
    hint "npm also writes its own debug log (look for 'A complete log of this run can be found in' above)."
    echo
    return 1
}

# Read flags
REINSTALL=0
for arg in "$@"; do
    case "$arg" in
        --reinstall)   REINSTALL=1 ;;
        *) warn "Unknown option '$arg' (ignored). Valid option: --reinstall" ;;
    esac
done

# Splash screen
BANNER_TEXT="CREATED BY: Christian J. Salang,  GitHub: ryuu-script"
WAIT_SECONDS=5

show_banner() {
    printf '\n\033[1;33m'
    cat <<'ASCII'
   ___                _ _       __           _       _   
  / __\__ _ _ __ ___ | (_)_ __ / _\ ___ _ __(_)_ __ | |_ 
 / /  / _` | '__/ _ \| | | '_ \\ \ / __| '__| | '_ \| __|
/ /__| (_| | | | (_) | | | | | |\ \ (__| |  | | |_) | |_ 
\____/\__,_|_|  \___/|_|_|_| |_\__/\___|_|  |_| .__/ \__|
                                              |_|                                           
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

if [ -z "$SETUP_RERAN" ]; then
    splash
fi

echo "Setting up CarolinDump in: $(pwd)"
echo

# 1. Node and npm
CURRENT_STEP="1. Checking Node and npm"
command -v node >/dev/null 2>&1 || fail "Node.js not found." \
    "Install the LTS version from https://nodejs.org (or use nvm) and run this again." \
    "Windows: close and reopen Git Bash after installing, so it picks up the new PATH." \
    "nvm users: run 'nvm use --lts' first; nvm settings don't carry over to new terminals."
command -v npm  >/dev/null 2>&1 || fail "npm not found (Node is at: $(command -v node))." \
    "npm normally comes with Node. Reinstall Node.js from https://nodejs.org." \
    "If you installed Node through a package manager, install the npm package too."
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
NODE_MINOR=$(node -p "process.versions.node.split('.')[1]")
NODE_NEEDS="Vite 8 and its tools need Node 20.19+ or 22.12+."
if [ "$NODE_MAJOR" -lt 20 ]; then
    warn "Node $(node -v) is too old. $NODE_NEEDS"
    hint "Install the current LTS from https://nodejs.org (or: nvm install --lts && nvm use --lts)."
    hint "Expect 'npm install' or 'npm run dev' to fail until you upgrade."
elif [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 19 ]; then
    warn "Node $(node -v) is slightly too old. $NODE_NEEDS"
    hint "Upgrade with: nvm install --lts   (or download the LTS from https://nodejs.org)."
elif [ "$NODE_MAJOR" -eq 21 ]; then
    warn "Node $(node -v) is an unsupported odd-numbered release. $NODE_NEEDS"
    hint "Switch to the LTS: nvm install --lts && nvm use --lts"
elif [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 12 ]; then
    warn "Node $(node -v) is slightly too old. $NODE_NEEDS"
    hint "Upgrade with: nvm install --lts   (or download the LTS from https://nodejs.org)."
fi
ok "Node $(node -v), npm $(npm -v)"

# 2. Right folder?
CURRENT_STEP="2. Looking for package.json"
if [ ! -f package.json ]; then
    echo "  Files in this folder:"
    ls -1 | head -20 | while IFS= read -r f; do hint "$f"; done
    fail "No package.json in $(pwd)." \
        "This script must sit in the project folder, next to package.json." \
        "If you copied setup.sh somewhere else, move it back, or run it from the cloned project folder." \
        "If the project isn't on this PC yet: git clone <your repo url>, then run setup.sh inside it."
fi
ok "Found package.json"

# 2b. Pull the latest code
CURRENT_STEP="2b. Pulling the latest code (git pull)"
if [ -d .git ] && command -v git >/dev/null 2>&1; then
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
        warn "You have local changes to tracked files, so I'm skipping git pull. Changed files:"
        git status --porcelain --untracked-files=no | while IFS= read -r line; do hint "$line"; done
        hint "Keep them for later:   git stash        (bring back with: git stash pop)"
        hint "Throw one away:        git checkout -- <file>"
        hint "Keep them for good:    git add -A && git commit -m \"message\" && git push"
        if git status --porcelain --untracked-files=no | grep -q 'package-lock.json'; then
            hint "package-lock.json changed here: this usually happens when 'npm install' runs on this PC."
            hint "If you didn't mean to change it:  git checkout -- package-lock.json"
        fi
    else
        OLD=$(git rev-parse HEAD)
        if PULL_OUT=$(git pull --ff-only 2>&1); then
            printf '%s\n' "$PULL_OUT"
            NEW=$(git rev-parse HEAD)
            if [ "$OLD" != "$NEW" ]; then
                ok "Updated ${OLD:0:7} -> ${NEW:0:7}"
                if [ -z "$SETUP_RERAN" ]; then
                    SETUP_RERAN=1 exec bash "./$(basename "$0")" "$@"
                fi
            else
                ok "Already up to date"
            fi
        else
            warn "git pull failed. Continuing with the current code, which may be out of date."
            echo "  git said:"
            printf '%s\n' "$PULL_OUT" | while IFS= read -r line; do hint "$line"; done
            echo "  What this usually means:"
            PULL_MATCHED=0
            if printf '%s' "$PULL_OUT" | grep -qiE 'Could not resolve host|unable to access|Failed to connect|Connection timed out|Network is unreachable'; then
                PULL_MATCHED=1
                hint "- No network, or GitHub/your git host can't be reached. Check your internet / VPN / proxy."
            fi
            if printf '%s' "$PULL_OUT" | grep -qiE 'Authentication failed|could not read Username|Permission denied|publickey|403|Repository not found'; then
                PULL_MATCHED=1
                hint "- Git login problem. Sign in again (Git Credential Manager prompt, or a personal access token),"
                hint "  or check that this account has access to the repo."
            fi
            if printf '%s' "$PULL_OUT" | grep -qiE 'Not possible to fast-forward|diverging|diverged'; then
                PULL_MATCHED=1
                hint "- This PC has commits that the remote doesn't, and the remote has commits this PC doesn't."
                hint "  See the difference:   git log --oneline --left-right HEAD...@{u}"
                hint "  Merge them:           git pull --rebase"
                hint "  Or discard this PC's commits (destructive!):  git reset --hard @{u}"
            fi
            if printf '%s' "$PULL_OUT" | grep -qiE 'no tracking information|no upstream|not currently on a branch|detached'; then
                PULL_MATCHED=1
                hint "- This branch isn't linked to a remote branch (or HEAD is detached)."
                hint "  Current branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
                hint "  Fix: git checkout main   then   git branch --set-upstream-to=origin/main"
            fi
            if printf '%s' "$PULL_OUT" | grep -qiE 'dubious ownership|safe.directory'; then
                PULL_MATCHED=1
                hint "- Git doesn't trust this folder's owner. Fix: git config --global --add safe.directory \"$(pwd)\""
            fi
            if [ "$PULL_MATCHED" -eq 0 ]; then
                hint "- No known cause matched. Try running 'git pull' by hand and read the message."
            fi
        fi
    fi
else
    if [ ! -d .git ]; then
        warn "This folder is not a git clone (no .git folder), so I can't pull updates."
        hint "If you downloaded a ZIP, re-clone with: git clone <your repo url>"
    else
        warn "git is not installed or not on PATH, so I can't pull updates."
        hint "Install Git from https://git-scm.com (Windows: reopen Git Bash afterwards)."
    fi
fi

# 3. Stray installs in parent folders
CURRENT_STEP="3. Checking parent folders for stray installs"
STRAY=""
for d in .. ../..; do
    if [ -d "$d/node_modules" ] || [ -f "$d/package.json" ]; then
        STRAY="$STRAY $(cd "$d" && pwd)"
    fi
done
if [ -n "$STRAY" ]; then
    warn "Found node_modules or package.json in:$STRAY"
    warn "That can cause 'Invalid hook call' errors. Delete them there if you didn't mean to create them."
    for d in $STRAY; do
        [ -d "$d/node_modules" ] && hint "$d/node_modules exists  (delete with: rm -rf \"$d/node_modules\")"
        [ -f "$d/package.json" ] && hint "$d/package.json exists  (check it's not left over from a mistaken 'npm install')"
    done
fi

# 4. Install dependencies
CURRENT_STEP="4. Installing dependencies (npm)"
STAMP="node_modules/.setup-stamp"
fingerprint() { cat package.json package-lock.json 2>/dev/null | cksum; }

if [ "$REINSTALL" -eq 1 ]; then
    warn "--reinstall given, wiping node_modules"
    rm -rf node_modules || fail "Could not delete node_modules." \
        "Something is probably using files inside it. Stop 'npm run dev', close editors and terminals, then try again." \
        "Windows: antivirus or a file explorer window open inside node_modules can also lock files."
fi

if [ -d node_modules ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$(fingerprint)" ]; then
    ok "Dependencies already installed and unchanged, skipping"
else
    if [ ! -f package-lock.json ]; then
        warn "No package-lock.json found, so exact versions can't be guaranteed. Commit it from your main PC."
    fi
    if [ -f package-lock.json ] && [ ! -d node_modules ]; then
        if ! run_npm ci; then
            warn "npm ci failed (cause explained above). Falling back to npm install, which may change package-lock.json."
            run_npm install || fail "Installing dependencies failed with both 'npm ci' and 'npm install'." \
                "Read the explanation printed above; the first 'npm error' line is the real cause." \
                "Then try a clean slate: bash setup.sh --reinstall" \
                "Still stuck? Copy the whole output of this run when asking for help."
        fi
    else
        run_npm install || fail "'npm install' failed." \
            "Read the explanation printed above; the first 'npm error' line is the real cause." \
            "Then try a clean slate: bash setup.sh --reinstall"
    fi
    mkdir -p node_modules && fingerprint > "$STAMP"
    ok "Dependencies installed"
fi

if [ -d .git ] && [ -n "$(git status --porcelain package.json package-lock.json 2>/dev/null)" ]; then
    warn "npm modified package.json or package-lock.json on this PC."
    hint "The next 'git pull' will be skipped until this is resolved."
    hint "If the change was unintended:  git checkout -- package.json package-lock.json"
    hint "If it's wanted: commit and push it from this PC (or redo it on your main PC)."
fi

# 5. Required packages
CURRENT_STEP="5. Checking required packages"
REQUIRED_PKGS="react-router-dom express mysql2 dotenv cors"
for pkg in $REQUIRED_PKGS; do
    if [ -d "node_modules/$pkg" ]; then
        ok "$pkg already installed, skipping"
    else
        warn "$pkg is missing, installing it"
        run_npm install "$pkg" || fail "Could not install $pkg." \
            "Check the package name for typos, and the explanation printed above." \
            "Try: bash setup.sh --reinstall"
        fingerprint > "$STAMP"
        ok "$pkg installed"
    fi
done
if [ -d .git ] && [ -n "$(git status --porcelain package.json 2>/dev/null)" ]; then
    warn "package.json was modified on this machine. Add the package on your own PC, commit and push,"
    warn "otherwise the next git pull will be skipped because of local changes."
fi

if [ ! -e node_modules/.bin/vite ]; then
    warn "node_modules/.bin/vite is missing, so 'npm run dev' will fail."
    hint "Vite is listed in devDependencies. If NODE_ENV=production is set in your shell, npm skips devDependencies."
    hint "Check:  echo \"\$NODE_ENV\"   (should be empty)   then run: bash setup.sh --reinstall"
fi

# 6. React copies
CURRENT_STEP="6. Checking React versions"
REACT_COPIES=$(npm ls react --all --parseable 2>/dev/null | grep -c '/node_modules/react$' || true)
if [ "${REACT_COPIES:-0}" -gt 1 ]; then
    warn "Found $REACT_COPIES copies of React. Try: npm dedupe   (then: npm ls react)"
    hint "Locations:"
    npm ls react --all --parseable 2>/dev/null | grep '/node_modules/react$' | while IFS= read -r p; do hint "$p"; done
elif npm ls react react-dom >/dev/null 2>&1; then
    ok "Single copy of React"
else
    warn "npm reports a React version problem. Details from 'npm ls react react-dom':"
    npm ls react react-dom 2>&1 | head -15 | while IFS= read -r line; do hint "$line"; done
    hint "Usual fix: bash setup.sh --reinstall   (react and react-dom must be the same version)"
fi

# 7. Clear Vite's cache
CURRENT_STEP="7. Clearing Vite's cache"
rm -rf node_modules/.vite || warn "Could not clear node_modules/.vite (a file is locked?). Stop any running dev server and try again."
ok "Vite cache cleared"

# 8. main.jsx filename
CURRENT_STEP="8. Checking index.html and src/main.jsx"
if [ ! -f index.html ]; then
    warn "index.html is missing in $(pwd). Vite needs it in the project root."
elif grep -q "/src/main.jsx" index.html 2>/dev/null && ! ls src 2>/dev/null | grep -qx "main.jsx"; then
    warn "index.html loads src/main.jsx but that exact file name wasn't found (check capital letters)."
    if [ -d src ]; then
        hint "Files in src/ that look similar:"
        ls src | grep -i 'main' | while IFS= read -r f; do hint "$f"; done
    else
        hint "The src/ folder doesn't exist at all. Did the git pull or clone fail?"
    fi
fi

# 9. Environment file
CURRENT_STEP="9. Checking the .env file"
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" <<'ENV'
# Google OAuth "Web application" client ID (Google Cloud Console > APIs & Services > Credentials).
# Authorized redirect URI to add there: <your site>/auth/callback
# e.g. http://localhost:5173/auth/callback
VITE_GOOGLE_CLIENT_ID=

# MySQL login, read only by server/server.js.
# No VITE_ prefix on purpose: Vite never sends these to the browser.
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=s23400055_tubolDB
ENV
    ok "Created .env (client ID and database login left blank)"
else
    [ -n "$(tail -c1 "$ENV_FILE")" ] && printf '\n' >> "$ENV_FILE"
    for kv in VITE_GOOGLE_CLIENT_ID= DB_HOST=localhost DB_PORT=3306 DB_USER= DB_PASSWORD= DB_NAME=s23400055_tubolDB; do
        key=${kv%%=*}
        if ! grep -q "^$key=" "$ENV_FILE"; then
            printf '%s\n' "$kv" >> "$ENV_FILE"
            ok "Added $key to your existing .env"
        fi
    done
fi

if grep -Eq '^VITE_GOOGLE_CLIENT_ID=[[:space:]]*$' "$ENV_FILE"; then
    warn "VITE_GOOGLE_CLIENT_ID in .env is blank, so Google sign-in won't work yet."
    hint "File to edit: $(pwd)/$ENV_FILE"
    hint "Paste your client ID after the = sign (no quotes, no spaces), then restart the dev server."
    hint "Vite only reads .env when it starts, so edits need a restart."
    hint "In Google Cloud Console, also add this redirect URI: http://localhost:5173/auth/callback"
else
    ok ".env has a Google client ID"
fi

if grep -Eq '^(DB_USER|DB_PASSWORD)=[[:space:]]*$' "$ENV_FILE"; then
    warn "DB_USER or DB_PASSWORD in .env is blank, so the API can't reach MySQL yet."
    hint "File to edit: $(pwd)/$ENV_FILE"
    hint "Fill in DB_USER and DB_PASSWORD (no quotes, no spaces), then restart:  npm run server"
    hint "DB_HOST is 'localhost' for a local database; for hosting, use the server name shown in phpMyAdmin."
else
    ok ".env has a database login"
fi

# 10. Seed the database if it is empty
CURRENT_STEP="10. Seeding the database"
echo
if grep -Eq '^(DB_USER|DB_PASSWORD)=[[:space:]]*$' "$ENV_FILE"; then
    warn "Skipping database seeding: DB_USER or DB_PASSWORD in .env is blank."
    hint "Fill them in, then run:  npm run seed"
elif [ ! -f server/seed.js ]; then
    warn "server/seed.js not found, skipping database seeding."
else
    if node server/seed.js; then
        ok "Database seed check done"
    else
        warn "Database seeding failed (setup continues). Read the message above."
        hint "Common causes: wrong DB_HOST / DB_USER / DB_PASSWORD in .env, or no network access to the database server."
        hint "Try again later with:  npm run seed"
    fi
fi

echo
ok "Setup finished..."

echo "Start the app with:  bash quickstart.sh"