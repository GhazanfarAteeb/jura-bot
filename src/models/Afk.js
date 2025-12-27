import mongoose from 'mongoose';

const afkSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  odId: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: 'AFK'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Enhanced features
  autoRemove: {
    type: Boolean,
    default: true // Auto-remove when user sends a message
  },
  scheduledReturn: {
    type: Date, // Optional: auto-remove at this time
    default: null
  },
  originalNickname: {
    type: String,
    default: null
  },
  mentions: [{
    odId: String,
    username: String,
    channelId: String,
    messageId: String,
    messageContent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Stats
  totalMentions: {
    type: Number,
    default: 0
  },
  timesAfk: {
    type: Number,
    default: 1
  }
});

// Compound index for quick lookups
afkSchema.index({ guildId: 1, odId: 1 }, { unique: true });
afkSchema.index({ scheduledReturn: 1 }); // For scheduled return queries

// Static method to set AFK
afkSchema.statics.setAfk = async function (guildId, odId, reason = 'AFK', options = {}) {
  const existing = await this.findOne({ guildId, odId });

  return await this.findOneAndUpdate(
    { guildId, odId },
    {
      guildId,
      odId,
      reason,
      timestamp: new Date(),
      mentions: [],
      autoRemove: options.autoRemove !== false,
      scheduledReturn: options.scheduledReturn || null,
      originalNickname: options.originalNickname || null,
      $inc: { timesAfk: existing ? 1 : 0 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// Static method to remove AFK
afkSchema.statics.removeAfk = async function (guildId, odId) {
  return await this.findOneAndDelete({ guildId, odId });
};

// Static method to get AFK status
afkSchema.statics.getAfk = async function (guildId, odId) {
  return await this.findOne({ guildId, odId });
};

// Static method to add mention
afkSchema.statics.addMention = async function (guildId, odId, mention) {
  return await this.findOneAndUpdate(
    { guildId, odId },
    {
      $push: { mentions: mention },
      $inc: { totalMentions: 1 }
    },
    { new: true }
  );
};

// Static method to get all AFK users in a guild
afkSchema.statics.getGuildAfk = async function (guildId) {
  return await this.find({ guildId });
};

// Static method to get scheduled AFK returns
afkSchema.statics.getScheduledReturns = async function () {
  return await this.find({
    scheduledReturn: { $lte: new Date() }
  });
};

// Get time since AFK
afkSchema.methods.getAfkDuration = function () {
  const diff = Date.now() - this.timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export default mongoose.model('Afk', afkSchema);
