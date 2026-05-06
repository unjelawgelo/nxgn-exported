interface CacheItem<T> {
  data: T
  timestamp: number
  entityType: string
  queryKey?: string
}

interface CacheMetadata {
  lastSyncTime: number
  version: string
}

class OfflineCache {
  private readonly CACHE_PREFIX = 'nxgn_offline_'
  private readonly METADATA_KEY = 'nxgn_offline_metadata'
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    this.initializeMetadata()
  }

  private initializeMetadata() {
    if (!this.getMetadata()) {
      const metadata: CacheMetadata = {
        lastSyncTime: Date.now(),
        version: '1.0.0'
      }
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata))
    }
  }

  private getMetadata(): CacheMetadata | null {
    try {
      const stored = localStorage.getItem(this.METADATA_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  private updateMetadata() {
    const metadata = this.getMetadata()
    if (metadata) {
      metadata.lastSyncTime = Date.now()
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata))
    }
  }

  private getCacheKey(entityType: string, queryKey?: string): string {
    return queryKey 
      ? `${this.CACHE_PREFIX}${entityType}_${queryKey}`
      : `${this.CACHE_PREFIX}${entityType}`
  }

  public set<T>(entityType: string, data: T, queryKey?: string): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        entityType,
        queryKey
      }
      
      const key = this.getCacheKey(entityType, queryKey)
      localStorage.setItem(key, JSON.stringify(cacheItem))
      this.updateMetadata()
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }

  public get<T>(entityType: string, queryKey?: string): T | null {
    try {
      const key = this.getCacheKey(entityType, queryKey)
      const stored = localStorage.getItem(key)
      
      if (!stored) return null

      const cacheItem: CacheItem<T> = JSON.parse(stored)
      
      // Check if cache is expired
      if (Date.now() - cacheItem.timestamp > this.CACHE_EXPIRY) {
        this.remove(entityType, queryKey)
        return null
      }

      return cacheItem.data
    } catch {
      return null
    }
  }

  public remove(entityType: string, queryKey?: string): void {
    try {
      const key = this.getCacheKey(entityType, queryKey)
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove cached data:', error)
    }
  }

  public clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
      
      // Reset metadata
      this.initializeMetadata()
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  public getAllKeys(): string[] {
    try {
      return Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX))
    } catch {
      return []
    }
  }

  public getCacheSize(): number {
    try {
      let size = 0
      this.getAllKeys().forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          size += key.length + value.length
        }
      })
      return size
    } catch {
      return 0
    }
  }

  public isExpired(entityType: string, queryKey?: string): boolean {
    try {
      const key = this.getCacheKey(entityType, queryKey)
      const stored = localStorage.getItem(key)
      
      if (!stored) return true

      const cacheItem: CacheItem<any> = JSON.parse(stored)
      return Date.now() - cacheItem.timestamp > this.CACHE_EXPIRY
    } catch {
      return true
    }
  }

  public getLastSyncTime(): number {
    const metadata = this.getMetadata()
    return metadata?.lastSyncTime || 0
  }
}

export const offlineCache = new OfflineCache()
