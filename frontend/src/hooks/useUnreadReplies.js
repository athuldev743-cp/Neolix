// src/hooks/useUnreadReplies.js
import { useState, useEffect } from 'react';
import { repliesApi } from '../services/api';

export function useUnreadReplies() {
  const [emailUnread, setEmailUnread] = useState(0);
  const [waUnread, setWaUnread] = useState(0);
  const [smsUnread, setSmsUnread] = useState(0);

  const checkCounts = async () => {
    try {
      // The interceptor in api.js now handles the X-User-Email header automatically
      const [emailRes, waRes, smsRes] = await Promise.all([
        repliesApi.inbox('unread', 'email'),
        repliesApi.inbox('unread', 'whatsapp'),
        repliesApi.inbox('unread', 'sms')
      ]);

      // Direct access assuming your api returns the data array directly or wrapped
      setEmailUnread(Array.isArray(emailRes.data) ? emailRes.data.length : 0);
      setWaUnread(Array.isArray(waRes.data) ? waRes.data.length : 0);
      setSmsUnread(Array.isArray(smsRes.data) ? smsRes.data.length : 0);
      
    } catch (e) {
      console.error("[Unread Hook] Sync dropped: ", e.message);
    }
  };

  useEffect(() => {
    checkCounts();
    const interval = setInterval(checkCounts, 5000); // Polling optimized down to 5s for real-time visibility
    return () => clearInterval(interval);
  }, []);

  return { emailUnread, waUnread, smsUnread, refresh: checkCounts };
}