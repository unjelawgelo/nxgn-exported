import React, { useState, ReactNode } from 'react'
import { NotificationContext, AddNotificationOpts } from './notification-context'

type Notification = {
  id: string
  type: 'success' | 'error'
  title: string
  message?: string
  userId?: string
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const pushNotification = (type: 'success' | 'error', title: string, message?: string, userId?: string) => {
    const id = Math.random().toString(36).slice(2, 9)
    const notification: Notification = { id, type, title, message, userId }

    setNotifications(prev => [...prev, notification])

    // Auto remove after 3.5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3500)
  }

  // New object-style API (message optional)
  const addNotification = (opts: AddNotificationOpts) => {
    pushNotification(opts.type, opts.title, opts.message, opts.userId)
  }

  const showSuccess = (title: string, message?: string) => {
    pushNotification('success', title, message)
  }

  const showError = (title: string, message?: string) => {
    pushNotification('error', title, message)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, addNotification }}>
      {children}

      {/* Notification Container - compact rectangular notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map(notification => (
          <div
            key={notification.id}
            onClick={() => removeNotification(notification.id)}
            className={`pointer-events-auto px-3 py-2 rounded-md shadow-md cursor-pointer transform transition-all max-w-xs w-full flex items-start gap-3 ${
              notification.type === 'success'
                ? 'bg-green-900/95 border border-green-700 text-green-100'
                : 'bg-red-900/95 border border-red-700 text-red-100'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-5">{notification.title}</div>
              {notification.message && (
                <div className="text-xs text-slate-300 mt-1 max-h-8 overflow-hidden">
                  {notification.message.length > 120 ? notification.message.slice(0, 120) + '...' : notification.message}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}