'use client'
import { usePushNotifications } from '@/lib/usePushNotifications'
import { Bell, BellOff, BellRing, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  unsupported: {
    icon: BellOff,
    label: 'Not supported',
    sublabel: 'Your browser doesn\'t support push notifications',
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    action: null,
  },
  denied: {
    icon: AlertCircle,
    label: 'Blocked by browser',
    sublabel: 'Open browser settings → Site permissions → Allow notifications',
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    action: null,
  },
  granted: {
    icon: BellRing,
    label: 'Push notifications ON',
    sublabel: 'You\'ll be alerted for high-score jobs and interview reminders',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    action: 'Turn off',
  },
  default: {
    icon: Bell,
    label: 'Push notifications OFF',
    sublabel: 'Get instant alerts for 8+ fit score jobs and upcoming interviews',
    color: 'text-gray-600',
    bg: 'bg-white',
    border: 'border-gray-200',
    action: 'Turn on',
  },
  loading: {
    icon: Bell,
    label: 'Checking...',
    sublabel: '',
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    action: null,
  },
}

export default function PushNotificationToggle() {
  const { status, subscribe, unsubscribe } = usePushNotifications()
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  async function handleToggle() {
    if (status === 'granted') {
      const ok = await unsubscribe()
      if (ok) toast.success('Push notifications disabled')
      else toast.error('Could not disable — try browser settings')
    } else {
      const ok = await subscribe()
      if (ok) toast.success('Push notifications enabled! 🔔')
      else if (Notification.permission === 'denied') {
        toast.error('Notifications blocked — check browser settings')
      }
    }
  }

  return (
    <div className={cn('rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors', config.bg, config.border)}>
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', status === 'granted' ? 'bg-green-100' : 'bg-gray-100')}>
          <Icon className={cn('w-4.5 h-4.5', config.color)} />
        </div>
        <div>
          <div className={cn('text-sm font-medium', config.color)}>{config.label}</div>
          {config.sublabel && (
            <div className="text-xs text-gray-500 mt-0.5 leading-relaxed max-w-xs">{config.sublabel}</div>
          )}
        </div>
      </div>

      {config.action && (
        <button
          onClick={handleToggle}
          disabled={status === 'loading'}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-shrink-0 disabled:opacity-60',
            status === 'granted'
              ? 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
              : 'bg-brand-500 border-brand-500 text-white hover:bg-brand-600'
          )}
        >
          {status === 'loading' ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : config.action}
        </button>
      )}
    </div>
  )
}
