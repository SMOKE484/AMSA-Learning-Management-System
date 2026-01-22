import cron from 'node-cron';
import { NotificationService } from "../utils/notificationService.js";
import Notification from "../models/notification.js";

export class NotificationJobs {
  static start() {
    console.log('Starting notification jobs');

    // Process pending notifications every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.processPendingNotifications();
      } catch (error) {
        console.error('Notification job error:', error);
      }
    });

    // Clean up expired notifications every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.cleanupExpiredNotifications();
      } catch (error) {
        console.error('Notification cleanup error:', error);
      }
    });

    // Retry failed notifications every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.retryFailedNotifications();
      } catch (error) {
        console.error('Notification retry error:', error);
      }
    });
  }

  static async processPendingNotifications() {
    try {
      // Process a batch of pending notifications
      const results = await NotificationService.processPendingNotifications(50);
      if (results && (results.successful > 0 || results.failed > 0)) {
        console.log(`Processed notifications: ${results.successful} successful, ${results.failed} failed`);
      }
    } catch (error) {
      console.error('Process pending notifications error:', error);
    }
  }

  static async cleanupExpiredNotifications() {
    try {
      const result = await NotificationService.cleanupExpiredNotifications();
      if (result > 0) {
        console.log(`Cleaned up ${result} expired notifications`);
      }
    } catch (error) {
      console.error('Cleanup expired notifications error:', error);
    }
  }

  static async retryFailedNotifications() {
    try {
      const failedNotifications = await Notification.find({
        status: 'failed',
        retryCount: { $lt: 3 }, // Max 3 retries
        createdAt: { 
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Only from last 24 hours
        }
      }).limit(20);

      if (failedNotifications.length > 0) {
        console.log(`Retrying ${failedNotifications.length} failed notifications`);
        const results = await NotificationService.sendBulkNotifications(failedNotifications);
        console.log(`Retry attempt complete.`);
      }
    } catch (error) {
      console.error('Retry failed notifications error:', error);
    }
  }

  static async runAllJobsManually() {
    console.log('Running all notification jobs manually...');
    await this.processPendingNotifications();
    await this.cleanupExpiredNotifications();
    await this.retryFailedNotifications();
    console.log('All notification jobs completed manually');
  }
}
