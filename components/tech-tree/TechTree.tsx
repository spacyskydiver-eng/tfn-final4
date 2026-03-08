'use client'

import Image from 'next/image'
import clsx from 'clsx'
import type { TechNode } from '@/lib/tech-tree/types'

/* ---------- layout tuning ---------- */
const NODE_WIDTH = 360
const NODE_HEIGHT = 150

const OFFSET_X = 40
const OFFSET_Y = 60
const SCALE = 0.65

const PAD_RIGHT = 160
const PAD_BOTTOM = 180

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

function pctToLevel(clientX: number, rect: DOMRect, maxLevel: number) {
  const pct = clamp((clientX - rect.left) / rect.width, 0, 1)
  return Math.round(pct * maxLevel)
}

type TechTreeProps = {
  title: string
  nodes: TechNode[]
  current: Record<string, number>
  editingCurrent: boolean
  onCurrentChange: (next: Record<string, number>) => void
  goals: Record<string, number>
  onGoalsChange: (next: Record<string, number>) => void
  onNodeShiftClick?: (id: string, current: number, goal: number) => void
}

export default function TechTree({
  title,
  nodes,
  current,
  onCurrentChange,
  editingCurrent,
  goals,
  onGoalsChange,
  onNodeShiftClick,
}: TechTreeProps) {

  /* ---------- actions ---------- */
  const maxAll = () => {
    const next: Record<string, number> = {}
    nodes.forEach(n => (next[n.id] = n.maxLevel))
    if (editingCurrent) onCurrentChange(next)
    onGoalsChange(next)
  }

  const resetAll = () => {
    const next: Record<string, number> = {}
    nodes.forEach(n => (next[n.id] = current[n.id] ?? n.level))
    if (editingCurrent) onCurrentChange(next)
    onGoalsChange(next)
  }

  /* ---------- canvas bounds ---------- */
  const maxX = Math.max(...nodes.map(n => n.x + NODE_WIDTH), 0)
  const maxY = Math.max(...nodes.map(n => n.y + NODE_HEIGHT), 0)

  const canvasWidth = (OFFSET_X + maxX + PAD_RIGHT) * SCALE
  const canvasHeight = (OFFSET_Y + maxY + PAD_BOTTOM) * SCALE

  const parentAnchorX = (x: number) => x + NODE_WIDTH
  const anchorY = (y: number) => y + NODE_HEIGHT / 2

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#0b4e87] to-[#08345d] p-4 shadow-2xl">

      {title && (
        <div className="mb-4 text-white text-xl font-bold">
          {title}
        </div>
      )}

      {/* controls */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-white/70">
          Shift-click a node to view upgrade cost.
        </p>

        <div className="flex gap-2">
          <button
            onClick={maxAll}
            className="px-3 py-1 rounded-lg bg-yellow-300/20 text-yellow-100 text-xs font-semibold border border-yellow-300/30 hover:bg-yellow-300/30 transition-colors"
          >
            Max All
          </button>

          <button
            onClick={resetAll}
            className="px-3 py-1 rounded-lg bg-red-500/20 text-red-100 text-xs font-semibold border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* scroll viewport */}
      <div className="relative w-full h-[520px] overflow-x-auto overflow-y-hidden">
        <div
  className="relative"
  style={{
    width: '100%',
    height: canvasHeight,
  }}
>
<div
  className="absolute top-0 left-0 origin-top-left"
  style={{
    width: maxX + PAD_RIGHT,
    height: maxY + PAD_BOTTOM,
    transform: `scale(${SCALE}) translate(${OFFSET_X}px, ${OFFSET_Y}px)`,
  }}
>


            {/* ---------- CONNECTION LINES ---------- */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width={maxX + PAD_RIGHT + 300}
              height={maxY + PAD_BOTTOM + 300}
            >
              {nodes.map(node =>
                (node.parents ?? []).map(pid => {
                  if (!pid) return null
                  const parent = nodes.find(n => n.id === pid)
                  if (!parent) return null

                  const x1 = parentAnchorX(parent.x)
                  const y1 = anchorY(parent.y)
                  const x2 = node.x
                  const y2 = anchorY(node.y)

                  // Check if this path is from medical_corps to elite units
                  const isMedicalCorpsToElite = parent.id === 'medical_corps' && 
                    ['royal_guard', 'royal_crossbowman', 'elite_teutonic_knight', 'trebuchet'].includes(node.id)

                  if (isMedicalCorpsToElite) {
                    // Calculate junction point between combined_arms/encampment and elite units
                    const junctionX = x1 + 500 // Further out past the middle nodes
                    
                    // Calculate vertical center of all 4 elite units
                    const eliteUnits = nodes.filter(n => 
                      ['royal_guard', 'royal_crossbowman', 'elite_teutonic_knight', 'trebuchet'].includes(n.id)
                    )
                    const minY = Math.min(...eliteUnits.map(n => anchorY(n.y)))
                    const maxY = Math.max(...eliteUnits.map(n => anchorY(n.y)))
                    const junctionY = (minY + maxY) / 2

                    // Main trunk only drawn once from medical_corps (when first elite unit is processed)
                    if (node.id === 'royal_guard') {
                      return (
                        <g key={`${pid}-${node.id}-group`}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={junctionX}
                            y2={junctionY}
                            stroke="#2c7ec7"
                            strokeWidth={3}
                            strokeDasharray="8 6"
                          />
                          <line
                            x1={junctionX}
                            y1={junctionY}
                            x2={x2}
                            y2={y2}
                            stroke="#2c7ec7"
                            strokeWidth={3}
                            strokeDasharray="8 6"
                          />
                        </g>
                      )
                    }
                    
                    // Branch lines from junction to each elite unit (for the other 3)
                    return (
                      <line
                        key={`${pid}-${node.id}`}
                        x1={junctionX}
                        y1={junctionY}
                        x2={x2}
                        y2={y2}
                        stroke="#2c7ec7"
                        strokeWidth={3}
                        strokeDasharray="8 6"
                      />
                    )
                  }

                  return (
                    <line
                      key={`${pid}-${node.id}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#2c7ec7"
                      strokeWidth={3}
                      strokeDasharray="8 6"
                    />
                  )
                })
              )}
            </svg>

            {/* ---------- NODES ---------- */}
            {nodes.map(node => {
              const currentLevel = current[node.id] ?? node.level
              const rawGoal = goals[node.id] ?? currentLevel
              const goalLevel = Math.max(rawGoal, currentLevel)

              const curPct = currentLevel / node.maxLevel
              const goalPct = goalLevel / node.maxLevel
              const knobPct = editingCurrent ? curPct : goalPct

              // Check if tech meets all requirements (check both current AND goal levels)
              const canUpgrade = !node.requirements || Object.entries(node.requirements).every(
                ([reqId, reqLevel]) => {
                  const reqCurrent = current[reqId] ?? 0
                  const reqGoal = goals[reqId] ?? reqCurrent
                  return Math.max(reqCurrent, reqGoal) >= reqLevel
                }
              )

              const setFromClientX = (clientX: number, el: HTMLDivElement) => {
                if (!canUpgrade) return
                
                const lvl = pctToLevel(clientX, el.getBoundingClientRect(), node.maxLevel)

                if (editingCurrent) {
                  onCurrentChange({ ...current, [node.id]: lvl })
                  if ((goals[node.id] ?? lvl) < lvl)
                    onGoalsChange({ ...goals, [node.id]: lvl })
                } else {
                  const safeGoal = Math.max(currentLevel, lvl)
                  onGoalsChange({ ...goals, [node.id]: safeGoal })
                }
              }

              return (
                <div
                  key={node.id}
                  className={`absolute select-none w-[360px] h-[150px] rounded-xl border transition-all duration-200 ${
                    canUpgrade
                      ? 'bg-[#1b6fa8] border-white/20 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(0,200,255,0.6)] shadow-[0_0_30px_rgba(0,160,255,0.25)] cursor-pointer'
                      : 'bg-[#1b6fa8]/50 border-red-500/50 opacity-60 cursor-not-allowed'
                  }`}
                  style={{ left: node.x, top: node.y }}
                  onClick={e => {
                    if (e.shiftKey && onNodeShiftClick) {
                      onNodeShiftClick(node.id, currentLevel, goalLevel)
                    }
                  }}
                >
                  {/* ICON */}
                  <div className="absolute -left-8 top-4 w-[110px] h-[110px] rounded-xl bg-gradient-to-br from-[#ffe28a] via-[#d6a93b] to-[#9c6b12] flex items-center justify-center">
                    <div className="w-[100px] h-[100px] rounded-lg bg-[#0e4f7c] flex items-center justify-center overflow-hidden">
                      <Image
                        src={node.icon || '/placeholder.svg'}
                        alt={node.name}
                        width={90}
                        height={90}
                      />
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="pl-24 pr-5 py-3 text-white h-full flex flex-col justify-between">
                    <div>
                      <div className="text-3xl font-extrabold">{node.name}</div>

                      <div className="text-2xl text-white/80 mb-2 font-bold">
                        {currentLevel} / {node.maxLevel}
                        {!editingCurrent && goalLevel > currentLevel && (
                          <div className="text-sm text-white/60">
                            Goal: {goalLevel}
                          </div>
                        )}
                        {!canUpgrade && (
                          <div className="text-sm text-red-300 mt-1">
                            Requirements not met
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ---------- LEVEL BAR ---------- */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`relative h-5 w-64 rounded-full transition-colors ${
                          canUpgrade ? 'bg-[#0b3556] cursor-grab active:cursor-grabbing' : 'bg-[#0b3556]/50 cursor-not-allowed'
                        }`}
                        onPointerDown={e => {
                          if (!canUpgrade) return
                          e.preventDefault()
                          const handleMove = (moveEvent: PointerEvent) => {
                            setFromClientX(moveEvent.clientX, e.currentTarget as HTMLDivElement)
                          }
                          const handleUp = () => {
                            document.removeEventListener('pointermove', handleMove)
                            document.removeEventListener('pointerup', handleUp)
                          }
                          document.addEventListener('pointermove', handleMove)
                          document.addEventListener('pointerup', handleUp)
                          setFromClientX(e.clientX, e.currentTarget as HTMLDivElement)
                        }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-sky-400/30 rounded-full transition-all"
                          style={{ width: `${curPct * 100}%` }}
                        />

                        {!editingCurrent && (
                          <div
                            className="absolute inset-y-0 left-0 bg-sky-400 rounded-full transition-all"
                            style={{ width: `${goalPct * 100}%` }}
                          />
                        )}

                        {editingCurrent && (
                          <div
                            className="absolute inset-y-0 left-0 bg-sky-400 rounded-full transition-all"
                            style={{ width: `${curPct * 100}%` }}
                          />
                        )}

                        {/* knob */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ left: `calc(${knobPct * 100}% - 8px)` }}
                        >
                          <div
                            className={clsx(
                              'w-4 h-4 rounded-full border-2 border-white shadow',
                              editingCurrent
                                ? 'bg-amber-400'
                                : 'bg-sky-400'
                            )}
                          />
                        </div>
                      </div>

                      {/* MAX button */}
                      <button
                        onClick={e => {
                          if (!canUpgrade) return
                          e.preventDefault()
                          e.stopPropagation()

                          const next = {
                            ...goals,
                            [node.id]: node.maxLevel,
                          }

                          onGoalsChange(next)

                          if (editingCurrent) {
                            onCurrentChange({
                              ...current,
                              [node.id]: node.maxLevel,
                            })
                          }
                        }}
                        disabled={!canUpgrade}
                        className={`px-3 py-1 text-sm font-bold rounded transition-colors ${
                          canUpgrade
                            ? 'bg-amber-400 text-black hover:bg-amber-300'
                            : 'bg-amber-400/30 text-black/50 cursor-not-allowed'
                        }`}
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
