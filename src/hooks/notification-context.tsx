import { createContext } from 'react'

export type NotificationType = 'success' | 'error'

export type AddNotificationOpts = {
  title: string
  message?: string
  type: NotificationType
  userId?: string
}

export type NotificationContextType = {
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  addNotification: (opts: AddNotificationOpts) => void
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)
