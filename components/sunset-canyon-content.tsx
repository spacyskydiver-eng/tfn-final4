'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
  PieChart, Pie,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Shield,
  Sword,
  Crosshair,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Star,
  ChevronDown,
  Zap,
  Trophy,
  AlertTriangle,
  RotateCcw,
  Target,
  Search,
  Layers,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Commander database                                                  */
/* ------------------------------------------------------------------ */

type TroopType = 'infantry' | 'cavalry' | 'archer' | 'mixed'
type Rarity = 'legendary' | 'epic' | 'elite'

interface CommanderInfo {
  name: string
  rarity: Rarity
  troopType: TroopType
}

// Full commander DB — copied exactly from rok-suite commander-reference.ts + SQL migrations
// Rarity is taken directly from the source files; troop type from SQL troop_type / first specialty
const COMMANDER_DB: CommanderInfo[] = [
  // ── LEGENDARY infantry ──────────────────────────────────────────────
  { name: 'Alexander the Great',     rarity: 'legendary', troopType: 'infantry' },
  { name: 'Björn Ironside',          rarity: 'epic',      troopType: 'infantry' },
  { name: 'Charles Martel',          rarity: 'legendary', troopType: 'infantry' },
  { name: 'Cheok Jun-Gyeong',        rarity: 'legendary', troopType: 'infantry' },
  { name: 'Constantine I',           rarity: 'legendary', troopType: 'infantry' },
  { name: 'Flavius Aetius',          rarity: 'legendary', troopType: 'infantry' },
  { name: 'Gilgamesh',               rarity: 'legendary', troopType: 'infantry' },
  { name: 'Gorgo',                   rarity: 'legendary', troopType: 'infantry' },
  { name: 'Guan Yu',                 rarity: 'legendary', troopType: 'infantry' },
  { name: 'Harald Sigurdsson',       rarity: 'legendary', troopType: 'infantry' },
  { name: 'Honda Tadakatsu',         rarity: 'legendary', troopType: 'infantry' },
  { name: 'Ivar the Boneless',       rarity: 'legendary', troopType: 'infantry' },
  { name: 'Lapu-Lapu',               rarity: 'legendary', troopType: 'infantry' },
  { name: 'Leonidas I',              rarity: 'legendary', troopType: 'infantry' },
  { name: 'Liu Che',                 rarity: 'legendary', troopType: 'infantry' },
  { name: 'Matthias Corvinus',       rarity: 'legendary', troopType: 'infantry' },
  { name: 'Nebuchadnezzar II',       rarity: 'legendary', troopType: 'infantry' },
  { name: 'Pericles',                rarity: 'legendary', troopType: 'infantry' },
  { name: 'Pyrrhus of Epirus',       rarity: 'legendary', troopType: 'infantry' },
  { name: 'Ragnar Lodbrok',          rarity: 'legendary', troopType: 'infantry' },
  { name: 'Richard I',               rarity: 'legendary', troopType: 'infantry' },
  { name: 'Sargon of Akkad',         rarity: 'legendary', troopType: 'infantry' },
  { name: 'Sun Tzu Prime',           rarity: 'legendary', troopType: 'infantry' },
  { name: 'Trajan',                  rarity: 'legendary', troopType: 'infantry' },
  { name: 'William Wallace',         rarity: 'legendary', troopType: 'infantry' },
  { name: 'Xiang Yu',                rarity: 'legendary', troopType: 'infantry' },
  { name: 'Zenobia',                 rarity: 'legendary', troopType: 'infantry' },

  // ── LEGENDARY archer ────────────────────────────────────────────────
  { name: 'Amanitore',               rarity: 'legendary', troopType: 'archer'   },
  { name: 'Artemisia I',             rarity: 'legendary', troopType: 'archer'   },
  { name: 'Ashurbanipal',            rarity: 'legendary', troopType: 'archer'   },
  { name: 'Dido',                    rarity: 'legendary', troopType: 'archer'   },
  { name: 'Edward of Woodstock',     rarity: 'legendary', troopType: 'archer'   },
  { name: 'El Cid',                  rarity: 'legendary', troopType: 'archer'   },
  { name: 'Henry V',                 rarity: 'legendary', troopType: 'archer'   },
  { name: 'Hermann Prime',           rarity: 'legendary', troopType: 'archer'   },
  { name: 'Ramesses II',             rarity: 'legendary', troopType: 'archer'   },
  { name: 'Shajar al-Durr',          rarity: 'legendary', troopType: 'archer'   },
  { name: 'Thutmose III',            rarity: 'legendary', troopType: 'archer'   },
  { name: 'Tomyris',                 rarity: 'legendary', troopType: 'archer'   },
  { name: 'Yi Seong-Gye',            rarity: 'legendary', troopType: 'archer'   },
  { name: 'Yi Sun-sin',              rarity: 'legendary', troopType: 'archer'   },
  { name: 'Zhuge Liang',             rarity: 'legendary', troopType: 'archer'   },

  // ── LEGENDARY cavalry ───────────────────────────────────────────────
  { name: 'Alexander Nevsky',        rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Arthur Pendragon',        rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Attila',                  rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Babur',                   rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Belisarius Prime',        rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Bertrand',                rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Cao Cao',                 rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Chandragupta Maurya',     rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Genghis Khan',            rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Heraclius',               rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Huo Qubing',              rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Jadwiga',                 rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Jan Zizka',               rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Justinian I',             rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Minamoto no Yoshitsune',  rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Philip II',               rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Saladin',                 rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Subutai',                 rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Takeda Shingen',          rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Tariq Ibn Ziyad',         rarity: 'legendary', troopType: 'cavalry'  },
  { name: 'Tomoe Gozen',             rarity: 'legendary', troopType: 'cavalry'  },

  // ── LEGENDARY mixed / leadership ────────────────────────────────────
  { name: 'Aethelflaed',             rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Boudica Prime',           rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Charlemagne',             rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Cleopatra VII',           rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Cyrus the Great',         rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Eleanor of Aquitaine',    rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Frederick I',             rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Hannibal Barca',          rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Imhotep',                 rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Ishida Mitsunari',        rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Joan of Arc Prime',       rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Julius Caesar',           rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Lu Bu',                   rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Margaret I',              rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Mehmed II',               rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Moctezuma I',             rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Mulan',                   rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Pakal the Great',         rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Scipio Africanus Prime',  rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Seondeok',                rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Suleiman I',              rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Theodora',                rarity: 'legendary', troopType: 'mixed'    },
  { name: 'William I',               rarity: 'legendary', troopType: 'mixed'    },
  { name: 'Wu Zetian',               rarity: 'legendary', troopType: 'mixed'    },

  // ── EPIC — exact list from commander-reference.ts EPIC section ──────
  { name: 'Baibars',                 rarity: 'epic',      troopType: 'cavalry'  },
  { name: 'Belisarius',              rarity: 'epic',      troopType: 'cavalry'  },
  { name: 'Boudica',                 rarity: 'epic',      troopType: 'mixed'    },
  { name: 'Eulji Mundeok',           rarity: 'epic',      troopType: 'infantry' },
  { name: 'Hermann',                 rarity: 'epic',      troopType: 'archer'   },
  { name: 'Joan of Arc',             rarity: 'epic',      troopType: 'mixed'    },
  { name: 'Keira',                   rarity: 'epic',      troopType: 'archer'   },
  { name: 'Kusunoki Masashige',      rarity: 'epic',      troopType: 'archer'   },
  { name: 'Lohar',                   rarity: 'epic',      troopType: 'mixed'    },
  { name: 'Osman I',                 rarity: 'epic',      troopType: 'mixed'    },
  { name: 'Pelagius',                rarity: 'epic',      troopType: 'cavalry'  },
  { name: 'Scipio Africanus',        rarity: 'epic',      troopType: 'mixed'    },
  { name: 'Sarka',                   rarity: 'epic',      troopType: 'infantry' },
  { name: 'Sun Tzu',                 rarity: 'epic',      troopType: 'infantry' },
  { name: 'Wak Chanil Ajaw',         rarity: 'epic',      troopType: 'mixed'    },
]

// Sorted alphabetically for lookup
const COMMANDER_MAP = new Map(COMMANDER_DB.map((c) => [c.name, c]))

/* ------------------------------------------------------------------ */
/*  Canyon synergy data (from rok-suite optimizer.ts, 2025)            */
/* ------------------------------------------------------------------ */

const CANYON_SYNERGIES: Record<string, { partners: string[]; canyonBonus: number; preferredRow: 'front' | 'back' | 'center'; tier: 'S' | 'A' | 'B' }> = {
  'Constantine I':          { partners: ['Wu Zetian', 'Charles Martel', 'Richard I', 'Joan of Arc'], canyonBonus: 50, preferredRow: 'front', tier: 'S' },
  'Wu Zetian':              { partners: ['Constantine I', 'Theodora', 'Charles Martel'], canyonBonus: 45, preferredRow: 'front', tier: 'S' },
  'Theodora':               { partners: ['Wu Zetian', 'Constantine I', 'Yi Seong-Gye'], canyonBonus: 40, preferredRow: 'back', tier: 'S' },
  'Richard I':              { partners: ['Charles Martel', 'Sun Tzu', 'Scipio Africanus', 'Yi Seong-Gye', 'Guan Yu', 'Constantine I', 'Scipio Africanus Prime'], canyonBonus: 45, preferredRow: 'front', tier: 'S' },
  'Sun Tzu':                { partners: ['Charles Martel', 'Guan Yu', 'Harald Sigurdsson', 'Richard I', 'Scipio Africanus', 'Yi Seong-Gye', 'Alexander the Great', 'Björn Ironside', 'Eulji Mundeok', 'Mehmed II', 'Baibars', 'Joan of Arc'], canyonBonus: 50, preferredRow: 'center', tier: 'S' },
  'Yi Seong-Gye':           { partners: ['Sun Tzu', 'Aethelflaed', 'Kusunoki Masashige', 'Mehmed II', 'Richard I', 'Hermann Prime', 'Ramesses II', 'Theodora'], canyonBonus: 50, preferredRow: 'center', tier: 'S' },
  'Joan of Arc':            { partners: ['Charles Martel', 'Scipio Africanus', 'Boudica', 'Sun Tzu', 'Mulan', 'Constantine I'], canyonBonus: 40, preferredRow: 'back', tier: 'S' },
  'William I':              { partners: ['Charles Martel', 'Richard I', 'Guan Yu', 'Genghis Khan'], canyonBonus: 45, preferredRow: 'front', tier: 'S' },
  'Aethelflaed':            { partners: ['Yi Seong-Gye', 'Sun Tzu', 'Lohar', 'Boudica', 'Baibars', 'Kusunoki Masashige'], canyonBonus: 40, preferredRow: 'center', tier: 'S' },
  'Guan Yu':                { partners: ['Sun Tzu', 'Alexander the Great', 'Richard I', 'Harald Sigurdsson', 'William I'], canyonBonus: 35, preferredRow: 'front', tier: 'S' },
  'Harald Sigurdsson':      { partners: ['Guan Yu', 'Sun Tzu', 'Charles Martel'], canyonBonus: 30, preferredRow: 'front', tier: 'S' },
  'Charles Martel':         { partners: ['Sun Tzu', 'Richard I', 'Scipio Africanus', 'Joan of Arc', 'Eulji Mundeok', 'Björn Ironside', 'Harald Sigurdsson', 'Constantine I', 'Wu Zetian'], canyonBonus: 40, preferredRow: 'front', tier: 'S' },
  'Scipio Africanus':       { partners: ['Sun Tzu', 'Charles Martel', 'Björn Ironside', 'Joan of Arc', 'Richard I'], canyonBonus: 25, preferredRow: 'front', tier: 'A' },
  'Scipio Africanus Prime': { partners: ['Liu Che', 'Sun Tzu'], canyonBonus: 30, preferredRow: 'front', tier: 'S' },
  'Liu Che':                { partners: ['Scipio Africanus Prime', 'Sun Tzu'], canyonBonus: 30, preferredRow: 'front', tier: 'S' },
  'Björn Ironside':         { partners: ['Sun Tzu', 'Eulji Mundeok', 'Charles Martel', 'Scipio Africanus'], canyonBonus: 20, preferredRow: 'front', tier: 'A' },
  'Eulji Mundeok':          { partners: ['Sun Tzu', 'Björn Ironside', 'Osman I', 'Charles Martel'], canyonBonus: 10, preferredRow: 'front', tier: 'B' },
  'Alexander the Great':    { partners: ['Guan Yu', 'Sun Tzu', 'Richard I'], canyonBonus: 25, preferredRow: 'front', tier: 'A' },
  'Hermann Prime':          { partners: ['Ashurbanipal', 'Yi Seong-Gye'], canyonBonus: 35, preferredRow: 'back', tier: 'S' },
  'Ashurbanipal':           { partners: ['Hermann Prime', 'Yi Seong-Gye', 'Ramesses II'], canyonBonus: 35, preferredRow: 'center', tier: 'S' },
  'Ramesses II':            { partners: ['Ashurbanipal', 'Yi Seong-Gye'], canyonBonus: 30, preferredRow: 'back', tier: 'S' },
  'Kusunoki Masashige':     { partners: ['Sun Tzu', 'Yi Seong-Gye', 'Aethelflaed', 'Hermann'], canyonBonus: 20, preferredRow: 'back', tier: 'A' },
  'Hermann':                { partners: ['Kusunoki Masashige', 'Yi Seong-Gye', 'El Cid'], canyonBonus: 15, preferredRow: 'back', tier: 'B' },
  'Thutmose III':           { partners: ['Yi Seong-Gye', 'Kusunoki Masashige', 'Aethelflaed'], canyonBonus: 10, preferredRow: 'back', tier: 'B' },
  'Alexander Nevsky':       { partners: ['Joan of Arc Prime', 'Xiang Yu', 'Attila', 'Takeda Shingen', 'Bertrand'], canyonBonus: -10, preferredRow: 'front', tier: 'A' },
  'Xiang Yu':               { partners: ['Alexander Nevsky', 'Saladin', 'Cao Cao'], canyonBonus: -10, preferredRow: 'front', tier: 'A' },
  'Attila':                 { partners: ['Takeda Shingen', 'Alexander Nevsky'], canyonBonus: -15, preferredRow: 'front', tier: 'A' },
  'Takeda Shingen':         { partners: ['Attila', 'Alexander Nevsky'], canyonBonus: -15, preferredRow: 'front', tier: 'A' },
  'Cao Cao':                { partners: ['Minamoto no Yoshitsune', 'Pelagius', 'Belisarius', 'Baibars', 'Osman I', 'Tomoe Gozen', 'Genghis Khan'], canyonBonus: -10, preferredRow: 'front', tier: 'B' },
  'Minamoto no Yoshitsune': { partners: ['Cao Cao', 'Pelagius', 'Baibars', 'Osman I', 'Genghis Khan'], canyonBonus: -10, preferredRow: 'front', tier: 'B' },
  'Genghis Khan':           { partners: ['Cao Cao', 'Minamoto no Yoshitsune', 'Baibars', 'William I'], canyonBonus: -5, preferredRow: 'front', tier: 'B' },
  'Baibars':                { partners: ['Osman I', 'Cao Cao', 'Sun Tzu', 'Aethelflaed', 'Saladin', 'Minamoto no Yoshitsune'], canyonBonus: 15, preferredRow: 'center', tier: 'A' },
  'Saladin':                { partners: ['Baibars', 'Cao Cao', 'Minamoto no Yoshitsune', 'Xiang Yu'], canyonBonus: 5, preferredRow: 'front', tier: 'A' },
  'Osman I':                { partners: ['Baibars', 'Eulji Mundeok', 'Cao Cao', 'Minamoto no Yoshitsune'], canyonBonus: -5, preferredRow: 'front', tier: 'B' },
  'Pelagius':               { partners: ['Minamoto no Yoshitsune', 'Cao Cao'], canyonBonus: -10, preferredRow: 'front', tier: 'B' },
  'Belisarius':             { partners: ['Cao Cao', 'Baibars'], canyonBonus: -15, preferredRow: 'front', tier: 'B' },
  'Tomoe Gozen':            { partners: ['Cao Cao'], canyonBonus: -5, preferredRow: 'front', tier: 'B' },
  'Joan of Arc Prime':      { partners: ['Alexander Nevsky', 'Mulan'], canyonBonus: 20, preferredRow: 'back', tier: 'A' },
  'Mulan':                  { partners: ['Joan of Arc Prime', 'Joan of Arc'], canyonBonus: 25, preferredRow: 'back', tier: 'A' },
  'Boudica':                { partners: ['Lohar', 'Aethelflaed', 'Sun Tzu', 'Joan of Arc'], canyonBonus: 10, preferredRow: 'back', tier: 'B' },
  'Lohar':                  { partners: ['Boudica', 'Aethelflaed', 'Joan of Arc'], canyonBonus: 5, preferredRow: 'back', tier: 'B' },
  'Mehmed II':              { partners: ['Yi Seong-Gye', 'Sun Tzu', 'Aethelflaed'], canyonBonus: 20, preferredRow: 'back', tier: 'A' },
  'Wak Chanil Ajaw':        { partners: ['Aethelflaed', 'Boudica', 'Lohar'], canyonBonus: 0, preferredRow: 'back', tier: 'B' },
  'El Cid':                 { partners: ['Hermann', 'Yi Seong-Gye'], canyonBonus: 20, preferredRow: 'back', tier: 'A' },
  'Bertrand':               { partners: ['Alexander Nevsky'], canyonBonus: 15, preferredRow: 'front', tier: 'A' },
  'Amanitore':              { partners: ['Yi Seong-Gye', 'Sun Tzu', 'Theodora'], canyonBonus: 25, preferredRow: 'back', tier: 'A' },
}

/* ------------------------------------------------------------------ */
/*  Styling maps                                                        */
/* ------------------------------------------------------------------ */

const RARITY_COLORS: Record<Rarity, string> = {
  legendary: 'text-yellow-400',
  epic:      'text-purple-400',
  elite:     'text-blue-400',
}
const RARITY_BG: Record<Rarity, string> = {
  legendary: 'bg-yellow-500/15 border-yellow-500/30',
  epic:      'bg-purple-500/15 border-purple-500/30',
  elite:     'bg-blue-500/15 border-blue-500/30',
}
const RARITY_BADGE: Record<Rarity, string> = {
  legendary: 'bg-yellow-500/20 text-yellow-300',
  epic:      'bg-purple-500/20 text-purple-300',
  elite:     'bg-blue-500/20 text-blue-300',
}

const TROOP_COLORS: Record<TroopType, string> = {
  infantry: 'text-blue-400',
  cavalry:  'text-orange-400',
  archer:   'text-green-400',
  mixed:    'text-violet-400',
}
const TROOP_BG: Record<TroopType, string> = {
  infantry: 'bg-blue-500/15 border-blue-500/30',
  cavalry:  'bg-orange-500/15 border-orange-500/30',
  archer:   'bg-green-500/15 border-green-500/30',
  mixed:    'bg-violet-500/15 border-violet-500/30',
}
const TROOP_ICONS: Record<TroopType, React.ReactNode> = {
  infantry: <Shield className="h-3.5 w-3.5" />,
  cavalry:  <Sword className="h-3.5 w-3.5" />,
  archer:   <Crosshair className="h-3.5 w-3.5" />,
  mixed:    <Layers className="h-3.5 w-3.5" />,
}

/* ------------------------------------------------------------------ */
/*  Commander types for the roster                                      */
/* ------------------------------------------------------------------ */

interface Commander {
  id: string
  name: string
  rarity: Rarity
  troopType: TroopType
  level: number
  stars: number
  skills: [number, number, number, number]
}

interface Army {
  primary: Commander
  secondary: Commander
  score: number
}

interface Formation {
  armies: Army[]
  winRate: number
  totalPower: number
  notes: string[]
}

/* ------------------------------------------------------------------ */
/*  Algorithm                                                           */
/* ------------------------------------------------------------------ */

function calcPower(c: Commander): number {
  const skillSum = c.skills.reduce((a, b) => a + b, 0)
  const skillRatio = skillSum / 20
  const rarityBonus = c.rarity === 'legendary' ? 300 : c.rarity === 'epic' ? 150 : 50
  return (
    c.level * c.level * 2 +
    skillSum * 100 * (1 + skillRatio) +
    c.stars * 400 +
    rarityBonus
  )
}

function isViable(c: Commander): boolean {
  return c.level >= 30 && Math.max(...c.skills) >= 3 && c.stars >= 2
}

function pairingScore(primary: Commander, secondary: Commander): number {
  const pp = calcPower(primary)
  const sp = calcPower(secondary)
  let score = pp / 10 + sp / 15

  const pSyn = CANYON_SYNERGIES[primary.name]
  const sSyn = CANYON_SYNERGIES[secondary.name]
  if (pSyn) score += pSyn.canyonBonus * 0.5
  if (sSyn) score += sSyn.canyonBonus * 0.3

  // Known partner bonus
  if (pSyn?.partners.includes(secondary.name)) score += 40
  if (sSyn?.partners.includes(primary.name))   score += 20

  // Tier bonus
  if (pSyn?.tier === 'S') score += 15
  if (pSyn?.tier === 'A') score += 8
  if (sSyn?.tier === 'S') score += 10
  if (sSyn?.tier === 'A') score += 5

  // Same troop type bonus
  if (primary.troopType === secondary.troopType) score += 30

  // Cavalry penalty (cavalry is weak in Canyon)
  if (primary.troopType === 'cavalry')  score -= 25
  if (secondary.troopType === 'cavalry') score -= 25

  // Infantry bonus
  if (primary.troopType === 'infantry')  score += 20
  if (secondary.troopType === 'infantry') score += 20

  // Viability penalties
  if (!isViable(primary))   score -= 500
  if (!isViable(secondary)) score -= 300

  return score
}

function optimizeFormation(commanders: Commander[]): Formation | null {
  if (commanders.length < 2) return null

  const pairs: { primary: Commander; secondary: Commander; score: number }[] = []
  for (let i = 0; i < commanders.length; i++) {
    for (let j = 0; j < commanders.length; j++) {
      if (i === j) continue
      pairs.push({ primary: commanders[i], secondary: commanders[j], score: pairingScore(commanders[i], commanders[j]) })
    }
  }
  pairs.sort((a, b) => b.score - a.score)

  const used = new Set<string>()
  const armies: Army[] = []
  for (const pair of pairs) {
    if (armies.length >= 5) break
    if (used.has(pair.primary.id) || used.has(pair.secondary.id)) continue
    armies.push(pair)
    used.add(pair.primary.id)
    used.add(pair.secondary.id)
  }

  if (armies.length === 0) return null

  // Sort: infantry/tank to front
  armies.sort((a, b) => {
    const aScore = (a.primary.troopType === 'infantry' ? 10 : 0) + (a.secondary.troopType === 'infantry' ? 5 : 0)
    const bScore = (b.primary.troopType === 'infantry' ? 10 : 0) + (b.secondary.troopType === 'infantry' ? 5 : 0)
    return bScore - aScore
  })

  const totalPower = armies.reduce((sum, a) => sum + calcPower(a.primary) + calcPower(a.secondary), 0)
  const winRate    = Math.min(82, Math.max(30, 35 + totalPower / 15000))

  const notes: string[] = []
  let foundSynergyPair = false
  for (const army of armies) {
    const pSyn = CANYON_SYNERGIES[army.primary.name]
    if (pSyn?.partners.includes(army.secondary.name) && pSyn.tier === 'S') {
      notes.push(`${army.primary.name} + ${army.secondary.name} is an S-tier Canyon pair.`)
      foundSynergyPair = true
      break
    }
  }

  const hasInfantryFront = armies.slice(0, 2).some((a) => a.primary.troopType === 'infantry')
  if (!hasInfantryFront) notes.push('Add an infantry tank (Richard I, Charles Martel, Constantine I) to the front row.')

  const nonViable = armies.filter((a) => !isViable(a.primary) || !isViable(a.secondary))
  if (nonViable.length > 0)
    notes.push(`${nonViable.length} pair(s) include under-leveled commanders. Aim for level 50+ with skill 1 maxed.`)

  const cavalryCount = armies.filter((a) => a.primary.troopType === 'cavalry' || a.secondary.troopType === 'cavalry').length
  if (cavalryCount > 1) notes.push('Cavalry commanders are countered by infantry in Canyon. Swap for infantry or archer commanders.')

  if (!foundSynergyPair && notes.length === 0)
    notes.push('Formation looks solid! Focus on skill upgrades and try Constantine I + Wu Zetian for the front line.')

  return { armies, winRate, totalPower, notes }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} className={`transition-colors ${s <= value ? 'text-yellow-400' : 'text-muted-foreground/30'}`}>
          <Star className="h-4 w-4 fill-current" />
        </button>
      ))}
    </div>
  )
}

function TroopBadge({ type }: { type: TroopType }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${TROOP_COLORS[type]}`}>
      {TROOP_ICONS[type]}
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  )
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${RARITY_BADGE[rarity]}`}>
      {rarity}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Commander Card (in the roster list)                                */
/* ------------------------------------------------------------------ */

function CommanderCard({ commander, onEdit, onDelete }: { commander: Commander; onEdit: () => void; onDelete: () => void }) {
  const power  = calcPower(commander)
  const viable = isViable(commander)
  const synTier = CANYON_SYNERGIES[commander.name]?.tier

  return (
    <div className={`rounded-xl border p-4 transition-all ${viable ? `${RARITY_BG[commander.rarity]}` : 'border-yellow-500/30 bg-yellow-500/5'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold truncate ${RARITY_COLORS[commander.rarity]}`}>{commander.name}</span>
            {synTier && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                synTier === 'S' ? 'bg-yellow-500/20 text-yellow-300' :
                synTier === 'A' ? 'bg-orange-500/20 text-orange-300' :
                'bg-secondary text-muted-foreground'
              }`}>{synTier}-Tier Canyon</span>
            )}
            {!viable && (
              <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-yellow-500/15 text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                Low viability
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <RarityBadge rarity={commander.rarity} />
            <TroopBadge type={commander.troopType} />
            <StarRating value={commander.stars} onChange={() => {}} />
            <span className="text-xs text-muted-foreground">Lv {commander.level}</span>
          </div>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {commander.skills.map((s, i) => (
              <span key={i} className={`rounded px-2 py-0.5 text-xs font-medium ${
                s >= 4 ? 'bg-purple-500/20 text-purple-300' :
                s >= 3 ? 'bg-blue-500/20 text-blue-300' :
                'bg-secondary text-muted-foreground'
              }`}>
                S{i + 1}: {s}
              </span>
            ))}
            <span className="rounded px-2 py-0.5 text-xs font-medium bg-secondary text-muted-foreground ml-1">
              {Math.round(power).toLocaleString()} pwr
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Army Slot                                                           */
/* ------------------------------------------------------------------ */

function ArmySlot({ army, position, index }: { army: Army | null; position: 'front' | 'back'; index: number }) {
  if (!army) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 flex flex-col items-center justify-center min-h-[110px] text-muted-foreground/40">
        <Users className="h-6 w-6 mb-1" />
        <span className="text-xs">Empty Slot</span>
      </div>
    )
  }
  const { primary, secondary } = army
  const bgClass = TROOP_BG[primary.troopType]
  return (
    <div className={`rounded-xl border p-4 ${bgClass}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${position === 'front' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
          {position === 'front' ? `Front ${index + 1}` : `Back ${index - 1}`}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-secondary/50 ${RARITY_COLORS[primary.rarity]}`}>
            {TROOP_ICONS[primary.troopType]}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${RARITY_COLORS[primary.rarity]}`}>{primary.name}</p>
            <p className="text-xs text-muted-foreground">Lv {primary.level} · ★{primary.stars}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-1">
          <div className="w-px h-6 bg-border mx-2" />
          <div className="min-w-0">
            <p className={`text-xs font-medium truncate ${RARITY_COLORS[secondary.rarity]}`}>+ {secondary.name}</p>
            <p className="text-xs text-muted-foreground/70">Lv {secondary.level} · ★{secondary.stars}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Formation Analytics Charts                                          */
/* ------------------------------------------------------------------ */

function WinRateGauge({ winRate }: { winRate: number }) {
  const color = winRate > 65 ? '#4ade80' : winRate >= 50 ? '#facc15' : '#f87171'
  const pct = (winRate - 30) / (82 - 30)

  // Two-segment pie: filled + empty, rendered as semicircle
  const gaugeData = [
    { value: pct * 100 },
    { value: (1 - pct) * 100 },
  ]
  const bgData = [{ value: 100 }]

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <PieChart width={180} height={100} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore – recharts PieChart doesn't need width/height typing fix here
        >
          {/* background track */}
          <Pie
            data={bgData}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius={52}
            outerRadius={76}
            stroke="none"
            fill="#27272a"
            isAnimationActive={false}
          />
          {/* filled arc */}
          <Pie
            data={gaugeData}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius={52}
            outerRadius={76}
            stroke="none"
            isAnimationActive
          >
            <Cell fill={color} />
            <Cell fill="transparent" />
          </Pie>
        </PieChart>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>{winRate.toFixed(1)}%</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Win Rate</span>
        </div>
      </div>
      <div className="flex justify-between w-full max-w-[180px] text-[9px] text-muted-foreground/60">
        <span>30%</span>
        <span>82%</span>
      </div>
    </div>
  )
}

function ArmyScoresChart({ armies }: { armies: Army[] }) {
  if (armies.length === 0) return null
  const data = armies.map((a, i) => {
    const primaryName  = a.primary.name.split(' ').slice(0, 2).join(' ')
    const secondName   = a.secondary.name.split(' ').slice(0, 2).join(' ')
    return {
      name: `${primaryName} + ${secondName}`,
      power: Math.round(calcPower(a.primary) + calcPower(a.secondary)),
      synergy: Math.max(0, Math.round(a.score - (calcPower(a.primary) / 10 + calcPower(a.secondary) / 15))),
    }
  })

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, armies.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#e4e4e7' }}
          formatter={(value: number, name: string) => [value.toLocaleString(), name === 'power' ? 'Base Power' : 'Synergy Bonus']}
        />
        <Bar dataKey="power"   name="power"   stackId="a" fill="#7c3aed" radius={[0, 0, 0, 0]} />
        <Bar dataKey="synergy" name="synergy" stackId="a" fill="#a855f7" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function CommanderPowerChart({ commanders }: { commanders: Commander[] }) {
  if (commanders.length === 0) return null

  const data = commanders.map((c) => {
    const skillSum   = c.skills.reduce((a, b) => a + b, 0)
    const skillRatio = skillSum / 20
    const rarityBonus = c.rarity === 'legendary' ? 300 : c.rarity === 'epic' ? 150 : 50
    const firstName = c.name.split(' ')[0]
    return {
      name: firstName,
      Level:  Math.round(c.level * c.level * 2),
      Skills: Math.round(skillSum * 100 * (1 + skillRatio)),
      Stars:  c.stars * 400,
      Rarity: rarityBonus,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, commanders.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={68} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#e4e4e7' }}
          formatter={(value: number) => [value.toLocaleString()]}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
        <Bar dataKey="Level"  stackId="a" fill="#3b82f6" />
        <Bar dataKey="Skills" stackId="a" fill="#8b5cf6" />
        <Bar dataKey="Stars"  stackId="a" fill="#f59e0b" />
        <Bar dataKey="Rarity" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Commander Form with full visual browser                             */
/* ------------------------------------------------------------------ */

const EMPTY_FORM = {
  name:      '',
  rarity:    'legendary' as Rarity,
  troopType: 'infantry' as TroopType,
  level:     40,
  stars:     3,
  skills:    [3, 3, 3, 3] as [number, number, number, number],
}

type RarityFilter  = 'all' | Rarity
type TroopFilter   = 'all' | TroopType

function CommanderPicker({ selected, onPick }: { selected: string; onPick: (c: CommanderInfo) => void }) {
  const [search,       setSearch]       = useState('')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [troopFilter,  setTroopFilter]  = useState<TroopFilter>('all')

  const results = useMemo(() => {
    const q = search.toLowerCase()
    return COMMANDER_DB.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false
      if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false
      if (troopFilter  !== 'all' && c.troopType !== troopFilter) return false
      return true
    })
  }, [search, rarityFilter, troopFilter])

  // Group by rarity for display when not searching
  const legendary = results.filter((c) => c.rarity === 'legendary')
  const epic       = results.filter((c) => c.rarity === 'epic')

  const FilterBtn = ({ active, onClick, children, className = '' }: {
    active: boolean; onClick: () => void; children: React.ReactNode; className?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
        active ? `bg-primary/20 text-primary ring-1 ring-primary/40 ${className}` : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all commanders…"
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        <FilterBtn active={rarityFilter === 'all'}       onClick={() => setRarityFilter('all')}>All</FilterBtn>
        <FilterBtn active={rarityFilter === 'legendary'} onClick={() => setRarityFilter('legendary')} className="text-yellow-400">⭐ Legendary</FilterBtn>
        <FilterBtn active={rarityFilter === 'epic'}      onClick={() => setRarityFilter('epic')} className="text-purple-400">💜 Epic</FilterBtn>
        <span className="w-px bg-border self-stretch mx-0.5" />
        <FilterBtn active={troopFilter === 'all'}       onClick={() => setTroopFilter('all')}>All Troops</FilterBtn>
        <FilterBtn active={troopFilter === 'infantry'}  onClick={() => setTroopFilter('infantry')}>🛡 Infantry</FilterBtn>
        <FilterBtn active={troopFilter === 'cavalry'}   onClick={() => setTroopFilter('cavalry')}>⚔ Cavalry</FilterBtn>
        <FilterBtn active={troopFilter === 'archer'}    onClick={() => setTroopFilter('archer')}>🏹 Archer</FilterBtn>
        <FilterBtn active={troopFilter === 'mixed'}     onClick={() => setTroopFilter('mixed')}>🔀 Mixed</FilterBtn>
      </div>

      {/* Commander grid */}
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background space-y-0.5 p-1.5">
        {results.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No commanders match these filters.</p>
        ) : (
          <>
            {/* Legendary group */}
            {legendary.length > 0 && rarityFilter !== 'epic' && (
              <>
                <p className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-wider px-2 py-1">
                  Legendary ({legendary.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                  {legendary.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => onPick(c)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all hover:bg-yellow-500/10 ${
                        selected === c.name ? 'bg-yellow-500/20 ring-1 ring-yellow-500/40' : ''
                      }`}
                    >
                      <span className={`shrink-0 ${TROOP_COLORS[c.troopType]}`}>{TROOP_ICONS[c.troopType]}</span>
                      <span className="text-xs font-medium text-yellow-300 flex-1 truncate">{c.name}</span>
                      {CANYON_SYNERGIES[c.name] && (
                        <span className={`text-[9px] font-bold ${
                          CANYON_SYNERGIES[c.name].tier === 'S' ? 'text-yellow-400' :
                          CANYON_SYNERGIES[c.name].tier === 'A' ? 'text-orange-400' : 'text-muted-foreground'
                        }`}>{CANYON_SYNERGIES[c.name].tier}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
            {/* Epic group */}
            {epic.length > 0 && rarityFilter !== 'legendary' && (
              <>
                <p className="text-[10px] font-bold text-purple-500/70 uppercase tracking-wider px-2 py-1 mt-1">
                  Epic ({epic.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                  {epic.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => onPick(c)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all hover:bg-purple-500/10 ${
                        selected === c.name ? 'bg-purple-500/20 ring-1 ring-purple-500/40' : ''
                      }`}
                    >
                      <span className={`shrink-0 ${TROOP_COLORS[c.troopType]}`}>{TROOP_ICONS[c.troopType]}</span>
                      <span className="text-xs font-medium text-purple-300 flex-1 truncate">{c.name}</span>
                      {CANYON_SYNERGIES[c.name] && (
                        <span className={`text-[9px] font-bold ${
                          CANYON_SYNERGIES[c.name].tier === 'S' ? 'text-yellow-400' :
                          CANYON_SYNERGIES[c.name].tier === 'A' ? 'text-orange-400' : 'text-muted-foreground'
                        }`}>{CANYON_SYNERGIES[c.name].tier}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {results.length} of {COMMANDER_DB.length} commanders shown
      </p>
    </div>
  )
}

function CommanderForm({ initial, onSave, onCancel }: {
  initial?: Commander
  onSave: (c: Omit<Commander, 'id'>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_FORM })

  function pickCommander(info: CommanderInfo) {
    setForm((f) => ({ ...f, name: info.name, rarity: info.rarity, troopType: info.troopType }))
  }

  function setSkill(index: number, val: string) {
    const n = Math.min(5, Math.max(1, parseInt(val) || 1))
    setForm((f) => {
      const skills = [...f.skills] as [number, number, number, number]
      skills[index] = n
      return { ...f, skills }
    })
  }

  const valid = form.name.trim().length > 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-foreground text-sm">{initial ? 'Edit Commander' : 'Add Commander'}</h3>

      {/* Commander browser */}
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Select Commander</Label>
        <CommanderPicker selected={form.name} onPick={pickCommander} />

        {/* Selected preview */}
        {form.name && (
          <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${RARITY_BG[form.rarity]}`}>
            <span className={TROOP_COLORS[form.troopType]}>{TROOP_ICONS[form.troopType]}</span>
            <span className={`text-sm font-semibold flex-1 ${RARITY_COLORS[form.rarity]}`}>{form.name}</span>
            <RarityBadge rarity={form.rarity} />
            <TroopBadge type={form.troopType} />
          </div>
        )}
      </div>

      {/* Level & Stars */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Level (1-60)</Label>
          <Input
            type="number" min={1} max={60} value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: Math.min(60, Math.max(1, parseInt(e.target.value) || 1)) }))}
            className="bg-secondary border-border"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Stars</Label>
          <div className="flex h-10 items-center">
            <StarRating value={form.stars} onChange={(v) => setForm((f) => ({ ...f, stars: v }))} />
          </div>
        </div>
      </div>

      {/* Skill levels */}
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Skill Levels (1-5)</Label>
        <div className="grid grid-cols-4 gap-2">
          {form.skills.map((s, i) => (
            <div key={i}>
              <Label className="mb-1 block text-xs text-muted-foreground/60 text-center">S{i + 1}</Label>
              <Input
                type="number" min={1} max={5} value={s}
                onChange={(e) => setSkill(i, e.target.value)}
                className="bg-secondary border-border text-center"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" disabled={!valid} onClick={() => onSave(form)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {initial ? 'Save Changes' : 'Add Commander'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main export                                                         */
/* ------------------------------------------------------------------ */

export function SunsetCanyonContent() {
  const [commanders, setCommanders] = useState<Commander[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('sc:commanders') ?? '[]') } catch { return [] }
  })
  const [showForm, setShowForm]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [formation, setFormation]   = useState<Formation | null>(null)

  useEffect(() => { localStorage.setItem('sc:commanders', JSON.stringify(commanders)) }, [commanders])

  function addCommander(data: Omit<Commander, 'id'>) {
    setCommanders((prev) => [...prev, { ...data, id: crypto.randomUUID() }])
    setShowForm(false)
    setFormation(null)
  }
  function updateCommander(id: string, data: Omit<Commander, 'id'>) {
    setCommanders((prev) => prev.map((c) => (c.id === id ? { ...data, id } : c)))
    setEditingId(null)
    setFormation(null)
  }
  function deleteCommander(id: string) {
    setCommanders((prev) => prev.filter((c) => c.id !== id))
    setFormation(null)
  }
  function clearAll() {
    setCommanders([])
    setFormation(null)
    setShowForm(false)
    setEditingId(null)
  }
  function runOptimizer() {
    setFormation(optimizeFormation(commanders))
  }

  const winColor = formation
    ? formation.winRate > 65 ? 'text-green-400' : formation.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
    : ''

  const slots: Array<{ army: Army | null; position: 'front' | 'back'; index: number }> = Array.from({ length: 5 }, (_, i) => ({
    army: formation ? formation.armies[i] ?? null : null,
    position: i < 2 ? 'front' : 'back',
    index: i,
  }))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            Sunset Canyon Optimizer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your commanders, then optimize for the best defensive formation.
          </p>
        </div>
        <div className="flex gap-2">
          {commanders.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground hover:text-destructive">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          )}
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => { setShowForm(true); setEditingId(null) }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Commander
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: form + roster */}
        <div className="space-y-4">
          {showForm && !editingId && <CommanderForm onSave={addCommander} onCancel={() => setShowForm(false)} />}

          {commanders.length === 0 && !showForm && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No commanders added yet. Click "Add Commander" to get started.</p>
            </div>
          )}

          {commanders.map((c) =>
            editingId === c.id ? (
              <CommanderForm key={c.id} initial={c} onSave={(data) => updateCommander(c.id, data)} onCancel={() => setEditingId(null)} />
            ) : (
              <CommanderCard key={c.id} commander={c} onEdit={() => { setEditingId(c.id); setShowForm(false) }} onDelete={() => deleteCommander(c.id)} />
            )
          )}

          {commanders.length >= 2 && (
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={runOptimizer}>
              <Zap className="h-4 w-4 mr-2" />
              Optimize Formation
            </Button>
          )}
          {commanders.length === 1 && (
            <p className="text-center text-xs text-muted-foreground">Add at least 2 commanders to optimize.</p>
          )}
        </div>

        {/* Right: formation result */}
        <div className="space-y-4">
          {!formation ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-10 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Add commanders and click "Optimize Formation" to see results.</p>
            </div>
          ) : (
            <>
              <Card className="border-border">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
                        <Trophy className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Projected Win Rate</p>
                        <p className={`text-3xl font-bold tabular-nums ${winColor}`}>{formation.winRate.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Formation Power</p>
                      <p className="text-lg font-semibold text-foreground">{Math.round(formation.totalPower).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">Formation Layout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Front Row (Tanks)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {slots.slice(0, 2).map((slot) => <ArmySlot key={slot.index} {...slot} />)}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">Back Row (DPS / Support)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {slots.slice(2).map((slot) => <ArmySlot key={slot.index} {...slot} />)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">Optimizer Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formation.notes.map((note, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-purple-400 text-[9px] font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Analytics charts */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-400" />
                    Formation Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Win rate gauge */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">Projected Win Rate</p>
                    <WinRateGauge winRate={formation.winRate} />
                    <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                      Formula: 35 + totalPower ÷ 15,000 · capped 30–82%
                    </p>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground mb-3">Army Pair Power + Synergy</p>
                    <ArmyScoresChart armies={formation.armies} />
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground mb-3">Commander Power Breakdown</p>
                    <CommanderPowerChart commanders={commanders} />
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground/70">
                      <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />Level²×2</span>
                      <span><span className="inline-block w-2 h-2 rounded-sm bg-violet-500 mr-1" />Skill×100×(1+ratio)</span>
                      <span><span className="inline-block w-2 h-2 rounded-sm bg-amber-500 mr-1" />Stars×400</span>
                      <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />Rarity bonus</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
