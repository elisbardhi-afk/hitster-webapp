import { listSongs } from "@/lib/songs";
import { generateQrDataUrl } from "@/lib/qrcode";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function QrSheetPage() {
  const songs = await listSongs();

  const cards = await Promise.all(
    songs.map(async (s) => ({
      song: s,
      qr: await generateQrDataUrl(s.id),
    })),
  );

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .qr-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6mm; }
          body { background: white !important; color: black !important; }
          .qr-card { break-inside: avoid; border-color: #000 !important; background: white !important; color: black !important; }
        }
      `}</style>
      <main className="p-6 max-w-5xl mx-auto">
        <div className="no-print flex items-baseline justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-2xl font-semibold">QR sheet</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-neutral-400">{cards.length} cards</p>
            <PrintButton />
          </div>
        </div>

        {cards.length === 0 ? (
          <p className="text-neutral-400 text-sm">No songs in catalog yet.</p>
        ) : (
          <div className="qr-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {cards.map(({ song, qr }) => (
              <div
                key={song.id}
                className="qr-card flex flex-col items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt={`QR for ${song.title}`} className="w-full h-auto" />
                <div className="text-center w-full">
                  <p className="text-xs font-medium truncate">{song.title}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
