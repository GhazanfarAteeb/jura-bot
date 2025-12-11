import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    inviterId: String,
    inviterTag: String,
    channelId: String,
    uses: { type: Number, default: 0 },
    maxUses: Number,
    createdTimestamp: Date,
    expiresTimestamp: Date,
    
    // Track who used this invite
    usedBy: [{
        userId: String,
        userTag: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Compound index
inviteSchema.index({ guildId: 1, code: 1 }, { unique: true });

export default mongoose.model('Invite', inviteSchema);
