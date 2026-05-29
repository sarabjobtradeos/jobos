// public/sw-push.js
// Service worker for PWA push notifications
// This extends the default Next.js SW — place in /public/sw-push.js

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'JobOS', body: event.data.text(), url: '/' }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-72.png',
    tag: data.tag || 'jobos',
    renotify: data.renotify || false,
    requireInteraction: false,
    silent: false,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'View', icon: '/icons/icon-72.png' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'JobOS Alert', options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/'
  const fullUrl = new URL(url, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url === fullUrl && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new tab
      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
      }
    })
  )
})

self.addEventListener('pushsubscriptionchange', function (event) {
  // Re-subscribe if subscription expires
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(function (subscription) {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })
      })
  )
})
