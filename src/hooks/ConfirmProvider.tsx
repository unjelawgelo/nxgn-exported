import React, { useState, ReactNode } from 'react'
import { ConfirmContext, ConfirmOptions } from './confirm-context'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<{
    id: string
    opts: ConfirmOptions
    resolve: (v: boolean) => void
  }[]>([])

  const confirm = (opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const id = Math.random().toString(36).slice(2, 9)
      setQueue((q) => [...q, { id, opts, resolve }])
    })
  }

  const handleClose = (id: string, result: boolean) => {
    setQueue((q) => {
      const item = q.find(i => i.id === id)
      if (item) item.resolve(result)
      return q.filter(i => i.id !== id)
    })
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {queue.map(item => (
        <div key={item.id} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-lg p-6 w-full max-w-sm shadow-lg">
            <h3 className="text-lg font-semibold text-foreground mb-2">{item.opts.title || 'Confirm'}</h3>
            <p className="text-sm text-muted-foreground mb-6">{item.opts.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleClose(item.id, false)}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg"
              >
                {item.opts.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => handleClose(item.id, true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                {item.opts.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </ConfirmContext.Provider>
  )
}