"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { parseQrPayload } from "@/lib/qrcode";

type Props = {
  onScan: (songId: string) => void;
  onCancel?: () => void;
};

export function QrScanner({ onScan, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | undefined;

    (async () => {
      try {
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (cancelled) return;
            if (result) {
              const id = parseQrPayload(result.getText());
              if (id) {
                onScan(id);
                controls?.stop();
              }
            }
          },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera error";
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onScan]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <video
        ref={videoRef}
        className="w-full rounded-2xl border border-neutral-700 aspect-square object-cover bg-black"
        playsInline
        muted
      />
      <div className="absolute inset-6 rounded-xl border-2 border-fuchsia-400/70 pointer-events-none" />
      {error && (
        <p className="mt-2 text-sm text-red-400">
          {error}. Make sure the browser has camera permission.
        </p>
      )}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
