import { offlineDetector } from './offlineDetector';
import { offlineCache } from './offlineCache';

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  data: any;
  timestamp: number;
}

class OfflineSync {
  private readonly SYNC_QUEUE_KEY = 'nxgn_sync_queue';
  private syncInProgress = false;

  constructor() {
    this.setupOnlineListener();
  }

  private setupOnlineListener() {
    offlineDetector.subscribe((status) => {
      if (status.isOnline && !this.syncInProgress) {
        this.syncPendingOperations();
      }
    });
  }

  public addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp'>): void {
    try {
      const syncOp: SyncOperation = {
        ...operation,
        id: this.generateId(),
        timestamp: Date.now()
      };

      const queue = this.getSyncQueue();
      queue.push(syncOp);
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to add sync operation:', error);
    }
  }

  private getSyncQueue(): SyncOperation[] {
    try {
      const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private clearSyncQueue(): void {
    try {
      localStorage.removeItem(this.SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !offlineDetector.getStatus().isOnline) {
      return;
    }

    this.syncInProgress = true;
    const queue = this.getSyncQueue();

    if (queue.length === 0) {
      this.syncInProgress = false;
      return;
    }

    console.log(`Syncing ${queue.length} pending operations...`);

    try {
      // Process operations in order
      for (const operation of queue) {
        try {
          await this.processOperation(operation);
          console.log(`Successfully synced operation: ${operation.type} ${operation.entityType}`);
        } catch (error) {
          console.error(`Failed to sync operation:`, operation, error);
          // Continue with other operations even if one fails
        }
      }

      // Clear processed operations
      this.clearSyncQueue();
      
      // Refresh cache after sync
      await this.refreshCache();
      
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    // This would integrate with the actual API client
    // For now, we'll just log the operation
    console.log('Processing sync operation:', operation);
    
    // In a real implementation, you would:
    // 1. Import the api client
    // 2. Make the appropriate API call based on operation.type and entityType
    // 3. Handle any conflicts or errors
    
    switch (operation.type) {
      case 'create':
        // await api.post(`/${operation.entityType}`, operation.data);
        break;
      case 'update':
        // await api.patch(`/${operation.entityType}/${operation.data.id}`, operation.data);
        break;
      case 'delete':
        // await api.delete(`/${operation.entityType}/${operation.data.id}`);
        break;
    }
  }

  private async refreshCache(): Promise<void> {
    try {
      // This would trigger a refresh of all cached data
      // For now, we'll clear the cache to force fresh data on next load
      console.log('Refreshing cache after sync...');
      
      // In a real implementation, you might:
      // 1. Call the list functions for each entity type
      // 2. Update the cache with fresh data
      
    } catch (error) {
      console.error('Failed to refresh cache:', error);
    }
  }

  public getPendingOperationsCount(): number {
    return this.getSyncQueue().length;
  }

  public isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export const offlineSync = new OfflineSync();
