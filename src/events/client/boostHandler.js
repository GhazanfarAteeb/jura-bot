import { Events, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    // Check if user started boosting (didn't have booster role before, has it now)
    const wasBoosting = oldMember.premiumSince !== null;
    const isBoosting = newMember.premiumSince !== null;

    // Only trigger when someone starts boosting (not when they stop)
    if (wasBoosting || !isBoosting) return;

    const guildId = newMember.guild.id;

    try {
      const guildConfig = await Guild.getGuild(guildId, newMember.guild.name);
      const boostSettings = guildConfig.features?.boostSystem;

      // Check if boost system is enabled
      if (!boostSettings?.enabled) return;

      // Get the channel
      const channelId = boostSettings.channel;
      if (!channelId) return;

      const channel = newMember.guild.channels.cache.get(channelId);
      if (!channel) return;

      // Get user's boost count (how many times they've boosted this server)
      const userBoostCount = await getUserBoostCount(newMember);

      // Handle boost tier rewards
      const tierReward = await handleBoostTierRewards(newMember, boostSettings, userBoostCount);

      // Build and send the boost message
      const { embed, content } = buildBoostEmbed(newMember, boostSettings, guildConfig, userBoostCount, tierReward);

      if (embed) {
        await channel.send({ content, embeds: [embed] });
      } else {
        const boostMsg = parseBoostMessage(boostSettings.message || 'Thank you {user} for boosting {server}! 🎉', newMember, userBoostCount);
        await channel.send(content || boostMsg);
      }

      console.log(`[BOOST] ${newMember.user.tag} boosted ${newMember.guild.name} (Boost #${userBoostCount})`);
    } catch (error) {
      console.error('[BOOST] Error sending boost message:', error);
    }
  }
};

/**
 * Get the number of times a user has boosted this server
 * Note: Discord API doesn't directly provide this, so we estimate based on premium subscription count changes
 * For accurate tracking, we'd need to store this separately
 */
async function getUserBoostCount(member) {
  // Discord doesn't provide per-user boost count directly
  // We'll use the guild's premium subscription count as a reference
  // For more accurate per-user tracking, you'd need to store this in the database

  // Check if member is boosting and count their contributions
  // This is a simplified approach - returns 1 for first-time boosters
  // For accurate multi-boost tracking, implement database storage
  return 1; // Default to 1 for now - can be enhanced with database tracking
}

/**
 * Handle assigning boost tier reward roles
 */
async function handleBoostTierRewards(member, boostSettings, boostCount) {
  const tierRewards = boostSettings.tierRewards || [];
  if (tierRewards.length === 0) return null;

  // Sort tiers by boost count (ascending)
  const sortedTiers = [...tierRewards].sort((a, b) => a.boostCount - b.boostCount);

  // Find the highest tier the user qualifies for
  let qualifiedTier = null;
  let rolesToAdd = [];
  let rolesToRemove = [];

  for (const tier of sortedTiers) {
    if (boostCount >= tier.boostCount && tier.roleId) {
      if (tier.stackable) {
        // Stackable: add this role without removing others
        rolesToAdd.push(tier.roleId);
      } else {
        // Non-stackable: only keep the highest tier
        qualifiedTier = tier;
      }
    }
  }

  // If non-stackable, only add the highest qualified tier
  if (!qualifiedTier && rolesToAdd.length === 0) return null;

  try {
    if (qualifiedTier && !qualifiedTier.stackable) {
      // Remove lower tier roles and add only the highest
      for (const tier of sortedTiers) {
        if (tier.boostCount < qualifiedTier.boostCount && tier.roleId) {
          const roleToRemove = member.guild.roles.cache.get(tier.roleId);
          if (roleToRemove && member.roles.cache.has(tier.roleId)) {
            await member.roles.remove(roleToRemove, 'Boost tier upgrade - replacing with higher tier');
          }
        }
      }

      const roleToAdd = member.guild.roles.cache.get(qualifiedTier.roleId);
      if (roleToAdd && !member.roles.cache.has(qualifiedTier.roleId)) {
        await member.roles.add(roleToAdd, `Boost tier reward (${qualifiedTier.boostCount}+ boosts)`);
      }
      return qualifiedTier;
    }

    // Stackable mode: add all qualified roles
    for (const roleId of rolesToAdd) {
      const role = member.guild.roles.cache.get(roleId);
      if (role && !member.roles.cache.has(roleId)) {
        await member.roles.add(role, 'Boost tier reward');
      }
    }

    // Return the highest tier for display
    return sortedTiers.filter(t => boostCount >= t.boostCount).pop() || null;
  } catch (error) {
    console.error('[BOOST] Error assigning tier reward roles:', error);
    return null;
  }
}

/**
 * Build the boost thank you embed based on settings
 */
function buildBoostEmbed(member, boost, guildConfig, boostCount = 1, tierReward = null) {
  if (boost.embedEnabled === false) {
    // Plain text mode
    const boostMsg = parseBoostMessage(boost.message || 'Thank you {user} for boosting {server}! 🎉', member, boostCount);
    return { embed: null, content: boostMsg };
  }

  // Decorative title with boost style
  const decorativeTitle = '💎 ･ﾟ✧ Server Boost ✧･ﾟ 💎';

  const boostMsg = parseBoostMessage(boost.message || 'Thank you {user} for boosting {server}! 🎉', member, boostCount);

  const embed = new EmbedBuilder()
    .setColor(boost.embedColor || '#f47fff');

  // Author section
  const authorType = boost.authorType || 'username';
  if (authorType !== 'none') {
    if (authorType === 'server') {
      embed.setAuthor({
        name: member.guild.name,
        iconURL: member.guild.iconURL({ dynamic: true, size: 128 })
      });
    } else if (authorType === 'displayname') {
      embed.setAuthor({
        name: member.displayName || member.user.displayName || member.user.username,
        iconURL: member.user.displayAvatarURL({ dynamic: true, size: 128 })
      });
    } else {
      embed.setAuthor({
        name: member.user.username,
        iconURL: member.user.displayAvatarURL({ dynamic: true, size: 128 })
      });
    }
  }

  // Title
  const title = boost.embedTitle;
  if (title && title.trim()) {
    embed.setTitle(parseBoostMessage(title, member, boostCount));
  } else if (title !== ' ') {
    embed.setTitle(decorativeTitle);
  }

  // Description - include tier info if enabled and tier was earned
  let description = boostMsg;
  if (boost.showTierInMessage !== false && tierReward) {
    const tierRole = member.guild.roles.cache.get(tierReward.roleId);
    if (tierRole) {
      description += `\n\n🏆 **Tier Reward Unlocked!**\nYou've earned the ${tierRole} role!`;
    }
  }
  embed.setDescription(description);

  // Thumbnail
  if (boost.thumbnailType === 'avatar') {
    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
  } else if (boost.thumbnailType === 'server') {
    embed.setThumbnail(member.guild.iconURL({ dynamic: true, size: 256 }));
  } else if (boost.thumbnailUrl) {
    embed.setThumbnail(boost.thumbnailUrl);
  } else if (boost.thumbnailType !== 'none' && boost.thumbnailType !== null) {
    // Default to avatar if no specific type set
    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
  }

  // Footer
  const footerText = boost.footerText;
  if (footerText && footerText.trim() && footerText !== ' ') {
    embed.setFooter({ text: parseBoostMessage(footerText, member) });
  } else if (footerText !== ' ') {
    embed.setFooter({ text: `Boost #${member.guild.premiumSubscriptionCount || 1}` });
  }

  // Timestamp
  if (boost.showTimestamp !== false) {
    embed.setTimestamp();
  }

  // Banner image
  if (boost.bannerUrl) {
    embed.setImage(boost.bannerUrl);
  }

  // Build greeting content (text above embed)
  let content = undefined;
  if (boost.mentionUser !== false) {
    const greetingTemplate = boost.greetingText || '💎 {user} just boosted the server!';
    content = parseBoostMessage(greetingTemplate, member, boostCount);
  }

  return { embed, content };
}

/**
 * Parse boost message with variables
 */
function parseBoostMessage(msg, member, boostCount = 1) {
  return msg
    .replace(/{user}/gi, `<@${member.user.id}>`)
    .replace(/{username}/gi, member.user.username)
    .replace(/{displayname}/gi, member.displayName || member.user.displayName || member.user.username)
    .replace(/{tag}/gi, member.user.tag)
    .replace(/{id}/gi, member.user.id)
    .replace(/{server}/gi, member.guild.name)
    .replace(/{membercount}/gi, member.guild.memberCount.toString())
    .replace(/{boostcount}/gi, (member.guild.premiumSubscriptionCount || 0).toString())
    .replace(/{boostlevel}/gi, member.guild.premiumTier.toString())
    .replace(/{userboosts}/gi, boostCount.toString())
    .replace(/{avatar}/gi, member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .replace(/\\n/g, '\n');
}

export { parseBoostMessage, buildBoostEmbed, handleBoostTierRewards };
