/**
 * Converte as gravações de demo-recordings/ em vídeos leves para a landing.
 * Requer ffmpeg (com libx264 e libvpx-vp9).
 *
 * Uso: npm run demo:converter
 * Saída: public/demo/passo-N.mp4, passo-N.webm e passo-N.jpg (imagem fixa)
 */
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "demo-recordings/manifest.json");
if (!existsSync(manifestPath)) {
  console.error("Sem demo-recordings/manifest.json — corre primeiro npm run demo:gravar.");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const out = resolve(root, "public/demo");
mkdirSync(out, { recursive: true });

const WIDTH = 1280; // resolução nativa da gravação (sem ampliar)

function ffmpeg(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg falhou: " + args.join(" "));
}

for (const n of ["1", "2", "3"]) {
  const clip = manifest[n];
  if (!clip) continue;
  const src = resolve(root, "demo-recordings", clip.file);
  const from = Math.max(0, clip.start - 0.1).toFixed(2);
  const to = (clip.end + 0.2).toFixed(2);
  const vf = `scale=${WIDTH}:-2:flags=lanczos,fps=30`;
  const base = resolve(out, `passo-${n}`);

  ffmpeg(["-i", src, "-ss", from, "-to", to, "-vf", vf, "-an",
    "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", `${base}.mp4`]);
  ffmpeg(["-i", src, "-ss", from, "-to", to, "-vf", vf, "-an",
    "-c:v", "libvpx-vp9", "-crf", "40", "-b:v", "0", "-row-mt", "1", "-deadline", "good", `${base}.webm`]);
  ffmpeg(["-ss", from, "-i", src, "-frames:v", "1", "-vf", `scale=${WIDTH}:-2:flags=lanczos`, "-q:v", "4", `${base}.jpg`]);

  const kb = (f) => Math.round(statSync(f).size / 1024);
  console.log(`Passo ${n}: mp4 ${kb(`${base}.mp4`)} KB · webm ${kb(`${base}.webm`)} KB · ${(clip.end - clip.start).toFixed(1)} s`);
}
