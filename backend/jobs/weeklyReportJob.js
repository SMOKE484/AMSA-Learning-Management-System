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

    // Load every student with parents once, then the week's attendance and
    // marks in two aggregations grouped by student (was 2 queries per child).
    const students = await Student.find({ parents: { $exists: true, $ne: [] } })
      .populate('user', 'name')
      .select('user grade parents')
      .lean();
    if (!students.length) return;

    const studentIds = students.map(s => s._id);

    const [attendanceByStudent, marksByStudent] = await Promise.all([
      Attendance.aggregate([
        { $match: { student: { $in: studentIds }, createdAt: { $gte: weekStart, $lte: now } } },
        {
          $group: {
            _id: '$student',
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          },
        },
      ]),
      Mark.aggregate([
        { $match: { student: { $in: studentIds }, createdAt: { $gte: weekStart, $lte: now } } },
        {
          $group: {
            _id: '$student',
            marks: { $push: { subject: '$subject', score: '$score', total: '$total' } },
          },
        },
      ]),
    ]);

    const attMap = new Map(attendanceByStudent.map(a => [a._id.toString(), a]));
    const marksMap = new Map(marksByStudent.map(m => [m._id.toString(), m.marks]));

    // Group child summary lines by parent
    const linesByParent = new Map();
    for (const child of students) {
      const att = attMap.get(child._id.toString()) || { total: 0, present: 0 };
      const rate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
      const marks = marksMap.get(child._id.toString()) || [];
      const marksLine = marks.length > 0
        ? marks.map(m => `${m.subject}: ${Math.round((m.score / m.total) * 100)}%`).join(', ')
        : 'No new grades';

      const line = `${child.user?.name || 'Student'} (${child.grade}): ${att.present}/${att.total} classes (${rate}%) — ${marksLine}`;
      for (const parentId of child.parents) {
        const key = parentId.toString();
        if (!linesByParent.has(key)) linesByParent.set(key, []);
        linesByParent.get(key).push(line);
      }
    }

    const parents = await User.find({ _id: { $in: [...linesByParent.keys()] }, role: 'parent' })
      .select('pushToken')
      .lean();
    console.log(`📊 Weekly report: processing ${parents.length} parents`);

    for (const parent of parents) {
      try {
        const lines = linesByParent.get(parent._id.toString());
        if (!lines?.length) continue;
        await NotificationService.sendWeeklyReport(parent, lines.join('\n'), weekStart);
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
