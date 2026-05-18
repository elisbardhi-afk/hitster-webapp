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
          body { background: white !important; color: black !important; margin: 0 !important; }
          main { padding: 8mm !important; max-width: none !important; }
          .qr-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 63mm) !important;
            gap: 4mm !important;
          }
          .qr-card {
            break-inside: avoid !important;
            width: 63mm !important;
            height: 88mm !important;
            padding: 3mm !important;
            box-sizing: border-box !important;
            border: 0.4mm solid #999 !important;
            border-radius: 2mm !important;
            background: white !important;
            color: black !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 2mm !important;
          }
          .qr-img {
            width: 55mm !important;
            height: 55mm !important;
            object-fit: contain !important;
            flex-shrink: 0 !important;
          }
          .qr-title { font-size: 8pt !important; font-weight: 600 !important; text-align: center !important; word-break: break-word !important; }
          .qr-artist { font-size: 7pt !important; color: #555 !important; text-align: center !important; }
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
                <img src={qr} alt={`QR for ${song.title}`} className="qr-img w-full h-auto" />
                <div className="text-center w-full">
                  <p className="qr-title text-xs font-medium truncate">{song.title}</p>
                  <p className="qr-artist text-[10px] text-neutral-500 truncate">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
