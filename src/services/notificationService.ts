// Notification Service
export interface Notification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

export const notificationService = {
  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  },

  // Send notification
  async sendNotification(notification: Notification): Promise<void> {
    const permission = Notification.permission;

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker to send notification
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        notification
      });
    } else {
      // Fallback to native notification
      new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        requireInteraction: notification.requireInteraction
      });
    }
  },

  // Schedule notification
  async scheduleNotification(
    notification: Notification,
    delayMs: number
  ): Promise<() => void> {
    const timeoutId = setTimeout(() => {
      this.sendNotification(notification);
    }, delayMs);

    // Return cancel function
    return () => clearTimeout(timeoutId);
  },

  // Feeding reminder
  async sendFeedingReminder(farmName: string): Promise<void> {
    await this.sendNotification({
      id: `feeding-${Date.now()}`,
      title: 'Feeding Time',
      body: `It's time to feed the birds at ${farmName}`,
      icon: '/icon-192x192.png',
      badge: '/masked-icon.svg',
      tag: 'feeding-reminder',
      requireInteraction: true,
      actions: [
        { action: 'log', title: 'Log Feeding' },
        { action: 'remind', title: 'Remind Later' }
      ]
    });
  },

  // Medication reminder
  async sendMedicationReminder(medicineName: string): Promise<void> {
    await this.sendNotification({
      id: `medicine-${Date.now()}`,
      title: 'Medication Due',
      body: `Administer ${medicineName} to the birds`,
      icon: '/icon-192x192.png',
      badge: '/masked-icon.svg',
      tag: 'medicine-reminder',
      requireInteraction: true,
      actions: [
        { action: 'mark-complete', title: 'Mark Complete' },
        { action: 'snooze', title: 'Snooze' }
      ]
    });
  },

  // Task reminder
  async sendTaskReminder(taskTitle: string): Promise<void> {
    await this.sendNotification({
      id: `task-${Date.now()}`,
      title: 'Task Reminder',
      body: taskTitle,
      icon: '/icon-192x192.png',
      badge: '/masked-icon.svg',
      tag: 'task-reminder'
    });
  },

  // Error notification
  async sendErrorNotification(errorMessage: string): Promise<void> {
    await this.sendNotification({
      id: `error-${Date.now()}`,
      title: 'Error',
      body: errorMessage,
      icon: '/icon-192x192.png',
      badge: '/masked-icon.svg',
      tag: 'error-notification',
      requireInteraction: true
    });
  },

  // Success notification
  async sendSuccessNotification(message: string): Promise<void> {
    await this.sendNotification({
      id: `success-${Date.now()}`,
      title: 'Success',
      body: message,
      icon: '/icon-192x192.png',
      badge: '/masked-icon.svg',
      tag: 'success-notification'
    });
  }
};

// Local storage for pending notifications (fallback when SW not available)
export const notificationQueue = {
  queue: [] as Notification[],

  add(notification: Notification): void {
    this.queue.push(notification);
    this.saveTolocalStorage();
  },

  getAll(): Notification[] {
    return this.queue;
  },

  clear(): void {
    this.queue = [];
    this.saveTolocalStorage();
  },

  saveTolocalStorage(): void {
    localStorage.setItem('notification_queue', JSON.stringify(this.queue));
  },

  loadFromLocalStorage(): void {
    const stored = localStorage.getItem('notification_queue');
    if (stored) {
      try {
        this.queue = JSON.parse(stored);
      } catch {
        this.queue = [];
      }
    }
  }
};
