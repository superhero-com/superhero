import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  errorComponent?: (error: Error) => React.ReactNode;
  showPagination?: boolean;
  itemsPerPage?: number;
}

export function DataTable<T>({
  queryFn,
  renderRow,
  initialParams = {},
  className = '',
  emptyMessage = 'No data found',
  loadingComponent,
  errorComponent,
  showPagination = true,
  itemsPerPage = 10,
}: DataTableProps<T>) {
  const [params, setParams] = useState<DataTableParams>({
    page: 1,
    limit: itemsPerPage,
  });

  // Create a stable query key that includes the queryFn to trigger refetch when filters change
  const queryKey = useMemo(() => ['DataTable', params, initialParams, queryFn], [params, initialParams, queryFn]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => queryFn({
      ...params,
      ...initialParams,
    }),
    placeholderData: (previousData) => previousData,
  });

  const handlePageChange = (page: number) => {
    setParams(prev => ({ ...prev, page }));
  };

  const handleParamsChange = (newParams: Partial<DataTableParams>) => {
    setParams(prev => ({ ...prev, ...newParams, page: 1 }));
  };

  // Expose methods for parent components
  useEffect(() => {
    // You can expose these methods through a ref if needed
  }, []);

  if (isLoading && !data) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        {loadingComponent || (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
      <div className="space-y-2">
        {data.items.map((item, index) => (
          <div key={index}>
            {renderRow({ item, index })}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {showPagination && data?.meta && (
        <DataTablePagination
          meta={data.meta}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

// Hook for using DataTable with external state management
export function useDataTable<T>(
  queryFn: (params: DataTableParams) => Promise<DataTableResponse<T>>,
  initialParams: DataTableParams = {}
) {
  const [params, setParams] = useState<DataTableParams>({
    page: 1,
    limit: 10,
    ...initialParams,
  });

  // Create a stable query key that includes the queryFn to trigger refetch when filters change
  const queryKey = useMemo(() => ['DataTable', params, queryFn], [params, queryFn]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => queryFn(params),
    placeholderData: (previousData) => previousData,
  });

  const updateParams = (newParams: Partial<DataTableParams>) => {
    setParams(prev => ({ ...prev, ...newParams }));
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
