"use client";

/**
 * Quadro de ordens animado do hero: um cursor arrasta cartões entre colunas,
 * a ordem entregue fica paga e o total faturado sobe. Repete em loop.
 * Com "reduzir movimento" fica estático no estado inicial.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Col = "waiting" | "in_progress" | "delivered";

type BoardCard = {
  id: string;
  plate: string;
  job: string;
  meta: string;
  price?: string;
  col: Col;
  paid?: boolean;
  hidden?: boolean;
};

const INITIAL: BoardCard[] = [
  { id: "a", plate: "AB-12-CD", job: "Pastilhas e discos dianteiros", meta: "Golf · 2018", price: "244,00 €", col: "waiting" },
  { id: "b", plate: "77-XZ-04", job: "Revisão dos travões", meta: "Yaris · 2017", col: "waiting" },
  { id: "c", plate: "56-CD-78", job: "Pastilhas traseiras", meta: "Transit", price: "330,00 €", col: "in_progress" },
  { id: "d", plate: "34-GH-56", job: "Purga do líquido", meta: "308", col: "delivered", paid: true },
];

const COLUMNS: { col: Col; label: string }[] = [
  { col: "waiting", label: "EM ESPERA" },
  { col: "in_progress", label: "EM CURSO" },
  { col: "delivered", label: "ENTREGUE" },
];

const TOTAL_START = 4280;
const TOTAL_END = 4610;

const mono = "font-mono";
const fmt = (n: number) => {
  const [int, dec] = n.toFixed(2).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")},${dec}\u00A0€`;
};


type Rect = { x: number; y: number; w: number };

class Cancelled extends Error {}

type Tone = "light" | "dark";

function CardView({ card, tone }: { card: BoardCard; tone: Tone }) {
  const active = card.col === "in_progress";
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-[4px] border p-2.5 transition-colors duration-500 sm:p-3 ${
        tone === "dark" ? "bg-night" : "bg-night-2"
      } ${
        active ? "border-accent-soft" : "border-night-line"
      }`}
    >
      <span className={`${mono} text-[11px] text-on-dark`}>{card.plate}</span>
      <span className="text-[12px] leading-snug text-on-dark-2">{card.job}</span>
      <div className="flex min-h-[18px] flex-wrap items-center justify-between gap-x-2">
        <span className={`${mono} text-[11px] text-on-dark-3`}>{card.meta}</span>
        {card.col === "delivered" && card.paid ? (
          <span className={`${mono} animate-[hb-pop_300ms_ease-out] rounded-[3px] bg-paid px-1.5 py-0.5 text-[10px] text-ink`}>
            PAGO
          </span>
        ) : card.col !== "waiting" && card.price ? (
          <span className={`${mono} text-[11px] text-accent-soft`}>{card.price}</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * tone "light": sobre fundo claro (hero da landing).
 * tone "dark": dentro de um painel azul-marinho (página de entrada).
 */
export function HeroBoard({ tone = "light" }: { tone?: Tone }) {
  const [cards, setCards] = useState<BoardCard[]>(INITIAL);
  const [total, setTotal] = useState(TOTAL_START);
  const [ghost, setGhost] = useState<{ card: BoardCard; from: Rect; to: Rect; go: boolean } | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, pressed: false });
  const [fading, setFading] = useState(false);
  // Pausa automática quando o quadro sai do ecrã (poupa CPU/bateria).
  const pausedRef = useRef(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Cada execução da animação tem uma geração; ao reiniciar/desmontar, as antigas param.
  const gen = useRef(0);

  // Espera `ms` de animação: o tempo não conta enquanto estiver em pausa.
  const sleep = useCallback(async (ms: number) => {
    const g = gen.current;
    let left = ms;
    while (left > 0) {
      const step = Math.min(left, 100);
      await new Promise((r) => setTimeout(r, step));
      if (gen.current !== g) throw new Cancelled();
      if (!pausedRef.current) left -= step;
    }
  }, []);
  const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

  const rectOf = useCallback((id: string): Rect | null => {
    const el = cardRefs.current[id];
    const board = boardRef.current;
    if (!el || !board) return null;
    const a = el.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width };
  }, []);

  const pointAt = useCallback(
    async (id: string) => {
      const r = rectOf(id);
      if (!r) return;
      setCursor((c) => ({ ...c, visible: true, x: r.x + r.w * 0.55, y: r.y + 22 }));
      await sleep(750);
    },
    [rectOf, sleep],
  );

  const move = useCallback(
    async (id: string, col: Col) => {
      const from = rectOf(id);
      if (!from) return;
      setCursor((c) => ({ ...c, pressed: true }));
      await sleep(180);
      // Coloca o cartão (invisível) no topo da coluna de destino e mede onde fica.
      setCards((cs) => {
        const card = cs.find((c) => c.id === id)!;
        const rest = cs.filter((c) => c.id !== id);
        const idx = rest.findIndex((c) => c.col === col);
        const moved = { ...card, col, hidden: true };
        if (idx === -1) return [...rest, moved];
        return [...rest.slice(0, idx), moved, ...rest.slice(idx)];
      });
      await frame();
      await frame();
      const to = rectOf(id);
      const card = { ...INITIAL.find((c) => c.id === id)!, col, paid: false };
      if (!to) return;
      setGhost({ card, from, to, go: false });
      await frame();
      setGhost((g) => (g ? { ...g, go: true } : g));
      setCursor((c) => ({ ...c, x: to.x + to.w * 0.55, y: to.y + 22 }));
      await sleep(900);
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, hidden: false } : c)));
      setGhost(null);
      setCursor((c) => ({ ...c, pressed: false }));
      await sleep(250);
    },
    [rectOf, sleep],
  );

  const countUp = useCallback(
    async (from: number, to: number, ms: number) => {
      const start = performance.now();
      const g = gen.current;
      while (gen.current === g) {
        const t = Math.min(1, (performance.now() - start) / ms);
        setTotal(from + (to - from) * (1 - Math.pow(1 - t, 3)));
        if (t >= 1) break;
        await frame();
      }
    },
    [],
  );

  useEffect(() => {
    const myGen = ++gen.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let started = false;
    const run = async () => {
      const check = () => {
        if (gen.current !== myGen) throw new Cancelled();
      };
      try {
        for (;;) {
          check();
          await sleep(1400);
          await pointAt("c");
          check();
          await move("c", "delivered");
          check();
          await sleep(350);
          setCards((cs) => cs.map((c) => (c.id === "c" ? { ...c, paid: true } : c)));
          await countUp(TOTAL_START, TOTAL_END, 900);
          await sleep(900);
          await pointAt("a");
          check();
          await move("a", "in_progress");
          check();
          setCursor((c) => ({ ...c, visible: false }));
          await sleep(2600);
          setFading(true);
          await sleep(350);
          setCards(INITIAL);
          setTotal(TOTAL_START);
          await frame();
          setFading(false);
        }
      } catch (e) {
        if (!(e instanceof Cancelled)) throw e;
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      pausedRef.current = !entry.isIntersecting;
      if (entry.isIntersecting && !started) {
        started = true;
        void run();
      }
    });
    if (boardRef.current) io.observe(boardRef.current);
    return () => {
      // Intencional: invalida a geração atual para parar a animação em curso.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      gen.current++;
      io.disconnect();
    };
  }, [countUp, move, pointAt, sleep]);

  return (
    <div
      className={`flex flex-col gap-4 rounded-lg p-4 sm:p-5 ${
        tone === "dark"
          ? "border border-night-line bg-night-2 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)]"
          : "bg-night shadow-[0_30px_60px_-30px_rgba(13,44,74,0.45)]"
      }`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between text-on-dark">
        <span className="text-sm font-medium">Ordens de reparação</span>
        <span className={`${mono} text-[11px] text-on-dark-3`}>SEX · 25 SET</span>
      </div>

      <div
        ref={boardRef}
        className={`relative grid grid-cols-3 items-start gap-2 transition-opacity duration-300 sm:gap-2.5 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {COLUMNS.map(({ col, label }) => {
          const inCol = cards.filter((c) => c.col === col);
          return (
            <div key={col} className="flex min-h-[180px] flex-col gap-2">
              <span className={`${mono} text-[10px] tracking-[0.12em] text-on-dark-3`}>
                {label} · {inCol.length}
              </span>
              {inCol.map((card) => (
                <div
                  key={card.id}
                  ref={(el) => {
                    cardRefs.current[card.id] = el;
                  }}
                  className={card.hidden ? "opacity-0" : "opacity-100"}
                >
                  <CardView card={card} tone={tone} />
                </div>
              ))}
            </div>
          );
        })}

        {ghost && (
          <div
            className="pointer-events-none absolute z-10 rotate-[1.5deg] shadow-[0_18px_30px_-10px_rgba(0,0,0,0.6)] transition-transform duration-[850ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{
              left: ghost.from.x,
              top: ghost.from.y,
              width: ghost.from.w,
              transform: ghost.go
                ? `translate(${ghost.to.x - ghost.from.x}px, ${ghost.to.y - ghost.from.y}px)`
                : "translate(0, 0) scale(1.03)",
            }}
          >
            <CardView card={ghost.card} tone={tone} />
          </div>
        )}

        <div
          className="pointer-events-none absolute z-20 transition-[left,top,opacity] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={{
            left: cursor.x,
            top: cursor.y,
            opacity: cursor.visible ? 1 : 0,
            transitionDuration: ghost?.go ? "850ms" : undefined,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            className={`transition-transform duration-150 ${cursor.pressed ? "scale-90" : "scale-100"}`}
          >
            <path d="M4 2l15 11-6.5 1.2L9 21z" fill="#F4F1EA" stroke="#0D2C4A" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-4 border-t border-night-line pt-3.5 text-on-dark">
        <span className="text-xs text-on-dark-3">Faturado em setembro</span>
        <span className="display-serif text-[26px] tabular-nums sm:text-[30px]">{fmt(total)}</span>
      </div>
    </div>
  );
}
