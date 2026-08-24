import QRCode from "qrcode";

/** Returns a PNG data URI encoding the given payload (typically a booking reference). */
export async function generateQrDataUrl(payload) {
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 320 });
}

/** Returns a raw PNG buffer, for attaching to an email instead of inlining a data URI. */
export async function generateQrBuffer(payload) {
  return QRCode.toBuffer(payload, { errorCorrectionLevel: "M", margin: 1, width: 320 });
}
