#!/bin/bash
# RoK Full Login Automation Script
ADB="adb -s localhost:5555"

tap() { $ADB shell input tap $1 $2; }

echo "=== Step 1: Force stop and relaunch RoK ==="
$ADB shell am force-stop com.lilithgame.roc.gp
sleep 3
$ADB shell am start -n com.lilithgame.roc.gp/com.harry.engine.MainActivity

echo "=== Step 2: Wait 30s then tap Accept & Continue (669 574) ==="
sleep 30
tap 669 574

echo "=== Step 3: Wait 60s then tap Tap to Start (640 560) ==="
sleep 60
tap 640 560

echo "=== Step 4: Wait 60s then tap Notifications Continue (786 481) ==="
sleep 60
tap 786 481

echo "=== Step 5: Wait 120s for game to fully load ==="
sleep 120

echo "=== Step 6: Tap Log in with another account (1220 30) ==="
tap 1220 30
sleep 3

echo "=== Step 7: Tap email field and type email ==="
tap 640 210
sleep 2
$ADB shell input text 'kobasa6829@hlkes.com'
sleep 2
tap 1191 619
sleep 2

echo "=== Step 8: Tap Password Login (633 479) ==="
tap 636 520
sleep 2

echo "=== Step 9: Tap password field and type password ==="
tap 650 347
sleep 2
$ADB shell input text 'Sharfrs1Nas'
sleep 2
tap 1191 619
sleep 2

echo "=== Step 10: Tap Login (619 433) ==="
tap 619 433
sleep 10

echo "=== Mina emergency step (1114 86) ==="
tap 1114 86
sleep 5

echo "=== Tap chat (150 670) ==="
tap 150 670

echo "=== Done! ==="
