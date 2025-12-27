import mongoose from 'mongoose';

const levelSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  username: String,

  // Level and XP
  level: {
    type: Number,
    default: 0
  },
  xp: {
    type: Number,
    default: 0
  },
  totalXP: {
    type: Number,
    default: 0
  },

  // Message stats
  messageCount: {
    type: Number,
    default: 0
  },

  // Voice stats
  voiceTime: {
    type: Number,
    default: 0 // Total seconds in voice
  },
  voiceXP: {
    type: Number,
    default: 0
  },
  currentVoiceSession: {
    channelId: String,
    joinedAt: Date
  },

  // Last message time (for cooldown)
  lastMessageTime: Date,

  // Rewards claimed
  rewardsClaimed: [{
    level: Number,
    roleId: String,
    claimedAt: { type: Date, default: Date.now }
  }],

  // Stats
  dailyXP: {
    type: Number,
    default: 0
  },
  weeklyXP: {
    type: Number,
    default: 0
  },
  lastDailyReset: Date,
  lastWeeklyReset: Date
}, {
  timestamps: true
});

// Compound index
levelSchema.index({ userId: 1, guildId: 1 }, { unique: true });
levelSchema.index({ guildId: 1, totalXP: -1 }); // For leaderboard

// Calculate XP needed for next level
// Formula: 100 + (level * 50) + (level^1.5 * 25)
// Level 0->1: 100 XP, Level 1->2: 175 XP, Level 5->6: 428 XP, Level 10->11: 791 XP
levelSchema.methods.xpForNextLevel = function () {
  const level = this.level || 0;
  return Math.floor(100 + (level * 50) + Math.pow(level, 1.5) * 25);
};

// Add XP and check for level up
levelSchema.methods.addXP = function (amount) {
  this.xp += amount;
  this.totalXP += amount;
  this.dailyXP = (this.dailyXP || 0) + amount;
  this.weeklyXP = (this.weeklyXP || 0) + amount;

  const leveledUp = [];

  // Check for level ups (prevent infinite loop with max 10 level ups per call)
  let iterations = 0;
  while (this.xp >= this.xpForNextLevel() && iterations < 10) {
    this.xp -= this.xpForNextLevel();
    this.level++;
    leveledUp.push(this.level);
    iterations++;
  }

  return leveledUp;
};

// Reset daily stats
levelSchema.methods.resetDaily = function () {
  this.dailyXP = 0;
  this.lastDailyReset = new Date();
};

// Reset weekly stats
levelSchema.methods.resetWeekly = function () {
  this.weeklyXP = 0;
  this.lastWeeklyReset = new Date();
};

// Static method to get leaderboard
levelSchema.statics.getLeaderboard = async function (guildId, limit = 10) {
  return await this.find({ guildId, totalXP: { $gt: 0 } })
    .sort({ totalXP: -1, level: -1 })
    .limit(limit)
    .lean();
};

// Static method to get user rank
levelSchema.statics.getUserRank = async function (userId, guildId) {
  const user = await this.findOne({ userId, guildId });
  if (!user) return null;

  const higherRanked = await this.countDocuments({
    guildId,
    $or: [
      { level: { $gt: user.level } },
      { level: user.level, xp: { $gt: user.xp } }
    ]
  });

  return higherRanked + 1;
};

export default mongoose.model('Level', levelSchema);
