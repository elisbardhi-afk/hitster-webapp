import QRCode from "qrcode";

const QR_PREFIX = "hitster:song:";

export function songIdToQrPayload(songId: string): string {
  return `${QR_PREFIX}${songId}`;
}

export function parseQrPayload(payload: string): string | null {
  if (!payload.startsWith(QR_PREFIX)) return null;
  const id = payload.slice(QR_PREFIX.length);
  return id.length > 0 ? id : null;
}

export async function generateQrDataUrl(songId: string): Promise<string> {
  return QRCode.toDataURL(songIdToQrPayload(songId), {
    margin: 1,
    errorCorrectionLevel: "M",
    width: 256,
  });
}

export async function generateQrSvg(songId: string): Promise<string> {
  return QRCode.toString(songIdToQrPayload(songId), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
