import crypto from 'node:crypto';
import QRCode from 'qrcode';

/**
 * Ticket token = <bookingId>.<eventId>.<signature>
 * The signature is an HMAC-SHA256 truncated to 128 bits so the QR stays small and easy to scan.
 */
export function makeQr(secret) {
  const sign = (payload) =>
    crypto.createHmac('sha256', secret).update(payload).digest().subarray(0, 16).toString('base64url');

  const createToken = (bookingId, eventId) => {
    const payload = `${bookingId}.${eventId}`;
    return `${payload}.${sign(payload)}`;
  };

  function verifyToken(token, expectedEventId) {
    const parts = String(token || '').trim().split('.');
    if (parts.length !== 3) {
      return { valid: false, code: 'INVALID_FORMAT', message: 'Not a valid TicketAI QR code format.' };
    }
    const [bookingId, eventId, sig] = parts;
    const want = Buffer.from(sign(`${bookingId}.${eventId}`));
    const got = Buffer.from(sig);
    if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) {
      return { valid: false, code: 'TAMPERED', message: 'Invalid or counterfeit QR signature.' };
    }
    if (expectedEventId && eventId !== expectedEventId) {
      return { valid: false, code: 'WRONG_EVENT', message: `This ticket is for a different event (${eventId}).` };
    }
    return { valid: true, bookingId, eventId };
  }

  const opts = { errorCorrectionLevel: 'M', margin: 2, width: 480, color: { dark: '#1E1B3A', light: '#FFFFFF' } };
  const dataUrl = (bookingId, eventId) => QRCode.toDataURL(createToken(bookingId, eventId), opts);
  const png = (bookingId, eventId) => QRCode.toBuffer(createToken(bookingId, eventId), { ...opts, type: 'png' });

  return { createToken, verifyToken, dataUrl, png };
}
