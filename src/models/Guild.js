import mongoose from 'mongoose';

const guildSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    guildName: String,
    prefix: {
        type: String,
        default: process.env.DEFAULT_PREFIX || '!'
    },
    features: {
        inviteVerification: {
            enabled: { type: Boolean, default: true },
            action: { type: String, enum: ['log', 'delete', 'warn', 'kick'], default: 'warn' },
            whitelist: [String] // Whitelisted invite codes
        },
        memberTracking: {
            enabled: { type: Boolean, default: true },
            susThreshold: { type: Number, default: 4 }, // Join count threshold
            susRole: String, // Role ID for suspicious members
            alertChannel: String // Channel ID for alerts
        },
        accountAge: {
            enabled: { type: Boolean, default: true },
            threshold: { type: Number, default: 24 }, // Hours
            newAccountRole: String, // Role ID for new accounts
            alertChannel: String
        },
        autoMod: {
            enabled: { type: Boolean, default: true },
            antiSpam: { 
                enabled: { type: Boolean, default: true },
                messageLimit: { type: Number, default: 5 }, // messages
                timeWindow: { type: Number, default: 5 }, // seconds
                action: { type: String, enum: ['warn', 'mute', 'kick'], default: 'warn' }
            },
            antiRaid: { type: Boolean, default: true },
            antiMassMention: {
                enabled: { type: Boolean, default: true },
                limit: { type: Number, default: 5 }
            },
            badWords: {
                enabled: { type: Boolean, default: false },
                words: [String],
                action: { type: String, enum: ['delete', 'warn', 'mute'], default: 'delete' }
            },
            antiRoleSpam: {
                enabled: { type: Boolean, default: true },
                cooldown: { type: Number, default: 60 } // seconds between role mentions
            }
        },
        birthdaySystem: {
            enabled: { type: Boolean, default: true },
            channel: String,
            role: String, // Birthday role
            message: { type: String, default: '🎉 Happy Birthday {user}! 🎂' }
        },
        eventSystem: {
            enabled: { type: Boolean, default: true },
            channel: String
        },
        levelSystem: {
            enabled: { type: Boolean, default: false },
            xpPerMessage: { type: Number, default: 10 },
            cooldown: { type: Number, default: 60 }, // seconds
            levelUpChannel: String,
            levelUpMessage: { type: String, default: '🎉 {user} leveled up to level {level}!' },
            announceLevelUp: { type: Boolean, default: true },
            roleRewards: [{
                level: Number,
                roleId: String
            }]
        },
        ticketSystem: {
            enabled: { type: Boolean, default: false },
            category: String, // Category ID
            supportRoles: [String],
            logChannel: String,
            maxTickets: { type: Number, default: 5 }
        },
        welcomeSystem: {
            enabled: { type: Boolean, default: false },
            channel: String,
            message: { type: String, default: 'Welcome {user} to {server}!' },
            embedEnabled: { type: Boolean, default: true },
            dmWelcome: { type: Boolean, default: false }
        },
        verificationSystem: {
            enabled: { type: Boolean, default: false },
            channel: String,
            role: String, // Verified role
            type: { type: String, enum: ['button', 'reaction', 'captcha'], default: 'button' }
        },
        reactionRoles: {
            enabled: { type: Boolean, default: false },
            messages: [{
                messageId: String,
                channelId: String,
                roles: [{
                    emoji: String,
                    roleId: String
                }]
            }]
        },
        autoMute: {
            enabled: { type: Boolean, default: false },
            defaultDuration: { type: Number, default: 600 } // seconds (10 min)
        }
    },
    roles: {
        susRole: String,
        newAccountRole: String,
        mutedRole: String,
        staffRoles: [String],
        birthdayRole: String,
        verifiedRole: String
    },
    channels: {
        modLog: String,
        alertLog: String,
        joinLog: String,
        staffChannel: String,
        birthdayChannel: String,
        eventChannel: String,
        welcomeChannel: String,
        ticketLog: String,
        botStatus: String,
        levelUpChannel: String
    },
    embedStyle: {
        color: { type: String, default: '#5865F2' },
        footer: String,
        timestamp: { type: Boolean, default: true },
        useGlyphs: { type: Boolean, default: true }
    },
    economy: {
        coinEmoji: { type: String, default: '💰' },
        coinName: { type: String, default: 'coins' },
        adventureNPCs: [String] // Custom NPC list
    }
}, {
    timestamps: true
});

// Method to get or create guild configuration
guildSchema.statics.getGuild = async function(guildId, guildName = null) {
    // Check cache first (if client.db exists)
    if (global.guildCache) {
        const cached = global.guildCache.get(guildId);
        if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
            return cached.data;
        }
    }
    
    let guild = await this.findOne({ guildId });
    
    if (!guild) {
        guild = await this.create({
            guildId,
            guildName
        });
    } else if (guildName && guild.guildName !== guildName) {
        guild.guildName = guildName;
        await guild.save();
    }
    
    // Cache the result
    if (!global.guildCache) global.guildCache = new Map();
    global.guildCache.set(guildId, {
        data: guild,
        timestamp: Date.now()
    });
    
    return guild;
};

export default mongoose.model('Guild', guildSchema);
