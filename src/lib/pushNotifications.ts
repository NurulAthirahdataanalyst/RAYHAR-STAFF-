import { API_BASE_URL } from '@/config/api';

/**
 * Initializes browser push notifications and registers token with backend
 */
export async function initializePushNotifications(userId: string) {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    // Check if permission already granted or default
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }

    if (Notification.permission !== 'granted') return;

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    // Retrieve subscription if Web Push is supported
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // Use applicationServerKey if available or standard subscription
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' // Optional standard VAPID public key
        });
      } catch (subErr) {
        // Fallback for browsers that don't need explicit key
      }
    }

    if (subscription) {
      const token = JSON.stringify(subscription);
      await fetch(`${API_BASE_URL}/api/notifications/fcm-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token, platform: 'web' }),
      });
    }
  } catch (err) {
    console.warn('Push notification registration notice:', err);
  }
}
