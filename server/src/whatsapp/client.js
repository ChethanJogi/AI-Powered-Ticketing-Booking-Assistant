/**
 * Minimal WhatsApp Cloud API client (Meta Graph API). No SDK needed - Node 22 has fetch/FormData/Blob.
 * `fetchImpl` is injectable so tests never touch the network.
 */
export class WhatsAppError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const digits = (s) => String(s || '').replace(/\D/g, '');

export function makeWhatsAppClient({ config, fetchImpl = globalThis.fetch }) {
  const wa = config.whatsapp;
  const enabled = () => !!(wa.enabled && wa.token && wa.phoneNumberId);
  const base = () => `https://graph.facebook.com/${wa.apiVersion}/${wa.phoneNumberId}`;

  async function call(path, init) {
    const res = await fetchImpl(base() + path, {
      ...init,
      headers: { Authorization: `Bearer ${wa.token}`, ...(init.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new WhatsAppError(data?.error?.message || `WhatsApp API error (${res.status})`, {
        code: data?.error?.code,
        status: res.status,
      });
    }
    return data;
  }

  const json = (body) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
  });

  async function sendText(to, body) {
    return call('/messages', json({ to: digits(to), type: 'text', text: { body: String(body).slice(0, 4000), preview_url: false } }));
  }

  async function sendTemplate(to, name, lang, params = []) {
    return call('/messages', json({
      to: digits(to),
      type: 'template',
      template: {
        name,
        language: { code: lang },
        components: params.length
          ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p).slice(0, 200) })) }]
          : [],
      },
    }));
  }

  async function sendImage(to, pngBuffer, caption = '') {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'image/png');
    form.append('file', new Blob([pngBuffer], { type: 'image/png' }), 'ticket.png');
    const media = await call('/media', { method: 'POST', body: form });
    return call('/messages', json({ to: digits(to), type: 'image', image: { id: media.id, caption: String(caption).slice(0, 1000) } }));
  }

  return { enabled, sendText, sendTemplate, sendImage };
}
