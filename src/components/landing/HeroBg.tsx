"use client";

import { useEffect, useRef } from "react";

export function HeroBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Particle effect — very lightweight, 40 particles
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let w = 0, h = 0;

    function resize() {
      if (!canvas) return;
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    }

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; decay: number };
    const particles: Particle[] = [];

    function spawn(): Particle {
      return {
        x: Math.random() * w,
        y: h + 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(Math.random() * 0.6 + 0.2),
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.4 + 0.1,
        decay: Math.random() * 0.002 + 0.001,
      };
    }

    for (let i = 0; i < 40; i++) {
      const p = spawn();
      p.y = Math.random() * h; // start distributed
      particles.push(p);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y < -10) {
          particles[i] = spawn();
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249, 115, 22, ${p.alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* Primary orange glow — center-bottom */}
        <div
          className="animate-blob-1 absolute rounded-full opacity-[0.12]"
          style={{
            width: 900,
            height: 900,
            left: "50%",
            top: "60%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, #f97316 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        {/* Secondary amber — top-right */}
        <div
          className="animate-blob-2 absolute rounded-full opacity-[0.08]"
          style={{
            width: 600,
            height: 600,
            right: "5%",
            top: "10%",
            background: "radial-gradient(circle, #fb923c 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
        {/* Tertiary deep blue — left */}
        <div
          className="animate-blob-3 absolute rounded-full opacity-[0.06]"
          style={{
            width: 500,
            height: 500,
            left: "0%",
            top: "30%",
            background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
            filter: "blur(120px)",
          }}
        />

        {/* Dot grid overlay */}
        <div className="dot-grid absolute inset-0 opacity-100" />

        {/* Subtle horizontal line */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: "62%",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.15) 50%, transparent)",
          }}
        />
      </div>

      {/* Floating particles canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
        aria-hidden
      />
    </>
  );
}
