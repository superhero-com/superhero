import type { ReactNode } from 'react';
import './governance.css';

const GovernanceHeader = ({ children }: { children?: ReactNode }) => (
  <header className="gov-header">
    {children && <div className="gov-header-actions">{children}</div>}
  </header>
);

export default GovernanceHeader;
