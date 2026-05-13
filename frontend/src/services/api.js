import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://neolix-backend.onrender.com/api/v1',
  timeout: 30000,
})

// ── Profile ──────────────────────────────────────────────────────────────────
export const profileApi = {
  get:           ()     => api.get('/profile'),
  update:        (data) => api.patch('/profile', data),
  updateSmtp:    (data) => api.put('/profile/smtp', data),
  updateWhatsApp:(data) => api.put('/profile/whatsapp', data),
  getContext:    ()     => api.get('/profile/context'),
  testSmtp:      ()     => api.post('/profile/smtp/test'),
}

// ── Leads ─────────────────────────────────────────────────────────────────────
export const leadsApi = {
  search: (q, limit = 50) =>
    api.get('/leads/search', { params: { q, limit } }),

  addSingle: (data) =>
    api.post('/leads/single', data),

  addBulk: (raw_text) =>
    api.post('/leads/bulk', { raw_text }),

  uploadFile: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/leads/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  scanCard: (image_base64) =>
    api.post('/leads/scan', { image_base64 }),

  get: (id) =>
    api.get(`/leads/${id}`),
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
export const campaignApi = {
  create:  (data) => api.post('/campaigns/create', data),
  list:    ()     => api.get('/campaigns/list'),
  get:     (id)   => api.get(`/campaigns/${id}`),
  preview: (data) => api.post('/campaigns/preview', data),
}

// ── Replies ───────────────────────────────────────────────────────────────────
export const repliesApi = {
  inbox:   (status)  => api.get('/replies/inbox', { params: status ? { status } : {} }),
  sent:    (cid)     => api.get('/replies/sent',  { params: cid ? { campaign_id: cid } : {} }),
  thread:  (id)      => api.get(`/replies/${id}`),
  respond: (id, data)=> api.post(`/replies/${id}/respond`, data),
  poll:    ()        => api.post('/replies/poll'),
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────
export const waApi = {
  status:          ()       => api.get('/whatsapp/status'),
  logout:          ()       => api.post('/whatsapp/logout'),
  send:            (data)   => api.post('/whatsapp/send', data),
  sendImage:       (data)   => api.post('/whatsapp/send-image', data),
  conversations:   ()       => api.get('/whatsapp/conversations'),
  messages:        (phone)  => api.get(`/whatsapp/messages/${phone}`),
  incoming:        ()       => api.get('/whatsapp/incoming'),
  respond:         (data)   => api.post('/whatsapp/respond', data),
  aiReply:         (data)   => api.post('/whatsapp/ai-reply', data),
  campaignCreate:  (data)   => api.post('/whatsapp/campaign/create', data),
  campaignList:    ()       => api.get('/whatsapp/campaign/list'),
  campaignGet:     (id)     => api.get(`/whatsapp/campaign/${id}`),
}

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/', { baseURL: import.meta.env.VITE_API_URL?.replace('/api/v1','') || '' }),
}

export default api