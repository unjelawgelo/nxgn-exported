import { useState, useEffect } from 'react'

export interface OfflineStatus {
  isOnline: boolean
  isOffline: boolean
  lastOnlineTime: number | null
}

class OfflineDetector {
  private listeners: Set<(status: OfflineStatus) => void> = new Set()
  private currentStatus: OfflineStatus = {
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    lastOnlineTime: navigator.onLine ? Date.now() : null
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Only use browser events - completely instant and reliable
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
      
      // Set initial status immediately based on browser
      this.currentStatus = {
        isOnline: navigator.onLine,
        isOffline: !navigator.onLine,
        lastOnlineTime: navigator.onLine ? Date.now() : null
      }
    }
  }

  private handleOnline = () => {
    this.currentStatus = {
      isOnline: true,
      isOffline: false,
      lastOnlineTime: Date.now()
    }
    this.notifyListeners()
  }

  private handleOffline = () => {
    this.currentStatus = {
      isOnline: false,
      isOffline: true,
      lastOnlineTime: this.currentStatus.lastOnlineTime
    }
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentStatus))
  }

  public getStatus(): OfflineStatus {
    return { ...this.currentStatus }
  }

  public subscribe(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.add(listener)
    listener(this.currentStatus)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }
    this.listeners.clear()
  }
}

export const offlineDetector = new OfflineDetector()

export function useOfflineStatus(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>(offlineDetector.getStatus())

  useEffect(() => {
    const unsubscribe = offlineDetector.subscribe(setStatus)
    return unsubscribe
  }, [])

  return status
}
