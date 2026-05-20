// src/hooks/useUnreadReplies.js
import { useState, useEffect } from 'react';
import { repliesApi, waApi } from '../services/api';

export function useUnreadReplies() {
  const [emailUnread, setEmailUnread] = useState(0);
  const [waUnread, setWaUnread] = useState(0);

  const checkCounts = async () => {
    try {
      // 1. Scan email unread arrays
      const { data: emailData } = await repliesApi.inbox();
      if (Array.isArray(emailData)) {
        setEmailUnread(emailData.filter(item => item.status === 'unread').length);
      }
    } catch (e) { /* background silencer */ }

    try {
      // 2. Scan WhatsApp unread arrays via campaign/queue snapshots
      const { data: campaigns } = await waApi.campaignList();
      if (Array.isArray(campaigns)) {
        let waUnreadAccumulator = 0;
        // Check running campaigns for unread or failed interactions needing replies view visibility
        for (const c of campaigns.filter(x => x.status === 'running')) {
          const { data: detail } = await waApi.campaignDetail(c.id);
          if (detail?.leads_preview) {
            waUnreadAccumulator += detail.leads_preview.filter(l => l.status === 'failed').length;
          }
        }
        setWaUnread(waUnreadAccumulator);
      }
    } catch (e) { /* background silencer */ }
  };

  useEffect(() => {
    checkCounts();
    const interval = setInterval(checkCounts, 10000); // Polls every 10 seconds smoothly
    return () => clearInterval(interval);
  }, []);

  return { emailUnread, waUnread, refresh: checkCounts };
}