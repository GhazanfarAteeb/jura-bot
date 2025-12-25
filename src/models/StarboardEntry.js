import mongoose from 'mongoose';

const starboardEntrySchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  originalMessageId: {
    type: String,
    required: true
  },
  originalChannelId: {
    type: String,
    required: true
  },
  starboardMessageId: {
    type: String,
    required: true
  },
  authorId: {
    type: String,
    required: true
  },
  starCount: {
    type: Number,
    default: 0
  },
  starrers: [{
    type: String // User IDs who starred
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index
starboardEntrySchema.index({ guildId: 1, originalMessageId: 1 }, { unique: true });

// Static method to find by original message
starboardEntrySchema.statics.findByOriginalMessage = async function (guildId, messageId) {
  return await this.findOne({ guildId, originalMessageId: messageId });
};

// Static method to get top starred
starboardEntrySchema.statics.getTopStarred = async function (guildId, limit = 10) {
  return await this.find({ guildId })
    .sort({ starCount: -1 })
    .limit(limit);
};

export default mongoose.model('StarboardEntry', starboardEntrySchema);
