import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  cookies: {
    type: Array,
    default: []
  },
  localStorage: {
    type: Map,
    of: String,
    default: {}
  },
  sessionStorage: {
    type: Map,
    of: String,
    default: {}
  },
  userAgent: {
    type: String,
    default: ''
  },
  type: {
    type: String,
      enum:['TikTok','Instagram'],
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isValid: {
    type: Boolean,
    default: true
  },
  metadata: {
    loginCount: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userSessionSchema.index({ username: 1, isValid: 1 });
userSessionSchema.index({ lastLogin: -1 });

// Method to check if session is still valid
// Session is valid if:
// - isValid flag is true
// - Last login was within the last 30 days
userSessionSchema.methods.isSessionValid = function() {
  if (!this.isValid) {
    return false;
  }
  
  // Check if last login was within 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  return this.lastLogin && this.lastLogin.getTime() > thirtyDaysAgo;
};

// Method to mark session as used
userSessionSchema.methods.markAsUsed = async function() {
  this.metadata.lastUsed = Date.now();
  this.metadata.loginCount = (this.metadata.loginCount || 0) + 1;
  await this.save();
};

// Update the updatedAt timestamp before saving
userSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const UserSession = mongoose.model('UserSession', userSessionSchema);

export default UserSession;

