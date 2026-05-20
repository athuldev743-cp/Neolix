// src/hooks/useUnreadReplies.js
import { useState, useEffect } from 'react';
import { repliesApi } from '../services/api';

export function useUnreadReplies() {
  const [emailUnread, setEmailUnread] = useState(0);
  const [waUnread, setWaUnread] = useState(0);
  const [smsUnread, setSmsUnread] = useState(0); // Kept available for your hardware pipeline balance

  const checkCounts = async () => {
    try {
      // 🔄 Query your channel-isolated endpoints concurrently to minimize server strain
      const [emailRes, waRes, smsRes] = await Promise.all([
        repliesApi.inbox('unread', 'email'),
        repliesApi.inbox('unread', 'whatsapp'),
        repliesApi.inbox('unread', 'sms')
      ]);

      // Map unread data stream array lengths straight to state counts
      if (emailRes && Array.isArray(emailRes.data)) {
        setEmailUnread(emailRes.data.length);
      }
      
      if (waRes && Array.isArray(waRes.data)) {
        setWaUnread(waRes.data.length); // ⚡ FIXED: This now tracks true live inbound WhatsApp replies!
      }

      if (smsRes && Array.isArray(smsRes.data)) {
        setSmsUnread(smsRes.data.length);
      }
    } catch (e) {
      console.error("[Unread Hook Log Warning] Background indicator sync dropped: ", e.message);
    }
  };

  useEffect(() => {
    checkCounts();
    const interval = setInterval(checkCounts, 5000); // Polling optimized down to 5s for real-time visibility
    return () => clearInterval(interval);
  }, []);

  return { emailUnread, waUnread, smsUnread, refresh: checkCounts };
}