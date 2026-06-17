import cron from 'node-cron';
import User from '../models/user.js';
import Student from '../models/student.js';
import Attendance from '../models/attendance.js';
import Mark from '../models/mark.js';
import { NotificationService } from '../utils/notificationService.js';

export class WeeklyReportJob {
  static start() {
    console.log('Starting weekly activity report job...');

    // Every Friday at 18:00
    cron.schedule('0 18 * * 5', async () => {
      try {
        await this.sendWeeklyReports();
      } catch (error) {
        console.error('Weekly report job error:', error);
      }
    });
  }

  static async sendWeeklyReports() {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const parents = await User.find({ role: 'parent' });
    console.log(`📊 Weekly report: processing ${parents.length} parents`);

    for (const parent of parents) {
      try {
        const children = await Student.find({ parents: parent._id }).populate('user', 'name');
        if (!children.length) continue;

        const childLines = [];

        for (const child of children) {
          const [attendance, marks] = await Promise.all([
            Attendance.find({
              student: child._id,
              createdAt: { $gte: weekStart, $lte: now },
            }).populate('class', 'subject'),
            Mark.find({
              student: child._id,
              createdAt: { $gte: weekStart, $lte: now },
            }),
          ]);

          const present = attendance.filter(a => a.status === 'present').length;
          const absent  = attendance.filter(a => a.status === 'absent').length;
          const late    = attendance.filter(a => a.status === 'late').length;
          const total   = attendance.length;
          const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

          const marksLine = marks.length > 0
            ? marks.map(m => `${m.subject}: ${Math.round((m.score / m.total) * 100)}%`).join(', ')
            : 'No new grades';

          childLines.push(
            `${child.user.name} (${child.grade}): ${present}/${total} classes (${rate}%) — ${marksLine}`
          );
        }

        const fullMessage = childLines.join('\n');
        await NotificationService.sendWeeklyReport(parent, fullMessage, weekStart);
      } catch (error) {
        console.error(`❌ Failed weekly report for parent ${parent._id}:`, error);
      }
    }

    console.log('✅ Weekly reports sent');
  }

  static async runManually() {
    console.log('Running weekly report job manually...');
    await this.sendWeeklyReports();
    console.log('Manual weekly report run complete');
  }
}
