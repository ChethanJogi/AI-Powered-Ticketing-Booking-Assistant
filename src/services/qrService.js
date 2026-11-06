import QRCode from 'qrcode';
import { USE_MOCK, request, db } from './apiClient.js';

// Simple client-side signature hash for offline demo mode
function clientSign(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h).toString(36);
}

export const qrService = {
  // In API mode pass the booking's server-signed `ticketToken` (see tokenFor) instead of calling this.
  createToken(bookingId, eventId) {
    const payload = `${bookingId}.${eventId}`;
    const sig = clientSign(payload);
    return `${payload}.${sig}`;
  },

  tokenFor(booking) {
    return booking.ticketToken || qrService.createToken(booking.id, booking.eventId);
  },

  async generateQrDataUrl(bookingId, eventId) {
    if (!USE_MOCK) {
      // The server signs tickets (HMAC). A locally-made QR would be rejected at the gate, so never fake one.
      const res = await request(`/bookings/${bookingId}/qr`);
      return res.dataUrl;
    }
    const token = qrService.createToken(bookingId, eventId);
    return QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
      color: {
        dark: '#1E1B3A',
        light: '#FFFFFF',
      },
    });
  },

  async verifyAndCheckIn(token, expectedEventId = null) {
    if (!USE_MOCK) {
      return request('/scan/verify', {
        method: 'POST',
        body: { token, eventId: expectedEventId },
      });
    }

    const parts = (token || '').trim().split('.');
    if (parts.length !== 3) {
      return { valid: false, code: 'INVALID_FORMAT', message: 'Not a valid TicketAI QR code format.' };
    }

    const [bookingId, eventId, sig] = parts;
    const expectedSig = clientSign(`${bookingId}.${eventId}`);
    if (sig !== expectedSig) {
      return { valid: false, code: 'FORGED', message: 'Invalid or counterfeit QR signature.' };
    }

    if (expectedEventId && eventId !== expectedEventId) {
      return { valid: false, code: 'WRONG_EVENT', message: `Ticket is for event ${eventId}, not this event.` };
    }

    const bookings = db.get('bookings', []);
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) {
      return { valid: false, code: 'NOT_FOUND', message: 'Booking record not found in system.' };
    }

    if (b.status !== 'CONFIRMED') {
      return { valid: false, code: 'NOT_CONFIRMED', message: `Ticket status is ${b.status}, not confirmed.` };
    }

    if (b.checkedInAt) {
      return {
        valid: false,
        code: 'ALREADY_USED',
        message: `ALREADY USED! Checked in on ${b.checkedInAt} for attendee ${b.userName}.`,
        attendee: b.userName,
        checkedInAt: b.checkedInAt,
        bookingId: b.id,
      };
    }

    // Atomic mark as checked in
    const nowStr = new Date().toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    b.checkedInAt = nowStr;
    db.set('bookings', bookings);

    return {
      valid: true,
      code: 'CHECKED_IN',
      message: 'Valid Ticket! Entry Approved.',
      attendee: b.userName,
      eventTitle: b.eventTitle,
      qty: b.qty,
      bookingId: b.id,
      checkedInAt: nowStr,
    };
  },
};

