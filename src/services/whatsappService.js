import { USE_MOCK, request } from './apiClient.js';

// WhatsApp needs the real backend (the bot, webhook and link codes live on the server).
export const whatsappService = {
  available: !USE_MOCK,

  async status() {
    if (USE_MOCK) return { enabled: false, linked: false, optIn: false, botNumber: null, number: null };
    return request('/whatsapp/status');
  },
  async createLinkCode() {
    return request('/whatsapp/link-code', { method: 'POST' });
  },
  async unlink() {
    return request('/whatsapp/link', { method: 'DELETE' });
  },
  async setOptIn(optIn) {
    return request('/whatsapp/preferences', { method: 'PUT', body: { optIn } });
  },
};
