// models/ClassSchedule.js 
// (Ensure you save this file with Capital 'C')

import mongoose from "mongoose";
import { PREDEFINED_SUBJECTS, PREDEFINED_GRADES } from "../config/academicConfig.js";

const classScheduleSchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: true },
  subject: { type: String, enum: PREDEFINED_SUBJECTS, required: true },
  grade: { type: String, enum: PREDEFINED_GRADES, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  scheduledDate: { type: Date, required: true },
  startTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  endTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  checkInNotificationSent: {  type: Boolean, default: false },
  
  classStartTime: Date,
  classEndTime: Date,
  checkInStart: Date,    
  checkInEnd: Date,      
  checkOutStart: Date,   
  checkOutEnd: Date,     
  recurrence: { type: String, enum: ["none", "daily", "weekly"], default: "none" },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  status: { type: String, enum: ["scheduled", "ongoing", "completed", "cancelled"], default: "scheduled" },
  meetingLink: { type: String, trim: true },
  room: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  autoMarkAbsent: { type: Boolean, default: true },
  autoAssigned: { type: Boolean, default: false },
  maxStudents: { type: Number, default: 30, min: 1 }
}, { timestamps: true });

// Virtuals
classScheduleSchema.virtual('classStartDateTime').get(function() {
  const [hours, minutes] = this.startTime.split(':').map(Number);
  const date = new Date(this.scheduledDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
});

classScheduleSchema.virtual('classEndDateTime').get(function() {
  const [hours, minutes] = this.endTime.split(':').map(Number);
  const date = new Date(this.scheduledDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
});

// Pre-save hooks
classScheduleSchema.pre('save', function(next) {
  if (this.isModified('scheduledDate') || this.isModified('startTime') || this.isModified('endTime')) {
    
    // 1. Calculate and Save Exact Start/End Times
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const startDate = new Date(this.scheduledDate);
    startDate.setHours(startHours, startMinutes, 0, 0);
    this.classStartTime = startDate;

    const [endHours, endMinutes] = this.endTime.split(':').map(Number);
    const endDate = new Date(this.scheduledDate);
    endDate.setHours(endHours, endMinutes, 0, 0);
    this.classEndTime = endDate;

    // Check-in opens 15 mins before end 
    this.checkInStart = new Date(endDate.getTime() - 15 * 60000); 
    this.checkInEnd = new Date(endDate.getTime() + 5 * 60000);
    this.checkOutStart = new Date(endDate.getTime() - 15 * 60000);
    this.checkOutEnd = new Date(endDate.getTime() + 15 * 60000);
  }
  next();
});

classScheduleSchema.methods.isCheckInAvailable = function() {
  const now = new Date();
  return now >= this.checkInStart && now <= this.checkInEnd;
};

classScheduleSchema.methods.isCheckOutAvailable = function() {
  const now = new Date();
  return now >= this.checkOutStart && now <= this.checkOutEnd;
};

classScheduleSchema.statics.findUpcomingForStudent = function(studentId, days = 7) {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0); 
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  endDate.setHours(23, 59, 59, 999);
  
  return this.find({
    students: studentId,
    scheduledDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['scheduled', 'ongoing'] }
  }).populate('tutor', 'user')
    .populate('tutor.user', 'name email')
    .sort({ scheduledDate: 1, startTime: 1 });
};


export default mongoose.models.ClassSchedule || mongoose.model("ClassSchedule", classScheduleSchema);