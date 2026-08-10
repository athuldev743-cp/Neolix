// src/services/api.js
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'https://neolix-neolix-backend.hf.space/api/v1'

const api = axios.create({
  baseURL: BASE,
  timeout: 120000,
})

// ── SECURITY: Global Header Injection ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const userEmail = localStorage.getItem('neolix_auth_email')
  if (userEmail) {
    config.headers['X-User-Email'] = userEmail
  }
  return config
})

// ── Existing Response Interceptor ──────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  async err => { return Promise.reject(err); }
)

// ── Profile ────────────────────────────────────────────────────────────────
const profileApi = {
  get:        ()     => api.get('/profile'),
  update:     (data) => api.patch('/profile', data),
  getContext: ()     => api.get('/profile/context'),
  updateSmsGateway: (data) => api.put('/profile/sms', data),
}

// ── Leads ──────────────────────────────────────────────────────────────────
const leadsApi = {
  search: (q, limit = 50, channelContext = 'email', requiredChannels = 'email') => 
    api.get('/leads/search', { params: { q, limit, channel_context: channelContext, required_channels: requiredChannels } }),
  addSingle:  (data)           => api.post('/leads/single', data),
  addBulk:    (raw_text)       => api.post('/leads/bulk', { raw_text }),
  uploadFile: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/leads/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
  },
  scanCard: (image_base64) => api.post('/leads/scan', { image_base64 }),
  get:      (id)           => api.get(`/leads/${id}`),
}

// ── Campaigns ──────────────────────────────────────────────────────────────
const campaignApi = {
  create:  (data) => api.post('/campaigns/create', data),
  list:    ()     => api.get('/campaigns/list'),
  get:     (id)   => api.get(`/campaigns/${id}`),
  preview: (data) => api.post('/campaigns/preview', data),
  previewBatch: (campaign_info, lead_ids) => api.post('/campaigns/preview-batch', { campaign_info, lead_ids }),
  launch:  (data) => api.post('/campaigns/launch', data),
}

// ── Omnichannel ────────────────────────────────────────────────────────────
const omniApi = {
  create: (data) => api.post('/omni-campaigns/create', data),
  list:   ()     => api.get('/omni-campaigns/list'),
}

// ── Replies ────────────────────────────────────────────────────────────────
const repliesApi = {
  inbox:  (status, channel) => api.get('/replies/inbox',  { params: { ...(status ? { status } : {}), ...(channel ? { channel } : {}) } }),
  sent:   (cid, channel)    => api.get('/replies/sent',   { params: { ...(cid ? { campaign_id: cid } : {}), ...(channel ? { channel } : {}) } }),
  thread:  (id)             => api.get(`/replies/${id}`),
  respond: (id, data)       => api.post(`/replies/${id}/respond`, data),
  poll:    ()               => api.post('/replies/poll'),
}

// ── WhatsApp ───────────────────────────────────────────────────────────────
// ── WhatsApp ───────────────────────────────────────────────────────────────
const waApi = {
  getQr:            ()      => api.get('/whatsapp/qr'),       // <-- ADD THIS (used for fetching base64 QR)
  status:           ()      => api.get('/whatsapp/status'),   // <-- Keep for basic state checks
  logout:           ()      => api.post('/whatsapp/logout'),
  send:             (data)  => api.post('/whatsapp/send', data),
  sendImage:        (data)  => api.post('/whatsapp/send-image', data),
  conversations:    ()      => api.get('/whatsapp/conversations'),
  messages:         (phone) => api.get(`/whatsapp/messages/${phone}`),
  incoming:         ()      => api.get('/whatsapp/incoming'),
  respond:          (data)  => api.post('/whatsapp/respond', data),
  aiReply:          (data)  => api.post('/whatsapp/ai-reply', data),
  campaignCreate:   (data)  => api.post('/whatsapp/campaign/create', data),
  campaignList:     ()      => api.get('/whatsapp/campaign/list'),
  campaignGet:      (id)    => api.get(`/whatsapp/campaign/${id}`),
  campaignDetail:   (id)    => api.get(`/whatsapp/campaign/${id}`),
  preview:          (data)  => api.post('/whatsapp/preview', data),
  previewBatch:     (data)  => api.post('/whatsapp/preview-batch', data),
  launch:           (data)  => api.post('/whatsapp/launch', data),
}

// ── Android SIM Gateway ────────────────────────────────────────────────────
const smsApi = {
  getConfig:   ()     => api.get('/sms/config'),
  saveConfig:  (data) => api.post('/sms/config', data),
  enqueue:     (data) => api.post('/sms/enqueue', data),
  getMetrics:  ()     => api.get('/sms/queue-status'),
  getLogs:     ()     => api.get('/sms/logs'),
}



// ✅ FINAL EXPORT: Only one line to export everything
export { 
  api,
  api as API, 
  profileApi, 
  leadsApi, 
  campaignApi, 
  omniApi, 
  repliesApi, 
  waApi, 
  smsApi 
};

export default api;