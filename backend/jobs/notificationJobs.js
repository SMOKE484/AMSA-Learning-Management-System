import cron from 'node-cron';
import { NotificationService } from "../utils/notificationService.js";

export class NotificationJobs {
  static start() {
    console.log('Starting notification jobs');

    // Clean up expired notifications every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.cleanupExpiredNotifications();
      } catch (error) {
        console.error('Notification cleanup error:', error);
      }
    });
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

  static async runAllJobsManually() {
    console.log('Running all notification jobs manually...');
    await this.cleanupExpiredNotifications();
    console.log('All notification jobs completed manually');
  }
}
