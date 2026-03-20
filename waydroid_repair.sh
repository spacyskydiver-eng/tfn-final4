#!/usr/bin/env bash
set -euo pipefail
LOG=/root/waydroid_repair.log
exec > >(tee -a "$LOG") 2>&1

echo "=== waydroid_repair.sh started $(date) ==="

# Ensure host Pulse socket exists
mkdir -p /run/user/0/pulse
touch /run/user/0/pulse/native || true
chmod 666 /run/user/0/pulse/native || true

# Ensure container mount target exists
mkdir -p /usr/lib/x86_64-linux-gnu/lxc/run/xdg/pulse
touch /usr/lib/x86_64-linux-gnu/lxc/run/xdg/pulse/native || true
chmod 666 /usr/lib/x86_64-linux-gnu/lxc/run/xdg/pulse/native || true || true

# Start headless compositor if not running
if ! pgrep -f "[w]eston" >/dev/null; then
  if command -v weston >/dev/null 2>&1; then
    nohup weston --backend=headless-backend.so >/root/weston.log 2>&1 &
    echo "started weston"
    sleep 2
  else
    echo "weston not installed"
  fi
fi

# Start waydroid session
if command -v waydroid >/dev/null 2>&1; then
  echo "starting waydroid session"
  waydroid session start || true
else
  echo "waydroid binary not found"
fi

# Wait for container to become RUNNING
for i in {1..60}; do
  st=$(waydroid status 2>/dev/null || true)
  echo "$st"
  if echo "$st" | grep -q "Container: RUNNING"; then
    echo "container running"
    break
  fi
  sleep 2
done

# Try to bring up ADB
for i in {1..60}; do
  adb_cmd_output=$(adb devices 2>/dev/null || true)
  if echo "$adb_cmd_output" | grep -q "127.0.0.1:5555[[:space:]]*device"; then
    echo "adb device online"
    break
  fi
  echo "attempting adb connect"
  adb connect 127.0.0.1:5555 || true
  sleep 2
done

# Launch game activity
echo "starting game activity"
adb -s 127.0.0.1:5555 shell am start -n com.lilithgame.roc.gp/com.harry.engine.MainActivity || true
sleep 6

# Open chat (tap coordinates previously found)
adb -s 127.0.0.1:5555 shell input tap 145 675 || true
sleep 1

# Start the commander bot if present
if [ -f /root/commander_bot_adb.py ]; then
  pkill -f commander_bot_adb.py || true
  nohup python3 /root/commander_bot_adb.py >/root/commander_bot.log 2>&1 &
  echo "started commander bot"
else
  echo "commander bot script not found"
fi

echo "=== waydroid_repair.sh finished $(date) ==="
