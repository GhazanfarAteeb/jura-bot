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

  try {
    // Delete the message first
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
      targetId: message.author.id,
      targetTag: message.author.tag,
      reason: `[AutoMod] ${reason}`
    });

    // Send notification to user
    const warningEmbed = await errorEmbed(guildId, 'AutoMod Warning',
      `${GLYPHS.WARNING} Your message was removed for: **${reason}**\n\n` +
      `Action taken: **${action.toUpperCase()}**`
    );

    // Execute action
    switch (action) {
      case 'warn':
        // Just warn - message already deleted
        await message.channel.send({
          content: `${message.author}`,
          embeds: [warningEmbed]
        }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 10000));

        // Add warning to member record
        await addWarningToMember(message.guild.id, message.author, 'AutoMod', `[AutoMod] ${reason}`);
        break;

      case 'timeout':
        if (message.member.moderatable) {
          await message.member.timeout(timeoutDuration * 1000, `[AutoMod] ${reason}`);
          await message.channel.send({
            content: `${message.author} has been timed out for ${formatDuration(timeoutDuration)}.`,
            embeds: [warningEmbed]
          }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 10000));
        }
        break;

      case 'kick':
        if (message.member.kickable) {
          try {
            await message.author.send({ embeds: [warningEmbed] }).catch(() => { });
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
