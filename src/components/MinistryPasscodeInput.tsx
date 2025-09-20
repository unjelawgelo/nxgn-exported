import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface MinistryPasscodeInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  id?: string
  required?: boolean
}

export default function MinistryPasscodeInput({
  value,
  onChange,
  placeholder = 'Ministry Passcode',
  id = 'ministry-passcode',
  required = false,
}: MinistryPasscodeInputProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full pr-12 p-4 bg-card border border-border rounded-lg focus:outline-none focus:ring-0 focus:border-border placeholder-muted-foreground text-foreground"
      />

      {value.length > 0 && (
        <button
          type="button"
          aria-label={show ? 'Hide passcode' : 'Show passcode'}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </div>
  )
}