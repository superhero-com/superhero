import React from 'react';
import { RecentActivity as RecentActivityType } from '../types/dex';
import { CONFIG } from '../../../config';

interface RecentActivityProps {
  recent: RecentActivityType[];
}

export default function RecentActivity({ recent }: RecentActivityProps) {
  if (!recent.length) return null;

  return (
    <div style={{ marginTop: 16, border: '1px solid #3a3a4a', borderRadius: 12, background: '#14141c', padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent activity</div>
      <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
        {recent.map((activity, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'capitalize' }}>{activity.type}</span>
            {activity.hash && CONFIG.EXPLORER_URL && (
              <a 
                href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${activity.hash}`} 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  color: '#8bc9ff', 
                  textDecoration: 'underline',
                  fontSize: '12px'
                }}
              >
                View
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
