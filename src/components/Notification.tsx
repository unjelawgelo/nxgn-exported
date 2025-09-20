import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, AlertTriangle, Info } from 'lucide-react';

interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Notification({ id, type, title, message, duration = 3500, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 240);
  }, [onClose, id]);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose, isVisible]);

  if (!isVisible) return null;

  const variants: Record<string, any> = {
    success: { bg: 'bg-green-900/95', border: 'border-green-700', iconColor: 'text-green-300' },
    error: { bg: 'bg-red-900/95', border: 'border-red-700', iconColor: 'text-red-300' },
    warning: { bg: 'bg-yellow-900/95', border: 'border-yellow-700', iconColor: 'text-yellow-300' },
    info: { bg: 'bg-slate-900/95', border: 'border-slate-700', iconColor: 'text-slate-300' }
  };

  const v = variants[type];
  const Icon = type === 'success' ? Check : type === 'warning' ? AlertTriangle : Info;

  return (
    <div className={`fixed z-50 top-4 right-4 pointer-events-auto`}> 
      <div
        className={`relative overflow-hidden rounded-md shadow-md ${v.bg} ${v.border} border transition-all duration-200 ease-out transform ${isMounted && !isExiting ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-2 opacity-0 scale-98'} ${isExiting ? 'translate-x-4 opacity-0 scale-98' : ''} w-[260px]`}
        role="status"
        aria-live="polite"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="flex items-center px-3 py-2 gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-sm ${v.iconColor}`}>
            <Icon className={`w-4 h-4 ${v.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#E6EEF2] truncate">{title}</div>
            {message && (
              <div className="text-xs text-[#C7D2DB] mt-1 truncate">
                {message.length > 120 ? message.slice(0, 120) + '...' : message}
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            aria-label="Close notification"
            className="ml-2 p-1 rounded-sm hover:bg-white/5 transition-colors"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <X className="w-4 h-4 text-[#94A3B8]" />
          </button>
        </div>
      </div>
    </div>
  );
}