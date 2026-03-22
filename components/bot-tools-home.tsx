'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  ShoppingCart, Check, X, Copy, CheckCheck, Loader2,
  Zap, Star, Trophy, ScanSearch, Database, Globe,
  ChevronDown, ChevronUp, ArrowRight, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  cartId: string
  toolId: string
  label: string
  bundle?: string
  isSoC?: boolean
  price: number
}

interface BotToolsHomeProps {
  cart: CartItem[]
  onAddToCart: (item: Omit<CartItem, 'cartId'>) => void
  onRemoveFromCart: (cartId: string) => void
  onOpenCart: () => void
  onNavigate: (tab: string) => void
}

// ─── Alliance Control data ────────────────────────────────────────────────────

interface FeatureGroup {
  name: string
  price?: number
  inherited?: boolean
  sub: string[]
}

interface AllianceTier {
  id: string
  label: string
  price: number
  individualValue: number
  savingsAmount: number
  savePercent: number
  icon: React.ElementType
  color: string
  bg: string
  border: string
  ring: string
  highlight: boolean
  badge?: string
  tagline: string
  featureGroups: FeatureGroup[]
}

const ALLIANCE_TIERS: AllianceTier[] = [
  {
    id: 'alliance-basic',
    label: 'Basic',
    price: 19,
    individualValue: 42,
    savingsAmount: 23,
    savePercent: 55,
    icon: Zap,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    ring: 'ring-sky-500/20',
    highlight: false,
    tagline: 'Core automation for active alliances',
    featureGroups: [
      { name: 'Fort Tracker', price: 14, sub: ['Real-time barbarian fort tracker'] },
      { name: 'Title Service', price: 12, sub: ['Automated kingdom title rotation'] },
      {
        name: 'Alliance Activity', price: 9,
        sub: ['Gift Tracking', 'Member Activity Tracking', 'Member Comparison', 'Automated Reports', 'Performance Analytics', 'Storehouse Analytics'],
      },
      { name: 'Player Finder', price: 7, sub: ['Search players by name, ID, or alliance'] },
    ],
  },
  {
    id: 'alliance-elite',
    label: 'Elite',
    price: 29,
    individualValue: 75,
    savingsAmount: 46,
    savePercent: 61,
    icon: Star,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    ring: 'ring-primary/20',
    highlight: true,
    badge: 'Most Popular',
    tagline: 'Most alliances upgrade to Elite for full automation',
    featureGroups: [
      { name: 'Everything in Basic', inherited: true, sub: [] },
      {
        name: 'Alliance Tracker (Level 2)', price: 10,
        sub: ['Fort & Flag Tracking', 'Building Time Tracking', 'Repair Time Tracking', 'Under Attack Alerts', 'Burning / Destruction Timers', 'Alerts on Dashboard + Discord'],
      },
      { name: 'Alliance Mobilization', price: 9, sub: ['Auto-ping rallies & war actions'] },
      { name: 'Discord Verification', price: 7, sub: ['Link accounts + auto-assign roles'] },
      { name: 'Alliance Rank Manager', price: 7, sub: ['Auto assign ranks & roles'] },
    ],
  },
  {
    id: 'alliance-legendary',
    label: 'Legendary',
    price: 39,
    individualValue: 97,
    savingsAmount: 58,
    savePercent: 60,
    icon: Trophy,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    ring: 'ring-amber-500/20',
    highlight: false,
    tagline: 'Complete alliance control for competitive KvK',
    featureGroups: [
      { name: 'Everything in Elite', inherited: true, sub: [] },
      {
        name: 'Alliance Tracker (Level 3)', price: 8,
        sub: ['Flag & Fort Placement with coordinates', 'Home Kingdom + KvK maps', 'Real-time map updates'],
      },
      { name: 'Barbarian Fort Finder', price: 7, sub: ['Locate forts across the map'] },
      { name: 'Auto Refresh Mobilization', price: 7, sub: ['Automatically refresh mobilization alerts'] },
    ],
  },
]

// ─── VIP Bundle data ─────────────────────────────────────────────────────────

const VIP_LEGENDARY_FEATURES = [
  'Fort Tracker — real-time barbarian fort tracker',
  'Title Service — automated kingdom title rotation',
  'Alliance Activity — Gift Tracking, Member Tracking, Comparison, Reports, Analytics, Storehouse Analytics',
  'Player Finder — search by name, ID, or alliance',
  'Alliance Tracker L2 — Fort & Flag Tracking, Building & Repair Times, Under Attack Alerts, Burning/Destruction Timers, Dashboard + Discord Alerts',
  'Alliance Tracker L3 — Flag & Fort Placement with coordinates, Home Kingdom + KvK maps, Real-time map updates',
  'Alliance Mobilization — auto-ping rallies & war actions',
  'Auto Refresh Mobilization — automatically refresh mobilization alerts',
  'Discord Verification — link accounts + auto-assign roles',
  'Alliance Rank Manager — auto assign ranks & roles',
  'Barbarian Fort Finder — locate forts across the map',
]

const VIP_KVK_PREMIUM_FEATURES = [
  'Full KvK — All Camps covered',
  'Daily Full Scans (all kingdoms / camps)',
  'Extra Scans on Request (Passes, Altars, Events)',
  'PreKvK + Honor Rankings',
  'Stage-by-Stage Tracking',
  'DKP Setup + Management',
  'Goals & Requirements',
  'Penalty & Bonus System',
  'Scheduled Scans handled for you',
  'Website Dashboard + Discord Reports',
  'Ongoing Support',
]

const VIP_KVK_TRACKING_FEATURES = [
  'Unlimited Kingdom Scans',
  'Scan within ~5 minutes',
  'Schedule Scans yourself',
  'Daily Honor + PreKvK Tracking',
  'Stage-by-Stage Tracking',
  'DKP Management',
  'Goals & Requirements',
  'Penalty & Bonus System',
  'Website Dashboard + Discord Access',
]

// ─── KvK Premium bundle data ──────────────────────────────────────────────────

const KVK_FULL_FEATURES_SOC = [
  'Daily Full Scans (All Kingdoms / Camps)',
  'Extra Scans on Request (Passes, Altars, Events)',
  'PreKvK Rankings',
  'Daily Honor Rankings',
  'Stage-by-Stage Tracking',
  'DKP Setup + Management',
  'Goals & Requirements',
  'Penalty & Bonus System',
  'Scheduled Scans handled for you',
  'Website Dashboard',
  'Discord Reports',
  'Ongoing Support',
]

const KVK_FULL_FEATURES_NONSOC = [
  'Daily Full Scans (All Kingdoms)',
  'Extra Scans on Request',
  'PreKvK Rankings',
  'Daily Honor Rankings',
  'Stage-by-Stage Tracking',
  'DKP Setup + Management',
  'Goals & Requirements',
  'Penalty & Bonus System',
  'Scheduled Scans handled for you',
  'Website Dashboard',
  'Discord Reports',
]

const KVK_BUNDLES = {
  soc: [
    { id: 'kvk-soc-full', label: 'Full KvK',        camps: 'All camps',   price: 150, features: KVK_FULL_FEATURES_SOC },
    { id: 'kvk-soc-two',  label: 'Two Camp Bundle',  camps: '2 camps',     price: 80,  features: [...KVK_FULL_FEATURES_SOC] },
    { id: 'kvk-soc-one',  label: 'One Camp Bundle',  camps: '1 camp',      price: 40,  features: [...KVK_FULL_FEATURES_SOC] },
  ],
  nonSoc: [
    { id: 'kvk-nonsoc-full', label: 'Full KvK',       camps: 'All kingdoms', price: 80,  features: KVK_FULL_FEATURES_NONSOC },
    { id: 'kvk-nonsoc-two',  label: 'Two Camp Bundle', camps: '2 camps',      price: 40,  features: [...KVK_FULL_FEATURES_NONSOC] },
    { id: 'kvk-nonsoc-one',  label: 'One Camp Bundle', camps: '1 camp',       price: 20,  features: [...KVK_FULL_FEATURES_NONSOC] },
  ],
}

// ─── KvK Data Tracking data ───────────────────────────────────────────────────

const KVK_TRACKING_FEATURES = [
  'Unlimited Kingdom Scans',
  'Scan within ~5 minutes',
  'Schedule Scans yourself',
  'Daily Honor Scans',
  'PreKvK & Stage-by-Stage Tracking',
  'DKP Management',
  'Goals & Requirements',
  'Penalty & Bonus System',
  'Hall of Heroes Processing',
  'Website Dashboard',
  'Discord Access',
]

const KVK_TRACKING = [
  { id: 'kvk-track-1mo', label: 'Monthly',  price: 29,  perMonth: 29,   saving: null },
  { id: 'kvk-track-2mo', label: '2 Months', price: 55,  perMonth: 27.5, saving: 3  },
  { id: 'kvk-track-1yr', label: '1 Year',   price: 240, perMonth: 20,   saving: 108 },
]

// ─── Multi-Kingdom data ───────────────────────────────────────────────────────

const MULTI_KVK = [
  {
    id: 'kvk-multi-basic',
    label: 'Basic',
    price: 55,
    scans: 10,
    features: [
      '10 Full KvK Scans',
      'Scan All Kingdoms in KvK',
      'Website Dashboard',
    ],
  },
  {
    id: 'kvk-multi-elite',
    label: 'Elite',
    price: 85,
    scans: 25,
    features: [
      '25 Full KvK Scans',
      'Scan All Kingdoms',
      'Website Dashboard',
      'Honor Rankings',
      'PreKvK Rankings',
    ],
  },
  {
    id: 'kvk-multi-legendary',
    label: 'Legendary',
    price: 150,
    scans: 60,
    features: [
      '60 Full KvK Scans',
      'Scan All Kingdoms',
      'Website Dashboard',
      'Honor Rankings',
      'PreKvK Rankings',
      'Autarch Rankings',
    ],
  },
]

// ─── Checkout panel ───────────────────────────────────────────────────────────

interface CheckoutProps {
  cart: CartItem[]
  onClose: () => void
  onRemove: (cartId: string) => void
  onCheckoutComplete: () => void
}

function CheckoutPanel({ cart, onClose, onRemove, onCheckoutComplete }: CheckoutProps) {
  const { user, login } = useAuth()
  const [step, setStep] = useState<'cart' | 'keys'>('cart')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productKey, setProductKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const total = cart.reduce((s, i) => s + i.price, 0)

  async function handleCheckout() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({
            toolId: i.toolId,
            label: i.label,
            bundle: i.bundle,
            isSoC: i.isSoC,
            price: i.price,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      setProductKey(data.order.productKey)
      setStep('keys')
      onCheckoutComplete()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  function copyKey() {
    if (!productKey) return
    navigator.clipboard.writeText(productKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full max-h-screen w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{step === 'cart' ? 'Cart' : 'Order Confirmed'}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Choose a plan or package below.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.cartId} className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      {item.isSoC !== undefined && (
                        <p className="text-xs text-muted-foreground">{item.isSoC ? 'Season of Conquest' : 'Non-SoC'}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-foreground">${item.price}</span>
                      <button onClick={() => onRemove(item.cartId)} className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {step === 'keys' && (
            <div className="space-y-5">
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400">
                Order placed. Copy your product key and redeem it in the TFN Discord server.
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground mb-2">Order summary</p>
                {cart.map(item => (
                  <div key={item.cartId} className="flex justify-between text-xs text-muted-foreground">
                    <span className="truncate pr-2">{item.label}{item.isSoC !== undefined ? ` (${item.isSoC ? 'SoC' : 'Non-SoC'})` : ''}</span>
                    <span className="shrink-0">${item.price}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-semibold text-foreground border-t border-border/50 pt-2 mt-2">
                  <span>Total</span><span>${total}</span>
                </div>
              </div>
              {productKey && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Your product key</p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm font-semibold text-foreground tracking-widest">
                    <span className="flex-1 select-all">{productKey}</span>
                    <button onClick={copyKey} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      {copied ? <CheckCheck className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Next steps</p>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Join the TFN Discord server</li>
                  <li>Use the <span className="font-mono bg-muted/50 px-1 rounded">/activate</span> slash command</li>
                  <li>Paste your product key when prompted</li>
                  <li>A private ticket will open with our staff team</li>
                  <li>Complete payment via PayPal — staff set everything up</li>
                </ol>
              </div>
            </div>
          )}

          {error && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{error}</div>}
        </div>

        {step === 'cart' && cart.length > 0 && (
          <div className="border-t border-border p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-foreground">${total}</span>
            </div>
            {!user ? (
              <>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
                  Sign in with Discord before placing an order.
                </div>
                <button onClick={login} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  Sign in with Discord
                </button>
              </>
            ) : (
              <button onClick={handleCheckout} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Processing...' : 'Confirm Order'}
              </button>
            )}
            <p className="text-center text-[10px] text-muted-foreground/60">Payment via PayPal after staff review. No charge yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Alliance tier card ───────────────────────────────────────────────────────

function AllianceTierCard({ tier, inCart, onAdd }: { tier: AllianceTier; inCart: boolean; onAdd: () => void }) {
  const [expanded, setExpanded] = useState(tier.highlight)
  const Icon = tier.icon

  return (
    <div className={cn(
      'relative flex flex-col rounded-xl border transition-all duration-200',
      tier.highlight
        ? 'border-primary/40 bg-primary/5 shadow-[0_0_40px_-12px_hsl(var(--glow)/0.3)]'
        : 'border-border/50 bg-card/60',
      inCart && 'ring-2 ring-green-500/30',
    )}>
      {tier.badge && (
        <div className="absolute -top-3.5 inset-x-0 flex justify-center">
          <span className="rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            {tier.badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tier.bg)}>
            <Icon className={cn('h-4 w-4', tier.color)} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Alliance Control — {tier.label}</p>
            <p className="text-[11px] text-muted-foreground">{tier.tagline}</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-end gap-3 mb-3">
          <div>
            <span className="text-3xl font-bold text-foreground">${tier.price}</span>
            <span className="text-sm text-muted-foreground ml-1">/mo</span>
          </div>
          <div className="pb-0.5">
            <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', tier.bg, tier.color)}>
              Save {tier.savePercent}%
            </span>
          </div>
        </div>

        {/* Value breakdown */}
        <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground mb-4">
          Individual value: <span className="text-foreground font-medium">~${tier.individualValue}/mo</span>
          <span className="mx-1.5 text-border">·</span>
          You save: <span className="text-green-400 font-medium">${tier.savingsAmount}/mo</span>
        </div>

        {/* CTA */}
        {inCart ? (
          <div className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-green-500/10 border border-green-500/20 py-2.5 text-sm font-medium text-green-400">
            <Check className="h-4 w-4" /> Added to cart
          </div>
        ) : (
          <button
            onClick={onAdd}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors',
              tier.highlight
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25'
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to cart
          </button>
        )}
      </div>

      {/* Features toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between border-t border-border/50 px-5 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <span className="font-medium">{expanded ? 'Hide features' : 'View all features'}</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {/* Feature list */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-4">
          {tier.featureGroups.map((group, i) => (
            <div key={i}>
              {group.inherited ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                  <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-primary">{group.name}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-foreground">{group.name}</p>
                    {group.price && (
                      <span className="text-[10px] text-muted-foreground/60 line-through">${group.price}/mo</span>
                    )}
                  </div>
                  <ul className="space-y-1 pl-2">
                    {group.sub.map((s, j) => (
                      <li key={j} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                        <Check className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── VIP Bundle card ──────────────────────────────────────────────────────────

function VipBundleCard({ inCart, onAdd }: { inCart: (id: string) => boolean; onAdd: (toolId: string, label: string, isSoC?: boolean) => void }) {
  const [kvkOption, setKvkOption] = useState<'premium' | 'tracking'>('premium')
  const [socType, setSocType] = useState<'soc' | 'nonSoc'>('soc')
  const [showFeatures, setShowFeatures] = useState(false)

  const toolId = kvkOption === 'premium'
    ? (socType === 'soc' ? 'vip-premium-soc' : 'vip-premium-nonsoc')
    : 'vip-tracking'
  const isSoC = kvkOption === 'premium' ? socType === 'soc' : undefined
  const label = kvkOption === 'premium'
    ? `VIP Bundle — Legendary + KvK Premium (${socType === 'soc' ? 'SoC' : 'Non-SoC'})`
    : 'VIP Bundle — Legendary + KvK Data Tracking'
  const inCartNow = inCart(toolId)

  const premiumValue = socType === 'soc' ? 150 : 80
  const totalValue = 39 + (kvkOption === 'premium' ? premiumValue : 29)
  const saving = totalValue - 79

  return (
    <div className="relative rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-card shadow-[0_0_60px_-15px_hsl(var(--glow)/0.35)]">
      {/* Best Value badge */}
      <div className="absolute -top-4 inset-x-0 flex justify-center">
        <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-lg">
          Best Value
        </span>
      </div>

      <div className="p-6 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          {/* Title + tagline */}
          <div>
            <h3 className="text-xl font-bold text-foreground">VIP Bundle</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Alliance Control (Legendary) + your choice of KvK coverage</p>
          </div>
          {/* Price */}
          <div className="text-right">
            <div className="flex items-end gap-1.5">
              <span className="text-4xl font-bold text-foreground">$79</span>
              <span className="text-sm text-muted-foreground pb-1">/mo</span>
            </div>
            <p className="text-xs text-green-400 font-medium mt-0.5">
              {saving > 0 ? `Save $${saving}+/mo` : 'Best all-in-one value'}
              {kvkOption === 'premium' && socType === 'soc' && <span className="text-muted-foreground/60"> (~{Math.round(saving/totalValue*100)}% off)</span>}
            </p>
          </div>
        </div>

        {/* Value comparison */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Alliance Control</p>
            <p className="text-sm font-bold text-foreground">$39/mo</p>
            <p className="text-[10px] text-muted-foreground/60">Legendary tier</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{kvkOption === 'premium' ? 'KvK Premium' : 'Data Tracking'}</p>
            <p className="text-sm font-bold text-foreground">${kvkOption === 'premium' ? premiumValue : 29}{kvkOption === 'premium' ? '' : '/mo'}</p>
            <p className="text-[10px] text-muted-foreground/60">{kvkOption === 'premium' ? 'one-time per KvK' : 'self-service'}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] text-primary uppercase tracking-wide mb-0.5 font-semibold">You pay</p>
            <p className="text-sm font-bold text-primary">$79/mo</p>
            <p className="text-[10px] text-green-400">{saving > 0 ? `Save $${saving}+` : 'All-in-one'}</p>
          </div>
        </div>

        {/* Competitor callout */}
        <div className="rounded-xl border border-border/30 bg-muted/20 px-4 py-3 mb-6 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Why $79 works: </span>
          Competitors charge ~$70 for bots + ~$200 for KvK scanning = ~$270 total. You pay $79 — all-in. A no-brainer for serious alliances.
        </div>

        {/* KvK option selector */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-foreground mb-2">Choose your KvK coverage</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setKvkOption('premium')}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                kvkOption === 'premium' ? 'border-primary/40 bg-primary/10' : 'border-border/50 bg-muted/10 hover:bg-muted/20'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('h-3 w-3 rounded-full border-2 flex-shrink-0', kvkOption === 'premium' ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                <p className="text-xs font-semibold text-foreground">KvK Premium Bundle</p>
              </div>
              <p className="text-[11px] text-muted-foreground pl-5">Done for you — staff handle everything</p>
            </button>
            <button
              onClick={() => setKvkOption('tracking')}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                kvkOption === 'tracking' ? 'border-primary/40 bg-primary/10' : 'border-border/50 bg-muted/10 hover:bg-muted/20'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('h-3 w-3 rounded-full border-2 flex-shrink-0', kvkOption === 'tracking' ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                <p className="text-xs font-semibold text-foreground">KvK Data Tracking</p>
              </div>
              <p className="text-[11px] text-muted-foreground pl-5">Self-service — full control in your hands</p>
            </button>
          </div>

          {/* SoC toggle for premium */}
          {kvkOption === 'premium' && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[11px] text-muted-foreground">KvK type:</span>
              <button onClick={() => setSocType('soc')} className={cn('rounded-lg px-3 py-1 text-xs font-medium transition-colors border', socType === 'soc' ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border/50 hover:bg-secondary')}>
                Season of Conquest
              </button>
              <button onClick={() => setSocType('nonSoc')} className={cn('rounded-lg px-3 py-1 text-xs font-medium transition-colors border', socType === 'nonSoc' ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border/50 hover:bg-secondary')}>
                Non-SoC
              </button>
            </div>
          )}
        </div>

        {/* Add to cart */}
        {inCartNow ? (
          <div className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-500/10 border border-green-500/20 py-3 text-sm font-semibold text-green-400 mb-4">
            <Check className="h-4 w-4" /> Added to cart
          </div>
        ) : (
          <button
            onClick={() => onAdd(toolId, label, isSoC)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity mb-4"
          >
            <ShoppingCart className="h-4 w-4" />
            Add VIP Bundle to cart — $79/mo
          </button>
        )}

        {/* Feature toggle */}
        <button
          onClick={() => setShowFeatures(f => !f)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showFeatures ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showFeatures ? 'Hide full feature list' : 'View full feature list'}
        </button>
      </div>

      {/* Expanded feature list */}
      {showFeatures && (
        <div className="border-t border-primary/20 px-6 pb-6 pt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              Alliance Control — Legendary (all tools)
            </p>
            <ul className="space-y-1.5">
              {VIP_LEGENDARY_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <ScanSearch className="h-3.5 w-3.5 text-primary" />
              {kvkOption === 'premium' ? 'KvK Premium Bundle (Done For You)' : 'KvK Data Tracking (Self-Service)'}
            </p>
            <ul className="space-y-1.5">
              {(kvkOption === 'premium' ? VIP_KVK_PREMIUM_FEATURES : VIP_KVK_TRACKING_FEATURES).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title, subtitle, label }: { icon: React.ElementType; title: string; subtitle: string; label: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <span className="rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Feature checklist ────────────────────────────────────────────────────────

function FeatureList({ features, highlight }: { features: string[]; highlight?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {features.map((f, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
          <Check className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', highlight ? 'text-primary' : 'text-green-400')} />
          {f}
        </li>
      ))}
    </ul>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BotToolsHome({ cart, onAddToCart, onRemoveFromCart, onOpenCart, onNavigate }: BotToolsHomeProps) {
  const [cartOpen, setCartOpen] = useState(false)
  const [kvkType, setKvkType] = useState<'soc' | 'nonSoc'>('soc')
  const [trackingPlan, setTrackingPlan] = useState('kvk-track-1mo')
  const cartCount = cart.length
  const cartIds = new Set(cart.map(i => i.toolId))

  function addItem(item: Omit<CartItem, 'cartId'>) { onAddToCart(item) }

  function AddBtn({ toolId, label, price, bundle, isSoC }: { toolId: string; label: string; price: number; bundle?: string; isSoC?: boolean }) {
    if (cartIds.has(toolId)) {
      return (
        <span className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-green-500/10 border border-green-500/20 py-2.5 text-sm font-medium text-green-400">
          <Check className="h-3.5 w-3.5" /> Added
        </span>
      )
    }
    return (
      <button
        onClick={() => addItem({ toolId, label, price, bundle, isSoC })}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/15 border border-primary/20 py-2.5 text-sm font-medium text-primary hover:bg-primary/25 transition-colors"
      >
        <ShoppingCart className="h-4 w-4" />
        Add to cart
      </button>
    )
  }

  const selectedTracking = KVK_TRACKING.find(p => p.id === trackingPlan)!

  return (
    <div className="space-y-14 max-w-5xl">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bot Tools Store</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Automate your Rise of Kingdoms kingdom with TFN&apos;s bot suite. Staff handle all setup — you just provide your kingdom details.
          </p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card hover:border-border shrink-0"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 -mt-8">
        {[
          { n: '1', text: 'Choose a plan or package' },
          { n: '2', text: 'Confirm order — get product key' },
          { n: '3', text: 'Redeem key in TFN Discord' },
          { n: '4', text: 'Staff set up & activate your bot' },
        ].map(s => (
          <div key={s.n} className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{s.n}</span>
            <p className="text-xs text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      {/* ── VIP Bundle ──────────────────────────────────────────────────────── */}
      <div>
        <SectionHeading
          icon={Crown}
          title="VIP Bundle"
          label="All-In-One"
          subtitle="Everything in Legendary Alliance Control plus full KvK coverage — one price, zero compromises."
        />
        <VipBundleCard
          inCart={(id) => cartIds.has(id)}
          onAdd={(toolId, label, isSoC) => addItem({ toolId, label, price: 79, isSoC })}
        />
      </div>

      {/* ── Section 1: Alliance Control ─────────────────────────────────────── */}
      <div>
        <SectionHeading
          icon={Zap}
          title="Alliance Control"
          label="Bots — Automation"
          subtitle="Monthly subscription. All tools run 24/7 — staff configure everything, you control the settings."
        />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {ALLIANCE_TIERS.map(tier => (
            <AllianceTierCard
              key={tier.id}
              tier={tier}
              inCart={cartIds.has(tier.id)}
              onAdd={() => addItem({ toolId: tier.id, label: `Alliance Control — ${tier.label}`, price: tier.price })}
            />
          ))}
        </div>
      </div>

      {/* ── Section 2: KvK Premium Bundles ──────────────────────────────────── */}
      <div>
        <SectionHeading
          icon={ScanSearch}
          title="KvK Premium Bundles"
          label="Done For You"
          subtitle="We handle everything — scans, tracking, DKP, reporting. You just receive the results."
        />

        {/* SoC / Non-SoC toggle */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setKvkType('soc')}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors border', kvkType === 'soc' ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border/50 hover:bg-secondary')}
          >
            Season of Conquest
          </button>
          <button
            onClick={() => setKvkType('nonSoc')}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors border', kvkType === 'nonSoc' ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border/50 hover:bg-secondary')}
          >
            Non-SoC
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {KVK_BUNDLES[kvkType].map((bundle, idx) => {
            const isFullKvk = idx === 0
            return (
              <div key={bundle.id} className={cn('flex flex-col rounded-xl border bg-card/60 p-5', isFullKvk ? 'border-primary/25' : 'border-border/50')}>
                {isFullKvk && (
                  <span className="self-start mb-3 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">Full Coverage</span>
                )}
                <p className="text-sm font-bold text-foreground mb-1">{bundle.label}</p>
                <p className="text-xs text-muted-foreground mb-4">{bundle.camps} tracked · Full event duration</p>
                <div className="mb-5">
                  <span className="text-2xl font-bold text-foreground">${bundle.price}</span>
                  <span className="text-xs text-muted-foreground ml-1">one-time per KvK</span>
                </div>
                <div className="flex-1 mb-5">
                  {isFullKvk ? (
                    <FeatureList features={bundle.features} />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                        <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-xs text-primary font-medium">All features from Full KvK</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                        <Check className="h-3 w-3 text-green-400 shrink-0" />
                        Limited to {bundle.camps}
                      </div>
                    </div>
                  )}
                </div>
                <AddBtn toolId={bundle.id} label={`KvK Premium — ${bundle.label} (${kvkType === 'soc' ? 'SoC' : 'Non-SoC'})`} price={bundle.price} bundle={bundle.id} isSoC={kvkType === 'soc'} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 3: KvK Data Tracking ────────────────────────────────────── */}
      <div>
        <SectionHeading
          icon={Database}
          title="KvK Data Tracking"
          label="Self-Service"
          subtitle="Full control in your hands — run scans yourself, manage your own DKP, set your own schedule."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Plan picker */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Choose a plan</p>
            {KVK_TRACKING.map(plan => (
              <button
                key={plan.id}
                onClick={() => setTrackingPlan(plan.id)}
                className={cn(
                  'w-full flex items-center justify-between rounded-xl border p-4 transition-colors text-left',
                  trackingPlan === plan.id
                    ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/50 bg-card/60 hover:border-border'
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">~${plan.perMonth}/mo</p>
                  {plan.saving && <p className="text-[11px] text-green-400 mt-0.5">Save ${plan.saving} vs monthly</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">${plan.price}</p>
                  <p className="text-[10px] text-muted-foreground">total</p>
                </div>
              </button>
            ))}
            <AddBtn
              toolId={selectedTracking.id}
              label={`KvK Data Tracking — ${selectedTracking.label}`}
              price={selectedTracking.price}
            />
          </div>

          {/* Features */}
          <div className="rounded-xl border border-border/50 bg-card/60 p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Included in all plans</p>
            <FeatureList features={KVK_TRACKING_FEATURES} />
          </div>
        </div>
      </div>

      {/* ── Section 4: Multi-Kingdom KvK Data ───────────────────────────────── */}
      <div>
        <SectionHeading
          icon={Globe}
          title="Multi-Kingdom KvK Data"
          label="One-Time Scans"
          subtitle="One-time scan packages across multiple kingdoms. Great for competitive intelligence."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {MULTI_KVK.map(pkg => (
            <div key={pkg.id} className="flex flex-col rounded-xl border border-border/50 bg-card/60 p-5">
              <p className="text-sm font-bold text-foreground mb-1">{pkg.label}</p>
              <p className="text-xs text-muted-foreground mb-4">{pkg.scans} full KvK scans</p>
              <div className="mb-5">
                <span className="text-2xl font-bold text-foreground">${pkg.price}</span>
                <span className="text-xs text-muted-foreground ml-1">one-time</span>
              </div>
              <div className="flex-1 mb-5">
                <FeatureList features={pkg.features} />
              </div>
              <AddBtn toolId={pkg.id} label={`Multi-Kingdom Data — ${pkg.label} (${pkg.scans} scans)`} price={pkg.price} />
            </div>
          ))}
        </div>
      </div>

      {/* Cart panel */}
      {cartOpen && (
        <CheckoutPanel
          cart={cart}
          onClose={() => setCartOpen(false)}
          onRemove={onRemoveFromCart}
          onCheckoutComplete={() => {}}
        />
      )}
    </div>
  )
}
