import mongoose from "mongoose";

const schoolConfigSchema = new mongoose.Schema({
  // School identification
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  code: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },

  // Geo-location configuration
  coordinates: {
    lat: { 
      type: Number, 
      required: true,
      min: -90,
      max: 90 
    },
    lng: { 
      type: Number, 
      required: true,
      min: -180,
      max: 180 
    }
  },
  allowedRadius: { 
    type: Number, 
    default: 200, // meters
    min: 50,
    max: 1000 
  },

  // Geo-fencing settings
  geoFencingEnabled: { 
    type: Boolean, 
    default: true 
  },
  requireLocationAccuracy: {
    type: Boolean,
    default: true
  },
  maxLocationAccuracy: {
    type: Number,
    default: 100, // meters
    min: 10
  },

  // School details
  address: {
    street: String,
    city: String,
    province: String,
    postalCode: String,
    country: {
      type: String,
      default: "South Africa"
    }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },

  // Operational settings
  timezone: { 
    type: String, 
    default: "Africa/Johannesburg" 
  },
  operatingHours: {
    start: { type: String, default: "07:00" }, // HH:MM format
    end: { type: String, default: "17:00" }    // HH:MM format
  },

  // Attendance settings
  defaultCheckInBuffer: {
    type: Number,
    default: 15, // minutes before class
    min: 5,
    max: 60
  },
  defaultCheckOutBuffer: {
    type: Number,
    default: 15, // minutes after class
    min: 5,
    max: 60
  },
  autoMarkAbsentEnabled: {
    type: Boolean,
    default: true
  },

  // Notification settings
  sendClassReminders: {
    type: Boolean,
    default: true
  },
  reminderMinutesBefore: {
    type: Number,
    default: 30, // minutes
    min: 5,
    max: 1440 // 24 hours
  }
}, { 
  timestamps: true 
});

// Ensure only one configuration document exists
schoolConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    // Create default config if none exists
    config = await this.create({
      name: "Default School",
      code: "SCH001",
      coordinates: {
        lat: -26.2041, // Johannesburg default
        lng: 28.0473
      }
    });
  }
  return config;
};

// Method to validate coordinates
schoolConfigSchema.methods.isValidCoordinate = function(lat, lng, accuracy = 100) {
  if (!this.geoFencingEnabled) {
    return true;
  }

  // Basic coordinate validation
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }

  // Accuracy validation if required
  if (this.requireLocationAccuracy && accuracy > this.maxLocationAccuracy) {
    return false;
  }

  return true;
};

// Virtual for full address
schoolConfigSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.address.street,
    this.address.city,
    this.address.province,
    this.address.postalCode,
    this.address.country
  ].filter(part => part && part.trim());
  
  return parts.join(', ');
});

// Pre-save validation
schoolConfigSchema.pre('save', function(next) {
  if (this.isModified('coordinates')) {
    const { lat, lng } = this.coordinates;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return next(new Error('Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180'));
    }
  }
  next();
});

export default mongoose.model("SchoolConfig", schoolConfigSchema);