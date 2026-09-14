// Firebase Messaging Service Worker for Rayhar Staff Portal
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.notification?.title || data.title || 'Rayhar Notification';
      const options = {
        body: data.notification?.body || data.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: data.data || {},
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      const title = 'Rayhar Leave & Attendance';
      const options = {
        body: event.data.text(),
        icon: '/favicon.ico',
      };
      event.waitUntil(self.registration.showNotification(title, options));
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
