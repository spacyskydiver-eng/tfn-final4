'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Crown, Flag, Search, Bell, MessageSquare, ScanSearch,
  ShoppingCart, Check, ChevronDown, ChevronUp, X, Copy, CheckCheck,
  Loader2, ExternalLink, Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  cartId: string   // unique per line item
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

// ─── Tool catalogue ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: 'kvk-scanner',
    label: 'KvK Scanner',
    icon: ScanSearch,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    tagline: 'Automated KvK rankings, DKP tracking, and scan scheduling.',
    description:
      'The bot logs into your kingdom every day and scrapes the full Top 300 rankings. Get live DKP scores, kill counts, deads, and honor points — automatically uploaded to your dashboard.',
    features: [
      'Automated daily top-300 scans',
      'DKP formula with custom weights',
      'Pre-KvK & seeding snapshots',
      'Honor point tracking',
      'Per-player DKP goals',
      'Configurable scan schedule',
    ],
    hasBundle: true,
    bundles: [
      { id: 'full-kvk',  label: 'Full KvK',        camps: 4, socPrice: 200, nonSocPrice: 100 },
      { id: 'two-camp',  label: 'Two Camp Bundle',  camps: 2, socPrice: 100, nonSocPrice: 50  },
      { id: 'one-camp',  label: 'One Camp Bundle',  camps: 1, socPrice: 50,  nonSocPrice: 25  },
    ],
  },
  {
    id: 'title-giving',
    label: 'Title Giving',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    tagline: 'Auto-rotate kingdom titles 24/7 — never miss a title window.',
    description:
      'Assigns Duke, Architect, Justice, and Scientist titles to your priority list on a configurable timer. Skips offline players and follows your alliance rules automatically.',
    features: [
      'Configurable rotation schedule',
      'Priority player lists',
      'Alliance-based rules',
      'Auto skip offline players',
    ],
    hasBundle: false,
    price: 20,
  },
  {
    id: 'fort-tracking',
    label: 'Fort Tracking',
    icon: Flag,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    tagline: 'Real-time fort attack & defence monitoring.',
    description:
      'Watches fort activity and logs every attack, capture, and defence event to your dashboard with timestamps. Get Discord alerts the moment a fort comes under attack.',
    features: [
      'Real-time attack alerts',
      'Defence log with timestamps',
      'Alliance fort assignments',
      'Export to CSV',
    ],
    hasBundle: false,
    price: 20,
  },
  {
    id: 'player-finder',
    label: 'Player Finder',
    icon: Search,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    tagline: 'Search any player by name, ID, or alliance across kingdoms.',
    description:
      'Instantly search for players across all connected kingdoms. Pull up power, kill counts, alliance membership, and commander profile snapshots without opening the game.',
    features: [
      'Cross-kingdom search',
      'Power & kill filters',
      'Alliance membership lookup',
      'Profile snapshot',
    ],
    hasBundle: false,
    price: 15,
  },
  {
    id: 'alliance-mob',
    label: 'Alliance Mobilization',
    icon: Bell,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    tagline: 'Auto-ping alliance chat when a rally or fort needs you.',
    description:
      'Detects fort attacks or rally launches and immediately sends a coordinated mobilization message in alliance chat with the target coordinates. Configurable cooldown to prevent spam.',
    features: [
      'Configurable message templates',
      'Auto-trigger on fort attack',
      'Cooldown to prevent spam',
      'Target coordinate injection',
    ],
    hasBundle: false,
    price: 20,
  },
  {
    id: 'discord-verify',
    label: 'Discord Verification',
    icon: MessageSquare,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    tagline: 'Link Discord accounts to governor IDs and auto-assign roles.',
    description:
      'A verification flow in your Discord server where members confirm their in-game governor ID. Automatically assigns kingdom, alliance, and rank roles based on their profile.',
    features: [
      'Governor ID verification',
      'Auto role assignment',
      'Kingdom & alliance roles',
      'Re-verification on power change',
    ],
    hasBundle: false,
    price: 15,
  },
]

// ─── Bundle picker subcomponent ───────────────────────────────────────────────

interface BundlePickerProps {
  bundles: { id: string; label: string; camps: number; socPrice: number; nonSocPrice: number }[]
  onAdd: (bundle: string, isSoC: boolean, price: number, label: string) => void
}

function BundlePicker({ bundles, onAdd }: BundlePickerProps) {
  const [isSoC, setIsSoC] = useState(true)

  return (
    <div className="mt-4 space-y-3">
      {/* SoC toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsSoC(true)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors border',
            isSoC
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'text-muted-foreground border-border/50 hover:bg-secondary'
          )}
        >
          Season of Conquest
        </button>
        <button
          onClick={() => setIsSoC(false)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors border',
            !isSoC
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'text-muted-foreground border-border/50 hover:bg-secondary'
          )}
        >
          Non-SoC
        </button>
      </div>

      {bundles.map(b => {
        const price = isSoC ? b.socPrice : b.nonSocPrice
        return (
          <div
            key={b.id}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{b.label}</p>
              <p className="text-xs text-muted-foreground">{b.camps} camp{b.camps > 1 ? 's' : ''} tracked</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">${price}</span>
              <button
                onClick={() => onAdd(b.id, isSoC, price, b.label)}
                className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25 border border-primary/20"
              >
                <ShoppingCart className="h-3 w-3" />
                Add
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tool card ────────────────────────────────────────────────────────────────

interface ToolCardProps {
  tool: typeof TOOLS[number]
  inCart: boolean
  onAddToCart: (item: Omit<CartItem, 'cartId'>) => void
  onNavigate: (tab: string) => void
}

function ToolCard({ tool, inCart, onAddToCart, onNavigate }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = tool.icon

  return (
    <div className={cn(
      'flex flex-col rounded-xl border bg-card/60 transition-all duration-200',
      inCart ? 'border-primary/30 shadow-[0_0_20px_-8px_hsl(var(--glow)/0.3)]' : 'border-border/50 hover:border-border'
    )}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tool.bg)}>
              <Icon className={cn('h-5 w-5', tool.color)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{tool.label}</h3>
                {inCart && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                    <Check className="h-2.5 w-2.5" /> In cart
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{tool.tagline}</p>
            </div>
          </div>
          {!tool.hasBundle && (
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-foreground">${tool.price}</p>
              <p className="text-[10px] text-muted-foreground">per KvK</p>
            </div>
          )}
        </div>

        {/* Feature pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tool.features.map(f => (
            <span key={f} className="rounded-md bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded description + bundle picker */}
      {expanded && (
        <div className="border-t border-border/50 px-5 py-4">
          <p className="text-sm text-muted-foreground">{tool.description}</p>
          {tool.hasBundle && tool.bundles && (
            <BundlePicker
              bundles={tool.bundles}
              onAdd={(bundle, isSoC, price, bundleLabel) => {
                onAddToCart({
                  toolId: tool.id,
                  label: `${tool.label} — ${bundleLabel}`,
                  bundle,
                  isSoC,
                  price,
                })
              }}
            />
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-auto flex items-center justify-between border-t border-border/50 px-5 py-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Less' : 'Details'}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate(tool.id)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Preview
          </button>

          {!tool.hasBundle && !inCart && (
            <button
              onClick={() =>
                onAddToCart({
                  toolId: tool.id,
                  label: tool.label,
                  price: tool.price!,
                })
              }
              className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25 border border-primary/20"
            >
              <ShoppingCart className="h-3 w-3" />
              Add to cart
            </button>
          )}

          {!tool.hasBundle && inCart && (
            <span className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 border border-green-500/20">
              <Check className="h-3 w-3" /> Added
            </span>
          )}

          {tool.hasBundle && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25 border border-primary/20"
            >
              <ShoppingCart className="h-3 w-3" />
              Choose bundle
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Checkout panel (product key display) ─────────────────────────────────────

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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 flex h-full max-h-screen w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {step === 'cart' ? 'Cart' : 'Order Confirmed'}
            </h2>
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
                  <p className="text-xs text-muted-foreground/60 mt-1">Browse the tools below and add them to your cart.</p>
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
                      <button
                        onClick={() => onRemove(item.cartId)}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
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
                Order placed! Copy your product key and redeem it in our Discord server.
              </div>

              {/* Items summary */}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground mb-2">Order summary</p>
                {cart.map(item => (
                  <div key={item.cartId} className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.label}{item.isSoC !== undefined ? ` (${item.isSoC ? 'SoC' : 'Non-SoC'})` : ''}</span>
                    <span>${item.price}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-semibold text-foreground border-t border-border/50 pt-2 mt-2">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>

              {/* Single product key */}
              {productKey && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Your product key</p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm font-semibold text-foreground tracking-widest">
                    <span className="flex-1 select-all">{productKey}</span>
                    <button
                      onClick={copyKey}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <CheckCheck className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Next steps</p>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Join the TFN Discord server</li>
                  <li>Use the <span className="font-mono bg-muted/50 px-1 rounded">/activate</span> slash command (visible only to you)</li>
                  <li>Paste your product key when prompted</li>
                  <li>A private ticket will open with our staff team</li>
                  <li>Complete payment via PayPal — staff will set everything up for you</li>
                </ol>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'cart' && cart.length > 0 && (
          <div className="border-t border-border p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-foreground">${total}</span>
            </div>
            {!user ? (
              <>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
                  You need to sign in with Discord before placing an order.
                </div>
                <button
                  onClick={login}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign in with Discord
                </button>
              </>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? 'Processing...' : 'Confirm Order'}
              </button>
            )}
            <p className="text-center text-[10px] text-muted-foreground/60">
              Payment via PayPal after staff review. No charge yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BotToolsHome({ cart, onAddToCart, onRemoveFromCart, onOpenCart, onNavigate }: BotToolsHomeProps) {
  const [cartOpen, setCartOpen] = useState(false)
  const cartCount = cart.length

  const cartToolIds = new Set(cart.map(i => i.toolId))

  function addToCart(item: Omit<CartItem, 'cartId'>) {
    onAddToCart(item)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bot Tools Store</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Automate your Rise of Kingdoms kingdom with our suite of bots. Each tool is set up by our staff — you just provide the kingdom details.
          </p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card hover:border-border"
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {[
          { n: '1', text: 'Add tools to cart' },
          { n: '2', text: 'Confirm order — get product key' },
          { n: '3', text: 'Redeem key in TFN Discord' },
          { n: '4', text: 'Staff sets up & activates your bot' },
        ].map(s => (
          <div key={s.n} className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {s.n}
            </span>
            <p className="text-xs text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {TOOLS.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            inCart={cartToolIds.has(tool.id)}
            onAddToCart={addToCart}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* Cart panel */}
      {cartOpen && (
        <CheckoutPanel
          cart={cart}
          onClose={() => setCartOpen(false)}
          onRemove={onRemoveFromCart}
          onCheckoutComplete={() => {/* cart cleared by parent */}}
        />
      )}
    </div>
  )
}
