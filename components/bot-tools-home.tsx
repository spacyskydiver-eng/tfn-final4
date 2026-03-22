'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Crown, Flag, Search, Bell, ScanSearch,
  ShoppingCart, Check, X, Copy, CheckCheck,
  Loader2, Star, Zap, Trophy, Database, Globe, Users,
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

// ─── Alliance Control tiers ───────────────────────────────────────────────────

const ALLIANCE_TIERS = [
  {
    id: 'alliance-basic',
    label: 'Basic',
    price: 19,
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    highlight: false,
    features: [
      'Title Giving (auto-rotate 24/7)',
      'Player Finder (cross-kingdom search)',
      'Fort Tracking (real-time alerts)',
    ],
    individualValue: 55,
  },
  {
    id: 'alliance-elite',
    label: 'Elite',
    price: 29,
    icon: Star,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Title Giving (auto-rotate 24/7)',
      'Player Finder (cross-kingdom search)',
      'Fort Tracking (real-time alerts)',
      'Alliance Mobilization (auto-ping on attack)',
    ],
    individualValue: 75,
  },
  {
    id: 'alliance-legendary',
    label: 'Legendary',
    price: 39,
    icon: Trophy,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    highlight: false,
    features: [
      'Title Giving (auto-rotate 24/7)',
      'Player Finder (cross-kingdom search)',
      'Fort Tracking (real-time alerts)',
      'Alliance Mobilization (auto-ping on attack)',
      'KvK Data Tracking (1 month self-service)',
    ],
    individualValue: 104,
  },
]

// ─── KvK Premium bundles ──────────────────────────────────────────────────────

const KVK_BUNDLES = {
  soc: [
    { id: 'soc-full',     label: 'Full KvK',       camps: 4, price: 150 },
    { id: 'soc-two',      label: 'Two Camp Bundle', camps: 2, price: 80  },
    { id: 'soc-one',      label: 'One Camp Bundle', camps: 1, price: 40  },
  ],
  nonSoc: [
    { id: 'nonsoc-full',  label: 'Full KvK',        camps: 4, price: 80  },
    { id: 'nonsoc-two',   label: 'Two Camp Bundle',  camps: 2, price: 40  },
    { id: 'nonsoc-one',   label: 'One Camp Bundle',  camps: 1, price: 20  },
  ],
}

// ─── KvK Data Tracking (self-service) ─────────────────────────────────────────

const KVK_TRACKING = [
  { id: 'tracking-1mo',  label: '1 Month',  price: 29,  perMonth: 29  },
  { id: 'tracking-2mo',  label: '2 Months', price: 55,  perMonth: 27.5 },
  { id: 'tracking-1yr',  label: '1 Year',   price: 240, perMonth: 20  },
]

// ─── Multi-Kingdom scan packages ──────────────────────────────────────────────

const MULTI_KVK = [
  { id: 'multi-basic',     label: 'Basic',     scans: 10,  price: 55  },
  { id: 'multi-elite',     label: 'Elite',     scans: 25,  price: 85  },
  { id: 'multi-legendary', label: 'Legendary', scans: 60,  price: 150 },
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
                Order placed! Copy your product key and redeem it in our Discord server.
              </div>
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
                  <li>Complete payment via PayPal — staff will set everything up</li>
                </ol>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{error}</div>
          )}
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

// ─── Section header ────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BotToolsHome({ cart, onAddToCart, onRemoveFromCart, onOpenCart, onNavigate }: BotToolsHomeProps) {
  const [cartOpen, setCartOpen] = useState(false)
  const [kvkType, setKvkType] = useState<'soc' | 'nonSoc'>('soc')
  const cartCount = cart.length
  const cartIds = new Set(cart.map(i => i.toolId))

  function addItem(item: Omit<CartItem, 'cartId'>) {
    onAddToCart(item)
  }

  function AddButton({ toolId, label, price, bundle, isSoC }: { toolId: string; label: string; price: number; bundle?: string; isSoC?: boolean }) {
    const inCart = cartIds.has(toolId)
    if (inCart) {
      return (
        <span className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 border border-green-500/20">
          <Check className="h-3 w-3" /> Added
        </span>
      )
    }
    return (
      <button
        onClick={() => addItem({ toolId, label, price, bundle, isSoC })}
        className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25 border border-primary/20"
      >
        <ShoppingCart className="h-3 w-3" />
        Add to cart
      </button>
    )
  }

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bot Tools Store</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Automate your Rise of Kingdoms kingdom with TFN&apos;s bot suite. Staff handles setup — you just provide kingdom details.
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
          { n: '1', text: 'Choose a plan or package' },
          { n: '2', text: 'Confirm order — get product key' },
          { n: '3', text: 'Redeem key in TFN Discord' },
          { n: '4', text: 'Staff sets up & activates your bot' },
        ].map(s => (
          <div key={s.n} className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{s.n}</span>
            <p className="text-xs text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      {/* ── Section 1: Alliance Control ─────────────────────────────────────── */}
      <div>
        <SectionTitle
          icon={Crown}
          title="Alliance Control"
          subtitle="Monthly subscription. Includes Title Giving, Fort Tracking, Player Finder, and more depending on tier."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ALLIANCE_TIERS.map(tier => {
            const Icon = tier.icon
            const savings = Math.round((1 - tier.price / tier.individualValue) * 100)
            return (
              <div
                key={tier.id}
                className={cn(
                  'relative flex flex-col rounded-xl border p-5',
                  tier.highlight
                    ? 'border-primary/40 bg-primary/5 shadow-[0_0_30px_-10px_hsl(var(--glow)/0.25)]'
                    : 'border-border/50 bg-card/60'
                )}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {tier.badge}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tier.bg)}>
                    <Icon className={cn('h-4 w-4', tier.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tier.label}</p>
                    <p className="text-[10px] text-muted-foreground">Save {savings}% vs individual</p>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">${tier.price}</span>
                  <span className="text-xs text-muted-foreground ml-1">/mo</span>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Individual value ~${tier.individualValue}/mo</p>
                </div>
                <ul className="space-y-2 flex-1 mb-5">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <AddButton toolId={tier.id} label={`Alliance Control — ${tier.label}`} price={tier.price} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 2: KvK Premium Bundles ──────────────────────────────────── */}
      <div>
        <SectionTitle
          icon={ScanSearch}
          title="KvK Premium Bundles"
          subtitle="Done-for-you KvK data scanning. Staff sets up automated scans for the full event duration."
        />
        {/* SoC / Non-SoC toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setKvkType('soc')}
            className={cn(
              'rounded-lg px-4 py-1.5 text-xs font-medium transition-colors border',
              kvkType === 'soc'
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'text-muted-foreground border-border/50 hover:bg-secondary'
            )}
          >
            Season of Conquest
          </button>
          <button
            onClick={() => setKvkType('nonSoc')}
            className={cn(
              'rounded-lg px-4 py-1.5 text-xs font-medium transition-colors border',
              kvkType === 'nonSoc'
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'text-muted-foreground border-border/50 hover:bg-secondary'
            )}
          >
            Non-SoC
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {KVK_BUNDLES[kvkType].map(bundle => (
            <div key={bundle.id} className="flex flex-col rounded-xl border border-border/50 bg-card/60 p-5">
              <p className="text-sm font-semibold text-foreground mb-1">{bundle.label}</p>
              <p className="text-xs text-muted-foreground mb-4">{bundle.camps} camp{bundle.camps > 1 ? 's' : ''} tracked · Full event duration</p>
              <div className="mb-5 mt-auto">
                <span className="text-2xl font-bold text-foreground">${bundle.price}</span>
                <span className="text-xs text-muted-foreground ml-1">one-time</span>
              </div>
              <AddButton toolId={`kvk-bundle-${bundle.id}`} label={`KvK Bundle — ${bundle.label} (${kvkType === 'soc' ? 'SoC' : 'Non-SoC'})`} price={bundle.price} bundle={bundle.id} isSoC={kvkType === 'soc'} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: KvK Data Tracking (self-service) ─────────────────────── */}
      <div>
        <SectionTitle
          icon={Database}
          title="KvK Data Tracking"
          subtitle="Self-service access to the KvK scanner dashboard. You control the scans and schedule."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {KVK_TRACKING.map(plan => (
            <div key={plan.id} className="flex flex-col rounded-xl border border-border/50 bg-card/60 p-5">
              <p className="text-sm font-semibold text-foreground mb-1">{plan.label}</p>
              <p className="text-xs text-muted-foreground mb-4">
                ~${plan.perMonth}/mo · Full scanner access
              </p>
              <div className="mb-5 mt-auto">
                <span className="text-2xl font-bold text-foreground">${plan.price}</span>
                <span className="text-xs text-muted-foreground ml-1">total</span>
              </div>
              <AddButton toolId={`tracking-${plan.id}`} label={`KvK Data Tracking — ${plan.label}`} price={plan.price} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Multi-Kingdom KvK Data ───────────────────────────────── */}
      <div>
        <SectionTitle
          icon={Globe}
          title="Multi-Kingdom KvK Data"
          subtitle="One-time scan packages covering multiple kingdoms. Great for competitive intelligence across regions."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MULTI_KVK.map(pkg => (
            <div key={pkg.id} className="flex flex-col rounded-xl border border-border/50 bg-card/60 p-5">
              <p className="text-sm font-semibold text-foreground mb-1">{pkg.label}</p>
              <p className="text-xs text-muted-foreground mb-4">{pkg.scans} kingdom scans included</p>
              <div className="mb-5 mt-auto">
                <span className="text-2xl font-bold text-foreground">${pkg.price}</span>
                <span className="text-xs text-muted-foreground ml-1">one-time</span>
              </div>
              <AddButton toolId={`multi-${pkg.id}`} label={`Multi-Kingdom Data — ${pkg.label} (${pkg.scans} scans)`} price={pkg.price} />
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
          onCheckoutComplete={() => {/* cart cleared by parent */}}
        />
      )}
    </div>
  )
}
