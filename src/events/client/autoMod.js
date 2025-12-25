import { Events, Collection, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import Member from '../../models/Member.js';
import ModLog from '../../models/ModLog.js';
import { errorEmbed, modLogEmbed, GLYPHS } from '../../utils/embeds.js';
import { checkBadWords, checkBadWordsAdvanced, getWordSeverity, getBuiltInWordCount } from '../../utils/badWordsFilter.js';

// Cache for tracking spam, mentions, etc.
const messageCache = new Collection(); // userId -> { messages: [], lastMessage: Date }
const mentionCache = new Collection(); // userId -> { count: number, lastMention: Date }
const inviteRegex = /(discord\.(gg|io|me|li|link)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
const linkRegex = /https?:\/\/[^\s]+/gi;

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    // Skip bots and DMs
    if (message.author.bot || !message.guild) return;

    // Skip if user has admin permissions
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

    try {
      const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

      // Skip if automod is disabled
      if (!guildConfig.features.autoMod.enabled) return;

      const autoMod = guildConfig.features.autoMod;
      const userId = message.author.id;

      // Check if user has staff role (bypass automod)
      const isStaff = guildConfig.roles.staffRoles?.some(roleId =>
        message.member.roles.cache.has(roleId)
      ) || guildConfig.roles.moderatorRoles?.some(roleId =>
        message.member.roles.cache.has(roleId)
      );

      if (isStaff) return;

      // === BAD WORDS FILTER ===
      if (autoMod.badWords.enabled) {
        // Get custom words from database (if any)
        const customWords = autoMod.badWords.words || [];
        const ignoredWords = autoMod.badWords.ignoredWords || [];
        const useBuiltIn = autoMod.badWords.useBuiltInList !== false; // Default to true

        // First check with word boundaries (prevents false positives like "grass" matching "ass")
        let result = checkBadWords(message.content, customWords, ignoredWords, useBuiltIn);

        // If not found, do advanced check for bypass attempts (e.g., "f u c k", "f.u.c.k")
        if (!result.found) {
          result = checkBadWordsAdvanced(message.content, customWords);
        }

        if (result.found) {
          const severity = getWordSeverity(result.word);

          // Determine action based on severity or configured action
          let action = autoMod.badWords.action;

          // Auto-escalate for extreme severity if enabled
          if (autoMod.badWords.autoEscalate && severity === 'extreme') {
            action = 'kick'; // Extreme slurs get kicked
          }

          await handleViolation(message, client, guildConfig, 'badWords',
            `Used prohibited word (${severity} severity)`, action, autoMod.badWords.timeoutDuration);
          return;
        }
      }

      // === ANTI-SPAM ===
      if (autoMod.antiSpam.enabled) {
        const now = Date.now();
        const userMessages = messageCache.get(userId) || { messages: [], lastCleanup: now };

        // Clean old messages
        userMessages.messages = userMessages.messages.filter(
          timestamp => now - timestamp < autoMod.antiSpam.timeWindow * 1000
        );

        userMessages.messages.push(now);
        messageCache.set(userId, userMessages);

        if (userMessages.messages.length > autoMod.antiSpam.messageLimit) {
          await handleViolation(message, client, guildConfig, 'spam',
            `Sending messages too fast (${userMessages.messages.length} msgs in ${autoMod.antiSpam.timeWindow}s)`,
            autoMod.antiSpam.action);

          // Clear cache after action
          messageCache.delete(userId);
          return;
        }
      }

      // === ANTI-MASS MENTION ===
      if (autoMod.antiMassMention.enabled) {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;

        if (mentionCount >= autoMod.antiMassMention.limit) {
          await handleViolation(message, client, guildConfig, 'massMention',
            `Mass mentioning (${mentionCount} mentions)`,
            autoMod.antiMassMention.action);
          return;
        }
      }

      // === ANTI-INVITES ===
      if (autoMod.antiInvites.enabled && inviteRegex.test(message.content)) {
        await handleViolation(message, client, guildConfig, 'invite',
          'Posting Discord invite links',
          autoMod.antiInvites.action);
        return;
      }

      // === ANTI-LINKS ===
      if (autoMod.antiLinks?.enabled) {
        const links = message.content.match(linkRegex);
        if (links) {
          // Check if any link is not whitelisted
          const hasUnwhitelistedLink = links.some(link => {
            const domain = new URL(link).hostname;
            return !autoMod.antiLinks.whitelistedDomains?.some(
              whitelisted => domain.includes(whitelisted)
            );
          });

          if (hasUnwhitelistedLink) {
            await handleViolation(message, client, guildConfig, 'link',
              'Posting unauthorized links',
              autoMod.antiLinks.action);
            return;
          }
        }
      }

    } catch (error) {
      console.error('AutoMod error:', error);
    }
  }
};

async function handleViolation(message, client, guildConfig, type, reason, action, timeoutDuration = 300) {
  const guildId = message.guild.id;
  const user = message.author;

  try {
    // Delete the message IMMEDIATELY
    if (action === 'delete' || action === 'warn' || action === 'timeout' || action === 'kick') {
      await message.delete().catch(() => { });
    }

    // Log the violation
    const caseNumber = await ModLog.getNextCaseNumber(guildId);
    await ModLog.create({
      guildId,
      caseNumber,
      action: `automod_${type}`,
      moderatorId: client.user.id,
      moderatorTag: client.user.tag,
      targetId: user.id,
      targetTag: user.tag,
      reason: `[AutoMod] ${reason}`
    });

    // Create a personalized warning message for the user
    const warningMessages = {
      badWords: [
        `Hey **${user.username}**, please watch your language! 🚫`,
        `**${user.username}**, that word isn't allowed here! Please be respectful. ⚠️`,
        `Whoa there **${user.username}**! Let's keep it friendly. 🛑`,
        `**${user.username}**, please keep the chat clean! 🧹`
      ],
      spam: [
        `Slow down **${user.username}**! You're sending messages too fast. 🐢`,
        `**${user.username}**, please don't spam the chat! ⏰`
      ],
      massMention: [
        `**${user.username}**, please don't mass mention users! 📢`,
        `Easy on the mentions, **${user.username}**! 🔔`
      ],
      invite: [
        `**${user.username}**, posting invite links isn't allowed here! 🔗`,
        `No advertising please, **${user.username}**! 📝`
      ],
      link: [
        `**${user.username}**, that link isn't allowed here! 🔗`,
        `**${user.username}**, please don't post unauthorized links! ⛔`
      ]
    };

    // Get random warning message for the type
    const messages = warningMessages[type] || [`**${user.username}**, your message was removed for violating server rules.`];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Build the warning embed
    const warningEmbed = await errorEmbed(guildId, `${GLYPHS.WARNING} AutoMod Warning`,
      `${randomMessage}\n\n` +
      `**Reason:** ${reason}\n` +
      `**Action:** ${action.charAt(0).toUpperCase() + action.slice(1)}`
    );

    // Send personalized warning in channel
    const sendWarning = async () => {
      const warningMsg = await message.channel.send({
        content: `<@${user.id}>`,
        embeds: [warningEmbed]
      });
      // Auto-delete warning after 10 seconds to keep chat clean
      setTimeout(() => warningMsg.delete().catch(() => { }), 10000);
    };

    // Execute action
    switch (action) {
      case 'warn':
        // Just warn - message already deleted
        await sendWarning();
        // Add warning to member record
        await addWarningToMember(message.guild.id, user, 'AutoMod', `[AutoMod] ${reason}`);
        break;

      case 'delete':
        // Just delete - show brief notification
        await sendWarning();
        break;

      case 'timeout':
        if (message.member.moderatable) {
          await message.member.timeout(timeoutDuration * 1000, `[AutoMod] ${reason}`);
          const timeoutEmbed = await errorEmbed(guildId, `${GLYPHS.WARNING} User Timed Out`,
            `${randomMessage}\n\n` +
            `**${user.username}** has been timed out for **${formatDuration(timeoutDuration)}**.\n` +
            `**Reason:** ${reason}`
          );
          const msg = await message.channel.send({
            content: `<@${user.id}>`,
            embeds: [timeoutEmbed]
          });
          setTimeout(() => msg.delete().catch(() => { }), 15000);
        }
        break;

      case 'kick':
        if (message.member.kickable) {
          try {
            // Try to DM the user before kicking
            const kickEmbed = await errorEmbed(guildId, `${GLYPHS.ERROR} You have been kicked`,
              `You were kicked from **${message.guild.name}** by AutoMod.\n\n` +
              `**Reason:** ${reason}`
            );
            await user.send({ embeds: [kickEmbed] }).catch(() => { });
            await message.member.kick(`[AutoMod] ${reason}`);
          } catch (error) {
            console.error('AutoMod kick failed:', error);
          }
        }
        break;

      case 'mute':
        // Apply muted role
        if (guildConfig.roles.mutedRole) {
          const mutedRole = message.guild.roles.cache.get(guildConfig.roles.mutedRole);
          if (mutedRole && message.member.manageable) {
            await message.member.roles.add(mutedRole, `[AutoMod] ${reason}`);
          }
        }
        break;
    }

    // Log to mod log channel
    if (guildConfig.channels.modLog) {
      const modLogChannel = message.guild.channels.cache.get(guildConfig.channels.modLog);
      if (modLogChannel) {
        const logEmbed = await modLogEmbed(guildId, `automod_${type}`, {
          caseNumber,
          targetTag: message.author.tag,
          targetId: message.author.id,
          moderatorTag: 'AutoMod',
          reason: reason,
          action: action
        });
        await modLogChannel.send({ embeds: [logEmbed] });
      }
    }

  } catch (error) {
    console.error('Error handling automod violation:', error);
  }
}

async function addWarningToMember(guildId, user, moderatorTag, reason) {
  let memberData = await Member.findOne({ userId: user.id, guildId });

  if (!memberData) {
    memberData = await Member.create({
      userId: user.id,
      guildId,
      username: user.username,
      discriminator: user.discriminator || '0',
      accountCreatedAt: user.createdAt
    });
  }

  memberData.warnings.push({
    moderatorId: 'automod',
    moderatorTag,
    reason,
    timestamp: new Date()
  });

  await memberData.save();
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}

// Cleanup old cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 60000; // 1 minute

  for (const [userId, data] of messageCache) {
    if (now - data.lastCleanup > maxAge) {
      messageCache.delete(userId);
    }
  }

  for (const [userId, data] of mentionCache) {
    if (now - data.lastMention > maxAge) {
      mentionCache.delete(userId);
    }
  }
}, 300000);
