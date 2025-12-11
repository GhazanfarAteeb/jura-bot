import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    // User identity tracking
    username: String,
    discriminator: String,
    displayName: String,
    globalName: String, // New Discord global username
    avatarUrl: String,
    lastKnownTag: String, // username#discriminator or @username
    accountCreatedAt: Date,
    
    // Username history for tracking
    usernameHistory: [{
        username: String,
        discriminator: String,
        displayName: String,
        changedAt: { type: Date, default: Date.now }
    }],
    
    // Join/Leave tracking
    joinHistory: [{
        timestamp: { type: Date, default: Date.now },
        inviteCode: String,
        inviter: String
    }],
    leaveHistory: [{
        timestamp: { type: Date, default: Date.now },
        reason: String
    }],
    
    // Calculated fields
    joinCount: { type: Number, default: 0 },
    leaveCount: { type: Number, default: 0 },
    susLevel: { type: Number, default: 0 },
    isSuspicious: { type: Boolean, default: false },
    isNewAccount: { type: Boolean, default: false },
    
    // Moderation data
    warnings: [{
        moderatorId: String,
        moderatorTag: String,
        reason: String,
        timestamp: { type: Date, default: Date.now }
    }],
    mutes: [{
        moderatorId: String,
        reason: String,
        duration: Number,
        timestamp: { type: Date, default: Date.now },
        expiresAt: Date
    }],
    kicks: [{
        moderatorId: String,
        reason: String,
        timestamp: { type: Date, default: Date.now }
    }],
    bans: [{
        moderatorId: String,
        reason: String,
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Invite tracking
    inviteLinks: [{
        link: String,
        code: String,
        guildName: String,
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Notes from staff
    notes: [{
        staffId: String,
        staffTag: String,
        note: String,
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Status flags
    flags: {
        radarOn: { type: Boolean, default: false },
        autoModBypass: { type: Boolean, default: false },
        verified: { type: Boolean, default: false }
    },
    
    // Statistics tracking (for stats command)
    stats: {
        messagesCount: { type: Number, default: 0 },
        voiceTime: { type: Number, default: 0 }, // in minutes
        reputation: { type: Number, default: 0 },
        
        // Message history for time-based filtering
        messageHistory: [{
            date: { type: Date, default: Date.now },
            count: { type: Number, default: 0 }
        }],
        
        // Voice history for time-based filtering
        voiceHistory: [{
            date: { type: Date, default: Date.now },
            minutes: { type: Number, default: 0 }
        }],
        
        // Top channels tracking
        topChannels: [{
            channelId: String,
            channelName: String,
            messageCount: { type: Number, default: 0 },
            lastMessageAt: Date
        }],
        
        // Last activity timestamps
        lastMessageAt: Date,
        lastVoiceAt: Date
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
memberSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Calculate sus level based on join patterns
memberSchema.methods.calculateSusLevel = function() {
    let susLevel = 0;
    
    // Multiple joins in short time
    if (this.joinCount >= 4) {
        susLevel += Math.floor(this.joinCount / 2);
    }
    
    // Join/leave ratio
    if (this.leaveCount > 0) {
        const ratio = this.joinCount / this.leaveCount;
        if (ratio > 2) susLevel += 2;
    }
    
    // Check recent joins (last 7 days)
    const recentJoins = this.joinHistory.filter(j => {
        const daysSince = (Date.now() - j.timestamp) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
    });
    
    if (recentJoins.length >= 3) susLevel += 3;
    
    this.susLevel = susLevel;
    this.isSuspicious = susLevel >= 4;
    
    return susLevel;
};

// Check if account is new (within specified hours)
memberSchema.methods.checkAccountAge = function(thresholdHours = 24) {
    if (!this.accountCreatedAt) return false;
    
    const hoursSinceCreation = (Date.now() - this.accountCreatedAt.getTime()) / (1000 * 60 * 60);
    this.isNewAccount = hoursSinceCreation < thresholdHours;
    
    return this.isNewAccount;
};

// Method to update user identity data
memberSchema.methods.updateIdentity = function(user) {
    const newUsername = user.username;
    const newDiscriminator = user.discriminator || '0';
    const newDisplayName = user.displayName || user.globalName;
    const newAvatarUrl = user.displayAvatarURL({ dynamic: true, size: 256 });
    const newTag = user.tag || `@${user.username}`;
    
    // Check if username changed
    if (this.username !== newUsername || this.discriminator !== newDiscriminator || this.displayName !== newDisplayName) {
        // Only add to history if there was a previous username
        if (this.username) {
            this.usernameHistory.push({
                username: this.username,
                discriminator: this.discriminator,
                displayName: this.displayName,
                changedAt: new Date()
            });
            
            // Keep only last 10 username changes
            if (this.usernameHistory.length > 10) {
                this.usernameHistory = this.usernameHistory.slice(-10);
            }
        }
        
        this.username = newUsername;
        this.discriminator = newDiscriminator;
        this.displayName = newDisplayName;
        this.globalName = user.globalName;
        this.lastKnownTag = newTag;
    }
    
    // Always update avatar URL
    this.avatarUrl = newAvatarUrl;
};

// Static method to get or create member
memberSchema.statics.getMember = async function(userId, guildId, userData = {}) {
    let member = await this.findOne({ userId, guildId });
    
    if (!member) {
        member = await this.create({
            userId,
            guildId,
            username: userData.username,
            discriminator: userData.discriminator || '0',
            displayName: userData.displayName || userData.globalName,
            globalName: userData.globalName,
            avatarUrl: userData.avatarUrl,
            lastKnownTag: userData.tag,
            accountCreatedAt: userData.createdAt,
            joinCount: 1,
            joinHistory: [{
                timestamp: new Date(),
                inviteCode: userData.inviteCode,
                inviter: userData.inviter
            }]
        });
    } else {
        // Update identity on every interaction
        if (userData.username) {
            member.updateIdentity({
                username: userData.username,
                discriminator: userData.discriminator || '0',
                displayName: userData.displayName,
                globalName: userData.globalName,
                tag: userData.tag,
                displayAvatarURL: () => userData.avatarUrl
            });
            await member.save();
        }
    }
    
    return member;
};

export default mongoose.model('Member', memberSchema);
