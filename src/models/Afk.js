import mongoose from 'mongoose';

const afkSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  userId: {
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
  mentions: [{
    userId: String,
    username: String,
    channelId: String,
    messageContent: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

// Compound index for quick lookups
afkSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Static method to set AFK
afkSchema.statics.setAfk = async function (guildId, userId, reason = 'AFK') {
  return await this.findOneAndUpdate(
    { guildId, userId },
    {
      guildId,
      userId,
      reason,
      timestamp: new Date(),
      mentions: []
    },
    { upsert: true, new: true }
  );
};

// Static method to remove AFK
afkSchema.statics.removeAfk = async function (guildId, userId) {
  return await this.findOneAndDelete({ guildId, userId });
};

// Static method to get AFK status
afkSchema.statics.getAfk = async function (guildId, userId) {
  return await this.findOne({ guildId, userId });
};

// Static method to add mention
afkSchema.statics.addMention = async function (guildId, userId, mention) {
  return await this.findOneAndUpdate(
    { guildId, userId },
    { $push: { mentions: mention } },
    { new: true }
  );
};

// Static method to get all AFK users in a guild
afkSchema.statics.getGuildAfk = async function (guildId) {
  return await this.find({ guildId });
};

export default mongoose.model('Afk', afkSchema);
