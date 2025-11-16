import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    index: true
  },
  originalFilename: { 
    type: String, 
    required: true 
  },
  storedFilename: { 
    type: String, 
    required: true 
  },
  filePath: { 
    type: String, 
    required: true 
  },
  fileSize: { 
    type: Number, 
    required: true 
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  caption: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  instagramPostId: { 
    type: String 
  },
  instagramPostUrl: { 
    type: String 
  },
  errorMessage: { 
    type: String 
  },
  retryCount: {
    type: Number,
    default: 0
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  startedProcessingAt: { 
    type: Date 
  },
  completedAt: { 
    type: Date 
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    fileHash: String,
    processingSteps: [{
      step: String,
      status: String,
      timestamp: Date,
      message: String
    }]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
uploadSchema.index({ username: 1, status: 1 });
uploadSchema.index({ uploadedAt: -1 });
uploadSchema.index({ status: 1, uploadedAt: -1 });

// Methods
uploadSchema.methods.updateStatus = function(status, message = null) {
  this.status = status;
  if (message) {
    this.errorMessage = message;
  }
  
  if (status === 'processing' && !this.startedProcessingAt) {
    this.startedProcessingAt = new Date();
  }
  
  if (status === 'completed' || status === 'failed') {
    this.completedAt = new Date();
  }
  
  return this.save();
};

uploadSchema.methods.addProcessingStep = function(step, status, message = null) {
  if (!this.metadata.processingSteps) {
    this.metadata.processingSteps = [];
  }
  
  this.metadata.processingSteps.push({
    step,
    status,
    timestamp: new Date(),
    message
  });
  
  return this.save();
};

uploadSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  return this.save();
};

// Static methods
uploadSchema.statics.findPendingUploads = function(username = null) {
  const query = { status: 'pending' };
  if (username) {
    query.username = username;
  }
  return this.find(query).sort({ uploadedAt: 1 });
};

uploadSchema.statics.findRecentUploads = function(username, limit = 10) {
  return this.find({ username })
    .sort({ uploadedAt: -1 })
    .limit(limit);
};

uploadSchema.statics.getUploadStats = function(username = null) {
  const matchStage = username ? { $match: { username } } : { $match: {} };
  
  return this.aggregate([
    matchStage,
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgFileSize: { $avg: '$fileSize' },
        totalFileSize: { $sum: '$fileSize' }
      }
    }
  ]);
};

export default mongoose.model('Upload', uploadSchema);