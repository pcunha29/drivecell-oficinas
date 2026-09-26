import { HeroBoard } from "@/components/marketing/hero-board";

/**
 * Teaser da página "Em construção": o quadro animado fica desfocado por um véu,
 * e uma lente passeia por cima a deixar ver, nítido, só um pedaço de cada vez.
 * Decorativo (aria-hidden). Com "reduzir movimento" a lente fica parada.
 */
export function TeaserBoard() {
  return (
    <div aria-hidden className="relative select-none" inert>
      <div className="pointer-events-none">
        <HeroBoard tone="dark" />
      </div>
      <div className="teaser-veil pointer-events-none absolute inset-0 rounded-lg" />
      <div className="teaser-lens pointer-events-none absolute rounded-full" />
      <span className="absolute -top-3 left-4 rounded-[3px] border border-accent-soft/50 bg-night px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-accent-soft uppercase">
        Em afinação
      </span>
    </div>
  );
}
