'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useTheme, COLOR_PRESETS, BACKGROUND_PRESETS } from '@/lib/theme-context'
import { ALL_ICONS } from '@/components/bundles-content'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Check, Palette, ImageIcon, Move, Eye, Sparkles, ChevronDown, ChevronUp, Wand2, Search, RotateCcw, Upload, Bot, Crown, Sword, Users, Bell, ScanSearch, Trophy, Shield, Map, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SettingsContent() {
  const {
    settings,
    setColorPreset,
    setBackground,
    setBackgroundOpacity,
    setParallaxEnabled,
    setCursorGlowEnabled,
    setCursorGlowColor,
    setCursorGlowSize,
    setCursorGlowOpacity,
    setMouseTrailEnabled,
    setMouseTrailIcon,
    setMouseTrailLength,
    setMouseTrailSize,
    setMouseTrailColor,
    currentColor,
    currentBackground,
  } = useTheme()

  const [showGlowAdvanced, setShowGlowAdvanced] = useState(false)
  const [customColorInput, setCustomColorInput] = useState(settings.cursorGlowColor ?? '')
  const [showTrailAdvanced, setShowTrailAdvanced] = useState(false)
  const [trailColorInput, setTrailColorInput] = useState(settings.mouseTrailColor ?? '')
  const [trailIconSearch, setTrailIconSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convert a user-uploaded file to a data-URL and store as the trail icon
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      if (result) setMouseTrailIcon(result)
    }
    reader.readAsDataURL(file)
    // Reset the input so the same file can be re-selected
    e.target.value = ''
  }

  const filteredTrailIcons = ALL_ICONS.filter(ic =>
    !trailIconSearch.trim() || ic.label.toLowerCase().includes(trailIconSearch.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Color Theme */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-foreground">Color Theme</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose a primary color for the entire interface
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COLOR_PRESETS.map(preset => {
              const isActive = settings.colorPresetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setColorPreset(preset.id)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200',
                    isActive
                      ? 'border-foreground/40 bg-secondary shadow-lg'
                      : 'border-border bg-secondary/40 hover:border-border hover:bg-secondary/70'
                  )}
                >
                  {/* Color swatch */}
                  <div
                    className="h-8 w-8 shrink-0 rounded-full border-2 border-foreground/10 shadow-inner"
                    style={{
                      backgroundColor: `hsl(${preset.hue} ${preset.saturation}% ${preset.lightness}%)`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{preset.name}</div>
                  </div>
                  {isActive && (
                    <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10">
                      <Check className="h-3 w-3 text-foreground" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Preview bar */}
          <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-4">
            <p className="text-xs text-muted-foreground mb-3">Preview</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="h-10 w-10 rounded-lg"
                style={{ backgroundColor: `hsl(${currentColor.primary})` }}
              />
              <div
                className="h-10 flex-1 max-w-[200px] rounded-lg"
                style={{
                  background: `linear-gradient(90deg, hsl(${currentColor.primary}), hsl(${currentColor.primary} / 0.3))`,
                }}
              />
              <div className="flex gap-1.5">
                <div
                  className="h-6 w-6 rounded-md"
                  style={{ backgroundColor: `hsl(${currentColor.primary} / 0.15)` }}
                />
                <div
                  className="h-6 w-6 rounded-md"
                  style={{ backgroundColor: `hsl(${currentColor.primary} / 0.30)` }}
                />
                <div
                  className="h-6 w-6 rounded-md"
                  style={{ backgroundColor: `hsl(${currentColor.primary} / 0.50)` }}
                />
                <div
                  className="h-6 w-6 rounded-md"
                  style={{ backgroundColor: `hsl(${currentColor.primary})` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Image */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-foreground">Background</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Set a background image for the entire app
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BACKGROUND_PRESETS.map(bg => {
              const isActive = settings.backgroundId === bg.id
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBackground(bg.id)}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border-2 transition-all duration-200',
                    isActive
                      ? 'border-primary shadow-lg shadow-primary/10'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video w-full bg-secondary">
                    {bg.thumbnail ? (
                      <img
                        src={bg.thumbnail || "/placeholder.svg"}
                        alt={bg.name}
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-background">
                        <span className="text-xs text-muted-foreground">No Image</span>
                      </div>
                    )}
                  </div>
                  {/* Label */}
                  <div className="flex items-center justify-between px-3 py-2 bg-card">
                    <span className="text-xs font-medium text-foreground">{bg.name}</span>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Opacity slider */}
          {currentBackground.src && (
            <div className="space-y-4 rounded-lg border border-border bg-secondary/40 p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground">
                    Background Opacity
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {settings.backgroundOpacity}% visibility
                  </p>
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={settings.backgroundOpacity}
                onChange={e => setBackgroundOpacity(Number(e.target.value))}
                className="w-full accent-primary h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Subtle</span>
                <span>Visible</span>
              </div>
            </div>
          )}

          {/* Parallax toggle */}
          {currentBackground.src && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-4">
              <div className="flex items-center gap-3">
                <Move className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Mouse Parallax Effect</p>
                  <p className="text-xs text-muted-foreground">
                    Background moves subtly with your mouse cursor
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.parallaxEnabled}
                onClick={() => setParallaxEnabled(!settings.parallaxEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                  settings.parallaxEnabled ? 'bg-primary' : 'bg-secondary'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-foreground shadow-lg transition-transform duration-200',
                    settings.parallaxEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Cursor Glow ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-foreground">Cursor Glow</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  A soft radial light that follows your cursor — off by default
                </p>
              </div>
            </div>
            {/* Reset glow to defaults */}
            {(settings.cursorGlowEnabled || settings.cursorGlowColor || settings.cursorGlowSize !== 220 || settings.cursorGlowOpacity !== 35) && (
              <button
                type="button"
                title="Reset cursor glow to defaults"
                onClick={() => {
                  setCursorGlowEnabled(false)
                  setCursorGlowColor(null)
                  setCursorGlowSize(220)
                  setCursorGlowOpacity(35)
                  setCustomColorInput('')
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition flex-shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Enable Cursor Glow</p>
                <p className="text-xs text-muted-foreground">
                  {settings.cursorGlowEnabled ? 'On — move your mouse to see it' : 'Off'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.cursorGlowEnabled}
              onClick={() => setCursorGlowEnabled(!settings.cursorGlowEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                settings.cursorGlowEnabled ? 'bg-primary' : 'bg-secondary'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-foreground shadow-lg transition-transform duration-200',
                  settings.cursorGlowEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {settings.cursorGlowEnabled && (
            <div className="space-y-4 rounded-lg border border-border bg-secondary/40 p-4">
              {/* Size slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Glow Size</label>
                  <span className="text-xs text-muted-foreground tabular-nums">{settings.cursorGlowSize ?? 220} px</span>
                </div>
                <input
                  type="range" min={80} max={400} step={10}
                  value={settings.cursorGlowSize ?? 220}
                  onChange={e => setCursorGlowSize(Number(e.target.value))}
                  className="w-full accent-primary h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Tight</span><span>Wide</span>
                </div>
              </div>

              {/* Opacity slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Intensity</label>
                  <span className="text-xs text-muted-foreground tabular-nums">{settings.cursorGlowOpacity ?? 35}%</span>
                </div>
                <input
                  type="range" min={5} max={80} step={5}
                  value={settings.cursorGlowOpacity ?? 35}
                  onChange={e => setCursorGlowOpacity(Number(e.target.value))}
                  className="w-full accent-primary h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Subtle</span><span>Strong</span>
                </div>
              </div>

              {/* Colour preview (using theme colour) */}
              {!settings.cursorGlowColor && (
                <div className="flex items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
                  <div
                    className="h-6 w-6 rounded-full border border-white/20 flex-shrink-0"
                    style={{ background: `hsl(${currentColor.hue} ${currentColor.saturation}% ${currentColor.lightness}%)` }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Using <span className="text-foreground font-medium">{currentColor.name}</span> theme colour
                  </p>
                </div>
              )}

              {/* Advanced toggle */}
              <button
                type="button"
                onClick={() => setShowGlowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition w-full"
              >
                {showGlowAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Advanced — custom colour
              </button>

              {showGlowAdvanced && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Override with any CSS colour (e.g. <code className="text-foreground">#ff6600</code>, <code className="text-foreground">hsl(30 90% 55%)</code>, <code className="text-foreground">white</code>).
                    Leave blank to use the theme colour.
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Native colour picker as a quick palette */}
                    <input
                      type="color"
                      value={customColorInput.startsWith('#') ? customColorInput : '#7c3aed'}
                      onChange={e => {
                        setCustomColorInput(e.target.value)
                        setCursorGlowColor(e.target.value)
                      }}
                      className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5 flex-shrink-0"
                    />
                    <input
                      type="text"
                      placeholder="e.g. #ff6600 or hsl(30 90% 55%)"
                      value={customColorInput}
                      onChange={e => setCustomColorInput(e.target.value)}
                      onBlur={() => {
                        const v = customColorInput.trim()
                        setCursorGlowColor(v || null)
                      }}
                      className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {settings.cursorGlowColor && (
                      <button
                        type="button"
                        onClick={() => { setCustomColorInput(''); setCursorGlowColor(null) }}
                        className="text-xs text-muted-foreground hover:text-foreground transition px-2 py-1.5 rounded-md border border-border flex-shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {settings.cursorGlowColor && (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
                      <div
                        className="h-6 w-6 rounded-full border border-white/20 flex-shrink-0"
                        style={{ background: settings.cursorGlowColor }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Custom: <span className="text-foreground font-medium font-mono">{settings.cursorGlowColor}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Mouse Trail ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-foreground">Mouse Trail</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Particles or icons that follow and fade behind your cursor
                </p>
              </div>
            </div>
            {/* Reset trail to defaults */}
            {(settings.mouseTrailEnabled || settings.mouseTrailIcon || settings.mouseTrailColor ||
              settings.mouseTrailLength !== 14 || settings.mouseTrailSize !== 22) && (
              <button
                type="button"
                title="Reset mouse trail to defaults"
                onClick={() => {
                  setMouseTrailEnabled(false)
                  setMouseTrailIcon(null)
                  setMouseTrailLength(14)
                  setMouseTrailSize(22)
                  setMouseTrailColor(null)
                  setTrailColorInput('')
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition flex-shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex items-center gap-3">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Enable Mouse Trail</p>
                <p className="text-xs text-muted-foreground">
                  {settings.mouseTrailEnabled ? 'On — move your mouse around' : 'Off'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.mouseTrailEnabled}
              onClick={() => setMouseTrailEnabled(!settings.mouseTrailEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                settings.mouseTrailEnabled ? 'bg-primary' : 'bg-secondary'
              )}
            >
              <span className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-foreground shadow-lg transition-transform duration-200',
                settings.mouseTrailEnabled ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>

          {settings.mouseTrailEnabled && (
            <div className="space-y-5 rounded-lg border border-border bg-secondary/40 p-4">
              {/* Trail length */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Trail Length</label>
                  <span className="text-xs text-muted-foreground tabular-nums">{settings.mouseTrailLength ?? 14} particles</span>
                </div>
                <input type="range" min={3} max={30} step={1}
                  value={settings.mouseTrailLength ?? 14}
                  onChange={e => setMouseTrailLength(Number(e.target.value))}
                  className="w-full accent-primary h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Short</span><span>Long</span>
                </div>
              </div>

              {/* Particle size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Particle Size</label>
                  <span className="text-xs text-muted-foreground tabular-nums">{settings.mouseTrailSize ?? 22} px</span>
                </div>
                <input type="range" min={10} max={56} step={2}
                  value={settings.mouseTrailSize ?? 22}
                  onChange={e => setMouseTrailSize(Number(e.target.value))}
                  className="w-full accent-primary h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Tiny</span><span>Large</span>
                </div>
              </div>

              {/* Icon picker — "Dots" option + all game icons */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Trail Icon</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search icons…"
                      value={trailIconSearch}
                      onChange={e => setTrailIconSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  {/* Upload custom image */}
                  <button
                    type="button"
                    title="Upload your own image"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition flex-shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto rounded-md border border-border p-2 bg-background/40">
                  {/* Dots (null) option */}
                  {!trailIconSearch.trim() && (
                    <button
                      type="button"
                      title="Glowing dots"
                      onClick={() => setMouseTrailIcon(null)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition aspect-square',
                        !settings.mouseTrailIcon
                          ? 'border-primary bg-primary/20'
                          : 'border-border hover:border-primary/40 bg-muted/20'
                      )}
                    >
                      <div
                        className="h-5 w-5 rounded-full"
                        style={{ background: `hsl(${currentColor.hue} ${currentColor.saturation}% ${currentColor.lightness}%)` }}
                      />
                      <span className="text-[9px] text-muted-foreground leading-tight text-center">Dots</span>
                      {!settings.mouseTrailIcon && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  )}

                  {filteredTrailIcons.map(ic => (
                    <button
                      key={ic.id}
                      type="button"
                      title={ic.label}
                      onClick={() => setMouseTrailIcon(ic.src)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 rounded-lg border p-1.5 transition aspect-square',
                        settings.mouseTrailIcon === ic.src
                          ? 'border-primary bg-primary/20'
                          : 'border-border hover:border-primary/40 bg-muted/20'
                      )}
                    >
                      <Image src={ic.src} alt={ic.label} width={28} height={28} className="object-contain" style={{ height: 28, width: 28 }} />
                      <span className="text-[8px] text-muted-foreground leading-tight text-center line-clamp-1 w-full">{ic.label}</span>
                    </button>
                  ))}
                </div>

                {settings.mouseTrailIcon && (
                  <div className="flex items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
                    <Image src={settings.mouseTrailIcon} alt="Trail icon" width={24} height={24} className="object-contain flex-shrink-0" style={{ height: 24, width: 24 }} />
                    <p className="text-xs text-muted-foreground flex-1">
                      {ALL_ICONS.find(ic => ic.src === settings.mouseTrailIcon)?.label ?? 'Custom icon'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setMouseTrailIcon(null)}
                      className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 flex-shrink-0"
                    >
                      Reset to dots
                    </button>
                  </div>
                )}
              </div>

              {/* Advanced toggle — colour */}
              <button
                type="button"
                onClick={() => setShowTrailAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition w-full"
              >
                {showTrailAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Advanced — custom colour (dots only)
              </button>

              {showTrailAdvanced && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Override dot colour. Leave blank to use the theme colour. Has no effect when using an icon.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={trailColorInput.startsWith('#') ? trailColorInput : '#7c3aed'}
                      onChange={e => { setTrailColorInput(e.target.value); setMouseTrailColor(e.target.value) }}
                      className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5 flex-shrink-0"
                    />
                    <Input
                      placeholder="e.g. #ff6600 or hsl(30 90% 55%)"
                      value={trailColorInput}
                      onChange={e => setTrailColorInput(e.target.value)}
                      onBlur={() => { const v = trailColorInput.trim(); setMouseTrailColor(v || null) }}
                      className="flex-1 h-9"
                    />
                    {settings.mouseTrailColor && (
                      <button
                        type="button"
                        onClick={() => { setTrailColorInput(''); setMouseTrailColor(null) }}
                        className="text-xs text-muted-foreground hover:text-foreground transition px-2 py-1.5 rounded-md border border-border flex-shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Divider: Bot Tools ─────────────────────────────────────────── */}
      <BotToolsSection />

      {/* ── Divider: KvK Scanner ──────────────────────────────────────── */}
      <KvkScannerSection />
    </div>
  )
}

// ─── Bot Tools Section ────────────────────────────────────────────────────────

const BOT_TOOLS = [
  {
    id: 'title-giving',
    label: 'Title Giving',
    icon: Crown,
    description: 'Automatically rotates kingdom titles (Duke, Justice, etc.) on a configurable schedule.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
  {
    id: 'fort-tracking',
    label: 'Fort Tracking',
    icon: Shield,
    description: 'Monitors fort attack and defense events in kingdom chat and logs them.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    id: 'player-finder',
    label: 'Player Finder',
    icon: Users,
    description: 'Searches for specific players across the map and reports their location.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
  },
  {
    id: 'alliance-mobilization',
    label: 'Alliance Mobilization',
    icon: Zap,
    description: 'Sends coordinated rally and mobilization messages to alliance members.',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
  },
  {
    id: 'discord-verification',
    label: 'Discord Verification',
    icon: Bell,
    description: 'Links in-game accounts to Discord and assigns verified member roles automatically.',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
]

function BotToolsSection() {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})

  return (
    <div className="relative">
      {/* Divider with label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
          <Bot className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bot Tools</span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-foreground">Bot Tools</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Configure automated bots for your kingdom
                </p>
              </div>
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CardHeader>

        {open && (
          <CardContent className="space-y-3">
            {BOT_TOOLS.map(tool => {
              const Icon = tool.icon
              const isOn = enabled[tool.id] ?? false
              return (
                <div
                  key={tool.id}
                  className={cn(
                    'flex items-start gap-4 rounded-xl border p-4 transition-all',
                    isOn ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-card/40'
                  )}
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tool.bg)}>
                    <Icon className={cn('h-5 w-5', tool.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{tool.label}</span>
                      {/* Toggle */}
                      <button
                        onClick={() => setEnabled(e => ({ ...e, [tool.id]: !e[tool.id] }))}
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors',
                          isOn ? 'border-primary bg-primary' : 'border-border bg-card'
                        )}
                        role="switch"
                        aria-checked={isOn}
                      >
                        <span
                          className={cn(
                            'pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                            isOn ? 'translate-x-[14px]' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{tool.description}</p>
                    {isOn && (
                      <button className="mt-2 text-xs text-primary hover:underline">Configure →</button>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// ─── KvK Scanner Section ──────────────────────────────────────────────────────

const KVK_SCANNER_ITEMS = [
  { id:'pre-kvk',  label:'Pre-KvK Rankings', icon: Sword,      description:'Track player power and rankings before KvK begins.' },
  { id:'honor',    label:'Honor Rankings',    icon: Trophy,     description:'Real-time honor leaderboard during KvK.' },
  { id:'dkp',      label:'DKP Score',         icon: Zap,        description:'Custom DKP formula scoring with configurable weights.' },
  { id:'summary',  label:'Summary View',      icon: Map,        description:'Combined view of all rankings, kingdoms, and camps.' },
]

function KvkScannerSection() {
  const [open, setOpen] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const [scanInterval, setScanInterval] = useState(30)

  return (
    <div className="relative">
      {/* Divider with label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1">
          <ScanSearch className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">KvK Scanner</span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Card className="border-primary/20 bg-card">
        <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <ScanSearch className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-foreground">KvK Scanner</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Configure live KvK tracking, scan intervals, and DKP formula
                </p>
              </div>
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CardHeader>

        {open && (
          <CardContent className="space-y-5">
            {/* Scan interval */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Scan Interval</label>
                <span className="text-xs text-muted-foreground tabular-nums">every {scanInterval}s</span>
              </div>
              <input
                type="range" min={10} max={120} step={5}
                value={scanInterval}
                onChange={e => setScanInterval(Number(e.target.value))}
                className="w-full accent-primary h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>10s (fast)</span><span>120s (slow)</span>
              </div>
            </div>

            {/* Kingdom numbers */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Kingdom Numbers to Scan</label>
              <input
                type="text"
                placeholder="e.g. 3497, 3499, 3500, 3504..."
                className="w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">Comma-separated list of kingdom IDs. Leave empty to scan your kingdom only.</p>
            </div>

            {/* Sub-sections collapse */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <button
                onClick={() => setSubOpen(o => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-white/[0.02] transition-colors"
              >
                <span>Tracking Modules</span>
                {subOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {subOpen && (
                <div className="border-t border-border/50 p-3 space-y-2">
                  {KVK_SCANNER_ITEMS.map(item => {
                    const Icon = item.icon
                    return (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/30 p-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground/60">
              DKP formula and leadership settings are managed from the KvK Scanner page directly.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
