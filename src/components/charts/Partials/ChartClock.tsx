import React, { useEffect, useState } from 'react';
import moment from 'moment';
import WebSocketClient from '@/libs/WebSocketClient';
import { TIME_FULL } from '@/utils/constants';
import Spinner from '@/components/Spinner';

interface ChartClockProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
}

export default function ChartClock({ className = '', ...props }: ChartClockProps) {
  const [currentTime, setCurrentTime] = useState(moment());
  const [isConnected, setIsConnected] = useState(WebSocketClient.isConnected());

  useEffect(() => {
    // Update time and connection status every second
    const interval = setInterval(() => {
      const connected = WebSocketClient.isConnected();
      setIsConnected(connected);
      console.log('connected', connected);
      // Only update time if connected
      if (connected) {
        setCurrentTime(moment());
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []); // Empty dependency array since we check the connection status inside the interval

  return (
    <div className={className} {...props}>
      {!isConnected ? (
        <span className="flex items-center gap-2">
          <Spinner />
          Reconnecting...
        </span>
      ) : (
        <span>
          {currentTime.format(TIME_FULL)}
          ({moment().format('Z')})
        </span>
      )}
    </div>
  );
}
