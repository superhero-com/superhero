/**
 * Runs {@link useNotifications} exactly ONCE for the whole app and shares the
 * result via context. Both the desktop sidebar and the mobile top bar are always
 * mounted (one is only hidden with CSS), so if each rendered a bell that called
 * `useNotifications()` directly we'd build TWO clients — two sockets and two
 * wallet-signature prompts. A single provider keeps it to one session.
 */
import React, { createContext, useContext } from 'react';
import { useNotifications, type UseNotifications } from './useNotifications';

const NotificationsContext = createContext<UseNotifications | null>(null);

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useNotifications();
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotificationsContext(): UseNotifications {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return ctx;
}
