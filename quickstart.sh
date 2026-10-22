
#!/usr/bin/env bash

set -e

RED='\033[1;91m'
GREEN='\033[1;92m'
RESET='\033[0m'

SSH_PID=""
DEV_PID=""

cleanup() {
    echo
    echo "Stopping application and SSH tunnel..."

    [[ -n "$DEV_PID" ]] && kill "$DEV_PID" 2>/dev/null || true
    [[ -n "$SSH_PID" ]] && kill "$SSH_PID" 2>/dev/null || true

    echo "Cleanup complete."
}

trap cleanup EXIT INT TERM HUP

echo "Establishing SSH tunnel..."

ssh -N -p 22072 \
    -L 3307:localhost:3306 \
    -o ExitOnForwardFailure=yes \
    s23400055@ver.dcism.org &
SSH_PID=$!

# Wait until SSH connects or fails.
for i in {1..30}; do
    if ! kill -0 "$SSH_PID" 2>/dev/null; then
        echo -e "${RED}[FAIL] Connection to SSH tunnel failed!${RESET}"
        exit 1
    fi

    if bash -c 'echo >/dev/tcp/127.0.0.1/3307' 2>/dev/null; then
        break
    fi

    sleep 1
done

if ! kill -0 "$SSH_PID" 2>/dev/null; then
    echo -e "${RED}[FAIL] Connection to SSH tunnel failed!${RESET}"
    exit 1
fi

echo -e "${GREEN}[PASS] SSH tunnel established!${RESET}"
echo "Starting Application..."

npm run dev -- --clearScreen false &
DEV_PID=$!

npm run server -- --no-clear

echo -e "${GREEN}[PASS] Quickstart completed!${RESET}"
