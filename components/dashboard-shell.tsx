"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ContentPanel } from "@/components/content-panel";
import { AnimatedBackground } from "@/components/animated-background";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/components/bot-tools-home";

// ─── Mouse Trail Overlay ───────────────────────────────────────────────────────
// Uses direct DOM manipulation (no React state) for 60fps performance.
// Each particle has a timestamp so it fades out over time even when the mouse stops.

type TrailPoint = { x: number; y: number; t: number }; // t = Date.now() at creation

function MouseTrailOverlay() {
  const { settings, currentColor } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef    = useRef<TrailPoint[]>([]);
  const rafRef       = useRef<number>(0);
  const length = settings.mouseTrailLength ?? 14;
  const size   = settings.mouseTrailSize   ?? 22;

  // Derive colour once — custom override or theme HSL
  const trailColor = settings.mouseTrailColor
    ?? `hsl(${currentColor.hue} ${currentColor.saturation}% ${currentColor.lightness}%)`;

  const onMove = useCallback((e: MouseEvent) => {
    const now = Date.now();
    pointsRef.current.unshift({ x: e.clientX, y: e.clientY, t: now });
    if (pointsRef.current.length > length) pointsRef.current.length = length;
  }, [length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Build particle divs
    el.innerHTML = "";
    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < length; i++) {
      const div = document.createElement("div");
      div.style.cssText = `
        position:absolute; top:0; left:0;
        width:${size}px; height:${size}px;
        pointer-events:none; will-change:transform,opacity;
        opacity:0; border-radius:50%;
      `;
      if (settings.mouseTrailIcon) {
        const img = document.createElement("img");
        img.src = settings.mouseTrailIcon;
        img.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;";
        img.draggable = false;
        div.appendChild(img);
      } else {
        // Glowing dot
        div.style.background = `radial-gradient(circle, ${trailColor} 0%, transparent 70%)`;
        div.style.filter = "blur(1px)";
      }
      el.appendChild(div);
      particles.push(div);
    }

    // FADE_MS: how long (ms) a particle lives after it was created.
    // Older particles die faster; newest one lives up to FADE_MS.
    const FADE_MS = 600;

    const animate = () => {
      const pts = pointsRef.current;
      const now = Date.now();

      particles.forEach((p, i) => {
        const pt = pts[i];
        if (!pt) { p.style.opacity = "0"; return; }

        // Position-based age (newer = index 0)
        const posAge = i / length;               // 0 → newest, 1 → oldest

        // Time-based age: how long since this point was recorded
        const elapsed   = now - pt.t;            // ms since created
        const timeAlive = Math.max(0, 1 - elapsed / FADE_MS);   // 1→0 as time passes

        // Combined: position AND time must both be "young" to stay visible
        const combined = timeAlive * (1 - posAge);

        const opacity = combined * (settings.mouseTrailIcon ? 0.88 : 0.92);
        const scale   = settings.mouseTrailIcon
          ? 0.45 + combined * 0.55
          : 0.3  + combined * 0.7;

        if (opacity < 0.005) {
          p.style.opacity = "0";
          return;
        }
        p.style.opacity   = String(opacity.toFixed(3));
        p.style.transform = `translate(${pt.x - size / 2}px, ${pt.y - size / 2}px) scale(${scale.toFixed(3)})`;
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
      pointsRef.current = [];
    };
  // Re-run whenever relevant settings change so particles re-build
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, size, settings.mouseTrailIcon, trailColor]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
    />
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────

export function DashboardShell() {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { settings, currentColor } = useTheme();

  // If URL contains ?request=<id>, auto-navigate to staff portal
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('request')) setActiveTab('staff-portal')
  }, []);

  function addToCart(item: Omit<CartItem, 'cartId'>) {
    setCart(prev => [...prev, { ...item, cartId: `${item.toolId}-${Date.now()}` }])
  }
  function removeFromCart(cartId: string) {
    setCart(prev => prev.filter(i => i.cartId !== cartId))
  }
  function clearCart() {
    setCart([])
  }

  // Cursor glow tracking
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!settings.cursorGlowEnabled) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
    });
  }, [settings.cursorGlowEnabled]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  const glowHsl    = settings.cursorGlowColor
    ? settings.cursorGlowColor
    : `hsl(${currentColor.hue} ${currentColor.saturation}% ${currentColor.lightness}%)`;
  const glowSize   = settings.cursorGlowSize   ?? 220;
  const glowAlpha  = ((settings.cursorGlowOpacity ?? 35) / 100).toFixed(2);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AnimatedBackground />

      {/* ── Mouse trail overlay ── */}
      {settings.mouseTrailEnabled && <MouseTrailOverlay />}

      {/* ── Cursor glow overlay ── */}
      {settings.cursorGlowEnabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
        >
          <div
            ref={glowRef}
            className="absolute"
            style={{
              width: glowSize * 2,
              height: glowSize * 2,
              marginLeft: -glowSize,
              marginTop: -glowSize,
              borderRadius: "50%",
              background: `radial-gradient(circle, color-mix(in srgb, ${glowHsl} ${Math.round(Number(glowAlpha) * 100)}%, transparent) 0%, transparent 70%)`,
              willChange: "transform",
              transform: "translate(-9999px, -9999px)",
            }}
          />
        </div>
      )}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        cartCount={cart.length}
        onCartClick={() => setActiveTab('bot-tools-home')}
      />
      <div
        className={cn(
          "relative z-10 flex-1 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        )}
      >
        <ContentPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          cart={cart}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
          onClearCart={clearCart}
        />
      </div>
    </div>
  );
}
