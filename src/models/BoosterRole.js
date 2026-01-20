import mongoose from 'mongoose';

const boosterRoleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  roleId: {
    type: String,
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  assignedBy: {
    type: String,
    required: false
  },
  reason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
boosterRoleSchema.index({ guildId: 1, userId: 1 });
boosterRoleSchema.index({ expiresAt: 1 });

// Static method to get expired booster roles
boosterRoleSchema.statics.getExpiredRoles = async function() {
  return this.find({
    expiresAt: { $lte: new Date() }
  });
};

// Static method to add a booster role entry
boosterRoleSchema.statics.addBoosterRole = async function(guildId, userId, roleId, duration, assignedBy = null, reason = null) {
  const expiresAt = new Date(Date.now() + duration);
  
  // Upsert - update if exists, create if not
  return this.findOneAndUpdate(
    { guildId, userId, roleId },
    {
      $set: {
        assignedAt: new Date(),
        expiresAt,
        assignedBy,
        reason
      }
    },
    { upsert: true, new: true }
  );
};

// Static method to remove a booster role entry
boosterRoleSchema.statics.removeBoosterRole = async function(guildId, userId, roleId = null) {
  const query = { guildId, userId };
  if (roleId) query.roleId = roleId;
  return this.deleteMany(query);
};

// Static method to get all active booster roles for a guild
boosterRoleSchema.statics.getGuildBoosterRoles = async function(guildId) {
  return this.find({
    guildId,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to get booster role info for a user
boosterRoleSchema.statics.getUserBoosterRole = async function(guildId, userId) {
  return this.findOne({
    guildId,
    userId,
    expiresAt: { $gt: new Date() }
  });
};

export default mongoose.model('BoosterRole', boosterRoleSchema);
