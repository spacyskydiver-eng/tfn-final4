#!/usr/bin/env python3
"""
Commander Bot — monitors RoK chat for "Shared a commander" messages,
clicks each one, extracts the data, and posts to the API.

Run on the Hetzner server:
  python3 /root/commander_bot_adb.py
"""

import subprocess
import time
import os
import json
import hashlib
import requests
from PIL import Image
from io import BytesIO

# ── Config ────────────────────────────────────────────────────────────────────
ADB_DEVICE   = "localhost:5555"
ADB          = ["adb", "-s", ADB_DEVICE]
API_URL      = os.environ.get("API_URL", "https://your-app.vercel.app/api/commanders")
API_TOKEN    = os.environ.get("API_TOKEN", "")
POLL_INTERVAL = 5   # seconds between chat checks
ANDROID_W    = 1280
ANDROID_H    = 720

# Chat message area on screen (approximate bounds in 1280x720)
# The green "Shared a commander" bar sits within this region
CHAT_X1, CHAT_X2 = 385, 1060
CHAT_Y1, CHAT_Y2 = 60,  650

# The distinctive green of the "Shared a commander" banner
# RGB range to match it
GREEN_R_MIN, GREEN_R_MAX = 50,  120
GREEN_G_MIN, GREEN_G_MAX = 140, 220
GREEN_B_MIN, GREEN_B_MAX = 50,  120
MIN_GREEN_PIXELS = 80   # min px in a row to count as a banner row

# Back button / close profile — tap top-left to dismiss commander profile
BACK_TAP = (50, 40)

# Already-processed: store (y_band, image_hash) to avoid re-clicking
seen_banners: set = set()

# ── ADB helpers ───────────────────────────────────────────────────────────────

def adb(*args) -> str:
    result = subprocess.run(ADB + list(args), capture_output=True, text=True, timeout=15)
    return result.stdout.strip()

def tap(x: int, y: int):
    adb("shell", "input", "tap", str(x), str(y))

def screenshot() -> Image.Image:
    """Pull a screenshot from the device and return as PIL Image."""
    tmp = "/tmp/rok_screen.png"
    adb("shell", "screencap", "-p", "/sdcard/rok_screen.png")
    adb("pull", "/sdcard/rok_screen.png", tmp)
    return Image.open(tmp).convert("RGB")

def back():
    adb("shell", "input", "keyevent", "4")  # KEYCODE_BACK

# ── Banner detection ──────────────────────────────────────────────────────────

def is_green_pixel(r, g, b) -> bool:
    return (GREEN_R_MIN <= r <= GREEN_R_MAX and
            GREEN_G_MIN <= g <= GREEN_G_MAX and
            GREEN_B_MIN <= b <= GREEN_B_MAX)

def find_shared_commander_banners(img: Image.Image) -> list[int]:
    """
    Scan the chat area row by row looking for rows with enough green pixels.
    Returns a list of Y-coordinates (center of each banner), top-to-bottom.
    """
    pixels = img.load()
    banner_rows = []
    for y in range(CHAT_Y1, CHAT_Y2):
        count = sum(
            1 for x in range(CHAT_X1, CHAT_X2)
            if is_green_pixel(*pixels[x, y])
        )
        if count >= MIN_GREEN_PIXELS:
            banner_rows.append(y)

    if not banner_rows:
        return []

    # Group consecutive rows into bands, return the center y of each band
    bands = []
    band_start = banner_rows[0]
    prev = banner_rows[0]
    for y in banner_rows[1:]:
        if y - prev > 5:
            bands.append((band_start + prev) // 2)
            band_start = y
        prev = y
    bands.append((band_start + prev) // 2)
    return bands  # top-to-bottom order

def banner_key(img: Image.Image, y_center: int) -> str:
    """A hash of the pixels around the banner to deduplicate."""
    crop = img.crop((CHAT_X1, y_center - 20, CHAT_X2, y_center + 20))
    buf = BytesIO()
    crop.save(buf, format="PNG")
    return hashlib.md5(buf.getvalue()).hexdigest()

# ── Commander profile extraction ──────────────────────────────────────────────

def extract_text_from_screen(img: Image.Image) -> str:
    """
    Basic OCR-free extraction: we just return a raw description for now.
    Full OCR (tesseract / google vision) can be added later.
    For now we return placeholder data so the API call works.
    """
    # TODO: add real OCR — crop profile area, run tesseract or Vision API
    return ""

def extract_player_name_from_banner(img: Image.Image, y_center: int) -> str:
    """
    The player name appears to the left of the banner on the same message row.
    For now we return a placeholder; OCR can fill this in later.
    """
    return "Unknown"

def post_to_api(payload: dict) -> bool:
    if not API_TOKEN:
        print("[warn] API_TOKEN not set, skipping POST")
        return False
    try:
        r = requests.post(
            API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {API_TOKEN}"},
            timeout=10,
        )
        if r.status_code in (200, 201):
            data = r.json()
            if data.get("duplicate"):
                print(f"  → duplicate (id={data['id']})")
            else:
                print(f"  → saved id={data['id']}")
            return True
        else:
            print(f"  → API error {r.status_code}: {r.text[:200]}")
            return False
    except Exception as e:
        print(f"  → POST failed: {e}")
        return False

# ── Commander profile reading ─────────────────────────────────────────────────

def read_commander_profile() -> dict:
    """
    After tapping a banner, the commander profile slides open.
    We take a screenshot and try to extract fields.
    Returns a dict suitable for POST /api/commanders.
    """
    time.sleep(3)  # wait for profile to open
    img = screenshot()

    # Save locally for debug
    img.save("/tmp/rok_profile_latest.png")

    # ── TODO: real OCR ──
    # For now return placeholder. Once OCR is wired in, parse:
    #   commanderName, sharedByPlayer, stars, level, skillLevels, etc.
    raw_text = extract_text_from_screen(img)
    return {
        "sharedByPlayer": "Unknown",
        "commanderName":  "Unknown",
        "rawProfileText": raw_text,
    }

# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    print("Commander bot starting. Polling every", POLL_INTERVAL, "s.")
    print(f"API: {API_URL}")
    if not API_TOKEN:
        print("WARNING: API_TOKEN env var not set — data won't be sent to API")

    while True:
        try:
            img = screenshot()
            banners = find_shared_commander_banners(img)

            if banners:
                print(f"Found {len(banners)} banner(s) at y={banners}")
                for y in banners:
                    key = banner_key(img, y)
                    if key in seen_banners:
                        print(f"  y={y} already processed, skipping")
                        continue

                    print(f"  Clicking banner at y={y} (x={CHAT_X1 + (CHAT_X2 - CHAT_X1)//2})")
                    tap(CHAT_X1 + (CHAT_X2 - CHAT_X1) // 2, y)
                    seen_banners.add(key)

                    profile = read_commander_profile()
                    print(f"  Profile: {profile.get('commanderName')} from {profile.get('sharedByPlayer')}")
                    post_to_api(profile)

                    # Close the profile and return to chat
                    back()
                    time.sleep(2)

                    # Refresh screenshot for next banner (scroll may have changed)
                    img = screenshot()
            else:
                print(".", end="", flush=True)

        except Exception as e:
            print(f"\n[error] {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
