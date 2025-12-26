import mongoose from 'mongoose';

const modLogSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    caseNumber: {
        type: Number,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'warn', 'mute', 'unmute', 'kick', 'ban', 'unban', 'purge', 'slowmode', 'note', 'invite_delete', 'sus_alert',
            'timeout', 'untimeout',
            // AutoMod actions
            'automod_badWords', 'automod_spam', 'automod_caps', 'automod_links', 'automod_invites', 
            'automod_mentions', 'automod_emojis', 'automod_zalgo', 'automod_newlines',
            'automod_massMention', 'automod_invite', 'automod_link'
        ]
    },
    moderatorId: {
        type: String,
        required: true
    },
    moderatorTag: String,
    targetId: String,
    targetTag: String,
    reason: String,
    details: mongoose.Schema.Types.Mixed,
    duration: String,
    messageId: String, // ID of the log message in Discord
    channelId: String,
    deletedMessage: String // The content of the deleted message (for automod logs)
}, {
    timestamps: true
});

// Compound index
modLogSchema.index({ guildId: 1, caseNumber: 1 }, { unique: true });

// Get next case number for guild
modLogSchema.statics.getNextCaseNumber = async function(guildId) {
    const lastCase = await this.findOne({ guildId })
        .sort({ caseNumber: -1 })
        .limit(1);
    
    return lastCase ? lastCase.caseNumber + 1 : 1;
};

export default mongoose.model('ModLog', modLogSchema);
