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
  private checkInterval: NodeJS.Timeout | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
      
      // Add periodic network check for more reliable detection
      this.startNetworkCheck()
    }
  }

  private startNetworkCheck = () => {
    // Check network status every 5 seconds
    this.checkInterval = setInterval(async () => {
      const isActuallyOnline = await this.checkRealConnectivity()
      const wasOnline = this.currentStatus.isOnline
      
      if (isActuallyOnline !== wasOnline) {
        if (isActuallyOnline) {
          this.handleOnline()
        } else {
          this.handleOffline()
        }
      }
    }, 5000)
  }

  private checkRealConnectivity = async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource to check real connectivity
      const response = await fetch('https://httpbin.org/json', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      })
      return true
    } catch {
      // If fetch fails, check navigator.onLine as fallback
      return navigator.onLine
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
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
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
