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

// ── Lightning Storm: branching electric bolts that rake the sky ───────────────
const lightning: Factory = (g, colors) => {
  let w = 0, h = 0;

  // ── Types ────────────────────────────────────────────────────────────────
  type Pt = { x: number; y: number };
  type BoltTree = {
    chains: { pts: Pt[]; width: number; color: string; isTrunk: boolean }[];
    life: number; maxLife: number;
    strikeX: number; strikeY: number; // ground impact point
    flashAlpha: number;               // screen-wide flash this frame
  };

  // Rain drops
  type Drop = { x: number; y: number; len: number; speed: number; alpha: number };

  let bolts: BoltTree[] = [];
  let drops: Drop[] = [];
  let nextStrike = 0;
  let ambientFlash = 0;          // residual screen flash after a strike
  let cloudOffset = 0;           // slowly drifting cloud layer

  // ── Geometry helpers ─────────────────────────────────────────────────────

  // Midpoint displacement fractal bolt — returns ordered list of points
  function fractalSegment(ax: number, ay: number, bx: number, by: number, depth: number, spread: number): Pt[] {
    if (depth === 0) return [{ x: ax, y: ay }, { x: bx, y: by }];
    const mx = (ax + bx) / 2 + (Math.random() - 0.5) * spread;
    const my = (ay + by) / 2 + (Math.random() - 0.5) * spread * 0.4;
    return [
      ...fractalSegment(ax, ay, mx, my, depth - 1, spread * 0.55),
      ...fractalSegment(mx, my, bx, by, depth - 1, spread * 0.55).slice(1),
    ];
  }

  // Build a full bolt tree: one trunk + recursive branches
  function buildTree(startX: number, startY: number, endX: number, endY: number): BoltTree["chains"] {
    const chains: BoltTree["chains"] = [];
    const SPREAD = (Math.abs(endY - startY) * 0.55);
    const trunkPts = fractalSegment(startX, startY, endX, endY, 7, SPREAD);
    chains.push({ pts: trunkPts, width: 2.2 + Math.random(), color: colors[0] ?? "#c084fc", isTrunk: true });

    // Spawn branches from random trunk points
    const branchCount = 3 + Math.floor(Math.random() * 5);
    for (let b = 0; b < branchCount; b++) {
      const srcIdx = Math.floor(trunkPts.length * (0.15 + Math.random() * 0.7));
      const src = trunkPts[srcIdx];
      // Branch angles away from trunk direction
      const trunkAngle = Math.atan2(endY - startY, endX - startX);
      const branchAngle = trunkAngle + (Math.random() - 0.5) * 1.6 + (Math.random() < 0.5 ? 0.4 : -0.4);
      const branchLen = (h * 0.15 + Math.random() * h * 0.25);
      const bex = src.x + Math.cos(branchAngle) * branchLen;
      const bey = src.y + Math.sin(branchAngle) * branchLen;
      const depth = b < 2 ? 5 : 4;
      const branchPts = fractalSegment(src.x, src.y, bex, bey, depth, branchLen * 0.4);
      const col = colors[1 + (b % (colors.length - 1))] ?? colors[0];
      chains.push({ pts: branchPts, width: 0.8 + Math.random() * 0.7, color: col, isTrunk: false });

      // Sub-branches off this branch
      if (Math.random() < 0.5 && branchPts.length > 4) {
        const si2 = Math.floor(branchPts.length * (0.3 + Math.random() * 0.4));
        const s2 = branchPts[si2];
        const a2 = branchAngle + (Math.random() - 0.5) * 1.2;
        const l2 = branchLen * 0.4;
        const sub = fractalSegment(s2.x, s2.y, s2.x + Math.cos(a2) * l2, s2.y + Math.sin(a2) * l2, 3, l2 * 0.35);
        chains.push({ pts: sub, width: 0.4 + Math.random() * 0.3, color: colors[2] ?? col, isTrunk: false });
      }
    }
    return chains;
  }

  function spawnBolt() {
    const startX = w * (0.1 + Math.random() * 0.8);
    const startY = 0;
    const endX   = startX + (Math.random() - 0.5) * w * 0.5;
    const endY   = h * (0.55 + Math.random() * 0.45);
    const chains = buildTree(startX, startY, endX, endY);
    const maxLife = 0.18 + Math.random() * 0.22;
    bolts.push({
      chains, life: 0, maxLife,
      strikeX: endX, strikeY: endY,
      flashAlpha: 0.18 + Math.random() * 0.22,
    });
    ambientFlash = Math.max(ambientFlash, 0.12 + Math.random() * 0.14);
  }

  function initRain(width: number, height: number) {
    drops = Array.from({ length: 220 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 8 + Math.random() * 18,
      speed: 380 + Math.random() * 260,
      alpha: 0.06 + Math.random() * 0.14,
    }));
  }

  function rebuild(width: number, height: number) {
    w = width; h = height;
    bolts = []; nextStrike = 0; ambientFlash = 0;
    initRain(width, height);
  }

  // ── Draw helpers ─────────────────────────────────────────────────────────

  function drawChain(pts: Pt[], baseWidth: number, color: string, alpha: number) {
    if (pts.length < 2) return;
    // Wide diffuse outer glow
    g.lineWidth = baseWidth * 12;
    g.strokeStyle = rgba(color, alpha * 0.04);
    g.shadowBlur = 0;
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();

    // Medium glow
    g.lineWidth = baseWidth * 5;
    g.strokeStyle = rgba(color, alpha * 0.15);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();

    // Tight colored core
    g.lineWidth = baseWidth * 1.5;
    g.strokeStyle = rgba(color, alpha * 0.85);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();

    // Bright white hot center
    g.lineWidth = baseWidth * 0.5;
    g.strokeStyle = rgba("#ffffff", alpha * 0.95);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
  }

  function drawGroundBloom(x: number, y: number, alpha: number, color: string) {
    // Radial explosion at ground impact
    const r = 60 + alpha * 80;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba("#ffffff", alpha * 0.7));
    gr.addColorStop(0.15, rgba(color, alpha * 0.5));
    gr.addColorStop(0.5, rgba(color, alpha * 0.12));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);

    // Horizontal shockwave streak
    g.lineWidth = 1;
    g.strokeStyle = rgba(color, alpha * 0.4);
    g.beginPath();
    g.moveTo(Math.max(0, x - r * 0.9), y);
    g.lineTo(Math.min(w, x + r * 0.9), y);
    g.stroke();
  }

  function drawClouds(tOffset: number) {
    // Roiling dark stormclouds across top third
    g.save();
    const cloudH = h * 0.38;
    const grad = g.createLinearGradient(0, 0, 0, cloudH);
    grad.addColorStop(0,   "rgba(6,4,18,1)");
    grad.addColorStop(0.55,"rgba(10,6,28,0.92)");
    grad.addColorStop(1,   "rgba(4,2,15,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, cloudH);

    // Soft cloud bumps (ellipses) scrolling slowly
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < 7; i++) {
      const cx = ((i / 7 + tOffset * 0.012) % 1.2 - 0.1) * w * 1.2;
      const cy = h * (0.04 + (i % 3) * 0.055);
      const rx = w * (0.12 + (i % 4) * 0.06);
      const ry = h * (0.06 + (i % 2) * 0.035);
      const cg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      cg.addColorStop(0,   "rgba(18,10,40,0.55)");
      cg.addColorStop(0.5, "rgba(12,7,30,0.25)");
      cg.addColorStop(1,   "rgba(0,0,0,0)");
      g.fillStyle = cg;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  return {
    resize({ width, height }) { rebuild(width, height); },
    frame({ width, height, dt }) {
      if (width !== w || height !== h) rebuild(width, height);
      cloudOffset += dt;

      g.setTransform(1, 0, 0, 1, 0, 0);

      // ── Base sky — very slow fade so glow trails linger ──
      g.fillStyle = "rgba(4,2,15,0.55)";
      g.fillRect(0, 0, w, h);

      // ── Ambient screen flash from previous strikes ──
      if (ambientFlash > 0.005) {
        g.fillStyle = rgba(colors[0] ?? "#a78bfa", ambientFlash * 0.18);
        g.fillRect(0, 0, w, h);
        ambientFlash *= 0.82;
      }

      // ── Rain ──
      g.globalCompositeOperation = "source-over";
      for (const d of drops) {
        d.y += d.speed * dt;
        d.x += 18 * dt; // slight wind
        if (d.y > h + d.len) { d.y = -d.len; d.x = Math.random() * w; }
        if (d.x > w + 10) d.x -= w + 20;
        g.strokeStyle = rgba("#8ab4cc", d.alpha + ambientFlash * 0.3);
        g.lineWidth = 0.5;
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.lineTo(d.x + 4, d.y + d.len);
        g.stroke();
      }

      // ── Spawn bolts ──
      nextStrike -= dt;
      if (nextStrike <= 0) {
        spawnBolt();
        if (Math.random() < 0.35) spawnBolt(); // double-strike
        if (Math.random() < 0.1)  spawnBolt(); // triple
        nextStrike = 0.8 + Math.random() * 2.8;
      }

      // ── Draw bolts ──
      g.globalCompositeOperation = "lighter";
      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i];
        bolt.life += dt;
        if (bolt.life >= bolt.maxLife) { bolts.splice(i, 1); continue; }

        const progress = bolt.life / bolt.maxLife;
        // Sharp flash-in (first 8%), bright hold, exponential fade-out
        const alpha = progress < 0.08
          ? progress / 0.08
          : Math.pow(1 - (progress - 0.08) / 0.92, 1.8);

        for (const chain of bolt.chains) {
          drawChain(chain.pts, chain.width, chain.color, alpha * (chain.isTrunk ? 1 : 0.65));
        }

        // Ground bloom at strike point — only while trunk is visible
        if (bolt.chains[0]) {
          drawGroundBloom(bolt.strikeX, bolt.strikeY, alpha * 0.9, bolt.chains[0].color);
        }

        // Per-bolt screen flash on very first frames
        if (progress < 0.04) {
          g.globalCompositeOperation = "source-over";
          g.fillStyle = rgba(bolt.chains[0]?.color ?? "#fff", bolt.flashAlpha * (1 - progress / 0.04) * 0.5);
          g.fillRect(0, 0, w, h);
          g.globalCompositeOperation = "lighter";
        }
      }

      g.globalCompositeOperation = "source-over";

      // ── Storm clouds on top ──
      drawClouds(cloudOffset);
    },
  };
};

// ── Sand Drift: warm particles swept by a curl noise wind field ───────────────
const sandDrift: Factory = (g, colors) => {
  type Grain = { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number };
  let grains: Grain[] = [];
  let w = 0, h = 0;
  let t = 0;

  // Cheap hash-based pseudo-noise (no external deps)
  function noise2(nx: number, ny: number): number {
    const ix = Math.floor(nx), iy = Math.floor(ny);
    const fx = nx - ix, fy = ny - iy;
    const h00 = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
    const h10 = Math.sin((ix + 1) * 127.1 + iy * 311.7) * 43758.5453;
    const h01 = Math.sin(ix * 127.1 + (iy + 1) * 311.7) * 43758.5453;
    const h11 = Math.sin((ix + 1) * 127.1 + (iy + 1) * 311.7) * 43758.5453;
    const a = h00 - Math.floor(h00);
    const b = h10 - Math.floor(h10);
    const c = h01 - Math.floor(h01);
    const d = h11 - Math.floor(h11);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function windAt(x: number, y: number, time: number): [number, number] {
    const scale = 0.002;
    const n1 = noise2(x * scale + time * 0.1, y * scale);
    const n2 = noise2(x * scale + 100, y * scale + time * 0.07);
    // Curl: perpendicular to gradient
    return [
      Math.cos(n1 * Math.PI * 2) * 40 + 15,  // bias rightward like wind
      Math.sin(n2 * Math.PI * 2) * 12,
    ];
  }

  function rebuild(width: number, height: number, scale: number) {
    w = width; h = height;
    const count = Math.floor(Math.min(1800, (w * h) / 900) * scale);
    grains = Array.from({ length: count }, () => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0, vy: 0,
        size: 0.6 + Math.random() * 1.4,
        color,
        alpha: 0.15 + Math.random() * 0.65,
      };
    });
  }

  return {
    resize({ width, height, densityScale }) { rebuild(width, height, densityScale); },
    frame({ width, height, dt }) {
      if (width !== w || height !== h) rebuild(width, height, 1);
      t += dt;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(12,7,0,0.30)";
      g.fillRect(0, 0, w, h);

      for (const gr of grains) {
        const [wx, wy] = windAt(gr.x, gr.y, t);
        // Lerp velocity toward wind
        gr.vx += (wx - gr.vx) * Math.min(1, dt * 3);
        gr.vy += (wy - gr.vy) * Math.min(1, dt * 3);
        gr.x += gr.vx * dt;
        gr.y += gr.vy * dt;

        // Wrap horizontally; respawn from left when going off right
        if (gr.x > w + 4) gr.x = -4;
        if (gr.x < -4) gr.x = w + 4;
        if (gr.y < -4) gr.y = h + 4;
        if (gr.y > h + 4) gr.y = Math.random() * h * 0.3;

        // Speed-based stretch
        const speed = Math.sqrt(gr.vx * gr.vx + gr.vy * gr.vy);
        const stretch = Math.min(4, speed * 0.06 + 1);

        g.globalAlpha = gr.alpha;
        g.fillStyle = gr.color;
        g.beginPath();
        const angle = Math.atan2(gr.vy, gr.vx);
        g.ellipse(gr.x, gr.y, gr.size * stretch, gr.size, angle, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    },
  };
};

// ── Neon Grid: receding perspective grid with glowing scanlines ───────────────
// ── Grid Run: WebGL2 raymarched corridor by Matthias Hurrle (@atzedent) ──────
//
// This effect uses a GLSL fragment shader so it cannot share the 2D canvas
// context that all other renderers use.  Instead, the factory:
//   1. Creates its own <canvas> with a WebGL2 context and appends it to
//      document.body (position:fixed, full-screen, z-index 0).
//   2. Returns a renderer whose frame() drives the WebGL render loop and whose
//      dispose() removes the WebGL canvas and tears down the GL context.
//   3. Leaves the host 2D canvas fully transparent so it sits invisibly above.
//
// Mouse/pointer data is forwarded through RenderCtx.pointer.
// animationSpeed is applied via the time uniform.
//
// The GLSL source is the "Grid Run" shader (MIT/CC0) by @atzedent.

const GRID_RUN_FRAG = `#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*/
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec2 move;
uniform vec2 wheel;
#define FC gl_FragCoord.xy
#define R resolution
#define T (time+113.+.2*wheel.y/MN)
#define S smoothstep
#define N normalize
#define MN min(R.x,R.y)
#define hue(a) (.5+.5*sin(3.14*(a)+vec3(1,2,3)))
#define LP vec3(1.+1.*sin(-T),2.-2.*cos(T),-3.-4.*sin(sin(T)))
vec3 render(vec2 uv);
void main() { O=vec4(render((FC-.5*R)/MN),1); }
float smin(float a, float b, float k) {
  k*=log(2.);
  float x=b-a;
  return a+x/(1.-exp2(x/k));
}
float box(vec3 p, vec3 s, float r) {
  p=abs(p)-s+r;
  return length(max(p,.0))+min(.0,max(max(p.x,p.y),p.z))-r;
}
float glow;
float map(vec3 p, bool g) {
  float d=5e5;
  if (g) {
    d=length(p-LP+vec3(.2,.2,0))-.02;
    glow+=.05/(.05+d*d*80.);
  }
  p.z-=T*3.5;
  p=fract(p)-.5;
  vec4 k=vec4(1,.05,.03,.1);
  float r=1e-2;
  return min(d,smin(
    box(p,k.www,r),
    min(
      box(p,k.zxz,r),
      min(box(p,k.xyz,r),box(p,k.yzx,r))
    ),.01
  ));
}
vec3 norm(vec3 p) {
  float h=1e-3; vec2 k=vec2(-1,1);
  return N(
    k.xyy*map(p+k.xyy*h,false)+
    k.yxy*map(p+k.yxy*h,false)+
    k.yyx*map(p+k.yyx*h,false)+
    k.xxx*map(p+k.xxx*h,false)
  );
}
bool march(inout vec3 p, vec3 rd, out float dd, out float at) {
  for (float i; i++<400.;) {
    float d=map(p,true);
    if (abs(d)<1e-3) return true;
    if (d>100.) return false;
    p+=rd*d;
    dd+=d;
    at+=.05*(.05/dd);
  }
  return false;
}
vec3 dir(vec2 uv, vec3 p, vec3 t, float z) {
  vec3 up=vec3(0,1,0),
  f=N(t-p),
  r=N(cross(up,f)),
  u=N(cross(f,r));
  return mat3(r,u,f)*N(vec3(uv,z));
}
mat3 rotX(float a) {
  float s=sin(a), c=cos(a);
  return mat3(vec3(1,0,0),vec3(0,c,-s),vec3(0,s,c));
}
mat3 rotY(float a) {
  float s=sin(a), c=cos(a);
  return mat3(vec3(c,0,s),vec3(0,1,0),vec3(-s,0,c));
}
float rnd(float a) {
  vec2 p=fract(a*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float curve(float t, float e) {
  t/=e;
  return mix(
    rnd(floor(t)),
    rnd(floor(t)+1.),
    pow(S(.0,1.,fract(t)),10.)
  );
}
vec3 org() {
  float k=-.2*sin(sin(T)), drama=3.14*curve(T*.2,2.);
  vec2 m=move/R;
  vec3 ro=vec3(0,0,.1);
  ro*=rotX(m.y*6.3-k-.1+drama/12.)*rotY(m.x*6.3-.45-sin(cos(T*.2-k+drama)));
  return ro;
}
float shadow(vec3 p, vec3 lp) {
  float shd=1., maxd=length(lp-p);
  vec3 l=N(lp-p);
  for (float i=1e-3; i<maxd;) {
    float d=map(p+l*i,false);
    if (d<1e-3) {
      shd=.0;
      break;
    }
    shd=min(shd,64.*d/i);
    i+=d;
  }
  return shd;
}
float calcAO(vec3 p, vec3 n) {
  float occ=.0, sca=1.;
  for (float i=.0; i<5.; i++) {
    float
    h=.01+i*.09,
    d=map(p+h*n,false);
    occ+=(h-d)*sca;
    sca*=.55;
    if (occ>.35) break;
  }
  return clamp(1.-3.*occ,.0,1.)*(.5+.5*n.y);
}
vec3 render(vec2 uv) {
  vec3 col=vec3(0),
  p=org(), ro=p,
  rd=dir(uv,p,vec3(0),1.);
  float dd, at;
  if (march(p,rd,dd,at)) {
    vec3 n=norm(p), lp=LP, l=N(lp-p),
    e=N(ro-p), r=reflect(-l,n);
    float ld=distance(lp,p), atten=1./(1.+ld*.25+ld*ld*.125),
    ao=calcAO(p,n), shd=shadow(p+n*5e-2,lp);
    col+=shd*atten*vec3(.1,.095,.09)+clamp(dot(l,n),.0,1.)*atten*ao*shd;
    col+=pow(max(.0,dot(r,e)),8.)*atten*ao*shd;
    col+=clamp(dot(-rd,l),.0,1.)*ao*atten*1.2;
  }
  float k=mix(max(.2,1.-distance(LP,ro)),.25,fract(sin(dot(ro,vec3(12.9898,78.233,156.345)))*345678.)),
  f=S(1.,.0,clamp(dd/200.,.0,1.));
  vec3 tint=vec3(1.2,.95,.9);
  col+=tint*at*k;
  col+=hue(3.14*k+f*f*f)*k*k;
  col=mix(col,vec3(1,.95,.9),S(.0,50.,distance(p,ro)));
  col=tanh(col*col);
  col=sqrt(col);
  col=mix(sqrt(col)*1.2,col,clamp(S(-.1,.2,dot(uv,uv)),.0,1.));
  col+=tanh(tint*glow);
  vec2 c=FC/R;
  c*=1.-c.yx;
  float vig=c.x*c.y*25.;
  vig=pow(vig,.25);
  col*=vig;
  return col;
}`;

const GRID_RUN_VERT = `#version 300 es
precision highp float;
in vec4 position;
void main(){ gl_Position=position; }`;

// Factory signature must match — we receive g and colors but don't use them
// since this renderer owns its own WebGL canvas.
const neonGrid: Factory = (_g, _colors) => {
  // ── Create dedicated WebGL canvas ────────────────────────────────────────
  const glCanvas = document.createElement("canvas");
  glCanvas.style.cssText = [
    "position:fixed", "inset:0", "width:100%", "height:100%",
    "z-index:0", "pointer-events:none", "display:block",
  ].join(";");
  document.body.appendChild(glCanvas);

  let gl: WebGL2RenderingContext | null = glCanvas.getContext("webgl2");
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let w = 0, h = 0;
  let elapsedTime = 0;          // accumulates scaled dt
  let mouseMove: [number, number] = [0, 0];
  let wheelOffset: [number, number] = [0, 0];

  // Uniform locations
  let uResolution: WebGLUniformLocation | null = null;
  let uTime:       WebGLUniformLocation | null = null;
  let uMove:       WebGLUniformLocation | null = null;
  let uWheel:      WebGLUniformLocation | null = null;

  function compileShader(type: number, src: string): WebGLShader | null {
    if (!gl) return null;
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("GridRun shader error:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function buildProgram(): WebGLProgram | null {
    if (!gl) return null;
    const vs = compileShader(gl.VERTEX_SHADER,   GRID_RUN_VERT);
    const fs = compileShader(gl.FRAGMENT_SHADER, GRID_RUN_FRAG);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    if (!p) return null;
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error("GridRun link error:", gl.getProgramInfoLog(p));
      gl.deleteProgram(p);
      return null;
    }
    return p;
  }

  function init() {
    if (!gl) return;
    program = buildProgram();
    if (!program) return;

    // Full-screen quad
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    uResolution = gl.getUniformLocation(program, "resolution");
    uTime       = gl.getUniformLocation(program, "time");
    uMove       = gl.getUniformLocation(program, "move");
    uWheel      = gl.getUniformLocation(program, "wheel");
  }

  function syncGLSize(cssW: number, cssH: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.floor(cssW * dpr));
    const bh = Math.max(1, Math.floor(cssH * dpr));
    if (glCanvas.width !== bw || glCanvas.height !== bh) {
      glCanvas.width  = bw;
      glCanvas.height = bh;
      w = bw; h = bh;
      gl?.viewport(0, 0, bw, bh);
    }
  }

  function renderGL(time: number) {
    if (!gl || !program) return;
    gl.useProgram(program);
    if (buffer) gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(uResolution, w, h);
    gl.uniform1f(uTime, time * 1e-3);
    gl.uniform2f(uMove, mouseMove[0], mouseMove[1]);
    gl.uniform2f(uWheel, wheelOffset[0], wheelOffset[1]);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  init();

  return {
    resize({ width, height }) {
      syncGLSize(width, height);
    },
    frame({ width, height, dt, pointer }) {
      syncGLSize(width, height);
      elapsedTime += dt * 1000; // dt is already speed-scaled

      // Forward pointer as move delta (matches the shader's move/R pattern)
      if (pointer) {
        mouseMove = [pointer.x, height - pointer.y];
      }

      renderGL(elapsedTime);

      // The host 2D canvas must stay blank — nothing to draw there.
    },
    dispose() {
      if (gl && program) {
        gl.deleteProgram(program);
        program = null;
      }
      if (gl && buffer) {
        gl.deleteBuffer(buffer);
        buffer = null;
      }
      // Lose the WebGL context explicitly so the GPU releases resources
      const ext = gl?.getExtension("WEBGL_lose_context");
      ext?.loseContext();
      gl = null;
      // Remove the WebGL canvas from the DOM
      if (glCanvas.parentNode) {
        glCanvas.parentNode.removeChild(glCanvas);
      }
    },
  };
};


// ── Fire Embers: rising heat particles with turbulence and glow ───────────────
const fireEmbers: Factory = (g, colors) => {
  type Ember = {
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    size: number; color: string;
    flicker: number; flickerSpeed: number;
    trail: { x: number; y: number }[];
  };
  let embers: Ember[] = [];
  let w = 0, h = 0;
  let t = 0;
  let spawnAcc = 0;

  const BASE_SPAWN_RATE = 18; // embers per second at med density

  function spawnEmber(scale: number) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    // Spawn across a wide band at the bottom
    const x = w * 0.05 + Math.random() * w * 0.9;
    const y = h + 4;
    const maxLife = 2.0 + Math.random() * 2.5;
    embers.push({
      x, y,
      vx: (Math.random() - 0.5) * 30,
      vy: -(40 + Math.random() * 80),
      life: 0,
      maxLife,
      size: (1.2 + Math.random() * 2.8) * Math.max(0.6, scale),
      color,
      flicker: Math.random() * Math.PI * 2,
      flickerSpeed: 4 + Math.random() * 8,
      trail: [],
    });
  }

  function rebuild(width: number, height: number) { w = width; h = height; embers = []; }

  return {
    resize({ width, height }) { rebuild(width, height); },
    frame({ width, height, dt, densityScale }) {
      if (width !== w || height !== h) rebuild(width, height);
      t += dt;

      g.setTransform(1, 0, 0, 1, 0, 0);
      // Deep fade — hot air haze effect
      g.fillStyle = "rgba(6,1,0,0.22)";
      g.fillRect(0, 0, w, h);

      // Spawn new embers
      spawnAcc += BASE_SPAWN_RATE * densityScale * dt;
      while (spawnAcc >= 1) {
        spawnEmber(densityScale);
        spawnAcc -= 1;
      }

      g.globalCompositeOperation = "lighter";

      for (let i = embers.length - 1; i >= 0; i--) {
        const em = embers[i];
        em.life += dt;
        if (em.life >= em.maxLife) { embers.splice(i, 1); continue; }

        const progress = em.life / em.maxLife;

        // Turbulence: sinusoidal + t-offset wind drift
        const turbX = Math.sin(t * 1.3 + em.flicker) * 18 + Math.cos(t * 0.7 + em.x * 0.01) * 10;
        em.vx += (turbX - em.vx) * Math.min(1, dt * 1.8);
        // Slow down vertical as it rises (buoyancy fades)
        em.vy += (0 - em.vy) * dt * 0.3;
        // Slight random wander
        em.vx += (Math.random() - 0.5) * 20 * dt;

        em.x += em.vx * dt;
        em.y += em.vy * dt;

        // Wrap horizontally
        if (em.x < -10) em.x = w + 10;
        if (em.x > w + 10) em.x = -10;
        if (em.y < -20) { embers.splice(i, 1); continue; }

        // Record trail (max 6 points)
        em.trail.push({ x: em.x, y: em.y });
        if (em.trail.length > 6) em.trail.shift();

        // Alpha: fade in quickly, hold, fade out from 70% life
        const alpha = progress < 0.08
          ? progress / 0.08
          : progress > 0.7
            ? 1 - (progress - 0.7) / 0.3
            : 1;
        const flicker = 0.6 + 0.4 * Math.sin(t * em.flickerSpeed + em.flicker);
        const finalAlpha = alpha * flicker;

        // Draw trail
        if (em.trail.length > 1) {
          for (let ti = 1; ti < em.trail.length; ti++) {
            const ta = (ti / em.trail.length) * finalAlpha * 0.3;
            g.strokeStyle = rgba(em.color, ta);
            g.lineWidth = em.size * (ti / em.trail.length);
            g.beginPath();
            g.moveTo(em.trail[ti - 1].x, em.trail[ti - 1].y);
            g.lineTo(em.trail[ti].x, em.trail[ti].y);
            g.stroke();
          }
        }

        // Outer glow halo
        const grad = g.createRadialGradient(em.x, em.y, 0, em.x, em.y, em.size * 4.5);
        grad.addColorStop(0, rgba(em.color, finalAlpha * 0.5));
        grad.addColorStop(0.4, rgba(em.color, finalAlpha * 0.15));
        grad.addColorStop(1, rgba(em.color, 0));
        g.fillStyle = grad;
        g.fillRect(em.x - em.size * 5, em.y - em.size * 5, em.size * 10, em.size * 10);

        // Core bright dot
        g.beginPath();
        g.arc(em.x, em.y, em.size * 0.7, 0, Math.PI * 2);
        g.fillStyle = rgba("#ffffff", finalAlpha * 0.85);
        g.fill();

        // Colored ring
        g.beginPath();
        g.arc(em.x, em.y, em.size * 1.4, 0, Math.PI * 2);
        g.fillStyle = rgba(em.color, finalAlpha * 0.45);
        g.fill();
      }

      g.globalCompositeOperation = "source-over";

      // Heat shimmer at the bottom: a warm gradient fog
      const heatGrad = g.createLinearGradient(0, h * 0.75, 0, h);
      heatGrad.addColorStop(0, rgba(colors[0], 0));
      heatGrad.addColorStop(0.7, rgba(colors[0], 0.06 + 0.03 * Math.sin(t * 1.1)));
      heatGrad.addColorStop(1, rgba(colors[2] ?? colors[0], 0.12));
      g.fillStyle = heatGrad;
      g.fillRect(0, h * 0.75, w, h * 0.25);
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
  lightning,
  "sand-drift": sandDrift,
  "neon-grid": neonGrid,
  "fire-embers": fireEmbers,
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
