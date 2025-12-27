import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  odId: {
    type: String,
    required: true
  },

  // Verification status
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verifiedBy: String, // 'self', 'captcha', 'staff', userId

  // Captcha data
  captcha: {
    code: String,
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    expiresAt: Date
  },

  // Pending verification
  pendingVerification: {
    type: Boolean,
    default: false
  },
  verificationMessageId: String,

  // Anti-bot checks
  joinedAt: Date,
  firstMessageAt: Date,
  passedChecks: [{
    check: String,
    passedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Compound index
verificationSchema.index({ guildId: 1, odId: 1 }, { unique: true });

// Generate captcha code
verificationSchema.statics.generateCaptcha = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Get or create verification record
verificationSchema.statics.getVerification = async function (guildId, odId) {
  let record = await this.findOne({ guildId, odId });
  if (!record) {
    record = await this.create({
      guildId,
      odId,
      joinedAt: new Date()
    });
  }
  return record;
};

// Verify user
verificationSchema.methods.verify = async function (verifiedBy = 'self') {
  this.verified = true;
  this.verifiedAt = new Date();
  this.verifiedBy = verifiedBy;
  this.pendingVerification = false;
  this.captcha = undefined;
  await this.save();
};

// Check captcha
verificationSchema.methods.checkCaptcha = function (input) {
  if (!this.captcha?.code) return { valid: false, error: 'No captcha pending' };
  if (new Date() > this.captcha.expiresAt) return { valid: false, error: 'Captcha expired' };
  if (this.captcha.attempts >= this.captcha.maxAttempts) return { valid: false, error: 'Too many attempts' };

  this.captcha.attempts++;

  if (input.toUpperCase() === this.captcha.code) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Incorrect code. ${this.captcha.maxAttempts - this.captcha.attempts} attempts remaining.`
  };
};

export default mongoose.model('Verification', verificationSchema);
