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

        const mentions = authorAfk.mentions || [];
        const MENTIONS_PER_PAGE = 5;
        const totalPages = Math.ceil(mentions.length / MENTIONS_PER_PAGE) || 1;
        let currentPage = 0;

        // Function to build embed for a specific page
        const buildMentionsEmbed = async (page) => {
          let welcomeBackMsg = `${GLYPHS.SUCCESS} Welcome back ${message.author}! You were AFK for **${durationText}**`;

          if (mentions.length > 0) {
            welcomeBackMsg += `\n\n📬 **You were mentioned ${mentions.length} time(s) while AFK:**`;

            const startIdx = page * MENTIONS_PER_PAGE;
            const endIdx = Math.min(startIdx + MENTIONS_PER_PAGE, mentions.length);
            const mentionsToShow = mentions.slice(startIdx, endIdx);

            mentionsToShow.forEach((mention) => {
              const timeAgo = formatDuration(Date.now() - new Date(mention.timestamp).getTime());
              const truncatedContent = mention.messageContent.length > 40
                ? mention.messageContent.slice(0, 40) + '...'
                : mention.messageContent;

              // Create jump link to the message
              const jumpLink = `https://discord.com/channels/${message.guild.id}/${mention.channelId}/${mention.messageId}`;

              welcomeBackMsg += `\n${GLYPHS.DOT} **${mention.username}** in <#${mention.channelId}> (${timeAgo} ago)`;
              welcomeBackMsg += `\n  └ "${truncatedContent}" [⤴️ Jump](${jumpLink})`;
            });

            if (totalPages > 1) {
              welcomeBackMsg += `\n\n📄 Page ${page + 1}/${totalPages}`;
            }
          }

          return await infoEmbed(message.guild.id, 'Welcome Back!', welcomeBackMsg);
        };

        // Build initial embed
        const embed = await buildMentionsEmbed(0);

        // Create buttons row
        const buildButtons = (page) => {
          const row = new ActionRowBuilder();

          // Add pagination buttons only if there are multiple pages
          if (totalPages > 1) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`afk_prev_${message.author.id}`)
                .setLabel('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
              new ButtonBuilder()
                .setCustomId(`afk_next_${message.author.id}`)
                .setLabel('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= totalPages - 1)
            );
          }

          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`afk_dismiss_${message.author.id}`)
              .setLabel('Dismiss')
              .setEmoji('✖️')
              .setStyle(ButtonStyle.Secondary)
          );

          return row;
        };

        // Send message
        const sentMessage = await message.channel.send({
          content: `<@${message.author.id}>`,
          embeds: [embed],
          components: [buildButtons(0)]
        }).catch(() => null);

        // Create collector for pagination if there are multiple pages
        if (sentMessage && totalPages > 1) {
          const collector = sentMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id && (i.customId.startsWith('afk_prev_') || i.customId.startsWith('afk_next_')),
            time: 300000 // 5 minutes
          });

          collector.on('collect', async (interaction) => {
            if (interaction.customId.startsWith('afk_prev_')) {
              currentPage = Math.max(0, currentPage - 1);
            } else if (interaction.customId.startsWith('afk_next_')) {
              currentPage = Math.min(totalPages - 1, currentPage + 1);
            }

            const newEmbed = await buildMentionsEmbed(currentPage);
            await interaction.update({
              embeds: [newEmbed],
              components: [buildButtons(currentPage)]
            });
          });

          collector.on('end', () => {
            // Disable pagination buttons when collector ends
            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`afk_prev_${message.author.id}`)
                .setLabel('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId(`afk_next_${message.author.id}`)
                .setLabel('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId(`afk_dismiss_${message.author.id}`)
                .setLabel('Dismiss')
                .setEmoji('✖️')
                .setStyle(ButtonStyle.Secondary)
            );
            sentMessage.edit({ components: [disabledRow] }).catch(() => { });
          });
        }

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
              messageId: message.id,
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
              await message.channel.send({ embeds: [embed] }).catch(() => { });
            } else {
              // No links - simple text response
              const embed = new EmbedBuilder()
                .setColor(guildConfig.embedStyle?.color || '#FFA500')
                .setDescription(`💤 **${user.username}** is AFK: ${reason}\n⏰ *AFK for ${duration}*`)
                .setTimestamp();

              // Use channel.send instead of reply in case message was deleted by automod
              await message.channel.send({ embeds: [embed] }).catch(() => { });
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
