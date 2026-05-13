import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 15000,
})

// ── Profile ──────────────────────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
  updateSmtp: (data) => api.put('/profile/smtp', data),
  updateWhatsApp: (data) => api.put('/profile/whatsapp', data),
  getContext: () => api.get('/profile/context'),
}

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health', { baseURL: '' }),
}

export default api