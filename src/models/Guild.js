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
        action: { type: String, enum: ['warn', 'mute', 'kick', 'timeout'], default: 'warn' }
      },
      antiRaid: {
        enabled: { type: Boolean, default: true },
        joinThreshold: { type: Number, default: 10 }, // members
        timeWindow: { type: Number, default: 30 }, // seconds
        action: { type: String, enum: ['lockdown', 'kick', 'ban'], default: 'lockdown' }
      },
      antiNuke: {
        enabled: { type: Boolean, default: true },
        banThreshold: { type: Number, default: 5 }, // bans in time window
        kickThreshold: { type: Number, default: 5 },
        roleDeleteThreshold: { type: Number, default: 3 },
        channelDeleteThreshold: { type: Number, default: 3 },
        timeWindow: { type: Number, default: 60 }, // seconds
        action: { type: String, enum: ['removeRoles', 'ban', 'kick'], default: 'removeRoles' },
        whitelistedUsers: [String] // User IDs that bypass anti-nuke
      },
      antiMassMention: {
        enabled: { type: Boolean, default: true },
        limit: { type: Number, default: 5 },
        action: { type: String, enum: ['delete', 'warn', 'timeout', 'kick'], default: 'delete' }
      },
      badWords: {
        enabled: { type: Boolean, default: false },
        useBuiltInList: { type: Boolean, default: true }, // Use the built-in bad words list
        words: [String], // Custom words added by admins
        ignoredWords: [String], // Words to whitelist/ignore
        action: { type: String, enum: ['delete', 'warn', 'timeout', 'kick'], default: 'delete' },
        timeoutDuration: { type: Number, default: 300 }, // seconds (5 min default)
        autoEscalate: { type: Boolean, default: true } // Auto-escalate action for extreme words
      },
      antiRoleSpam: {
        enabled: { type: Boolean, default: true },
        cooldown: { type: Number, default: 60 } // seconds between role mentions
      },
      antiLinks: {
        enabled: { type: Boolean, default: false },
        whitelistedDomains: [String],
        action: { type: String, enum: ['delete', 'warn', 'timeout'], default: 'delete' }
      },
      antiInvites: {
        enabled: { type: Boolean, default: true },
        action: { type: String, enum: ['delete', 'warn', 'timeout', 'kick'], default: 'delete' }
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
      enabled: { type: Boolean, default: true },
      minXpPerMessage: { type: Number, default: 15 },
      maxXpPerMessage: { type: Number, default: 25 },
      xpCooldown: { type: Number, default: 60 }, // seconds between XP gains
      levelUpChannel: String,
      levelUpMessage: { type: String, default: '🎉 {user} leveled up to level {level}!' },
      announceLevelUp: { type: Boolean, default: true },
      rewards: [{
        level: Number,
        roleId: String
      }],
      noXpChannels: [String], // Channels where XP is not earned
      xpMultipliers: [{
        roleId: String,
        multiplier: { type: Number, default: 1 }
      }],
      boosterMultiplier: { type: Number, default: 1.5 } // Multiplier for server boosters
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
      dmWelcome: { type: Boolean, default: false },
      bannerUrl: String // Optional banner image for welcome embed
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
    colorRoles: {
      channelId: String,
      messageId: String,
      title: { type: String, default: '🎨 Color Roles' },
      description: { type: String, default: '**React to get a color role!**\nYou can only have one color at a time.' },
      embedColor: { type: String, default: '#667eea' },
      image: String,
      thumbnail: String,
      footerText: { type: String, default: 'Click a reaction to get/remove a color role' }
    },
    autoMute: {
      enabled: { type: Boolean, default: false },
      defaultDuration: { type: Number, default: 600 } // seconds (10 min)
    },
    starboard: {
      enabled: { type: Boolean, default: false },
      channel: String,
      threshold: { type: Number, default: 3 },
      emoji: { type: String, default: '⭐' },
      selfStar: { type: Boolean, default: false },
      ignoredChannels: [String]
    },
    tempVoice: {
      enabled: { type: Boolean, default: false },
      createChannelId: String, // "Join to Create" channel
      categoryId: String, // Category for temp channels
      interfaceChannelId: String, // Interface channel for button controls
      defaultName: { type: String, default: "{user}'s Channel" },
      defaultLimit: { type: Number, default: 0 }
    }
  },
  roles: {
    susRole: String,
    newAccountRole: String,
    mutedRole: String,
    staffRoles: [String],
    adminRoles: [String], // Roles that can use admin slash commands
    moderatorRoles: [String], // Roles that can use moderation slash commands
    birthdayRole: String,
    verifiedRole: String
  },
  channels: {
    modLog: String,
    alertLog: String,
    joinLog: String,
    leaveLog: String,
    messageLog: String, // For message edit/delete logs
    voiceLog: String, // For voice channel activity
    memberLog: String, // For member updates (roles, nickname)
    serverLog: String, // For server changes
    staffChannel: String,
    birthdayChannel: String,
    eventChannel: String,
    welcomeChannel: String,
    ticketLog: String,
    ticketCategory: String, // Category for ticket channels
    ticketPanelChannel: String, // Channel for ticket panel
    botStatus: String,
    levelUpChannel: String
  },
  slashCommands: {
    enabled: { type: Boolean, default: true },
    adminOnly: { type: Boolean, default: false }, // Only admins can use slash commands
    disabledCommands: [String] // List of disabled slash command names
  },
  security: {
    lockdownActive: { type: Boolean, default: false },
    lockdownReason: String,
    lockdownBy: String,
    lockdownAt: Date,
    lockdownPermissions: [{
      channelId: String,
      channelType: String, // 'text' or 'voice'
      permissions: mongoose.Schema.Types.Mixed // Store the original permission overwrites
    }]
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
  },
  // Voice XP settings
  voiceXP: {
    enabled: { type: Boolean, default: true },
    xpPerMinute: { type: Number, default: 5 },
    minUsersRequired: { type: Number, default: 1 }, // Min users in channel
    afkChannelExcluded: { type: Boolean, default: true },
    mutedExcluded: { type: Boolean, default: true }, // Exclude muted users
    deafenedExcluded: { type: Boolean, default: true }, // Exclude deafened users
    excludedChannels: [String]
  },
  // Auto-publish announcements
  autoPublish: {
    enabled: { type: Boolean, default: false },
    channels: [String] // Announcement channel IDs
  },
  // Auto-role on join
  autoRole: {
    enabled: { type: Boolean, default: false },
    roles: [String], // Role IDs to give on join
    delay: { type: Number, default: 0 }, // Seconds delay before giving role
    botRoles: [String], // Different roles for bots
    requireVerification: { type: Boolean, default: false }
  },
  // Command channel restrictions
  commandChannels: {
    enabled: { type: Boolean, default: false },
    channels: [String], // Channel IDs where commands are allowed
    bypassRoles: [String] // Roles that bypass channel restrictions
  },
  // Custom shop items
  customShopItems: [{
    id: String,
    name: String,
    description: String,
    price: { type: Number, default: 100 },
    type: { type: String, enum: ['role', 'item', 'background', 'other'], default: 'item' },
    roleId: String, // For role type items
    image: String,
    rarity: { type: String, default: 'common' },
    stock: { type: Number, default: -1 }, // -1 = unlimited
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Method to get or create guild configuration
guildSchema.statics.getGuild = async function (guildId, guildName = null) {
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
