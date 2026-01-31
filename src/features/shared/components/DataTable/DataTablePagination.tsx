import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { DataTableMeta } from './DataTable';

export interface DataTablePaginationProps {
  meta: DataTableMeta;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  isLoading?: boolean;
  className?: string;
  showItemsPerPage?: boolean;
  itemsPerPageOptions?: number[];
}

export function DataTablePagination({
  meta,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false,
  className = '',
  showItemsPerPage = true,
  itemsPerPageOptions = [5, 10, 20, 50, 100],
}: DataTablePaginationProps) {
  const {
    totalItems,
    itemsPerPage,
    totalPages,
    currentPage,
  } = meta;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value);
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newItemsPerPage);
    }
  };

  // Calculate the range of items being displayed
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`py-3 ${className}`}>
      {/* Mobile: Compact single-row layout with FAB clearance */}
      <div className="flex md:hidden items-center gap-3 pr-20">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1 || isLoading}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition-all hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1 px-2 text-xs text-white/60">
            <span className="font-medium text-white/90">{currentPage}</span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>
          
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages || isLoading}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition-all hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Items info */}
        <span className="text-[10px] text-white/40">
          {startItem}-{endItem} of {totalItems}
        </span>
      </div>

      {/* Desktop: Full layout */}
      <div className="hidden md:flex items-center justify-between">
        {/* Items per page selector */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-white/70">Rows</p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {itemsPerPageOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page info */}
        <div className="flex items-center space-x-4">
          <div className="text-sm text-white/60">
            <span className="font-medium text-white/90">{currentPage}</span>
            <span> / {totalPages}</span>
            <span className="ml-2 text-white/40">({startItem}-{endItem} of {totalItems})</span>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || isLoading}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevious}
            disabled={currentPage === 1 || isLoading}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
            disabled={currentPage === totalPages || isLoading}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || isLoading}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
