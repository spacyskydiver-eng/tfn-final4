#!/bin/bash
# test-api.sh — end-to-end curl tests for the Kill Tracker API
# Usage: ./test-api.sh
# Requires: the Next.js dev server running on http://localhost:3000
#           and a valid rok_ token (paste below or pass as ROK_TOKEN env var)

set -e

BASE="${BASE_URL:-http://localhost:3000}"
TOKEN="${ROK_TOKEN:-}"   # e.g. rok_abc123...

# Colour helpers
GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; }
info() { echo -e "${CYAN}$1${NC}"; }

echo ""
info "─── ROK Kill Tracker API Tests"
info "    Base URL : $BASE"
echo ""

# ─── 1. No token → 401 ────────────────────────────────────────────────────────
info "1. POST /api/events — no auth token (expect 401)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/events" \
  -H "Content-Type: application/json" \
  -d '{"rawText":"test"}')
[ "$STATUS" = "401" ] && ok "Got 401 Unauthorized" || fail "Expected 401, got $STATUS"

# ─── 2. Invalid token → 401 ───────────────────────────────────────────────────
info "\n2. POST /api/events — invalid token (expect 401)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer rok_thisisnotavalidtoken000000000000000000000000000000000000000000" \
  -d '{"rawText":"test"}')
[ "$STATUS" = "401" ] && ok "Got 401 Unauthorized" || fail "Expected 401, got $STATUS"

# ─── 3. Missing rawText → 400 ─────────────────────────────────────────────────
if [ -n "$TOKEN" ]; then
  info "\n3. POST /api/events — missing rawText (expect 400)"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/events" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{}')
  [ "$STATUS" = "400" ] && ok "Got 400 Bad Request" || fail "Expected 400, got $STATUS"

  # ─── 4. Submit a barbarian kill report ──────────────────────────────────────
  info "\n4. POST /api/events — submit barbarian kill report (expect 201)"
  BODY=$(curl -s -X POST "$BASE/api/events" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "rawText": "Battle Report\nRise of Kingdoms\nAttacker: TestUser\nBarbarian (Lv.25)\nVictory\n\nTotal Kills: 500\nFood: 10000",
      "syncedVia": "clipboard"
    }')
  echo "  Response: $BODY"
  STATUS=$(echo "$BODY" | grep -o '"id"' | head -1)
  [ -n "$STATUS" ] && ok "Event created (has id)" || fail "No id in response"

  EVENT_ID=$(echo "$BODY" | sed 's/.*"id":"\([^"]*\)".*/\1/')

  # ─── 5. Submit same report again (expect duplicate) ─────────────────────────
  info "\n5. POST /api/events — same report again (expect duplicate:true)"
  BODY2=$(curl -s -X POST "$BASE/api/events" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "rawText": "Battle Report\nRise of Kingdoms\nAttacker: TestUser\nBarbarian (Lv.25)\nVictory\n\nTotal Kills: 500\nFood: 10000",
      "syncedVia": "clipboard"
    }')
  echo "  Response: $BODY2"
  DUPL=$(echo "$BODY2" | grep -o '"duplicate":true')
  [ -n "$DUPL" ] && ok "Got duplicate:true (dedup working)" || fail "Expected duplicate:true"

  # ─── 6. Submit a fort kill report ───────────────────────────────────────────
  info "\n6. POST /api/events — submit fort kill report (expect 201)"
  BODY3=$(curl -s -X POST "$BASE/api/events" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "rawText": "Battle Report Rise of Kingdoms\nAttacker: AlexTaylor\n[TFN] Fort (Lv.3)\nVictory\nTotal Kills: 2450\nFort destroyed: 1",
      "syncedVia": "clipboard"
    }')
  echo "  Response: $BODY3"
  FT=$(echo "$BODY3" | grep -o '"type":"FORT_KILL"')
  [ -n "$FT" ] && ok "Fort kill event created with correct type" || fail "Expected FORT_KILL type"

  # ─── 7. GET stats ────────────────────────────────────────────────────────────
  info "\n7. GET /api/events/stats"
  STATS=$(curl -s "$BASE/api/events/stats" \
    -H "Authorization: Bearer $TOKEN")
  echo "  Response: $STATS"
  HAS_BARB=$(echo "$STATS" | grep -o '"barbarian"')
  [ -n "$HAS_BARB" ] && ok "Stats returned barbarian field" || fail "Missing barbarian in stats"

  # ─── 8. GET events list ──────────────────────────────────────────────────────
  info "\n8. GET /api/events"
  EVENTS=$(curl -s "$BASE/api/events" \
    -H "Authorization: Bearer $TOKEN")
  echo "  Response (truncated): ${EVENTS:0:200}…"
  HAS_EVENTS=$(echo "$EVENTS" | grep -o '"events"')
  [ -n "$HAS_EVENTS" ] && ok "Events list returned" || fail "Missing events field"

else
  info "\n⚠  Skipping authenticated tests — set ROK_TOKEN to test with a real token."
  info "   Steps:"
  info "   1. Open http://localhost:3000 in your browser"
  info "   2. Sign in with Discord"
  info "   3. Go to Kill Tracker in the sidebar"
  info "   4. Create a token and copy the rok_… value"
  info "   5. Re-run: ROK_TOKEN='rok_your_token_here' ./test-api.sh"
fi

echo ""
info "─── Done"
echo ""
