import React from 'react';
import AeButton from '../AeButton';
import './MobileTrendingPagination.scss';

interface MobileTrendingPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  className?: string;
}

export default function MobileTrendingPagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  className = '',
}: MobileTrendingPaginationProps) {
  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !loading) {
      onPageChange(currentPage + 1);
    }
  };

  const canGoPrev = currentPage > 1 && !loading;
  const canGoNext = currentPage < totalPages && !loading;

  return (
    <div className={`mobile-trending-pagination ${className}`}>
      <div className="pagination-info">
        <span className="page-text">Page {currentPage} of {totalPages}</span>
        {loading && <span className="loading-indicator">Loading...</span>}
      </div>
      
      <div className="pagination-controls">
        <AeButton 
          variant="ghost" 
          size="sm" 
          rounded
          disabled={!canGoPrev}
          onClick={handlePrevPage}
          className="pagination-button"
        >
          ← Previous
        </AeButton>
        
        <div className="page-indicators">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            const isActive = pageNum === currentPage;
            const isVisible = pageNum >= 1 && pageNum <= totalPages;
            
            if (!isVisible) return null;
            
            return (
              <button
                key={pageNum}
                className={`page-indicator ${isActive ? 'active' : ''}`}
                onClick={() => onPageChange(pageNum)}
                disabled={loading}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <AeButton 
          variant="ghost" 
          size="sm" 
          rounded
          disabled={!canGoNext}
          onClick={handleNextPage}
          className="pagination-button"
        >
          Next →
        </AeButton>
      </div>
    </div>
  );
}
