import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Afk from '../../models/Afk.js';
import Guild from '../../models/Guild.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

// URL regex pattern
const urlRegex = /(https?:\/\/[^\s]+)/gi;

// Image URL pattern - handles query strings like ?size=4096
const imageUrlPattern = /\.(png|jpg|jpeg|gif|webp)($|\?)/i;

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    // Skip bots and DMs
    if (message.author.bot || !message.guild) return;

    try {
      const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

      // Check if the message author is AFK and remove their status
      const authorAfk = await Afk.getAfk(message.guild.id, message.author.id);

      if (authorAfk) {
        // Remove AFK status
        await Afk.removeAfk(message.guild.id, message.author.id);

        // Calculate how long they were AFK
        const afkDuration = Date.now() - authorAfk.timestamp.getTime();
        const durationText = formatDuration(afkDuration);

        // Build welcome back message
        let welcomeBackMsg = `${GLYPHS.SUCCESS} Welcome back ${message.author}! You were AFK for **${durationText}**`;

        // Show missed mentions if any
        if (authorAfk.mentions && authorAfk.mentions.length > 0) {
          welcomeBackMsg += `\n\n📬 **You were mentioned ${authorAfk.mentions.length} time(s) while AFK:**`;

          // Show up to 5 mentions
          const mentionsToShow = authorAfk.mentions.slice(-5);
          mentionsToShow.forEach((mention, index) => {
            const timeAgo = formatDuration(Date.now() - mention.timestamp.getTime());
            const truncatedContent = mention.messageContent.length > 50
              ? mention.messageContent.slice(0, 50) + '...'
              : mention.messageContent;
            welcomeBackMsg += `\n${GLYPHS.DOT} **${mention.username}** in <#${mention.channelId}> (${timeAgo} ago): "${truncatedContent}"`;
          });

          if (authorAfk.mentions.length > 5) {
            welcomeBackMsg += `\n... and ${authorAfk.mentions.length - 5} more`;
          }
        }

        const embed = await infoEmbed(message.guild.id, 'Welcome Back!', welcomeBackMsg);

        // Create dismiss button
        const dismissRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`afk_dismiss_${message.author.id}`)
              .setLabel('Dismiss')
              .setEmoji('✖️')
              .setStyle(ButtonStyle.Secondary)
          );

        // Use channel.send instead of reply in case message was deleted by automod
        await message.channel.send({ 
          content: `<@${message.author.id}>`,
          embeds: [embed],
          components: [dismissRow]
        }).catch(() => null);

        // Try to remove [AFK] from nickname
        try {
          if (message.member.manageable && message.member.displayName.startsWith('[AFK]')) {
            await message.member.setNickname(message.member.displayName.replace('[AFK] ', ''));
          }
        } catch (error) {
          // Can't change nickname
        }
      }

      // Check if any mentioned users are AFK
      const mentionedUsers = message.mentions.users;

      if (mentionedUsers.size > 0) {
        const afkResponses = [];

        for (const [userId, user] of mentionedUsers) {
          if (userId === message.author.id) continue; // Skip self-mentions

          const userAfk = await Afk.getAfk(message.guild.id, userId);

          if (userAfk) {
            // Add this mention to their record
            await Afk.addMention(message.guild.id, userId, {
              userId: message.author.id,
              username: message.author.username,
              channelId: message.channel.id,
              messageContent: message.content.slice(0, 100),
              timestamp: new Date()
            });

            // Calculate how long they've been AFK
            const afkDuration = Date.now() - userAfk.timestamp.getTime();
            const durationText = formatDuration(afkDuration);

            // Check if reason has links
            const links = userAfk.reason.match(urlRegex);
            const textWithoutLinks = userAfk.reason.replace(urlRegex, '').trim();

            afkResponses.push({
              user,
              reason: userAfk.reason,
              duration: durationText,
              links,
              textWithoutLinks
            });
          }
        }

        // Send AFK notifications
        if (afkResponses.length > 0) {
          for (const afkData of afkResponses) {
            const { user, reason, duration, links, textWithoutLinks } = afkData;

            if (links && links.length > 0) {
              // Has links - create embed
              const embed = new EmbedBuilder()
                .setColor(guildConfig.embedStyle?.color || '#FFA500')
                .setAuthor({
                  name: `${user.username} is AFK`,
                  iconURL: user.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`⏰ AFK for **${duration}**`)
                .setTimestamp();

              // Add text reason if exists
              if (textWithoutLinks) {
                embed.addFields({ name: '📝 Reason', value: textWithoutLinks, inline: false });
              }

              // Add links
              links.forEach((link, index) => {
                let linkTitle = getLinkTitle(link, index, links.length);
                embed.addFields({ name: linkTitle, value: link, inline: false });
              });

              // If it's an image link, set it as the embed image
              const imageLink = links.find(link => imageUrlPattern.test(link));
              if (imageLink) {
                embed.setImage(imageLink);
              }

              // Use channel.send instead of reply in case message was deleted by automod
              await message.channel.send({ embeds: [embed] }).catch(() => {});
            } else {
              // No links - simple text response
              const embed = new EmbedBuilder()
                .setColor(guildConfig.embedStyle?.color || '#FFA500')
                .setDescription(`💤 **${user.username}** is AFK: ${reason}\n⏰ *AFK for ${duration}*`)
                .setTimestamp();

              // Use channel.send instead of reply in case message was deleted by automod
              await message.channel.send({ embeds: [embed] }).catch(() => {});
            }
          }
        }
      }

    } catch (error) {
      console.error('Error in AFK handler:', error);
    }
  }
};

/**
 * Format duration in human readable format
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Get a nice title for a link based on its domain
 */
function getLinkTitle(link, index, totalLinks) {
  if (link.includes('youtube.com') || link.includes('youtu.be')) return '🎬 YouTube';
  if (link.includes('twitter.com') || link.includes('x.com')) return '🐦 Twitter/X';
  if (link.includes('github.com')) return '🐙 GitHub';
  if (link.includes('discord.gg') || link.includes('discord.com')) return '💬 Discord';
  if (link.includes('twitch.tv')) return '🎮 Twitch';
  if (link.includes('instagram.com')) return '📷 Instagram';
  if (link.includes('tiktok.com')) return '🎵 TikTok';
  if (link.includes('spotify.com')) return '🎧 Spotify';
  if (imageUrlPattern.test(link)) return '🖼️ Image';
  return `🔗 Link ${totalLinks > 1 ? index + 1 : ''}`;
}
