"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type HowItWorksStep = {
  n: string;
  title: string;
  text: string;
  video: { mp4: string; webm: string; poster: string };
};

/**
 * "Como funciona" com vídeos da app demo: lista de passos à esquerda,
 * vídeo à direita. Avança sozinho no fim de cada vídeo; clicar num passo
 * salta para ele. Só reproduz enquanto está visível e respeita
 * "reduzir movimento" (mostra a imagem fixa e controlos).
 */
export function HowItWorks({ steps }: { steps: HowItWorksStep[] }) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reproduz só quando visível (e sem "reduzir movimento").
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (visible && !reducedMotion) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [visible, reducedMotion, active]);

  const goTo = useCallback((i: number) => {
    setProgress(0);
    setActive(i);
  }, []);

  const step = steps[active];

  return (
    <div
      ref={sectionRef}
      className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12"
    >
      <ol className="m-0 flex list-none flex-col gap-2 p-0 lg:col-span-4">
        {steps.map((s, i) => {
          const isActive = i === active;
          return (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-pressed={isActive}
                aria-controls="como-funciona-video"
                className={`group flex w-full cursor-pointer flex-col gap-2 rounded-md border px-6 py-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  isActive
                    ? "border-line bg-paper-card"
                    : "border-transparent bg-transparent hover:bg-paper-card/60"
                }`}
              >
                <span className="flex items-baseline gap-4">
                  <span
                    className={`display-serif text-[40px] leading-none ${
                      isActive ? "text-accent" : "text-ink-muted"
                    }`}
                  >
                    {s.n}
                  </span>
                  <span
                    className={`text-[20px] font-semibold ${
                      isActive ? "text-ink" : "text-ink-2"
                    }`}
                  >
                    {s.title}
                  </span>
                </span>
                <span
                  className={`text-[15px] leading-[1.6] text-ink-2 ${
                    isActive ? "block" : "hidden lg:block lg:text-ink-muted"
                  }`}
                >
                  {s.text}
                </span>
                {isActive && !reducedMotion && (
                  <span
                    aria-hidden="true"
                    className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-line"
                  >
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <figure className="m-0 lg:col-span-8">
        <div className="overflow-hidden rounded-lg border border-line bg-paper-card shadow-[0_30px_60px_-30px_rgba(13,44,74,0.3)]">
          <div
            aria-hidden="true"
            className="flex items-center gap-2 border-b border-line px-4 py-3"
          >
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="ml-3 font-mono text-[11px] tracking-wide text-ink-muted">
              drivecell · oficina demo
            </span>
          </div>
          <video
            id="como-funciona-video"
            key={step.n}
            ref={videoRef}
            className="block aspect-[8/5] w-full bg-paper"
            poster={step.video.poster}
            muted
            playsInline
            preload="metadata"
            controls={reducedMotion}
            aria-label={`Demonstração: ${step.title}`}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onEnded={() => goTo((active + 1) % steps.length)}
          >
            <source src={step.video.webm} type="video/webm" />
            <source src={step.video.mp4} type="video/mp4" />
          </video>
        </div>
        <figcaption className="sr-only">
          Passo {step.n}: {step.text}
        </figcaption>
      </figure>
    </div>
  );
}
