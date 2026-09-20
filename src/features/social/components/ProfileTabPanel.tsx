import React, { useEffect, useState } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { TabErrorState, TabOfflineBanner } from './ProfileTabStates';

// A failed tab must never take the header with it: the panel wraps only the tab
// body, so a thrown query error renders the recoverable error state here and the
// blocks above stay mounted. `resetKey` (the active tab) clears a stuck error
// when the visitor switches tabs.
type BoundaryProps = {
  resetKey: string;
  onReset: () => void;
  children: React.ReactNode;
};
type BoundaryState = { hasError: boolean };

class TabErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prev: BoundaryProps) {
    const { resetKey } = this.props;
    const { hasError } = this.state;
    if (hasError && prev.resetKey !== resetKey) {
      this.setState({ hasError: false });
    }
  }

  handleRetry = () => {
    const { onReset } = this.props;
    onReset();
    this.setState({ hasError: false });
  };

  render() {
    const { children } = this.props;
    const { hasError } = this.state;
    if (hasError) return <TabErrorState onRetry={this.handleRetry} />;
    return children;
  }
}

function useOffline() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  );
  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return offline;
}

const ProfileTabPanel = ({
  activeTab,
  children,
}: {
  activeTab: string;
  children: React.ReactNode;
}) => {
  const offline = useOffline();
  return (
    <div className="w-full">
      {offline && <TabOfflineBanner />}
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <TabErrorBoundary resetKey={activeTab} onReset={reset}>
            {children}
          </TabErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
};

export default ProfileTabPanel;
