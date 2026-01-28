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

      // Build and send the boost message
      const { embed, content } = buildBoostEmbed(newMember, boostSettings, guildConfig);

      if (embed) {
        await channel.send({ content, embeds: [embed] });
      } else {
        const boostMsg = parseBoostMessage(boostSettings.message || 'Thank you {user} for boosting {server}! 🎉', newMember);
        await channel.send(content || boostMsg);
      }

      console.log(`[BOOST] ${newMember.user.tag} boosted ${newMember.guild.name}`);
    } catch (error) {
      console.error('[BOOST] Error sending boost message:', error);
    }
  }
};

/**
 * Build the boost thank you embed based on settings
 */
function buildBoostEmbed(member, boost, guildConfig) {
  if (boost.embedEnabled === false) {
    // Plain text mode
    const boostMsg = parseBoostMessage(boost.message || 'Thank you {user} for boosting {server}! 🎉', member);
    return { embed: null, content: boostMsg };
  }

  // Decorative title with boost style
  const decorativeTitle = '💎 ･ﾟ✧ Server Boost ✧･ﾟ 💎';

  const boostMsg = parseBoostMessage(boost.message || 'Thank you {user} for boosting {server}! 🎉', member);

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
    embed.setTitle(parseBoostMessage(title, member));
  } else if (title !== ' ') {
    embed.setTitle(decorativeTitle);
  }

  // Description
  embed.setDescription(boostMsg);

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
    content = parseBoostMessage(greetingTemplate, member);
  }

  return { embed, content };
}

/**
 * Parse boost message with variables
 */
function parseBoostMessage(msg, member) {
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
    .replace(/{avatar}/gi, member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .replace(/\\n/g, '\n');
}

export { parseBoostMessage, buildBoostEmbed };
