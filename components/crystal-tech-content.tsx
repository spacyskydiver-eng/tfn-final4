'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import techTreeData from '@/lib/data/crystal-tech-tree.json'

/* ------------------------------------------------------------------ */
/*  Layout — scaled down from codexhelper originals                    */
/* ------------------------------------------------------------------ */

const NW = 160   // node width  (codex: 230)
const NH = 64    // node height (codex: 80)
const HG = 44    // horizontal gap (codex: 70)
const LS = 104   // line spacing (codex: 140)
const PL = 24    // padding left
const PT = 70    // padding top
const PB = 70    // padding bottom

const COL_PATTERN = [4,4,1,3,3,2,4,4,4,1,3,2,4,4,1,2,4,1] as const

function rowsForCount(n: number): number[] {
  if (n === 4) return [0, 1, 2, 3]
  if (n === 3) return [0.5, 1.5, 2.5]
  if (n === 2) return [0.5, 2.5]
  return [1.5]
}

// Slot name → tech key (exact from codexhelper techLayout.ts)
const ASSIGNMENTS: Record<string, string> = {
  col0_slot0:'quenchedBladesI',          col0_slot1:'improvedBowsI',
  col0_slot2:'mountedCombatTechniquesI', col0_slot3:'improvedProjectilesI',
  col1_slot0:'swiftMarchingI',           col1_slot1:'fleetOfFootI',
  col1_slot2:'swiftSteedsI',             col1_slot3:'reinforcedAxlesI',
  col2_slot0:'callToArmsI',
  col3_slot0:'cuttingCornersI',          col3_slot1:'culturalExchange',        col3_slot2:'leadershipI',
  col4_slot0:'barbarianBounties',        col4_slot1:'callToArmsII',            col4_slot2:'karakuReports',
  col5_slot0:'cuttingCornersII',         col5_slot1:'leadershipII',
  col6_slot0:'quenchedBladesII',         col6_slot1:'improvedBowsII',
  col6_slot2:'mountedCombatTechniquesII',col6_slot3:'improvedProjectilesII',
  col7_slot0:'starmetalShields',         col7_slot1:'starmetalBracers',
  col7_slot2:'starmetalBarding',         col7_slot3:'starmetalAxles',
  col8_slot0:'swiftMarchingII',          col8_slot1:'fleetOfFootII',
  col8_slot2:'swiftSteedsII',            col8_slot3:'reinforcedAxlesII',
  col9_slot0:'largerCamps',
  col10_slot0:'runecraft',               col10_slot1:'specialConcoctionsI',    col10_slot2:'expandedFormationsI',
  col11_slot0:'emergencySupport',        col11_slot1:'rapidRetreat',
  col12_slot0:'ironInfantry',            col12_slot1:'archersFocus',
  col12_slot2:'ridersResilience',        col12_slot3:'siegeProvisions',
  col13_slot0:'swiftMarchingIII',        col13_slot1:'fleetOfFootIII',
  col13_slot2:'swiftSteedsIII',          col13_slot3:'reinforcedAxlesIII',
  col14_slot0:'specialConcoctionsII',
  col15_slot0:'celestialGuidance',       col15_slot1:'expandedFormationsII',
  col16_slot0:'infantryExpert',          col16_slot1:'archerExpert',
  col16_slot2:'cavalryExpert',           col16_slot3:'siegeExpert',
  col17_slot0:'surpriseStrike',
}

// Reverse: tech key → slot name
const TECH_SLOT: Record<string, string> = Object.fromEntries(
  Object.entries(ASSIGNMENTS).map(([s,k]) => [k,s])
)

// Compute pixel pos (top-left) for each slot
const SLOT_POS: Record<string, {x:number; y:number}> = {}
COL_PATTERN.forEach((count, col) => {
  rowsForCount(count).forEach((row, si) => {
    SLOT_POS[`col${col}_slot${si}`] = {
      x: PL + col * (NW + HG),
      y: PT + row * LS,
    }
  })
})

const CANVAS_W = PL + COL_PATTERN.length * (NW + HG) + 40
const CANVAS_H = PT + 3 * LS + NH + PB

/* ------------------------------------------------------------------ */
/*  Connection line definitions (exact from techLayout.ts)             */
/* ------------------------------------------------------------------ */

const DIRECT: [string,string][] = [
  ['col0_slot0','col1_slot0'],['col0_slot1','col1_slot1'],
  ['col0_slot2','col1_slot2'],['col0_slot3','col1_slot3'],
  ['col1_slot0','col2_slot0'],['col1_slot1','col2_slot0'],
  ['col1_slot2','col2_slot0'],['col1_slot3','col2_slot0'],
  ['col2_slot0','col3_slot0'],['col2_slot0','col3_slot1'],['col2_slot0','col3_slot2'],
  ['col3_slot1','col4_slot0'],['col3_slot1','col4_slot1'],['col3_slot1','col4_slot2'],
  ['col4_slot1','col5_slot0'],['col4_slot1','col5_slot1'],
  ['col6_slot0','col7_slot0'],['col6_slot1','col7_slot1'],
  ['col6_slot2','col7_slot2'],['col6_slot3','col7_slot3'],
  ['col7_slot0','col8_slot0'],['col7_slot1','col8_slot1'],
  ['col7_slot2','col8_slot2'],['col7_slot3','col8_slot3'],
  ['col8_slot0','col9_slot0'],['col8_slot1','col9_slot0'],
  ['col8_slot2','col9_slot0'],['col8_slot3','col9_slot0'],
  ['col9_slot0','col10_slot0'],['col9_slot0','col10_slot1'],['col9_slot0','col10_slot2'],
  ['col10_slot1','col11_slot0'],['col10_slot1','col11_slot1'],
  ['col12_slot0','col13_slot0'],['col12_slot1','col13_slot1'],
  ['col12_slot2','col13_slot2'],['col12_slot3','col13_slot3'],
  ['col13_slot0','col14_slot0'],['col13_slot1','col14_slot0'],
  ['col13_slot2','col14_slot0'],['col13_slot3','col14_slot0'],
  ['col14_slot0','col15_slot0'],['col14_slot0','col15_slot1'],
  ['col16_slot0','col17_slot0'],['col16_slot1','col17_slot0'],
  ['col16_slot2','col17_slot0'],['col16_slot3','col17_slot0'],
]

// Pass-through: fromSlot fans through gap col to all 4 slots of toCol
const PASS_THROUGHS = [
  { fromSlot:'col4_slot1', toSlots:['col6_slot0','col6_slot1','col6_slot2','col6_slot3'] },
  { fromSlot:'col10_slot1', toSlots:['col12_slot0','col12_slot1','col12_slot2','col12_slot3'] },
  { fromSlot:'col14_slot0', toSlots:['col16_slot0','col16_slot1','col16_slot2','col16_slot3'] },
]

/* ------------------------------------------------------------------ */
/*  Prerequisite logic — exact port from codexhelper techRequirements   */
/* ------------------------------------------------------------------ */

// Line prerequisites: to unlock a tech (level 1), need ≥1 of these at level 1+
const LINE_PREREQS: Record<string, string[]> = {}
for (const [fromSlot, toSlot] of DIRECT) {
  const from = ASSIGNMENTS[fromSlot], to = ASSIGNMENTS[toSlot]
  if (from && to) {
    if (!LINE_PREREQS[to]) LINE_PREREQS[to] = []
    if (!LINE_PREREQS[to].includes(from)) LINE_PREREQS[to].push(from)
  }
}
for (const pt of PASS_THROUGHS) {
  const from = ASSIGNMENTS[pt.fromSlot]
  for (const toSlot of pt.toSlots) {
    const to = ASSIGNMENTS[toSlot]
    if (from && to) {
      if (!LINE_PREREQS[to]) LINE_PREREQS[to] = []
      if (!LINE_PREREQS[to].includes(from)) LINE_PREREQS[to].push(from)
    }
  }
}

// Explicit prerequisite tech rules (allOf/anyOf, for level 1 unlock)
type PrereqRule = { allOf: string[] } | { anyOf: string[] }
const PREREQ_TECHS: Record<string, PrereqRule> = {
  swiftMarchingI:               { allOf:['quenchedBladesI'] },
  fleetOfFootI:                 { allOf:['improvedBowsI'] },
  swiftSteedsI:                 { allOf:['mountedCombatTechniquesI'] },
  reinforcedAxlesI:             { allOf:['improvedProjectilesI'] },
  cuttingCornersI:              { allOf:['callToArmsI'] },
  leadershipI:                  { allOf:['callToArmsI'] },
  culturalExchange:             { allOf:['cuttingCornersI'] },
  barbarianBounties:            { allOf:['culturalExchange'] },
  karakuReports:                { allOf:['culturalExchange'] },
  starmetalShields:             { allOf:['swiftMarchingI'] },
  starmetalBracers:             { allOf:['fleetOfFootI'] },
  starmetalBarding:             { allOf:['swiftSteedsI'] },
  starmetalAxles:               { allOf:['reinforcedAxlesI'] },
  swiftMarchingII:              { allOf:['starmetalShields'] },
  fleetOfFootII:                { allOf:['starmetalBracers'] },
  swiftSteedsII:                { allOf:['starmetalBarding'] },
  reinforcedAxlesII:            { allOf:['starmetalAxles'] },
  cuttingCornersII:             { allOf:['callToArmsII'] },
  leadershipII:                 { allOf:['leadershipI'] },
  swiftMarchingIII:             { allOf:['swiftMarchingII'] },
  fleetOfFootIII:               { allOf:['fleetOfFootII'] },
  swiftSteedsIII:               { allOf:['swiftSteedsII'] },
  reinforcedAxlesIII:           { allOf:['reinforcedAxlesII'] },
  specialConcoctionsI:          { allOf:['largerCamps'] },
  specialConcoctionsII:         { allOf:['specialConcoctionsI'] },
  runecraft:                    { allOf:['largerCamps'] },
  rapidRetreat:                 { allOf:['emergencySupport'] },
  expandedFormationsI:          { allOf:['largerCamps'] },
  expandedFormationsII:         { allOf:['specialConcoctionsII'] },
  celestialGuidance:            { allOf:['specialConcoctionsII'] },
}

// RC requirements: { techKey: { techLevel: rcLevelNeeded } }
const RC_REQS: Record<string, Record<number,number>> = {
  callToArmsI:  { 9: 17 },
  callToArmsII: { 6: 18, 8: 21, 9: 24, 10: 25 },
}

function rcReduction(rc: number): number {
  if (rc <= 0) return 0
  if (rc <= 10) return rc * 0.1
  if (rc <= 20) return 1 + (rc - 10) * 0.2
  return [3.3,3.6,4,4.5,5][Math.min(rc-21,4)]
}

interface TechReq { level:number; tech?:string; anyOf?:string[]; allOf?:string[]; techLevel?:number }
interface TechLevelDef { level:number; buff:string; time:string; crystals:number; seasonCoins:number }
interface TechDef {
  name:string; description:string; buffType:string; category:string
  maxLevel:number; levels:TechLevelDef[]; requirements:TechReq[]
}
type TechMap = Record<string, TechDef>
type Levels = Record<string, number>

const TECH_MAP = techTreeData.technologies as TechMap

// Can we upgrade techKey to targetLevel?
function canUpgradeTo(key: string, targetLevel: number, levels: Levels, rc: number): boolean {
  const tech = TECH_MAP[key]
  if (!tech || targetLevel < 1 || targetLevel > tech.maxLevel) return false

  if (targetLevel === 1) {
    // Line prerequisites: need ≥1 of connecting techs at 1+
    const linePre = LINE_PREREQS[key]
    if (linePre && linePre.length > 0) {
      if (!linePre.some(k => (levels[k]??0) >= 1)) return false
    }
    // Explicit prereq rules
    const rule = PREREQ_TECHS[key]
    if (rule) {
      if ('allOf' in rule && !rule.allOf.every(k => (levels[k]??0) >= 1)) return false
      if ('anyOf' in rule && !rule.anyOf.some(k => (levels[k]??0) >= 1)) return false
    }
  }

  // RC requirements for this level
  const rcReq = RC_REQS[key]?.[targetLevel]
  if (rcReq && rc < rcReq) return false

  // JSON-based per-level requirements
  for (const req of tech.requirements) {
    if (req.level > targetLevel) continue
    const needed = req.techLevel ?? 0
    if (req.tech && (levels[req.tech]??0) < needed) return false
    if (req.anyOf && !req.anyOf.some(k => (levels[k]??0) >= needed)) return false
    if (req.allOf && !req.allOf.every(k => (levels[k]??0) >= needed)) return false
  }

  return true
}

// Can we remove a level (would it break dependents)?
function canRemove(key: string, newLevel: number, levels: Levels): boolean {
  for (const [otherKey, tech] of Object.entries(TECH_MAP)) {
    const otherLv = levels[otherKey] ?? 0
    if (otherLv === 0) continue

    // Check JSON requirements
    for (const req of tech.requirements) {
      if (req.level > otherLv) continue
      const needed = req.techLevel ?? 0
      if (req.tech === key && newLevel < needed) return false
      if (req.anyOf?.includes(key) && newLevel < needed) {
        if (!req.anyOf.some(k => k !== key && (levels[k]??0) >= needed)) return false
      }
      if (req.allOf?.includes(key) && newLevel < needed) return false
    }
    // Check explicit prereq rules
    const rule = PREREQ_TECHS[otherKey]
    if (rule && otherLv >= 1) {
      if ('allOf' in rule && rule.allOf.includes(key) && newLevel < 1) return false
      if ('anyOf' in rule && rule.anyOf.includes(key) && newLevel < 1) {
        if (!rule.anyOf.some(k => k !== key && (levels[k]??0) >= 1)) return false
      }
    }
    // Check line prereqs
    const linePre = LINE_PREREQS[otherKey]
    if (linePre?.includes(key) && otherLv >= 1 && newLevel < 1) {
      if (!linePre.some(k => k !== key && (levels[k]??0) >= 1)) return false
    }
  }
  return true
}

function findMaxLevel(key: string, levels: Levels, rc: number): number {
  const tech = TECH_MAP[key]; if (!tech) return 0
  let lv = levels[key] ?? 0
  while (lv < tech.maxLevel && canUpgradeTo(key, lv + 1, levels, rc)) lv++
  return lv
}

/* ------------------------------------------------------------------ */
/*  Cost helpers (exact from techCosts.ts)                             */
/* ------------------------------------------------------------------ */

function parseTime(s: string): number {
  let t = 0
  const d=s.match(/(\d+)d/); if(d) t+=+d[1]*86400
  const h=s.match(/(\d+)h/); if(h) t+=+h[1]*3600
  const m=s.match(/(\d+)m/); if(m) t+=+m[1]*60
  const sc=s.match(/(\d+)s/); if(sc) t+=+sc[1]
  return t
}

function applyHelps(secs: number, helps: number): number {
  let t = Math.max(3, Math.ceil(secs))
  for (let i=0; i<Math.min(helps,30); i++) {
    if (t<=0) break
    t = Math.max(0, t - Math.max(180, t*0.01))
  }
  return Math.floor(t)
}

function fmtTime(secs: number): string {
  if (secs <= 0) return '0 Days'
  const d=Math.floor(secs/86400), h=Math.floor((secs%86400)/3600), m=Math.floor((secs%3600)/60)
  const parts: string[] = []
  if (d) parts.push(`${d}d`); if (h) parts.push(`${h}h`); if (m) parts.push(`${m}m`)
  return parts.length ? parts.join(' ') : '<1m'
}

function fmtNum(n: number): string {
  if (n>=1e6) return (n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M'
  if (n>=1e3) return (n/1e3).toFixed(0)+'k'
  return n.toLocaleString()
}

/* ------------------------------------------------------------------ */
/*  Icon map                                                            */
/* ------------------------------------------------------------------ */

const ICON_NAME_OVERRIDE: Record<string,string> = {
  expandedFormationsI:  'Expanded Formation I',
  expandedFormationsII: 'Expanded Formation II',
}

function iconSrc(key: string): string {
  const tech = TECH_MAP[key]
  if (!tech) return ''
  const name = ICON_NAME_OVERRIDE[key] ?? tech.name
  return `/images/crystal/tech_icons/${encodeURIComponent(name)}.webp`
}

/* ------------------------------------------------------------------ */
/*  SVG helpers                                                         */
/* ------------------------------------------------------------------ */

function bezier(fromSlot: string, toSlot: string): string {
  const a = SLOT_POS[fromSlot], b = SLOT_POS[toSlot]
  if (!a||!b) return ''
  const x1=a.x+NW, y1=a.y+NH/2, x2=b.x, y2=b.y+NH/2
  const mx=(x1+x2)/2
  return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`
}

/* ------------------------------------------------------------------ */
/*  Tech node component                                                 */
/* ------------------------------------------------------------------ */

const CAT_COLOR: Record<string,string> = {
  infantry:'#E63946', archer:'#2A9D8F', cavalry:'#E9C46A', siege:'#9B59B6', utility:'#3498DB',
}

function TechNode({ techKey, levels, rc, onSet }: {
  techKey: string
  levels: Levels
  rc: number
  onSet: (key: string, lv: number) => void
}) {
  const tech  = TECH_MAP[techKey]
  const pos   = SLOT_POS[TECH_SLOT[techKey]]
  if (!tech || !pos) return null

  const cur    = levels[techKey] ?? 0
  const maxed  = cur === tech.maxLevel
  const locked = cur === 0 && !canUpgradeTo(techKey, 1, levels, rc)
  const canAdd = !maxed && canUpgradeTo(techKey, cur+1, levels, rc)
  const pct    = (cur / tech.maxLevel) * 100
  const accent = CAT_COLOR[tech.category] ?? '#3498DB'

  // Drag to scrub level
  const dragRef = useRef<{startX:number; startLv:number} | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { e.preventDefault(); return }
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startLv: cur }
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = Math.round((ev.clientX - dragRef.current.startX) / 18)
      const desired = Math.max(0, Math.min(tech.maxLevel, dragRef.current.startLv + delta))
      // Find highest level we can actually reach
      let lv = dragRef.current.startLv
      if (desired > lv) {
        while (lv < desired && canUpgradeTo(techKey, lv+1, levels, rc)) lv++
      } else {
        while (lv > desired && canRemove(techKey, lv-1, levels)) lv--
      }
      if (lv !== cur) onSet(techKey, lv)
    }
    const up = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleMax = (e: React.MouseEvent) => {
    e.stopPropagation()
    const max = findMaxLevel(techKey, levels, rc)
    if (max > cur) onSet(techKey, max)
  }

  return (
    <div
      style={{
        position:'absolute', left:pos.x, top:pos.y, width:NW, height:NH,
        cursor: locked ? 'not-allowed' : 'ew-resize',
        userSelect:'none',
        opacity: locked ? 0.35 : 1,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={e => { e.preventDefault(); if (!locked && cur>0 && canRemove(techKey,cur-1,levels)) onSet(techKey,cur-1) }}
    >
      {/* Card */}
      <div style={{
        width:'100%', height:'100%', borderRadius:8, overflow:'hidden',
        background: maxed
          ? 'linear-gradient(135deg,#0c3040 0%,#082030 100%)'
          : 'linear-gradient(135deg,#162d45 0%,#0e2035 100%)',
        border:`1.5px solid ${maxed ? 'rgba(0,229,255,0.7)' : locked ? 'rgba(255,255,255,0.06)' : 'rgba(80,160,255,0.25)'}`,
        boxShadow: maxed ? '0 0 10px rgba(0,229,255,0.25)' : undefined,
        display:'flex', flexDirection:'column',
      }}>
        {/* Body row */}
        <div style={{ display:'flex', alignItems:'center', flex:1, overflow:'hidden', padding:'4px 6px 2px 4px', gap:6 }}>
          {/* Icon */}
          <div style={{
            width:38, height:38, flexShrink:0, borderRadius:6,
            background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconSrc(techKey)}
              alt=""
              width={32} height={32}
              style={{ objectFit:'contain', display:'block' }}
              draggable={false}
            />
          </div>

          {/* Text */}
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ color:'#c8e4ff', fontSize:10, fontWeight:600, lineHeight:1.2, marginBottom:1,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {tech.name}
            </p>
            {cur > 0 && (
              <p style={{ color:accent, fontSize:9, opacity:0.85, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {tech.levels[cur-1]?.buff}
              </p>
            )}
          </div>

          {/* Max button */}
          {!maxed && !locked && (
            <button
              onClick={handleMax}
              style={{
                background:'rgba(0,180,255,0.18)', border:'1px solid rgba(0,180,255,0.35)',
                borderRadius:4, color:'#7dd3fc', fontSize:9, fontWeight:700,
                padding:'2px 5px', cursor:'pointer', flexShrink:0, lineHeight:1,
              }}
              title="Max out this tech"
            >
              MAX
            </button>
          )}
          {maxed && (
            <span style={{ color:'#00e5ff', fontSize:9, fontWeight:700, flexShrink:0 }}>MAX</span>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ padding:'0 4px 4px' }}>
          {/* Progress bar */}
          <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:3, height:4, overflow:'hidden', marginBottom:2 }}>
            <div style={{
              width:`${pct}%`, height:'100%', borderRadius:3,
              background: maxed ? '#00e5ff' : accent,
              transition:'width 0.15s',
            }} />
          </div>
          {/* Level + accent strip row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ height:2, width:`${(cur/tech.maxLevel)*100}%`, background:accent, borderRadius:1, opacity:0.4 }} />
            <p style={{ color:'rgba(180,210,255,0.45)', fontSize:8.5, tabularNums:true } as React.CSSProperties}>
              {cur}/{tech.maxLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Left accent */}
      <div style={{
        position:'absolute', left:0, top:0, bottom:0, width:3,
        background:accent, borderRadius:'8px 0 0 8px',
      }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export function CrystalTechContent() {
  const [levels, setLevels] = useState<Levels>({})
  const [rc, setRc]         = useState(25)
  const [speed, setSpeed]   = useState(0)
  const [helps, setHelps]   = useState(30)
  const [confirmClear, setConfirmClear] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  const handleSet = useCallback((key: string, lv: number) => {
    setLevels(prev => ({ ...prev, [key]: lv }))
  }, [])

  // Horizontal drag-to-scroll on canvas (but not on nodes)
  const scrollDrag = useRef<{x:number; sl:number}|null>(null)

  const totals = useMemo(() => {
    const rcRed = rcReduction(rc)
    const cc1 = Math.min(levels['cuttingCornersI']??0, 5)
    const cc2 = Math.min(levels['cuttingCornersII']??0, 10)
    const costRed = Math.min(rcRed + cc1 + cc2, 50)
    let crystals=0, raw=0, coins=0, secs=0
    for (const [key, lv] of Object.entries(levels)) {
      if (!lv||lv<=0) continue
      const tech = TECH_MAP[key]; if (!tech) continue
      for (let i=0; i<lv; i++) {
        const ld = tech.levels[i]; if (!ld) continue
        raw += ld.crystals
        crystals += Math.round(ld.crystals * (1 - costRed/100))
        coins += ld.seasonCoins
        const base = parseTime(ld.time)
        const spd = speed>0 ? base/(1+speed/100) : base
        secs += applyHelps(spd, helps)
      }
    }
    return { crystals, raw, savings:raw-crystals, coins, secs, costRed:costRed.toFixed(1) }
  }, [levels, rc, speed, helps])

  const svgPaths = useMemo(() => {
    const out: {d:string; dashed:boolean}[] = []
    for (const [a,b] of DIRECT) { const d=bezier(a,b); if(d) out.push({d, dashed:false}) }
    for (const pt of PASS_THROUGHS) {
      for (const to of pt.toSlots) { const d=bezier(pt.fromSlot,to); if(d) out.push({d, dashed:true}) }
    }
    return out
  }, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Settings */}
      <div style={{
        background:'linear-gradient(to right,#0a1929,#0f2030)',
        border:'1px solid rgba(100,200,255,0.15)',
        borderRadius:12, padding:'12px 16px',
        display:'flex', flexWrap:'wrap', gap:16, alignItems:'flex-end',
      }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:10, fontWeight:700, color:'rgba(100,200,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Research Centre
          </label>
          <select value={rc} onChange={e=>setRc(+e.target.value)}
            style={{ background:'#0a1929', border:'1px solid rgba(100,200,255,0.2)', borderRadius:8, color:'#c8e4ff',
              padding:'6px 10px', fontSize:12, outline:'none' }}>
            {Array.from({length:25},(_,i)=>i+1).map(n=>(
              <option key={n} value={n}>Level {n} ({rcReduction(n).toFixed(1)}% off)</option>
            ))}
          </select>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:10, fontWeight:700, color:'rgba(100,200,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Research Speed %
          </label>
          <input type="number" min={0} max={500} value={speed}
            onChange={e=>setSpeed(Math.max(0,+e.target.value||0))}
            style={{ background:'#0a1929', border:'1px solid rgba(100,200,255,0.2)', borderRadius:8, color:'#c8e4ff',
              padding:'6px 10px', fontSize:12, width:100, outline:'none' }} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:10, fontWeight:700, color:'rgba(100,200,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Helps per Research
          </label>
          <input type="number" min={0} max={30} value={helps}
            onChange={e=>setHelps(Math.max(0,Math.min(30,+e.target.value||0)))}
            style={{ background:'#0a1929', border:'1px solid rgba(100,200,255,0.2)', borderRadius:8, color:'#c8e4ff',
              padding:'6px 10px', fontSize:12, width:90, outline:'none' }} />
        </div>

        <p style={{ fontSize:11, color:'rgba(200,220,255,0.4)', alignSelf:'center', marginLeft:4 }}>
          Drag ← → on a tech to set level · Right-click to remove · MAX button to max out
        </p>

        <div style={{ marginLeft:'auto' }}>
          {confirmClear ? (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:12, color:'rgba(200,220,255,0.5)' }}>Reset all?</span>
              <button onClick={()=>{setLevels({}); setConfirmClear(false)}}
                style={{ background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:8,
                  color:'#f87171', padding:'5px 12px', fontSize:12, cursor:'pointer' }}>Yes</button>
              <button onClick={()=>setConfirmClear(false)}
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
                  color:'rgba(200,220,255,0.5)', padding:'5px 10px', fontSize:12, cursor:'pointer' }}>Cancel</button>
            </div>
          ):(
            <button onClick={()=>setConfirmClear(true)}
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
                color:'rgba(200,220,255,0.4)', padding:'6px 12px', fontSize:11, cursor:'pointer',
                display:'flex', alignItems:'center', gap:6 }}>
              <RotateCcw style={{ width:12, height:12 }} /> Reset All
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        style={{ overflowX:'auto', overflowY:'hidden', borderRadius:12, border:'1px solid rgba(100,200,255,0.15)', cursor:'grab' }}
        onMouseDown={e => {
          if ((e.target as HTMLElement).closest('[data-tech]')) return
          const el = canvasRef.current; if(!el) return
          scrollDrag.current = { x: e.pageX, sl: el.scrollLeft }
          const move = (ev: MouseEvent) => {
            if (!scrollDrag.current || !el) return
            el.scrollLeft = scrollDrag.current.sl - (ev.pageX - scrollDrag.current.x)
          }
          const up = () => { scrollDrag.current=null; document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up) }
          document.addEventListener('mousemove', move)
          document.addEventListener('mouseup', up)
        }}
      >
        <div style={{
          position:'relative', width:CANVAS_W, height:CANVAS_H,
          background:'linear-gradient(180deg,#0d1e32 0%,#091524 60%,#0d1e32 100%)',
          flexShrink:0,
        }}>
          {/* SVG connection lines */}
          <svg style={{ position:'absolute', inset:0, width:CANVAS_W, height:CANVAS_H, pointerEvents:'none', overflow:'visible' }}>
            <defs>
              <pattern id="ctgrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0L0 0 0 32" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#ctgrid)" />
            {svgPaths.map((p,i) => (
              <path key={i} d={p.d} fill="none"
                stroke={p.dashed ? 'rgba(0,200,255,0.3)' : 'rgba(80,160,255,0.4)'}
                strokeWidth={p.dashed ? 1.5 : 2}
                strokeDasharray={p.dashed ? '8 4' : undefined}
              />
            ))}
          </svg>

          {/* Tech nodes */}
          {Object.entries(ASSIGNMENTS).map(([slot, key]) => key ? (
            <div key={key} data-tech={key}>
              <TechNode techKey={key} levels={levels} rc={rc} onSet={handleSet} />
            </div>
          ) : null)}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background:'linear-gradient(to right,#0a1929,#0f2030)',
        border:'1px solid rgba(100,200,255,0.15)', borderRadius:12, overflow:'hidden',
      }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0 }}>
          {[
            { icon:'/images/crystal/research_speedup.webp', label:'Total Speedups', value:fmtTime(totals.secs), color:'#7dd3fc' },
            { icon:'/images/crystal/season_coin.webp',      label:'Season Coins',   value:fmtNum(totals.coins), color:'#fbbf24' },
            { icon:'/images/crystal/crystal.webp',          label:'Total Crystals', value:fmtNum(totals.crystals), color:'#00e5ff',
              sub: totals.savings>0 ? `−${fmtNum(totals.savings)} saved (${totals.costRed}% off)` : undefined },
          ].map((item, i) => (
            <div key={i} style={{ padding:'14px 20px', textAlign:'center', borderRight: i<2 ? '1px solid rgba(100,200,255,0.1)' : undefined }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.icon} alt="" width={18} height={18} style={{ objectFit:'contain' }} />
                <p style={{ fontSize:10, fontWeight:700, color:'rgba(100,200,255,0.55)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                  {item.label}
                </p>
              </div>
              <p style={{ fontSize:22, fontWeight:700, color:item.color, fontVariantNumeric:'tabular-nums' }}>
                {item.value}
              </p>
              {item.sub && <p style={{ fontSize:10, color:'#34d399', marginTop:2 }}>{item.sub}</p>}
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid rgba(100,200,255,0.08)', padding:'8px 24px',
          display:'flex', gap:32, justifyContent:'center' }}>
          {[
            { label:'Cost Reduction', value:`${totals.costRed}%` },
            { label:'RC Discount',    value:`${rcReduction(rc).toFixed(1)}%` },
            { label:'CC Discount',    value:`${Math.min((levels['cuttingCornersI']??0)+(levels['cuttingCornersII']??0),15)}%` },
            { label:'Raw Crystals',   value:fmtNum(totals.raw) },
          ].map(item => (
            <div key={item.label} style={{ textAlign:'center' }}>
              <p style={{ fontSize:9, color:'rgba(200,220,255,0.35)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{item.label}</p>
              <p style={{ fontSize:12, fontWeight:600, color:'rgba(200,220,255,0.6)' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
