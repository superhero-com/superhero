# DataTable Component System

A flexible, reusable DataTable component system built with React Query, TypeScript, and Tailwind CSS that works with your unified API response format.

## Features

- 🔄 **Automatic Pagination**: Built-in pagination with customizable page sizes
- 🎨 **Flexible Row Rendering**: Custom render functions for each row
- ⚡ **React Query Integration**: Automatic caching, background updates, and error handling
- 🎯 **TypeScript Support**: Full type safety with generic types
- 🎛️ **Customizable**: Loading states, error handling, and empty states
- 📱 **Responsive**: Works on all screen sizes
- 🔧 **Extensible**: Easy to extend with additional features

## API Response Format

The DataTable expects your API to return data in this unified format:

```typescript
{
  items: T[],           // Array of data items
  meta: {
    totalItems: number,    // Total number of items across all pages
    itemCount: number,    // Number of items in current page
    itemsPerPage: number, // Items per page
    totalPages: number,   // Total number of pages
    currentPage: number   // Current page number
  }
}
```

## Basic Usage

```tsx
import { DataTable } from '../shared/components/DataTable';
import { DexService } from '../../api/generated';

function MyComponent() {
  return (
    <DataTable
      queryFn={(params) => DexService.listAllPairTransactions({ ...params })}
      renderRow={({ item, index }) => (
        <div key={index}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      )}
      initialParams={{
        limit: 10,
        page: 1,
      }}
    />
  );
}
```

## Advanced Usage with Filters

```tsx
import { useDataTable } from '../shared/components/DataTable';

function AdvancedComponent() {
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
  });

  const { data, isLoading, params, updateParams } = useDataTable(
    (params) => MyService.getData({
      ...params,
      type: filters.type !== 'all' ? filters.type : undefined,
      search: filters.search || undefined,
    }),
    { limit: 20, page: 1 }
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    updateParams({ page: 1 }); // Reset to first page
  };

  return (
    <div>
      {/* Your filter controls */}
      <input 
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.target.value)}
      />
      
      <DataTable
        queryFn={(params) => MyService.getData({ ...params, ...filters })}
        renderRow={({ item }) => <MyRowComponent item={item} />}
        initialParams={{ limit: 20, page: 1 }}
      />
    </div>
  );
}
```

## Props

### DataTable Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `queryFn` | `(params: DataTableParams) => Promise<DataTableResponse<T>>` | **Required** | Function that fetches data |
| `renderRow` | `(props: { item: T; index: number }) => React.ReactNode` | **Required** | Function to render each row |
| `initialParams` | `DataTableParams` | `{}` | Initial query parameters |
| `className` | `string` | `''` | Additional CSS classes |
| `emptyMessage` | `string` | `'No data found'` | Message when no data |
| `loadingComponent` | `React.ReactNode` | `undefined` | Custom loading component |
| `errorComponent` | `(error: Error) => React.ReactNode` | `undefined` | Custom error component |
| `showPagination` | `boolean` | `true` | Show/hide pagination |
| `itemsPerPage` | `number` | `10` | Default items per page |

### DataTableParams

```typescript
interface DataTableParams {
  page?: number;
  limit?: number;
  [key: string]: any; // Additional parameters for your API
}
```

### DataTableResponse

```typescript
interface DataTableResponse<T> {
  items: T[];
  meta: DataTableMeta;
}

interface DataTableMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}
```

## useDataTable Hook

For more control over the data fetching, use the `useDataTable` hook:

```tsx
const {
  data,           // Current data response
  isLoading,      // Loading state
  error,          // Error state
  params,         // Current parameters
  updateParams,   // Function to update parameters
  resetParams,    // Function to reset parameters
  refetch,        // Function to manually refetch
} = useDataTable(queryFn, initialParams);
```

## DataTablePagination Props

The pagination component is automatically included but can be customized:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `meta` | `DataTableMeta` | **Required** | Pagination metadata |
| `onPageChange` | `(page: number) => void` | **Required** | Page change handler |
| `onItemsPerPageChange` | `(itemsPerPage: number) => void` | `undefined` | Items per page change handler |
| `isLoading` | `boolean` | `false` | Loading state |
| `className` | `string` | `''` | Additional CSS classes |
| `showItemsPerPage` | `boolean` | `true` | Show items per page selector |
| `itemsPerPageOptions` | `number[]` | `[5, 10, 20, 50, 100]` | Available page sizes |

## Examples

### Simple Transaction List

```tsx
<DataTable
  queryFn={(params) => DexService.listAllPairTransactions({ ...params })}
  renderRow={({ item }) => (
    <TransactionCard transaction={item} />
  )}
  itemsPerPage={20}
/>
```

### With Custom Loading State

```tsx
<DataTable
  queryFn={myQueryFn}
  renderRow={({ item }) => <MyRow item={item} />}
  loadingComponent={
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  }
/>
```

### With Custom Error Handling

```tsx
<DataTable
  queryFn={myQueryFn}
  renderRow={({ item }) => <MyRow item={item} />}
  errorComponent={(error) => (
    <div className="text-center p-8">
      <h3 className="text-lg font-semibold text-destructive">Error</h3>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  )}
/>
```

## Styling

The DataTable uses Tailwind CSS classes and follows your design system. You can customize the appearance by:

1. **Passing custom className**: Add your own CSS classes
2. **Custom components**: Override loading, error, and empty states
3. **Tailwind customization**: Modify the default classes in your Tailwind config

## Integration with Your API

Make sure your API endpoints return data in the expected format:

```typescript
// Your API service
export class MyService {
  static async getData(params: {
    page?: number;
    limit?: number;
    [key: string]: any;
  }) {
    const response = await fetch('/api/data', {
      method: 'GET',
      // Include params in query string
    });
    
    return {
      items: response.data,
      meta: {
        totalItems: response.total,
        itemCount: response.data.length,
        itemsPerPage: params.limit || 10,
        totalPages: Math.ceil(response.total / (params.limit || 10)),
        currentPage: params.page || 1,
      }
    };
  }
}
```

## Best Practices

1. **Use TypeScript**: Define proper types for your data items
2. **Memoize render functions**: Use `useCallback` for complex render functions
3. **Handle loading states**: Provide meaningful loading indicators
4. **Error boundaries**: Wrap DataTable in error boundaries for better error handling
5. **Optimize queries**: Use React Query's caching and background updates effectively
6. **Responsive design**: Ensure your row components work on all screen sizes

## Troubleshooting

### Common Issues

1. **Type errors**: Make sure your `queryFn` returns the correct type
2. **Pagination not working**: Check that your API returns the correct `meta` object
3. **Loading states**: Ensure your API calls are properly handled by React Query
4. **Styling issues**: Check that Tailwind classes are properly configured

### Debug Tips

- Use React Query DevTools to inspect query states
- Check browser network tab for API calls
- Verify your API response format matches the expected structure
- Use TypeScript strict mode to catch type errors early
