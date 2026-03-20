# ROK Bot Runbook

## Server Details
- **IP**: 204.168.137.204
- **SSH Key**: `~/.ssh/gcloud_rok`
- **SSH**: `ssh -i ~/.ssh/gcloud_rok root@204.168.137.204`
- **OS**: Ubuntu, Hetzner CX23, Helsinki
- **Screen**: 1280×720

## Android / ADB
- **Emulator**: **redroid** Docker container (`redroid/redroid:11.0.0-latest`), NOT Waydroid
- **Container name**: `redroid`, data volume: `/root/android-data:/data`
- **ADB device**: `127.0.0.1:5555` (also shows as `emulator-5554`, `172.17.0.2:5555`)
- **Game package**: `com.lilithgame.roc.gp`
- **Game activity**: `com.harry.engine.MainActivity`

---

## Common Commands (run from your Mac)

### Take a screenshot and open it
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb -s 127.0.0.1:5555 exec-out screencap -p' > /tmp/rok.png && open /tmp/rok.png
```

### Tap a coordinate
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb -s 127.0.0.1:5555 shell input tap X Y'
```

### Swipe (startX startY endX endY duration_ms)
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb -s 127.0.0.1:5555 shell input swipe 100 193 280 193 400'
```

### Send BACK key
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb -s 127.0.0.1:5555 shell input keyevent 4'
```

### Reconnect ADB (if taps stop working)
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb disconnect 127.0.0.1:5555 && sleep 2 && adb connect 127.0.0.1:5555'
```

---

## Game Flow

### Start / restart the game
```bash
# Force stop
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb -s 127.0.0.1:5555 shell am force-stop com.lilithgame.roc.gp'
# Launch
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb -s 127.0.0.1:5555 shell am start -n com.lilithgame.roc.gp/com.harry.engine.MainActivity'
# Wait ~45s, then tap anywhere on loading screen
sleep 45 && ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb -s 127.0.0.1:5555 shell input tap 640 360'
```

### Open Kingdom Chat
1. Tap chat icon: `input tap 145 675`
2. If tutorial tooltip appears ("Slide message bar..."), dismiss with BACK key or restart game
3. Tap "Kingdom" row in left sidebar: `input tap 165 193`

### Dismiss common popups
- First Recharge popup (X button): `input tap 1130 58`
- Alliance invite popup (X button): `input tap 869 130`

---

## Bot

### Bot file
`/root/commander_bot_adb.py`

### Start the bot
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'nohup python3 /root/commander_bot_adb.py > /root/bot.log 2>&1 &'
```

### Check if bot is running
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'ps aux | grep commander_bot_adb | grep -v grep'
```

### Watch bot log
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'tail -f /root/bot.log'
```

### Stop the bot (run as a standalone command, never chained)
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'pkill -f commander_bot_adb.py'
```

---

## After Server Restart — Full Recovery

After any server reboot, everything will be dead. Run this in order:

### Step 1: Start adbd (do this every restart)
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 << 'EOF'
# Disable the app squatting port 5555 (com.hagaseca.thost9)
docker exec redroid pm disable-user com.hagaseca.thost9 2>/dev/null || true
# Kill it if running
docker exec redroid kill $(docker exec redroid ps 2>/dev/null | grep hagaseca | awk '{print $2}') 2>/dev/null || true
sleep 2
# Switch adbd to port 5555 and start it
docker exec redroid setprop service.adb.tcp.port 5555
docker exec redroid sh -c 'stop adbd; sleep 2; start adbd'
sleep 3
# Connect ADB
adb kill-server && adb start-server
adb connect 127.0.0.1:5555
sleep 3
adb devices
EOF
```

### Step 2: Launch the game
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'adb -s 127.0.0.1:5555 shell am start -n com.lilithgame.roc.gp/com.harry.engine.MainActivity'
sleep 50
```

### Step 3: Start the bot
```bash
ssh -i ~/.ssh/gcloud_rok root@204.168.137.204 'nohup python3 /root/commander_bot_adb.py > /root/bot.log 2>&1 &'
```

---

## Known Issues
- **After restart**: `com.hagaseca.thost9` app grabs port 5555 and blocks adbd — must disable it first (see above)
- **adbd port**: must be set to 5555 each restart via `setprop service.adb.tcp.port 5555` (it defaults to 5554)
- **ro.adb.secure=0**: no ADB auth needed on this container — `adb_keys` file doesn't matter
- Never chain `pkill` with other commands in the same SSH call — it kills the SSH session
- Tutorial tooltip ("Slide message bar") blocks OK button tap — restart game to reset it
- Always use different filenames for screenshots to confirm screen actually changed
