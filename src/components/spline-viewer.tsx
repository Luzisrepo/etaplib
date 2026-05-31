"use client";

import { useEffect, useRef } from "react";

type Props = { scene: string; onLoad?: () => void };

export function SplineViewer({ scene, onLoad }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any = null;

    async function init() {
      const { Application } = await import("@splinetool/runtime");
      if (destroyed || !canvasRef.current) return;
      app = new Application(canvasRef.current);
      await app.load(scene);
      if (!destroyed) onLoad?.();
    }

    void init();
    return () => {
      destroyed = true;
      try { app?.dispose?.(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", background: "#0d1117" }}
    />
  );
}
