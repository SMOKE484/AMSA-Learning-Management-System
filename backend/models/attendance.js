// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClassSchedule",
    required: true
  },
  
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  
  // Attendance status
  status: {
    type: String,
    enum: ["absent", "present", "late", "excused", "left_early"],
    default: "absent"
  },
  
  // Check-in details
  checkIn: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number // In meters
    },
    // === MODIFIED SECTION STARTS ===
    verifiedByLocation: {
      type: Boolean,
      default: false
    },
    verifiedByWifi: {
      type: Boolean,
      default: false
    },
    // Added this for consistency
    verifiedByIP: {
      type: Boolean,
      default: false
    },
    verificationMethod: {
      type: String,
      // Added "school_ip_verified" to this list to prevent crashes
      enum: ["location", "wifi", "qr", "manual", "both", "school_ip_verified"],
      default: "manual"
    },
    // === MODIFIED SECTION ENDS ===
    
    ipAddress: String,
    deviceId: String,
    wifiNetwork: {
      ssid: String,
      bssid: String,
      signalStrength: Number
    }
  },
  
  // Check-out details
  checkOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    },
    ipAddress: String,
    deviceId: String
  },
  
  // Duration in minutes
  duration: Number,
  
  // Verification flags
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Manual override (for teachers/admins)
  manualOverride: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: String,
    timestamp: Date,
    originalStatus: String
  },
  
  // Notes
  notes: String,
  
  // Auto-marked if student didn't check in
  autoMarked: {
    type: Boolean,
    default: false
  },
  
  // Security flags
  flags: [{
    type: String,
    enum: ["high_accuracy", "suspicious_location", "different_device", "off_hours", "ip_mismatch"]
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Unique constraint: one attendance per student per class
attendanceSchema.index({ class: 1, student: 1 }, { unique: true });

// Index for querying
attendanceSchema.index({ student: 1, "checkIn.time": -1 });
attendanceSchema.index({ class: 1, status: 1 });
attendanceSchema.index({ "checkIn.time": 1 });

// Virtual for check-in date
attendanceSchema.virtual('checkInDate').get(function() {
  return this.checkIn?.time ? this.checkIn.time.toISOString().split('T')[0] : null;
});

// Virtual for duration
attendanceSchema.virtual('calculatedDuration').get(function() {
  if (this.checkIn?.time && this.checkOut?.time) {
    return Math.round((this.checkOut.time - this.checkIn.time) / (1000 * 60)); // minutes
  }
  return null;
});

// Pre-save to calculate duration
attendanceSchema.pre('save', function(next) {
  if (this.checkIn?.time && this.checkOut?.time) {
    this.duration = this.calculatedDuration;
  }
  next();
});

export default mongoose.model("Attendance", attendanceSchema);