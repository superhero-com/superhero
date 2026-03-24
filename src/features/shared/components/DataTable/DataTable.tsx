import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@/components/Spinner';
import { DataTablePagination } from './DataTablePagination';

export interface DataTableParams {
  page?: number;
  limit?: number;
  [key: string]: any;
}

export interface DataTableMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface DataTableResponse<T> {
  items: T[];
  meta: DataTableMeta;
}

export interface DataTableProps<T> {
  queryFn: (params: DataTableParams) => Promise<DataTableResponse<T>>;
  renderRow: (props: { item: T; index: number }) => React.ReactNode;
  initialParams?: DataTableParams;
  className?: string;
  emptyMessage?: string;
  loadingComponent?: React.ReactNode;
  fetchingOverlayComponent?: React.ReactNode;
  errorComponent?: (error: Error) => React.ReactNode;
  showPagination?: boolean;
  itemsPerPage?: number;
}

export const DataTable = <T, >({
  queryFn,
  renderRow,
  initialParams = {},
  className = '',
  emptyMessage = 'No data found',
  loadingComponent,
  fetchingOverlayComponent,
  errorComponent,
  showPagination = true,
  itemsPerPage = 10,
}: DataTableProps<T>) => {
  const [params, setParams] = useState<DataTableParams>({
    page: 1,
    limit: itemsPerPage,
  });
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  // Create a stable query key that includes the queryFn to trigger refetch when filters change
  const queryKey = useMemo(() => ['DataTable', params, initialParams, queryFn], [params, initialParams, queryFn]);

  const {
    data, isLoading, isFetching, error, refetch,
  } = useQuery({
    queryKey,
    queryFn: () => queryFn({
      ...params,
      ...initialParams,
    }),
    placeholderData: (previousData) => previousData,
  });

  const isTableLoading = isLoading || isPageTransitioning;

  const handlePageChange = (page: number) => {
    setIsPageTransitioning(true);
    setParams((prev) => ({ ...prev, page }));
  };

  // Expose methods for parent components
  useEffect(() => {
    // You can expose these methods through a ref if needed
  }, []);

  useEffect(() => {
    if (error) {
      setIsPageTransitioning(false);
      return;
    }

    if (!isFetching && data?.meta?.currentPage === params.page) {
      setIsPageTransitioning(false);
    }
  }, [data?.meta?.currentPage, error, isFetching, params.page]);

  if (isLoading && !data) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        {loadingComponent || (
          <div className="flex items-center space-x-2">
            <Spinner className="h-6 w-6" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 text-center ${className}`}>
        {errorComponent ? (
          errorComponent(error as Error)
        ) : (
          <div className="text-destructive">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="text-muted-foreground">
          <p className="font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Data Table Content */}
      <div className="relative">
        <div className={`space-y-2 transition-opacity ${isPageTransitioning ? 'opacity-50' : ''}`}>
          {data.items.map((item, index) => {
            const itemIdentifier = (item as any).id
              ?? (item as any).address
              ?? (item as any).hash
              ?? JSON.stringify(item);
            const rowKey = `${params.page ?? data.meta?.currentPage ?? 1}-${itemIdentifier}-${index}`;
            return (
              <div key={rowKey}>
                {renderRow({ item, index })}
              </div>
            );
          })}
        </div>

        {isPageTransitioning && (
          <div className="absolute inset-0 flex items-center justify-center">
            {fetchingOverlayComponent || (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
                <Spinner className="h-4 w-4" />
                <span>Loading page...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {showPagination && data?.meta && (
        <DataTablePagination
          meta={data.meta}
          onPageChange={handlePageChange}
          isLoading={isTableLoading}
        />
      )}
    </div>
  );
};

// Hook for using DataTable with external state management
export function useDataTable<T>(
  queryFn: (params: DataTableParams) => Promise<DataTableResponse<T>>,
  initialParams: DataTableParams = {},
) {
  const [params, setParams] = useState<DataTableParams>({
    page: 1,
    limit: 10,
    ...initialParams,
  });

  // Create a stable query key that includes the queryFn to trigger refetch when filters change
  const queryKey = useMemo(() => ['DataTable', params, queryFn], [params, queryFn]);

  const {
    data, isLoading, error, refetch,
  } = useQuery({
    queryKey,
    queryFn: () => queryFn(params),
    placeholderData: (previousData) => previousData,
  });

  const updateParams = (newParams: Partial<DataTableParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  };

  const resetParams = () => {
    setParams({ page: 1, limit: 10, ...initialParams });
  };

  return {
    data,
    isLoading,
    error,
    params,
    updateParams,
    resetParams,
    refetch,
  };
}
