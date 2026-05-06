import React from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOfflineStatus } from '../../utils/offlineDetector';
import { offlineCache } from '../../utils/offlineCache';
import { offlineSync } from '../../utils/offlineSync';
import { cn } from '../../lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className = "" }: OfflineIndicatorProps) {
  const { isOnline, isOffline, lastOnlineTime } = useOfflineStatus();
  const [pendingOps, setPendingOps] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    const updateStatus = () => {
      setPendingOps(offlineSync.getPendingOperationsCount());
      setIsSyncing(offlineSync.isSyncing());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline) {
    if (isSyncing) {
      return (
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium border border-blue-700 transition-all duration-300",
          className
        )}>
          <RefreshCw className="h-4 w-4 animate-spin text-white" />
          <span>Syncing data...</span>
        </div>
      );
    }

    if (pendingOps > 0) {
      return (
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white rounded-full text-sm font-medium border border-amber-700 transition-all duration-300",
          className
        )}>
          <AlertCircle className="h-4 w-4 text-white" />
          <span>Online ({pendingOps} pending)</span>
        </div>
      );
    }

    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-full text-sm font-medium border border-emerald-700 transition-all duration-300",
        className
      )}>
        <div className="relative">
          <Wifi className="h-4 w-4 text-white" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
        </div>
        <span>Connected</span>
      </div>
    );
  }

  const lastSyncTime = offlineCache.getLastSyncTime();
  const formattedTime = lastSyncTime 
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never';

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-full text-sm font-medium border border-slate-800 transition-all duration-300",
      className
    )}>
      <div className="relative">
        <WifiOff className="h-4 w-4 text-slate-300" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-slate-400 rounded-full"></div>
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-white">Offline Mode</span>
        <span className="text-xs text-slate-300">
          Last sync: {formattedTime}
          {pendingOps > 0 && ` • ${pendingOps} pending`}
        </span>
      </div>
    </div>
  );
}

export function OfflineBadge({ className = "" }: OfflineIndicatorProps) {
  const { isOnline, isOffline } = useOfflineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 text-white rounded-full text-xs font-medium border border-slate-800 transition-all duration-300",
      className
    )}>
      <WifiOff className="h-3 w-3 text-slate-300" />
      <span>Offline</span>
    </div>
  );
}
