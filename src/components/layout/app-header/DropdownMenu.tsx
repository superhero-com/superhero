import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NavigationItem } from './navigationItems';

interface DropdownMenuProps {
  item: NavigationItem;
  isActiveRoute: (path: string) => boolean;
  onItemClick?: () => void;
}

export default function DropdownMenu({ item, isActiveRoute, onItemClick }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveSubmenu(null);
    }, 150);
  };

  const handleSubmenuMouseEnter = (subItemId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveSubmenu(subItemId);
  };

  const handleSubmenuMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 150);
  };

  const handleItemClick = () => {
    setIsOpen(false);
    setActiveSubmenu(null);
    onItemClick?.();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const hasActiveChild = item.children?.some(child => 
    isActiveRoute(child.path) || child.children?.some(grandChild => isActiveRoute(grandChild.path))
  );

  return (
    <div 
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main dropdown trigger */}
      <button
        className={`no-underline font-medium px-3 py-2 rounded-lg transition-all duration-200 relative flex items-center gap-1 ${
          isActiveRoute(item.path) || hasActiveChild
            ? 'after:content-[""] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:rounded-sm'
            : ''
        }`}
        style={{
          color: isActiveRoute(item.path) || hasActiveChild ? 'var(--custom-links-color)' : 'var(--light-font-color)',
          backgroundColor: isActiveRoute(item.path) || hasActiveChild ? 'rgba(0,255,157,0.1)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isActiveRoute(item.path) && !hasActiveChild) {
            e.currentTarget.style.color = 'var(--standard-font-color)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActiveRoute(item.path) && !hasActiveChild) {
            e.currentTarget.style.color = 'var(--light-font-color)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {item.label}
        <span className="text-xs">▼</span>
        {(isActiveRoute(item.path) || hasActiveChild) && (
          <span
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-sm"
            style={{ backgroundColor: 'var(--custom-links-color)' }}
          />
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && item.children && (
        <div 
          className="absolute top-full left-0 mt-1 min-w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50"
          style={{
            backgroundColor: 'rgba(12, 12, 20, 0.95)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderColor: 'rgba(255, 255, 255, 0.14)',
            boxShadow: '0 6px 28px rgba(0,0,0,0.35)'
          }}
        >
          {item.children.map((child) => (
            <div key={child.id} className="relative">
              {child.children ? (
                // Submenu with children
                <div
                  onMouseEnter={() => handleSubmenuMouseEnter(child.id)}
                  onMouseLeave={handleSubmenuMouseLeave}
                >
                  <button
                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200 flex items-center justify-between"
                    style={{
                      color: isActiveRoute(child.path) ? 'var(--custom-links-color)' : 'var(--light-font-color)',
                      backgroundColor: isActiveRoute(child.path) ? 'rgba(0,255,157,0.1)' : 'transparent',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span>{child.icon}</span>
                      {child.label}
                    </span>
                    <span className="text-xs">▶</span>
                  </button>
                  
                  {/* Submenu */}
                  {activeSubmenu === child.id && (
                    <div 
                      className="absolute left-full top-0 ml-1 min-w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
                      style={{
                        backgroundColor: 'rgba(12, 12, 20, 0.95)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        borderColor: 'rgba(255, 255, 255, 0.14)',
                        boxShadow: '0 6px 28px rgba(0,0,0,0.35)'
                      }}
                    >
                      {child.children.map((grandChild) => (
                        <Link
                          key={grandChild.id}
                          to={grandChild.path}
                          className="block px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200 flex items-center gap-2"
                          style={{
                            color: isActiveRoute(grandChild.path) ? 'var(--custom-links-color)' : 'var(--light-font-color)',
                            backgroundColor: isActiveRoute(grandChild.path) ? 'rgba(0,255,157,0.1)' : 'transparent',
                          }}
                          onClick={handleItemClick}
                        >
                          <span>{grandChild.icon}</span>
                          {grandChild.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Regular menu item
                <Link
                  to={child.path}
                  className="block px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200 flex items-center gap-2"
                  style={{
                    color: isActiveRoute(child.path) ? 'var(--custom-links-color)' : 'var(--light-font-color)',
                    backgroundColor: isActiveRoute(child.path) ? 'rgba(0,255,157,0.1)' : 'transparent',
                  }}
                  onClick={handleItemClick}
                >
                  <span>{child.icon}</span>
                  {child.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
