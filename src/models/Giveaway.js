import mongoose from 'mongoose';

const giveawaySchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  hostId: {
    type: String,
    required: true
  },
  prize: {
    type: String,
    required: true
  },
  winners: {
    type: Number,
    default: 1
  },
  endsAt: {
    type: Date,
    required: true
  },
  ended: {
    type: Boolean,
    default: false
  },
  participants: [{
    type: String // User IDs
  }],
  winnerIds: [{
    type: String
  }],
  requirements: {
    roleId: String, // Must have this role
    minLevel: Number, // Minimum level required
    minMessages: Number // Minimum messages required
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for finding active giveaways
giveawaySchema.index({ guildId: 1, ended: 1 });
giveawaySchema.index({ endsAt: 1, ended: 1 });

// Static method to get active giveaways
giveawaySchema.statics.getActiveGiveaways = async function () {
  return await this.find({ ended: false, endsAt: { $lte: new Date() } });
};

// Static method to get guild giveaways
giveawaySchema.statics.getGuildGiveaways = async function (guildId, includeEnded = false) {
  const query = { guildId };
  if (!includeEnded) query.ended = false;
  return await this.find(query).sort({ endsAt: 1 });
};

// Method to add participant
giveawaySchema.methods.addParticipant = async function (userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    await this.save();
    return true;
  }
  return false;
};

// Method to remove participant
giveawaySchema.methods.removeParticipant = async function (userId) {
  const index = this.participants.indexOf(userId);
  if (index > -1) {
    this.participants.splice(index, 1);
    await this.save();
    return true;
  }
  return false;
};

// Method to pick winners
giveawaySchema.methods.pickWinners = function () {
  const winners = [];
  const participants = [...this.participants];

  const winnerCount = Math.min(this.winners, participants.length);

  for (let i = 0; i < winnerCount; i++) {
    const randomIndex = Math.floor(Math.random() * participants.length);
    winners.push(participants.splice(randomIndex, 1)[0]);
  }

  return winners;
};

export default mongoose.model('Giveaway', giveawaySchema);
