import { 
  format, 
  addMinutes, 
  isWithinInterval, 
  parse, 
  isAfter, 
  isBefore,
  differenceInMinutes
} from 'date-fns';

export class TimeService {
  /**
   * Calculate timing windows for a class
   * @param {Date} classDate - The date of the class
   * @param {string} startTime - Start time in "HH:MM" format
   * @param {string} endTime - End time in "HH:MM" format
   * @param {number} bufferMinutes - Buffer minutes (default: 15)
   * @returns {Object} Timing windows
   */
  static calculateTimingWindows(classDate, startTime, endTime, bufferMinutes = 15) {
    const classStart = this.combineDateAndTime(classDate, startTime);
    const classEnd = this.combineDateAndTime(classDate, endTime);
    
    return {
      checkInStart: addMinutes(classStart, -bufferMinutes),
      checkInEnd: addMinutes(classStart, bufferMinutes),
      checkOutStart: addMinutes(classEnd, -bufferMinutes),
      checkOutEnd: addMinutes(classEnd, bufferMinutes),
      classStart,
      classEnd
    };
  }

  /**
   * Combine date and time strings into a Date object
   * @param {Date} date - The date portion
   * @param {string} timeString - Time in "HH:MM" format
   * @returns {Date} Combined datetime
   */
  static combineDateAndTime(date, timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Check if current time is within a time window
   * @param {Date} now - Current time
   * @param {Date} start - Window start
   * @param {Date} end - Window end
   * @returns {boolean} True if within window
   */
  static isWithinTimeWindow(now, start, end) {
    return isWithinInterval(now, { start, end });
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @param {string} formatString - Format string
   * @returns {string} Formatted date
   */
  static formatDate(date, formatString = 'yyyy-MM-dd') {
    return format(date, formatString);
  }

  /**
   * Format time for display
   * @param {Date} date - Date containing time
   * @returns {string} Formatted time (HH:MM)
   */
  static formatTime(date) {
    return format(date, 'HH:mm');
  }

  /**
   * Get minutes until an event
   * @param {Date} eventTime - Event time
   * @returns {number} Minutes until event (negative if past)
   */
  static getMinutesUntil(eventTime) {
    return differenceInMinutes(eventTime, new Date());
  }

  /**
   * Check if a class is happening now
   * @param {Date} classStart - Class start time
   * @param {Date} classEnd - Class end time
   * @returns {boolean} True if class is ongoing
   */
  static isClassOngoing(classStart, classEnd) {
    const now = new Date();
    return isWithinInterval(now, { start: classStart, end: classEnd });
  }

  /**
   * Check if check-in is available for a class
   * @param {Date} checkInStart - Check-in window start
   * @param {Date} checkInEnd - Check-in window end
   * @returns {boolean} True if check-in is available
   */
  static isCheckInAvailable(checkInStart, checkInEnd) {
    return this.isWithinTimeWindow(new Date(), checkInStart, checkInEnd);
  }

  /**
   * Check if check-out is available for a class
   * @param {Date} checkOutStart - Check-out window start
   * @param {Date} checkOutEnd - Check-out window end
   * @returns {boolean} True if check-out is available
   */
  static isCheckOutAvailable(checkOutStart, checkOutEnd) {
    return this.isWithinTimeWindow(new Date(), checkOutStart, checkOutEnd);
  }

  /**
   * Generate time slots for scheduling
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} endTime - End time (HH:MM)
   * @param {number} intervalMinutes - Interval in minutes (default: 30)
   * @returns {string[]} Array of time slots
   */
  static generateTimeSlots(startTime = '07:00', endTime = '17:00', intervalMinutes = 30) {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute <= endMinute)
    ) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push(timeString);

      currentMinute += intervalMinutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return slots;
  }

  /**
   * Calculate class duration in minutes
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} endTime - End time (HH:MM)
   * @returns {number} Duration in minutes
   */
  static calculateDuration(startTime, endTime) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    return endTotalMinutes - startTotalMinutes;
  }
}