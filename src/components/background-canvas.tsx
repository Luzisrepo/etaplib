"use client";

/**
 * BackgroundCanvas
 * ────────────────
 * Renders a single fixed, full-screen, pointer-events-none <canvas> behind all
 * app content. Dispatches to one of several procedural "effect" renderers based
 * on the active theme's `effect.type`.
 *
 * Honors the user's QOL settings:
 *  - reduceMotion    → render a single static frame, no rAF loop
 *  - animationSpeed  → multiplies per-frame dt
 *  - particleDensity → scales particle counts (low / med / high)
 *
 * The loop auto-pauses when the tab is hidden (visibilitychange) and resumes on
 * focus. DPR-aware, ResizeObserver-driven.
 *
 * FIX: Effect switching overlap
 * ─────────────────────────────
 * Previously the poll interval (250ms) caused old renderers to keep drawing for
 * up to 250ms after a theme change, visibly overlapping the new effect.
 * Fix: listen to the "etap-settings-changed" event (fired by SettingsDialog on
 * every apply()) to trigger an immediate rebuild — no polling window, no overlap.
 * The poll interval is kept only as a fallback for cross-tab sync.
 * On rebuild we also hard-clear the canvas so no residue from the previous
 * effect's compositing mode (e.g. "lighter" from plasma/aurora) bleeds through.
 */

import { useEffect, useRef } from "react";
import {
  EffectConfig,
  EffectSettings,
  ParticleDensity,
  ThemeId,
  THEMES,
} from "@/lib/settings";

// ── Effect renderer contract ────────────────────────────────────────────────

interface RenderCtx {
  /** CSS pixels (already DPR-scaled backing store). */
  width: number;
  height: number;
  /** Seconds elapsed since previous frame, already scaled by animationSpeed. */
  dt: number;
  /** Current cursor position in CSS px, or null when off-canvas. */
  pointer: { x: number; y: number } | null;
  /** Density multiplier derived from the user's particleDensity setting. */
  densityScale: number;
}

interface EffectRenderer {
  /** Called whenever the canvas backing-store size changes. */
  resize(ctx: RenderCtx): void;
  /** Draw a single frame. Called ~60fps while visible & motion is allowed. */
  frame(ctx: RenderCtx): void;
  /** Optional cleanup of timers / offscreen resources. */
  dispose?(): void;
}

type Factory = (g: CanvasRenderingContext2D, colors: string[]) => EffectRenderer;

// ── Small helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

const DENSITY_SCALE: Record<ParticleDensity, number> = {
  low: 0.5,
  med: 1,
  high: 1.6,
};

// ════════════════════════════════════════════════════════════════════════════
//  RENDERERS
// ════════════════════════════════════════════════════════════════════════════

// ── Constellation: linked particle network that drifts & reacts to cursor ──────
const constellation: Factory = (g, colors) => {
  type P = { x: number; y: number; vx: number; vy: number };
  let particles: P[] = [];
  let w = 0, h = 0;
  const linkColor = colors[0];
  const nodeColors = colors.length > 1 ? colors.slice(1) : colors;

  function rebuild(width: number, height: number, scale: number) {
    w = width; h = height;
    const target = Math.min(160, Math.floor((w * h) / 14000) * scale);
    particles = Array.from({ length: target }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 18,
    }));
  }

  return {
    resize({ width, height, densityScale }) {
      rebuild(width, height, Math.max(0.3, densityScale));
    },
    frame({ width, height, dt, pointer }) {
      if (width !== w || height !== h) rebuild(width, height, particles.length ? 1 : 1);
      // Fade instead of clear → subtle trails
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(0, 0, w, h);

      const linkDist = 130;
      for (const p of particles) {
        // Cursor attraction
        if (pointer) {
          const dx = pointer.x - p.x, dy = pointer.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 26000) {
            const f = 14 / Math.max(40, Math.sqrt(d2));
            p.vx += dx * f * dt;
            p.vy += dy * f * dt;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // wrap
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
        // mild damping
        p.vx *= 0.995; p.vy *= 0.995;
      }

      // Links
      g.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.5;
            g.strokeStyle = rgba(linkColor, alpha);
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
            g.stroke();
          }
        }
      }
      // Nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        g.fillStyle = nodeColors[i % nodeColors.length];
        g.beginPath();
        g.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    },
  };
};

// ── Starfield: hyperspace warp ────────────────────────────────────────────────
const starfield: Factory = (g, colors) => {
  type Star = { x: number; y: number; z: number; pz: number; c: string };
  let stars: Star[] = [];
  let w = 0, h = 0, cx = 0, cy = 0;
  const COUNT_BASE = 360;

  function spawn(s: Star) {
    s.x = (Math.random() - 0.5) * w;
    s.y = (Math.random() - 0.5) * h;
    s.z = Math.max(1, Math.max(w, h));
    s.pz = s.z;
    s.c = colors[Math.floor(Math.random() * colors.length)] ?? "#ffffff";
  }

  function rebuild(width: number, height: number, scale: number) {
    w = width; h = height; cx = w / 2; cy = h / 2;
    const count = Math.floor(COUNT_BASE * scale);
    stars = Array.from({ length: count }, () => {
      const s = { x: 0, y: 0, z: 1, pz: 1, c: "#fff" } as Star;
      spawn(s);
      s.z = Math.random() * Math.max(w, h); // spread initial depth
      s.pz = s.z;
      return s;
    });
  }

  return {
    resize({ width, height, densityScale }) {
      rebuild(width, height, Math.max(0.3, densityScale));
    },
    frame({ width, height, dt }) {
      if (width !== w || height !== h) rebuild(width, height, stars.length ? 1 : 1);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(2,3,10,0.4)";
      g.fillRect(0, 0, w, h);

      const speed = 0.8;
      for (const s of stars) {
        s.pz = s.z;
        s.z -= Math.max(w, h) * speed * dt;
        if (s.z < 1) spawn(s);
        const k = 1 / s.z;
        const px = cx + s.x * k * 200;
        const py = cy + s.y * k * 200;
        const pk = 1 / s.pz;
        const ppx = cx + s.x * pk * 200;
        const ppy = cy + s.y * pk * 200;

        const size = Math.max(0.4, (1 - s.z / Math.max(w, h)) * 2.4);
        g.strokeStyle = s.c;
        g.lineWidth = size;
        g.globalAlpha = Math.min(1, (1 - s.z / Math.max(w, h)) * 1.4);
        g.beginPath();
        g.moveTo(ppx, ppy);
        g.lineTo(px, py);
        g.stroke();
      }
      g.globalAlpha = 1;
    },
  };
};

// ── Matrix Rain: cascading katakana columns ───────────────────────────────────
const matrix: Factory = (g, colors) => {
  const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノﾊﾋﾌﾍﾎ0123456789ABCDEF*+=-".split("");
  const FS = 16; // font size (css px)
  let columns: { y: number; speed: number }[] = [];
  let drops: string[][] = [];
  let w = 0, h = 0, cols = 0;
  const headColor = colors[2] ?? "#aaffaa";
  const bodyColor = colors[0] ?? "#39ff14";

  function rebuild(width: number, height: number) {
    w = width; h = height;
    cols = Math.ceil(w / FS);
    columns = Array.from({ length: cols }, () => ({
      y: Math.random() * -h,
      speed: 60 + Math.random() * 120,
    }));
    drops = Array.from({ length: cols }, () => []);
  }

  return {
    resize({ width, height }) { rebuild(width, height); },
    frame({ width, height, dt }) {
      if (width !== w || height !== h) rebuild(width, height);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(2,6,2,0.12)"; // long-persistence trails
      g.fillRect(0, 0, w, h);

      g.font = `${FS}px "IBM Plex Mono", monospace`;
      g.textBaseline = "top";

      for (let c = 0; c < cols; c++) {
        const col = columns[c];
        col.y += col.speed * dt;
        // push a glyph at the leading edge
        const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        drops[c].push(glyph);
        // cap trail length
        if (drops[c].length > 22) drops[c].shift();

        const x = c * FS;
        for (let i = 0; i < drops[c].length; i++) {
          const yPos = col.y - i * FS;
          if (yPos < -FS || yPos > h) continue;
          const fade = 1 - i / drops[c].length;
          g.fillStyle = i === 0 ? headColor : rgba(bodyColor, fade);
          g.fillText(drops[c][i], x, yPos);
        }
        // reset when fully off-screen
        if (col.y - drops[c].length * FS > h + FS) {
          col.y = -Math.random() * h * 0.5;
          drops[c] = [];
        }
      }
    },
  };
};

// ── Aurora Flow: flowing multi-band ribbons using sine field ──────────────────
const auroraFlow: Factory = (g, colors) => {
  let w = 0, h = 0;
  let bands: { phase: number; speed: number; amp: number; yBase: number; color: string; thick: number }[] = [];
  let t = 0;

  function rebuild(width: number, height: number) {
    w = width; h = height;
    bands = colors.map((color, i) => ({
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + i * 0.05,
      amp: 60 + Math.random() * 80,
      yBase: h * (0.25 + (i / Math.max(1, colors.length - 1)) * 0.5),
      color,
      thick: 90 + Math.random() * 70,
    }));
  }

  return {
    resize({ width, height }) { rebuild(width, height); },
    frame({ width, height, dt }) {
      if (width !== w || height !== h) rebuild(width, height);
      t += dt;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(4,16,28,0.25)";
      g.fillRect(0, 0, w, h);

      g.globalCompositeOperation = "lighter";
      for (const b of bands) {
        const grad = g.createLinearGradient(0, b.yBase - b.thick, 0, b.yBase + b.thick);
        grad.addColorStop(0, rgba(b.color, 0));
        grad.addColorStop(0.5, rgba(b.color, 0.22));
        grad.addColorStop(1, rgba(b.color, 0));
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(0, b.yBase + b.thick);
        for (let x = 0; x <= w; x += 8) {
          const y =
            b.yBase +
            Math.sin(x * 0.004 + t * b.speed + b.phase) * b.amp +
            Math.sin(x * 0.011 + t * b.speed * 1.6) * (b.amp * 0.3);
          g.lineTo(x, y);
        }
        // mirror back along the top to build a ribbon of thickness ~ b.thick
        for (let x = w; x >= 0; x -= 8) {
          const y =
            b.yBase +
            Math.sin(x * 0.004 + t * b.speed + b.phase) * b.amp +
            Math.sin(x * 0.011 + t * b.speed * 1.6) * (b.amp * 0.3) -
            b.thick;
          g.lineTo(x, y);
        }
        g.closePath();
        g.fill();
      }
      g.globalCompositeOperation = "source-over";
    },
  };
};

// ── Plasma: soft flowing colour blobs (metaball-ish via radial gradients) ─────
const plasma: Factory = (g, colors) => {
  type Blob = { x: number; y: number; vx: number; vy: number; r: number; color: string };
  let blobs: Blob[] = [];
  let w = 0, h = 0;

  function rebuild(width: number, height: number, scale: number) {
    w = width; h = height;
    const count = Math.max(4, Math.round(colors.length * 2 * scale));
    blobs = colors.flatMap((color) =>
      Array.from({ length: Math.ceil(count / colors.length) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 24,
        vy: (Math.random() - 0.5) * 24,
        r: (140 + Math.random() * 180),
        color,
      }))
    );
  }

  return {
    resize({ width, height, densityScale }) {
      rebuild(width, height, Math.max(0.4, densityScale));
    },
    frame({ width, height, dt }) {
      if (width !== w || height !== h) rebuild(width, height, 1);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(10,5,24,0.18)";
      g.fillRect(0, 0, w, h);

      g.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < -b.r) b.x = w + b.r; else if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r; else if (b.y > h + b.r) b.y = -b.r;

        const grad = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, rgba(b.color, 0.35));
        grad.addColorStop(0.5, rgba(b.color, 0.10));
        grad.addColorStop(1, rgba(b.color, 0));
        g.fillStyle = grad;
        g.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      g.globalCompositeOperation = "source-over";
    },
  };
};

// ── Registry ─────────────────────────────────────────────────────────────────

const RENDERERS: Record<EffectConfig["type"], Factory> = {
  constellation,
  starfield,
  matrix,
  "aurora-flow": auroraFlow,
  plasma,
};

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  /** Active theme id — when it has an `effect`, the canvas renders it. */
  themeId: ThemeId;
  /** QOL options that modulate the loop. */
  effects: EffectSettings;
  /** When false (e.g. on the landing page unless showOnLanding), render nothing. */
  active: boolean;
}

export function BackgroundCanvas({ themeId, effects, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep the latest props accessible inside the rAF loop without re-subscribing.
  const propsRef = useRef({ themeId, effects, active });
  propsRef.current = { themeId, effects, active };

  useEffect(() => {
    const _canvas = canvasRef.current;
    if (!_canvas) return;
    const _g = _canvas.getContext("2d", { alpha: true });
    if (!_g) return;

    // Aliases so nested closures don't need narrowing.
    const canvas = _canvas;
    const g = _g;

    let renderer: EffectRenderer | null = null;
    let raf = 0;
    let lastTs = 0;
    let visible = true;

    // ── Track which effect key is currently running ──────────────────────
    // This lets us detect a switch and rebuild immediately instead of waiting
    // for the 250ms poll, which was the root cause of overlap.
    let activeKey = "";

    const ro = new ResizeObserver(() => syncSize());
    ro.observe(canvas);

    function syncSize() {
      const cssW = canvas.clientWidth || window.innerWidth;
      const cssH = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.max(1, Math.floor(cssW * dpr));
      const bh = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildKey(): string {
      const { themeId, effects: fx } = propsRef.current;
      return `${themeId}|${fx.reduceMotion}|${fx.particleDensity}`;
    }

    function buildRenderer() {
      const { themeId, effects: fx } = propsRef.current;
      const theme = THEMES.find((t) => t.id === themeId);
      const cfg = theme?.effect;
      if (!cfg) return null;
      const factory = RENDERERS[cfg.type];
      const r = factory(g, cfg.colors);
      r.resize({
        width: canvas.clientWidth || window.innerWidth,
        height: canvas.clientHeight || window.innerHeight,
        dt: 0,
        pointer: null,
        densityScale: (cfg.baseDensity ?? 1) * DENSITY_SCALE[fx.particleDensity],
      });
      return r;
    }

    function frameAt(ts: number) {
      const { effects: fx } = propsRef.current;
      const speed = Math.max(0.05, fx.animationSpeed);
      if (lastTs === 0) lastTs = ts;
      let dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (dt > 0.05) dt = 0.05; // clamp big gaps after tab switch

      const ctx: RenderCtx = {
        width: canvas.clientWidth || window.innerHeight,
        height: canvas.clientHeight || window.innerHeight,
        dt: dt * speed,
        pointer,
        densityScale: DENSITY_SCALE[fx.particleDensity],
      };
      renderer?.frame(ctx);
    }

    function loop(ts: number) {
      const { active, effects: fx } = propsRef.current;
      if (!active || fx.reduceMotion || !visible) {
        raf = 0;
        return;
      }
      frameAt(ts);
      raf = requestAnimationFrame(loop);
    }

    // ── Pointer tracking (cursor only, no touch scroll hijack) ──
    let pointer: { x: number; y: number } | null = null;
    function onMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onLeave() { pointer = null; }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onLeave, { passive: true });

    function onVisibility() {
      visible = document.visibilityState === "visible";
      if (visible && propsRef.current.active && !propsRef.current.effects.reduceMotion) {
        lastTs = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    // ── Boot: hard-clear canvas, dispose old renderer, build new one ──────
    // The hard clearRect + compositing reset is critical: effects like plasma
    // and aurora use globalCompositeOperation = "lighter", which leaves the
    // canvas in a non-default state if they are interrupted mid-frame.
    // Without explicitly resetting these, the next effect inherits the old
    // blending mode and its pixels visually overlap/compound.
    function boot() {
      // 1. Cancel the running animation frame immediately so the old renderer
      //    cannot draw even a single extra frame after we start switching.
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }

      // 2. Dispose old renderer's resources (timers, offscreen buffers, etc.)
      renderer?.dispose?.();
      renderer = null;

      // 3. Hard reset the canvas — clear ALL pixels and reset every context
      //    state that an effect renderer might have mutated.
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);

      // 4. Re-sync DPR transform after the raw clearRect above.
      syncSize();

      // 5. Update the active key so the poll doesn't double-trigger.
      activeKey = buildKey();

      // 6. Build and initialise the new renderer.
      renderer = buildRenderer();

      // 7. Draw one frame immediately (covers reduceMotion + initial paint).
      lastTs = 0;
      frameAt(performance.now());

      // 8. Kick off the animation loop if appropriate.
      const { active, effects: fx } = propsRef.current;
      if (active && !fx.reduceMotion && visible) {
        raf = requestAnimationFrame(loop);
      }
    }

    // Initial boot
    boot();

    // ── React to theme/setting changes via the settings-changed event ─────
    // SettingsDialog dispatches "etap-settings-changed" synchronously on every
    // apply(), so we get an immediate rebuild with zero overlap window.
    function onSettingsChanged() {
      const newKey = buildKey();
      if (newKey !== activeKey) {
        boot();
      } else {
        // Same effect, just active/reduceMotion changed — handle loop state.
        const p = propsRef.current;
        const shouldRun = p.active && !p.effects.reduceMotion && visible;
        if (shouldRun && !raf) { lastTs = 0; raf = requestAnimationFrame(loop); }
        else if (!shouldRun && raf) { cancelAnimationFrame(raf); raf = 0; }
      }
    }
    window.addEventListener("etap-settings-changed", onSettingsChanged);

    // ── Fallback poll for cross-tab sync and active/reduceMotion toggles ──
    // Reduced to 500ms since the event handler covers the fast path.
    const poll = window.setInterval(() => {
      const newKey = buildKey();
      if (newKey !== activeKey) {
        // Cross-tab change — rebuild.
        boot();
        return;
      }
      const p = propsRef.current;
      const shouldRun = p.active && !p.effects.reduceMotion && visible;
      if (shouldRun && !raf) { lastTs = 0; raf = requestAnimationFrame(loop); }
      else if (!shouldRun && raf) { cancelAnimationFrame(raf); raf = 0; }
    }, 500);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
      window.removeEventListener("etap-settings-changed", onSettingsChanged);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer?.dispose?.();
      // Final canvas clear on unmount so no ghost pixels remain if the
      // component is remounted with a different effect.
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="bg-canvas pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
