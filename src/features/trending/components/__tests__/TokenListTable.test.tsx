import { render } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import TokenListTable from '../TokenListTable';

vi.mock('@/hooks', () => ({ useIsMobile: () => false }));

function renderTable(showCollectionColumn?: boolean) {
  const { container } = render(
    <TokenListTable
      pages={[]}
      loading
      orderBy="market_cap"
      orderDirection="DESC"
      onSort={vi.fn()}
      showCollectionColumn={showCollectionColumn}
    />,
  );
  return container;
}

/**
 * The desktop skeleton row has to carry the same cells as the header, otherwise
 * the columns visibly drift apart while the first page is loading.
 */
function cellCounts(container: HTMLElement) {
  const headerCells = container.querySelectorAll('thead tr > th');
  const skeletonRow = container.querySelector(
    '.token-list-skeleton .bctsl-token-list-table-row',
  );
  return {
    headers: headerCells.length,
    skeletonCells: skeletonRow?.querySelectorAll(':scope > td').length ?? 0,
  };
}

describe('TokenListTable loading skeleton', () => {
  it('matches the header column count with the collection column shown', () => {
    const { headers, skeletonCells } = cellCounts(renderTable(true));

    expect(headers).toBeGreaterThan(0);
    expect(skeletonCells).toBe(headers);
  });

  it('matches the header column count with the collection column hidden', () => {
    const { headers, skeletonCells } = cellCounts(renderTable(false));

    expect(headers).toBeGreaterThan(0);
    expect(skeletonCells).toBe(headers);
  });

  it('drops one column from both header and skeleton when collection is hidden', () => {
    expect(cellCounts(renderTable(false)).headers)
      .toBe(cellCounts(renderTable(true)).headers - 1);
  });
});
