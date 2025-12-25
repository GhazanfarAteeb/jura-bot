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
levelSchema.index({ guildId: 1, level: -1, xp: -1 }); // For leaderboard

// Calculate XP needed for next level
levelSchema.methods.xpForNextLevel = function () {
  return Math.floor(100 * Math.pow(this.level, 1.5));
};

// Add XP and check for level up
levelSchema.methods.addXP = function (amount) {
  this.xp += amount;
  this.totalXP += amount;
  this.dailyXP += amount;
  this.weeklyXP += amount;

  const leveledUp = [];

  // Check for level ups
  while (this.xp >= this.xpForNextLevel()) {
    this.xp -= this.xpForNextLevel();
    this.level++;
    leveledUp.push(this.level);
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
