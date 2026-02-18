'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { TalentTree, TalentNode } from '@/lib/game/talents'
import type { CommanderTalentConfig } from '@/lib/engine/useCommanderPlanner'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Minus, Plus, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_TALENT_POINTS = 74

/** Base path for talent node icons copied from rok-talents public/images/talents. */
export const TALENT_ICON_BASE = '/images/talents'

type TalentTreeGraphProps = {
  tree: TalentTree
  config: CommanderTalentConfig
  onConfigChange: (config: CommanderTalentConfig) => void
  maxPoints?: number
  color?: 'red' | 'yellow' | 'blue'
}

function getTotalPointsSpent(config: CommanderTalentConfig): number {
  return Object.values(config.nodes).reduce((sum, level) => sum + level, 0)
}

/** Prerequisites met: all prerequisite nodes have at least 1 level. */
function canUnlockNode(node: TalentNode, config: CommanderTalentConfig): boolean {
  if (node.prerequisites.length === 0) return true
  return node.prerequisites.every((prereqId) => (config.nodes[prereqId] ?? 0) > 0)
}

/** Dependents = nodes that list this node as prerequisite (downstream). */
function getDependents(tree: TalentTree, nodeId: string): string[] {
  return tree.nodes.filter((n) => n.prerequisites.includes(nodeId)).map((n) => n.id)
}

/** Collect all ancestor talents along the prerequisite chain (recursive). */
function collectPrereqAncestors(
  tree: TalentTree,
  node: TalentNode,
  acc: Set<string>
): void {
  for (const prereqId of node.prerequisites) {
    if (acc.has(prereqId)) continue
    acc.add(prereqId)
    const prereqNode = tree.nodes.find((n) => n.id === prereqId)
    if (prereqNode) collectPrereqAncestors(tree, prereqNode, acc)
  }
}

/** Prerequisite talents along the path that are not yet maxed (for incomplete-talent toast). */
function getIncompleteMaxPrereqs(
  tree: TalentTree,
  node: TalentNode,
  config: CommanderTalentConfig
): TalentNode[] {
  const ids = new Set<string>()
  collectPrereqAncestors(tree, node, ids)
  if (ids.size === 0) return []
  const prereqNodes = tree.nodes.filter((n) => ids.has(n.id))
  return prereqNodes.filter((p) => (config.nodes[p.id] ?? 0) < p.maxLevel)
}

/** Auto-path plan step for upgrading along a dependency chain. */
type AutoPathStep = {
  nodeId: string
  levelsNeeded: number
}

/** Find all prerequisite upgrades needed to reach target (including one level in target). */
function findPathToNode(
  tree: TalentTree,
  config: CommanderTalentConfig,
  targetNodeId: string
): { steps: AutoPathStep[]; nodeIds: string[] } | null {
  const target = tree.nodes.find((n) => n.id === targetNodeId)
  if (!target) return null

  // If already directly reachable (prereqs met) just open tooltip, no auto path.
  if (canUnlockNode(target, config)) return null

  // Collect all ancestors in the prerequisite chain.
  const prereqIds = new Set<string>()
  collectPrereqAncestors(tree, target, prereqIds)

  const steps: AutoPathStep[] = []
  const allNodeIds: string[] = []

  // First, ensure all prerequisite talents are maxed.
  for (const id of prereqIds) {
    const node = tree.nodes.find((n) => n.id === id)
    if (!node) continue
    const current = config.nodes[id] ?? 0
    if (current >= node.maxLevel) continue
    steps.push({ nodeId: id, levelsNeeded: node.maxLevel - current })
    allNodeIds.push(id)
  }

  // Then include one level in the target talent itself (0 -> 1) if needed.
  const currentTargetLevel = config.nodes[targetNodeId] ?? 0
  if (currentTargetLevel < 1 && target.maxLevel > 0) {
    steps.push({ nodeId: targetNodeId, levelsNeeded: 1 - currentTargetLevel })
    allNodeIds.push(targetNodeId)
  }

  if (steps.length === 0) return null
  return { steps, nodeIds: Array.from(new Set(allNodeIds)) }
}

/** Can add a level: prerequisites met, not maxed, points remaining. */
function canLevelUp(
  node: TalentNode,
  config: CommanderTalentConfig,
  pointsRemaining: number
): boolean {
  const level = config.nodes[node.id] ?? 0
  if (level >= node.maxLevel) return false
  if (pointsRemaining <= 0 && level === 0) return false
  return canUnlockNode(node, config)
}

/** Can remove a level: has points and no dependent has points (prevent illegal state). */
function canLevelDown(tree: TalentTree, node: TalentNode, config: CommanderTalentConfig): boolean {
  const level = config.nodes[node.id] ?? 0
  if (level <= 0) return false
  const dependents = getDependents(tree, node.id)
  return dependents.every((depId) => (config.nodes[depId] ?? 0) === 0)
}

/** Reason node cannot be leveled up (for tooltip). */
function getLevelUpBlockReason(
  node: TalentNode,
  config: CommanderTalentConfig,
  pointsRemaining: number
): string | null {
  const level = config.nodes[node.id] ?? 0
  if (level >= node.maxLevel) return 'Already maxed.'
  if (level === 0 && !canUnlockNode(node, config)) {
    const missing = node.prerequisites.filter((prereqId) => (config.nodes[prereqId] ?? 0) === 0)
    if (missing.length > 0) return `Requires points in prerequisite talent(s) first.`
    return 'Prerequisites not met.'
  }
  if (pointsRemaining <= 0) return 'No talent points remaining.'
  return null
}

/** Reason node cannot be leveled down. */
function getLevelDownBlockReason(tree: TalentTree, node: TalentNode, config: CommanderTalentConfig): string | null {
  const level = config.nodes[node.id] ?? 0
  if (level <= 0) return null
  const dependents = getDependents(tree, node.id)
  const withPoints = dependents.filter((depId) => (config.nodes[depId] ?? 0) > 0)
  if (withPoints.length > 0) return 'Remove points from later talents in this path first.'
  return null
}

function getNodeState(
  node: TalentNode,
  config: CommanderTalentConfig
): 'locked' | 'available' | 'partial' | 'maxed' {
  const level = config.nodes[node.id] ?? 0
  if (!canUnlockNode(node, config)) return 'locked'
  if (level === 0) return 'available'
  if (level >= node.maxLevel) return 'maxed'
  return 'partial'
}

/** Format description template with value at given level (0-based index). */
function formatDescription(template: string | undefined, levelIndex: number, values: number[]): string {
  if (!template) return ''
  const value = values[levelIndex] ?? values[values.length - 1] ?? values[0] ?? 0
  return template.replace(/\$\{1\}/g, String(value))
}

export function TalentTreeGraph({
  tree,
  config,
  onConfigChange,
  maxPoints = MAX_TALENT_POINTS,
  color = 'blue',
}: TalentTreeGraphProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)
  const [pulseNodeId, setPulseNodeId] = useState<string | null>(null)
  const [highlightNodeIds, setHighlightNodeIds] = useState<string[]>([])
  const [incompleteToast, setIncompleteToast] = useState<{ names: string[] } | null>(null)
  const [autoPathPlan, setAutoPathPlan] = useState<{ steps: AutoPathStep[]; totalPoints: number } | null>(
    null
  )
  const [isApplyingAutoPath, setIsApplyingAutoPath] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const filterIdRef = useRef(`talent-glow-${Math.random().toString(36).slice(2, 9)}`)

  const totalPointsSpent = useMemo(() => getTotalPointsSpent(config), [config])
  const pointsRemaining = maxPoints - totalPointsSpent

  const bounds = useMemo(() => {
    if (tree.nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100, centerX: 50, centerY: 50 }
    }
    const xs = tree.nodes.map((n) => n.x)
    const ys = tree.nodes.map((n) => n.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    // Smaller padding so the tree appears larger and closer together
    const padding = Math.max((maxX - minX) * 0.06, (maxY - minY) * 0.06, 4)
    const width = maxX - minX + padding * 2
    const height = maxY - minY + padding * 2
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width,
      height,
      centerX,
      centerY,
    }
  }, [tree.nodes])

  const theme = useMemo(() => {
    const byColor = {
      red: { edgeHex: '#fb7185', glowHex: 'rgba(251,113,133,0.65)' }, // rose-400-ish
      yellow: { edgeHex: '#facc15', glowHex: 'rgba(250,204,21,0.65)' }, // amber-400-ish
      blue: { edgeHex: '#60a5fa', glowHex: 'rgba(96,165,250,0.65)' }, // blue-400-ish
    } as const
    return byColor[color]
  }, [color])

  // Active edges = all prerequisite edges leading to any node with level > 0.
  const activeEdgeKeys = useMemo(() => {
    const byId: Record<string, TalentNode> = {}
    for (const n of tree.nodes) byId[n.id] = n

    const keys = new Set<string>()
    const seen = new Set<string>()

    const dfs = (id: string) => {
      const node = byId[id]
      if (!node) return
      for (const prereqId of node.prerequisites) {
        keys.add(`${prereqId}-${id}`)
        if (!seen.has(prereqId)) {
          seen.add(prereqId)
          dfs(prereqId)
        }
      }
    }

    for (const [id, lvl] of Object.entries(config.nodes)) {
      if (Number(lvl) > 0) {
        if (!seen.has(id)) {
          seen.add(id)
          dfs(id)
        }
      }
    }
    return keys
  }, [tree.nodes, config.nodes])

  const previewNodeIds = useMemo(() => new Set(highlightNodeIds), [highlightNodeIds])

  const colorClasses = useMemo(() => {
    const themes = {
      red: {
        unlocked: 'fill-red-500 stroke-red-600',
        locked: 'fill-gray-600 stroke-gray-700',
        partial: 'fill-red-400 stroke-red-500',
        maxed: 'fill-red-600 stroke-red-700',
        edge: 'stroke-red-400',
        glow: 'drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]',
      },
      yellow: {
        unlocked: 'fill-yellow-500 stroke-yellow-600',
        locked: 'fill-gray-600 stroke-gray-700',
        partial: 'fill-yellow-400 stroke-yellow-500',
        maxed: 'fill-yellow-600 stroke-yellow-700',
        edge: 'stroke-yellow-400',
        glow: 'drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]',
      },
      blue: {
        unlocked: 'fill-blue-500 stroke-blue-600',
        locked: 'fill-gray-600 stroke-gray-700',
        partial: 'fill-blue-400 stroke-blue-500',
        maxed: 'fill-blue-600 stroke-blue-700',
        edge: 'stroke-blue-400',
        glow: 'drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]',
      },
    }
    return themes[color]
  }, [color])

  const levelUp = useCallback(
    (node: TalentNode) => {
      // If some prerequisite talents are not maxed yet, show toast + highlight and block.
      const incomplete = getIncompleteMaxPrereqs(tree, node, config)
      if (incomplete.length > 0) {
        setIncompleteToast({ names: incomplete.map((n) => n.name) })
        setHighlightNodeIds(incomplete.map((n) => n.id))
        setTimeout(() => {
          setIncompleteToast(null)
          setHighlightNodeIds([])
        }, 4000)
        return
      }
      if (!canLevelUp(node, config, pointsRemaining)) return
      const currentLevel = config.nodes[node.id] ?? 0
      const nextNodes = { ...config.nodes, [node.id]: currentLevel + 1 }
      onConfigChange({ ...config, nodes: nextNodes })
      setPulseNodeId(node.id)
      setTimeout(() => setPulseNodeId(null), 300)
    },
    [tree, config, onConfigChange, pointsRemaining]
  )

  const levelDown = useCallback(
    (node: TalentNode) => {
      if (!canLevelDown(tree, node, config)) return
      const currentLevel = config.nodes[node.id] ?? 0
      const nextLevel = currentLevel - 1
      const nextNodes = { ...config.nodes }
      if (nextLevel === 0) delete nextNodes[node.id]
      else nextNodes[node.id] = nextLevel
      onConfigChange({ ...config, nodes: nextNodes })
      setPulseNodeId(node.id)
      setTimeout(() => setPulseNodeId(null), 300)
    },
    [tree, config, onConfigChange]
  )

  const handleNodeClick = useCallback((node: TalentNode, event: React.MouseEvent) => {
    event.stopPropagation()
    // If node is not yet reachable but we can compute a path, enter preview/confirm flow.
    if (!canUnlockNode(node, config)) {
      const plan = findPathToNode(tree, config, node.id)
      if (!plan) {
        // No valid path, just show tooltip.
        setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
        return
      }
      const totalPointsNeeded = plan.steps.reduce((sum, step) => sum + step.levelsNeeded, 0)
      if (totalPointsNeeded > pointsRemaining) {
        // Not enough points: toast and highlight, but no plan.
        setIncompleteToast({ names: plan.nodeIds.map((id) => tree.nodes.find((n) => n.id === id)?.name ?? id) })
        setHighlightNodeIds(plan.nodeIds)
        setTimeout(() => {
          setIncompleteToast(null)
          setHighlightNodeIds([])
        }, 4000)
        return
      }
      // Preview mode: highlight full path and show confirm panel.
      setAutoPathPlan({ steps: plan.steps, totalPoints: totalPointsNeeded })
      setHighlightNodeIds(plan.nodeIds)
      setSelectedNodeId(node.id)
      return
    }

    // Normal reachable behavior: open/close tooltip.
    setAutoPathPlan(null)
    setHighlightNodeIds([])
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
  }, [tree, config, pointsRemaining])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null)
        if (isFullscreen) setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFullscreen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!selectedNodeId) return
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (containerRef.current?.contains(target)) return
      setSelectedNodeId(null)
      setAutoPathPlan(null)
      setHighlightNodeIds([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedNodeId])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (!svgRef.current) return
    setIsDragging(true)
    const rect = svgRef.current.getBoundingClientRect()
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const deltaX = (e.clientX - rect.left - dragStart.x) * (bounds.width / rect.width) / zoom
      const deltaY = (e.clientY - rect.top - dragStart.y) * (bounds.height / rect.height) / zoom
      setPan((p) => ({ x: p.x - deltaX, y: p.y - deltaY }))
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    },
    [isDragging, dragStart, bounds, zoom]
  )

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.2, 3)), [])
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.2, 0.5)), [])
  const handleResetView = useCallback(() => {
    setZoom(1)
    setPan({ x: bounds.centerX, y: bounds.centerY })
  }, [bounds])

  useEffect(() => {
    setPan({ x: bounds.centerX, y: bounds.centerY })
  }, [bounds.centerX, bounds.centerY])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !svgRef.current) return
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = svgRef.current!.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const svgMouseX = (mouseX / rect.width) * bounds.width + bounds.minX
        const svgMouseY = (mouseY / rect.height) * bounds.height + bounds.minY
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        const newZoom = Math.max(0.5, Math.min(3, zoom + delta))
        const zoomFactor = newZoom / zoom
        setPan((p) => ({
          x: svgMouseX - (svgMouseX - p.x) * zoomFactor,
          y: svgMouseY - (svgMouseY - p.y) * zoomFactor,
        }))
        setZoom(newZoom)
      }
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoom, bounds])

  const getNodeScreenPosition = useCallback(
    (node: TalentNode) => {
      if (!containerRef.current || !svgRef.current) return null
      const rect = containerRef.current.getBoundingClientRect()
      const vbCenterX = bounds.minX + bounds.width / 2
      const vbCenterY = bounds.minY + bounds.height / 2
      const vx = vbCenterX + zoom * (node.x - pan.x)
      const vy = vbCenterY + zoom * (node.y - pan.y)
      const sx = rect.left + ((vx - bounds.minX) / bounds.width) * rect.width
      const sy = rect.top + ((vy - bounds.minY) / bounds.height) * rect.height
      return { x: sx, y: sy }
    },
    [bounds, zoom, pan]
  )

  const edges = useMemo(() => {
    const byId: Record<string, TalentNode> = {}
    for (const n of tree.nodes) byId[n.id] = n

    return tree.edges.map((edge) => {
      const fromNode = byId[edge.from]
      const toNode = byId[edge.to]
      if (!fromNode || !toNode) return null

      const key = `${edge.from}-${edge.to}`
      const isPreview = previewNodeIds.has(fromNode.id) && previewNodeIds.has(toNode.id)

      // Available = the dependent node is unlockable (prereqs satisfied) even if unspent.
      const isAvailable = canUnlockNode(toNode, config)
      const isActive = activeEdgeKeys.has(key) || ((config.nodes[fromNode.id] ?? 0) > 0 && (config.nodes[toNode.id] ?? 0) > 0)

      const stroke = isPreview || isActive || isAvailable ? theme.edgeHex : '#334155' // slate-700
      const opacity = isPreview ? 1 : isActive ? 0.95 : isAvailable ? 0.55 : 0.25
      const strokeWidth = isPreview ? 2.5 : isActive ? 2 : isAvailable ? 1.5 : 1
      const glow = (isPreview || isActive) ? `drop-shadow(0 0 6px ${theme.glowHex})` : undefined

      return (
        <line
          key={key}
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          vectorEffect="non-scaling-stroke"
          style={{ filter: glow }}
        />
      )
    })
  }, [tree.edges, tree.nodes, config, activeEdgeKeys, previewNodeIds, theme])

  const selectedNode = selectedNodeId ? tree.nodes.find((n) => n.id === selectedNodeId) : null

  const nodes = useMemo(() => {
    // Slightly larger icons for better readability
    const baseLargeSize = Math.max(bounds.width, bounds.height) * 0.02
    const baseSmallSize = Math.max(bounds.width, bounds.height) * 0.014

    return tree.nodes.map((node) => {
      const level = config.nodes[node.id] ?? 0
      const state = getNodeState(node, config)
      const isLocked = state === 'locked'
      const isMaxed = state === 'maxed'
      const isPartial = state === 'partial'
      const radius = node.nodeType === 'node-large' ? baseLargeSize : baseSmallSize
      const isHover = hoverNodeId === node.id
      const isPulse = pulseNodeId === node.id
      const isHighlight = previewNodeIds.has(node.id)

      let fillClass = colorClasses.locked
      let strokeClass = colorClasses.locked
      if (isMaxed) {
        fillClass = colorClasses.maxed
        strokeClass = colorClasses.maxed
      } else if (isPartial) {
        fillClass = colorClasses.partial
        strokeClass = colorClasses.partial
      } else if (!isLocked) {
        fillClass = colorClasses.unlocked
        strokeClass = colorClasses.unlocked
      }

      const iconPath = node.icon ? `${TALENT_ICON_BASE}/${node.icon}.png` : null

      return (
        <g
          key={node.id}
          onMouseEnter={() => setHoverNodeId(node.id)}
          onMouseLeave={() => setHoverNodeId(null)}
          className="cursor-pointer"
        >
          {isMaxed && (
            <circle
              cx={node.x}
              cy={node.y}
              r={radius * 1.15}
              className={cn('opacity-40 transition-opacity', colorClasses.glow)}
            />
          )}
          {iconPath ? (
            <g
              className={cn(
                'transition-all duration-200',
                isLocked && 'opacity-50',
                isHover && !isLocked && 'opacity-90',
                isPulse && 'animate-pulse',
                isHighlight && 'opacity-100'
              )}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                className={cn(fillClass, strokeClass, 'talent-fallback-circle')}
                style={{ strokeWidth: radius * 0.15, display: 'none' }}
                onClick={(e) => handleNodeClick(node, e)}
              />
              <image
                href={iconPath}
                x={node.x - radius}
                y={node.y - radius}
                width={radius * 2}
                height={radius * 2}
                preserveAspectRatio="xMidYMid meet"
                onClick={(e) => handleNodeClick(node, e)}
                onError={(e) => {
                  const img = e.target as SVGImageElement
                  img.setAttribute('opacity', '0')
                  const fallback = img.parentElement?.querySelector('.talent-fallback-circle') as SVGCircleElement | null
                  if (fallback) fallback.style.display = ''
                }}
                style={{ pointerEvents: 'all' }}
              />
            </g>
          ) : (
            <circle
              cx={node.x}
              cy={node.y}
              r={radius}
              className={cn(
                fillClass,
                strokeClass,
                'transition-all duration-200',
                isLocked && 'opacity-50',
                isHover && !isLocked && 'opacity-90',
                isPulse && 'animate-pulse',
                isHighlight && 'opacity-100',
                isMaxed && colorClasses.glow
              )}
              style={{ strokeWidth: radius * 0.15 }}
              onClick={(e) => handleNodeClick(node, e)}
            />
          )}
          <text
            x={node.x}
            y={node.y + radius * 0.95}
            textAnchor="middle"
            dominantBaseline="hanging"
            className="pointer-events-none select-none font-semibold fill-white drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]"
            fontSize={Math.max(radius * 0.4, 3)}
          >
            {level > 0 ? `${level}/${node.maxLevel}` : ''}
          </text>
          <title>{node.name}</title>
        </g>
      )
    })
  }, [
    tree.nodes,
    config,
    colorClasses,
    handleNodeClick,
    bounds,
    zoom,
    hoverNodeId,
    pulseNodeId,
  ])

  const controls = (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="text-xs text-muted-foreground">
        Points: {totalPointsSpent}/{maxPoints} ({pointsRemaining} remaining)
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-7 w-7 p-0" title="Zoom out">
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-7 w-7 p-0" title="Zoom in">
          <ZoomIn className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Reset all talents in this tree
            onConfigChange({ ...config, nodes: {} })
            setSelectedNodeId(null)
          }}
          className="h-7 w-16 px-1 text-[10px]"
          title="Reset all talents in this tree"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="h-7 w-7 p-0"
          title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  )

  const graphArea = (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full border border-border rounded-lg overflow-hidden bg-secondary/20 transition-[height] duration-200',
        isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-[500px]'
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        className="w-full h-full transition-transform duration-150"
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id={filterIdRef.current} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g
          transform={`translate(${bounds.minX + bounds.width / 2}, ${bounds.minY + bounds.height / 2}) scale(${zoom}) translate(${-pan.x}, ${-pan.y})`}
        >
          <g>{edges}</g>
          <g>{nodes}</g>
        </g>
      </svg>

      {selectedNode && (() => {
        const pos = getNodeScreenPosition(selectedNode)
        if (!pos) return null
        const level = config.nodes[selectedNode.id] ?? 0
        const values = selectedNode.values ?? [0]
        const nextLevelIndex = Math.min(level, values.length - 1)
        const desc = formatDescription(selectedNode.description, nextLevelIndex, values)
        const incompleteForSelected = getIncompleteMaxPrereqs(tree, selectedNode, config)
        const canUp = canLevelUp(selectedNode, config, pointsRemaining) && incompleteForSelected.length === 0
        const canDown = canLevelDown(tree, selectedNode, config)
        const upReason =
          incompleteForSelected.length > 0
            ? 'Upgrade these talents to maximum first.'
            : getLevelUpBlockReason(selectedNode, config, pointsRemaining)
        const downReason = getLevelDownBlockReason(tree, selectedNode, config)
        const panelWidth = 280
        const panelHeight = 180
        const left = typeof window !== 'undefined'
          ? Math.max(8, Math.min(pos.x - panelWidth / 2, window.innerWidth - panelWidth - 8))
          : pos.x - panelWidth / 2
        const top = typeof window !== 'undefined'
          ? Math.max(8, Math.min(pos.y - 80, window.innerHeight - panelHeight - 8))
          : pos.y - 80
        return createPortal(
          <div
            ref={panelRef}
            className="fixed z-[200] min-w-[200px] max-w-[280px] rounded-lg border border-border bg-popover p-3 shadow-lg"
            style={{ left, top }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground">{selectedNode.name}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedNodeId(null)}
              >
                <span className="sr-only">Close</span>
                ×
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{desc || 'No description.'}</p>
            <div className="flex items-center justify-between mt-3 gap-2">
              <span className="text-xs text-muted-foreground">
                Level {level}/{selectedNode.maxLevel}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!canDown}
                  title={downReason ?? 'Remove point'}
                  onClick={() => levelDown(selectedNode)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium w-8 text-center">{level}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!canUp}
                  title={upReason ?? 'Add point'}
                  onClick={() => levelUp(selectedNode)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {upReason && level < selectedNode.maxLevel && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">{upReason}</p>
            )}
            {downReason && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">{downReason}</p>
            )}
            {autoPathPlan && (
              <div className="mt-3 border-t border-border pt-2">
                <p className="text-[11px] font-medium text-foreground mb-1">Auto-upgrade path</p>
                <p className="text-[11px] text-muted-foreground mb-1">
                  This will add a total of{' '}
                  <span className="font-semibold text-foreground">{autoPathPlan.totalPoints}</span> talent
                  point{autoPathPlan.totalPoints !== 1 ? 's' : ''} along the path to this talent.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    size="sm"
                    className="h-7 px-3 text-[11px]"
                    disabled={isApplyingAutoPath}
                    onClick={() => {
                      ;(async () => {
                        // Re-check available points before applying.
                        const spent = getTotalPointsSpent(config)
                        const available = maxPoints - spent
                        if (!autoPathPlan || autoPathPlan.totalPoints > available) {
                          setIncompleteToast({ names: ['Not enough talent points for this path.'] })
                          return
                        }

                        // Build an ordered list: prerequisites first, then target.
                        const byId: Record<string, TalentNode> = {}
                        for (const n of tree.nodes) byId[n.id] = n

                        const targetId = selectedNode.id
                        const order: string[] = []
                        const seen = new Set<string>()
                        const visit = (id: string) => {
                          if (seen.has(id)) return
                          seen.add(id)
                          const node = byId[id]
                          if (!node) return
                          for (const p of node.prerequisites) visit(p)
                          order.push(id)
                        }
                        visit(targetId)

                        const nextNodes = { ...config.nodes }
                        setIsApplyingAutoPath(true)
                        try {
                          for (const id of order) {
                            const node = byId[id]
                            if (!node) continue
                            const isTarget = id === targetId
                            const desired = isTarget ? Math.max(1, nextNodes[id] ?? 0) : node.maxLevel
                            let current = nextNodes[id] ?? 0
                            while (current < desired) {
                              current += 1
                              nextNodes[id] = current
                              onConfigChange({ ...config, nodes: { ...nextNodes } })
                              await new Promise((r) => setTimeout(r, 80))
                            }
                          }
                        } finally {
                          setIsApplyingAutoPath(false)
                        }
                        setAutoPathPlan(null)
                        setHighlightNodeIds([])
                      })()
                    }}
                  >
                    {isApplyingAutoPath ? 'Upgrading…' : 'Confirm path'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    disabled={isApplyingAutoPath}
                    onClick={() => {
                      setAutoPathPlan(null)
                      setHighlightNodeIds([])
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )
      })()}
    </div>
  )

  const legend = (
    <div className="text-[10px] text-muted-foreground flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1">
        <div className={cn('w-3 h-3 rounded-full', colorClasses.unlocked)} />
        <span>Available</span>
      </div>
      <div className="flex items-center gap-1">
        <div className={cn('w-3 h-3 rounded-full', colorClasses.partial)} />
        <span>Partial</span>
      </div>
      <div className="flex items-center gap-1">
        <div className={cn('w-3 h-3 rounded-full', colorClasses.maxed)} />
        <span>Maxed</span>
      </div>
      <div className="flex items-center gap-1">
        <div className={cn('w-3 h-3 rounded-full', colorClasses.locked)} />
        <span>Locked</span>
      </div>
      <span className="ml-auto">Click node to open panel · Use +/− to level</span>
    </div>
  )

  const main = (
    <div className="space-y-2">
      {controls}
      {graphArea}
      {legend}
    </div>
  )

  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-medium">Talent tree — {tree.name}</span>
          <Button variant="outline" size="sm" onClick={() => setIsFullscreen(false)}>
            <Minimize2 className="h-4 w-4 mr-1" />
            Exit fullscreen
          </Button>
        </div>
        <div className="flex-1 min-h-0 p-3">
          {main}
        </div>
      </div>,
      document.body
    )
  }

  return (
    <>
      {main}
      {incompleteToast &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed top-4 right-4 z-[210] rounded-md border border-border bg-popover px-3 py-2 shadow-lg text-xs">
            <p className="font-semibold mb-1">Incomplete Talents</p>
            <p className="mb-1">Upgrade talents to the maximum level first:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {incompleteToast.names.map((name) => (
                <li key={name} className="font-semibold">
                  {name}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </>
  )
}
