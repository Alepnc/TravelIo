import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Anteprima dei link (WhatsApp, Telegram, iMessage, social): il marchio come riga del tabellone partenze.
 * Nessun prezzo inventato: solo marchio, promessa e qualche meta del catalogo.
 */
export const alt = "TravelIo: dall'idea all'itinerario, in un'unica app";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const condensed = await readFile(join(process.cwd(), "src/app/_og/archivo-condensed-bold.ttf"));
const medium = await readFile(join(process.cwd(), "src/app/_og/archivo-medium.ttf"));

const BOARD = "#0e0f11";
const CELL = "#191b1f";
const FRAME = "#2a2d31";
const TEXT = "#f2f2f0";
const DIM = "#9a9ea5";
const AMBER = "#ffb000";

function Cell({ ch, w, h, size: fs, bg = CELL, color = TEXT }: { ch: string; w: number; h: number; size: number; bg?: string; color?: string }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: w, height: h, background: bg, borderRadius: 4, color, fontSize: fs, fontFamily: "Archivo Condensed" }}>
      {ch}
      <div style={{ position: "absolute", left: 0, right: 0, top: h / 2, height: 2, background: "rgba(0,0,0,0.7)" }} />
    </div>
  );
}

function Row({ text, cells, w, h, fs, color }: { text: string; cells: number; w: number; h: number; fs: number; color?: string }) {
  const chars = text.toUpperCase().padEnd(cells, " ").slice(0, cells).split("");
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {chars.map((c, i) => (
        <Cell key={i} ch={c === " " ? "" : c} w={w} h={h} size={fs} color={color} />
      ))}
    </div>
  );
}

export default function OpengraphImage() {
  const rows = [
    ["Lisbona", "LIS", "Voli e alloggi"],
    ["Barcellona", "BCN", "Itinerario su mappa"],
    ["Praga", "PRG", "Budget sotto controllo"],
  ];
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: FRAME, padding: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: BOARD, borderRadius: 6, padding: "56px 64px" }}>
          {/* Marchio: TRAVEL in palette bianche, IO in ambra */}
          <div style={{ display: "flex", gap: 8 }}>
            {"TRAVEL".split("").map((c, i) => (
              <Cell key={i} ch={c} w={104} h={146} size={124} />
            ))}
            <div style={{ display: "flex", gap: 8, marginLeft: 10 }}>
              {"IO".split("").map((c, i) => (
                <Cell key={i} ch={c} w={104} h={146} size={124} bg={AMBER} color={BOARD} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", fontFamily: "Archivo", fontSize: 40, color: TEXT, letterSpacing: -0.5 }}>Dall&apos;idea all&apos;itinerario, in un&apos;unica app.</div>

          {/* Tre righe del tabellone, senza prezzi */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `2px solid ${FRAME}`, paddingTop: 22 }}>
            {rows.map(([city, code, what]) => (
              <div key={code} style={{ display: "flex", alignItems: "center", gap: 28 }}>
                <Row text={city} cells={10} w={30} h={42} fs={32} />
                <Row text={code} cells={3} w={30} h={42} fs={32} />
                <div style={{ display: "flex", fontFamily: "Archivo Condensed", fontSize: 28, color: DIM, letterSpacing: 2 }}>{what.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo Condensed", data: condensed, weight: 700, style: "normal" },
        { name: "Archivo", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
