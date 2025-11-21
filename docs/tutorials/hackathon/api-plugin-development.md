---
title: API Plugin Development
---

## Overview

API plugins extend the Superhero backend to process blockchain transactions, extract data, and contribute content to features like the popular feed. They run server-side and sync with the æternity blockchain.

## Plugin Architecture

API plugins extend `BasePlugin` and implement transaction processing logic. They can also implement `PopularRankingContributor` to inject content into the popular feed.

## Base Plugin Structure

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tx } from '@/mdw-sync/entities/tx.entity';
import { PluginSyncState } from '@/mdw-sync/entities/plugin-sync-state.entity';
import { BasePlugin } from '../base-plugin';
import { PluginFilter } from '../plugin.interface';
import { BasePluginSyncService } from '../base-plugin-sync.service';

@Injectable()
export class MyPlugin extends BasePlugin {
  protected readonly logger = new Logger(MyPlugin.name);
  readonly name = 'my-plugin';
  readonly version = 1; // Increment when data structure changes

  constructor(
    @InjectRepository(Tx)
    protected readonly txRepository: Repository<Tx>,
    @InjectRepository(PluginSyncState)
    protected readonly pluginSyncStateRepository: Repository<PluginSyncState>,
    private syncService: BasePluginSyncService,
  ) {
    super();
  }

  startFromHeight(): number {
    // Block height to start syncing from
    return 1000000;
  }

  filters(): PluginFilter[] {
    return [
      {
        type: 'contract_call',
        contractIds: ['ct_your_contract_address'],
        functions: ['create_item', 'update_item'],
      },
    ];
  }

  protected getSyncService(): BasePluginSyncService {
    return this.syncService;
  }
}
```

## Transaction Processing

Create a sync service that extends `BasePluginSyncService`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BasePluginSyncService } from '../base-plugin-sync.service';
import { Tx } from '@/mdw-sync/entities/tx.entity';
import { SyncDirection } from '../plugin.interface';

@Injectable()
export class MyPluginSyncService extends BasePluginSyncService {
  private readonly logger = new Logger(MyPluginSyncService.name);

  async processBatch(txs: Tx[], syncDirection: SyncDirection): Promise<void> {
    for (const tx of txs) {
      await this.processTransaction(tx, syncDirection);
    }
  }

  private async processTransaction(tx: Tx, syncDirection: SyncDirection) {
    const pluginData = tx.data?.['my-plugin']?.data;
    if (!pluginData) return;

    // Extract data from transaction
    const functionName = tx.function;
    const decodedData = pluginData;

    switch (functionName) {
      case 'create_item':
        await this.handleCreateItem(tx, decodedData);
        break;
      case 'update_item':
        await this.handleUpdateItem(tx, decodedData);
        break;
    }
  }

  private async handleCreateItem(tx: Tx, data: any) {
    // Save to database, emit events, etc.
    this.logger.log(`Created item: ${data.item_id}`);
  }

  private async handleUpdateItem(tx: Tx, data: any) {
    // Update database, etc.
    this.logger.log(`Updated item: ${data.item_id}`);
  }
}
```

## Popular Feed Integration

Implement `PopularRankingContributor` to inject content into the popular feed:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PopularRankingContributor, PopularRankingContentItem } from '../popular-ranking.interface';
import { PopularWindow } from '@/social/services/popular-ranking.service';
import { MyItem } from './entities/my-item.entity';

@Injectable()
export class MyPluginPopularRankingService implements PopularRankingContributor {
  readonly name = 'my-content';
  private readonly logger = new Logger(MyPluginPopularRankingService.name);

  constructor(
    @InjectRepository(MyItem)
    private readonly itemRepository: Repository<MyItem>,
  ) {}

  async getRankingCandidates(
    window: PopularWindow,
    since: Date | null,
    limit: number,
  ): Promise<PopularRankingContentItem[]> {
    try {
      const queryBuilder = this.itemRepository
        .createQueryBuilder('item')
        .orderBy('item.created_at', 'DESC')
        .limit(limit);

      // Apply time window filter
      if (since) {
        queryBuilder.where('item.created_at >= :since', { since });
      }

      const items = await queryBuilder.getMany();

      return items.map((item) => ({
        id: `my-content:${item.id}`, // Must match format: {plugin-name}:{id}
        type: 'my-content',
        created_at: item.created_at,
        sender_address: item.creator_address,
        content: item.title || item.description || '',
        total_comments: item.comments_count || 0,
        topics: item.tags?.map(tag => ({ name: tag })) || [],
        metadata: {
          item_id: item.id,
          // Add any additional metadata
        },
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch items for popular ranking:`, error);
      return [];
    }
  }
}
```

## Plugin Module Setup

Create a module to wire everything together:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MyPlugin } from './my-plugin';
import { MyPluginSyncService } from './my-plugin-sync.service';
import { MyPluginPopularRankingService } from './my-plugin-popular-ranking.service';
import { MyItem } from './entities/my-item.entity';
import { POPULAR_RANKING_CONTRIBUTOR } from '../plugin.tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([MyItem]),
  ],
  providers: [
    MyPlugin,
    MyPluginSyncService,
    {
      provide: POPULAR_RANKING_CONTRIBUTOR,
      useClass: MyPluginPopularRankingService,
      multi: true, // Allow multiple contributors
    },
  ],
  exports: [MyPlugin],
})
export class MyPluginModule {}
```

## Registering the Plugin

Add your plugin to the main plugin index:

```typescript
// src/plugins/index.ts
import { MyPluginModule } from './my-plugin/my-plugin.module';
import { MyPluginPopularRankingService } from './my-plugin/my-plugin-popular-ranking.service';

export const PLUGIN_MODULES: Type[] = [
  // ... other plugins
  MyPluginModule,
];

export const getPopularRankingContributorProvider = (): Provider => ({
  provide: POPULAR_RANKING_CONTRIBUTOR,
  useFactory: (
    governanceRankingService: GovernancePopularRankingService,
    myPluginRankingService: MyPluginPopularRankingService,
  ): PopularRankingContributor[] => {
    return [
      governanceRankingService,
      myPluginRankingService, // Add your contributor
    ];
  },
  inject: [GovernancePopularRankingService, MyPluginPopularRankingService],
});
```

## Transaction Filters

Define filters to match relevant transactions:

```typescript
filters(): PluginFilter[] {
  return [
    {
      type: 'contract_call',
      contractIds: ['ct_your_contract_address'],
      functions: ['create_item', 'update_item', 'delete_item'],
    },
    // Custom predicate for complex filtering
    {
      predicate: (tx: Partial<Tx>) => {
        return (
          tx.type === 'ContractCallTx' &&
          tx.contract_id === 'ct_your_contract_address' &&
          tx.function?.startsWith('item_')
        );
      },
    },
  ];
}
```

## Version Management

Increment the plugin version when data structures change:

```typescript
readonly version = 2; // Increment when breaking changes occur
```

This triggers a re-sync of plugin data for affected transactions.

## Update Queries

Override `getUpdateQueries` to handle transaction updates:

```typescript
getUpdateQueries(pluginName: string, currentVersion: number) {
  return [
    async (repo, limit, cursor) => {
      const query = repo.createQueryBuilder('tx')
        .where('tx.function IN (:...functions)', { 
          functions: ['create_item', 'update_item'] 
        })
        .andWhere(
          `(tx.data->>'${pluginName}' IS NULL OR (tx.data->'${pluginName}'->>'_version')::int != :version)`,
          { version: currentVersion }
        )
        .orderBy('tx.block_height', 'ASC')
        .addOrderBy('tx.micro_time', 'ASC')
        .limit(limit);

      if (cursor) {
        query.andWhere(
          '(tx.block_height > :height OR (tx.block_height = :height AND tx.micro_time > :microTime))',
          { height: cursor.block_height, microTime: cursor.micro_time }
        );
      }

      return query.getMany();
    },
  ];
}
```

## Error Handling

Handle errors gracefully:

```typescript
async processTransaction(tx: Tx, syncDirection: SyncDirection) {
  try {
    // Process transaction
  } catch (error) {
    this.logger.error(`Failed to process transaction ${tx.hash}:`, error);
    // Don't throw - continue processing other transactions
  }
}
```

## Testing

Test your plugin with sample transactions:

```typescript
describe('MyPlugin', () => {
  it('should process create_item transactions', async () => {
    const mockTx = {
      hash: 'th_test',
      function: 'create_item',
      data: {
        'my-plugin': {
          _version: 1,
          data: { item_id: '123', title: 'Test Item' },
        },
      },
    };
    
    await plugin.processBatch([mockTx], SyncDirectionEnum.LIVE);
    // Assert expected behavior
  });
});
```

## Best Practices

1. **Idempotency**: Ensure processing is idempotent
2. **Error Handling**: Log errors but don't crash the sync
3. **Performance**: Process in batches when possible
4. **Versioning**: Increment version for breaking changes
5. **Logging**: Use structured logging for debugging
6. **Testing**: Test with real transaction data

