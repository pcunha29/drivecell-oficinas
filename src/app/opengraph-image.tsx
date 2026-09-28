import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

/** Imagem de partilha (WhatsApp, redes, Slack…). Gerada no build a partir deste ficheiro. */
export const alt = `${SITE_NAME} - A oficina organizada. Sem papelada.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NIGHT = "#0d2c4a";
const NIGHT_2 = "#143a5e";
const LINE = "#28506f";
const GOLD = "#c9a66b";
const ON_DARK = "#f4f1ea";
const ON_DARK_2 = "#c8d1db";
const ON_DARK_3 = "#98a8b9";
const PAID = "#9fd3b1";

const columns: {
  label: string;
  cards: { plate: string; job: string; tag?: "active" | "paid" }[];
}[] = [
  {
    label: "EM ESPERA",
    cards: [
      { plate: "AB-12-CD", job: "Pastilhas e discos" },
      { plate: "77-XZ-04", job: "Revisão dos travões" },
    ],
  },
  {
    label: "EM CURSO",
    cards: [{ plate: "56-CD-78", job: "Pastilhas traseiras", tag: "active" }],
  },
  {
    label: "ENTREGUE",
    cards: [{ plate: "34-GH-56", job: "Purga do líquido", tag: "paid" }],
  },
];

export default async function OpengraphImage() {
  const dir = join(process.cwd(), "src/app/_og-fonts");
  const [serif, serifItalic, sans, logo] = await Promise.all([
    readFile(join(dir, "instrument-serif-latin-400-normal.woff")),
    readFile(join(dir, "instrument-serif-latin-400-italic.woff")),
    readFile(join(dir, "Geist-Medium.ttf")),
    readFile(join(process.cwd(), "public/logos/logo-full-white.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: NIGHT,
        padding: "64px 72px",
        fontFamily: "Geist",
        color: ON_DARK,
      }}
    >
      {/* Coluna de texto */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 650,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={logoSrc} width={272} height={40} alt="" />
          <div
            style={{
              display: "flex",
              borderLeft: `1px solid ${LINE}`,
              paddingLeft: 18,
              fontSize: 18,
              letterSpacing: 4,
              color: ON_DARK_3,
            }}
          >
            OFICINAS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontSize: 72,
              lineHeight: 1.02,
              letterSpacing: -0.5,
            }}
          >
            A oficina organizada.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontStyle: "italic",
              fontSize: 72,
              lineHeight: 1.08,
              color: GOLD,
            }}
          >
            Sem papelada.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 26,
              lineHeight: 1.4,
              color: ON_DARK_2,
              maxWidth: 540,
            }}
          >
            Ordens de reparação, clientes, viaturas e pagamentos num só quadro.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: GOLD,
            letterSpacing: 1,
          }}
        >
          drivecell.pt
        </div>
      </div>

      {/* Quadro de ordens ilustrativo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginLeft: "auto",
          alignSelf: "center",
          width: 400,
          padding: 22,
          gap: 14,
          background: NIGHT_2,
          border: `1px solid ${LINE}`,
          borderRadius: 10,
        }}
      >
        <div style={{ display: "flex", fontSize: 18, color: ON_DARK }}>
          Ordens de reparação
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {columns.map((col) => (
            <div
              key={col.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: 112,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 11,
                  letterSpacing: 2,
                  color: ON_DARK_3,
                }}
              >
                {col.label}
              </div>
              {col.cards.map((card) => (
                <div
                  key={card.plate}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: 10,
                    background: NIGHT,
                    borderRadius: 5,
                    border: `1px solid ${card.tag === "active" ? GOLD : LINE}`,
                  }}
                >
                  <div
                    style={{ display: "flex", fontSize: 12, color: ON_DARK }}
                  >
                    {card.plate}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 12,
                      lineHeight: 1.3,
                      color: ON_DARK_2,
                    }}
                  >
                    {card.job}
                  </div>
                  {card.tag === "paid" && (
                    <div
                      style={{
                        display: "flex",
                        alignSelf: "flex-start",
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: PAID,
                        color: NIGHT,
                        fontSize: 10,
                      }}
                    >
                      PAGO
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 12,
          }}
        >
          <div style={{ display: "flex", fontSize: 13, color: ON_DARK_3 }}>
            Faturado em setembro
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontSize: 30,
              color: ON_DARK,
            }}
          >
            4 610,00 €
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serif, style: "normal", weight: 400 },
        {
          name: "Instrument Serif",
          data: serifItalic,
          style: "italic",
          weight: 400,
        },
        { name: "Geist", data: sans, style: "normal", weight: 500 },
      ],
    },
  );
}
