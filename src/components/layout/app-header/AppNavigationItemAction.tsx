import { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NavigationItem } from './navigationItems';

interface AppNavigationItemActionProps {
  item: NavigationItem;
  isActive?: boolean;
  className: string;
  style?: CSSProperties;
  onConnect: () => void;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  children: ReactNode;
}

const AppNavigationItemAction = ({
  item,
  isActive = false,
  className,
  style,
  onConnect,
  onMouseEnter,
  onMouseLeave,
  children,
}: AppNavigationItemActionProps) => {
  if (item.isExternal && item.path) {
    return (
      <a
        href={item.path}
        target="_blank"
        rel="noreferrer"
        className={className}
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </a>
    );
  }

  if (item.id === 'account' && !item.path) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={onConnect}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        aria-current={isActive ? 'page' : undefined}
      >
        {children}
      </button>
    );
  }

  if (!item.path) return null;

  return (
    <Link
      to={item.path}
      className={className}
      style={style}
      aria-current={isActive ? 'page' : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  );
};

export default AppNavigationItemAction;
