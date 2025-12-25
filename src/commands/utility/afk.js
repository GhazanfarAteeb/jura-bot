import { EmbedBuilder } from 'discord.js';
import Afk from '../../models/Afk.js';
import Guild from '../../models/Guild.js';
import { successEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

// URL regex pattern
const urlRegex = /(https?:\/\/[^\s]+)/gi;

export default {
  name: 'afk',
  description: 'Set your AFK status with an optional reason',
  usage: '[reason]',
  aliases: ['away', 'brb'],
  cooldown: 5,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
    const reason = args.join(' ') || 'AFK';

    // Set AFK status
    await Afk.setAfk(message.guild.id, message.author.id, reason);

    // Check if reason contains links
    const links = reason.match(urlRegex);
    const textWithoutLinks = reason.replace(urlRegex, '').trim();

    // Build response
    if (links && links.length > 0) {
      // Has links - create embed for links
      const embed = new EmbedBuilder()
        .setColor(guildConfig.embedStyle?.color || '#5865F2')
        .setAuthor({
          name: `${message.author.username} is now AFK`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      // Add text reason if exists
      if (textWithoutLinks) {
        embed.setDescription(`**Reason:** ${textWithoutLinks}`);
      }

      // Add links as fields
      links.forEach((link, index) => {
        // Try to get a nice title for the link
        let linkTitle = 'Link';
        if (link.includes('youtube.com') || link.includes('youtu.be')) linkTitle = '🎬 YouTube';
        else if (link.includes('twitter.com') || link.includes('x.com')) linkTitle = '🐦 Twitter/X';
        else if (link.includes('github.com')) linkTitle = '🐙 GitHub';
        else if (link.includes('discord.gg') || link.includes('discord.com')) linkTitle = '💬 Discord';
        else if (link.includes('twitch.tv')) linkTitle = '🎮 Twitch';
        else if (link.includes('instagram.com')) linkTitle = '📷 Instagram';
        else if (link.includes('tiktok.com')) linkTitle = '🎵 TikTok';
        else if (link.includes('spotify.com')) linkTitle = '🎧 Spotify';
        else if (link.match(/\.(png|jpg|jpeg|gif|webp)$/i)) linkTitle = '🖼️ Image';
        else linkTitle = `🔗 Link ${links.length > 1 ? index + 1 : ''}`;

        embed.addFields({ name: linkTitle, value: link, inline: false });
      });

      // If it's an image link, set it as the embed image
      const imageLink = links.find(link => link.match(/\.(png|jpg|jpeg|gif|webp)$/i));
      if (imageLink) {
        embed.setImage(imageLink);
      }

      await message.reply({ embeds: [embed] });
    } else {
      // No links - just text
      const embed = await successEmbed(message.guild.id, 'AFK Set',
        `${GLYPHS.SUCCESS} ${message.author} is now AFK: **${reason}**`
      );
      await message.reply({ embeds: [embed] });
    }

    // Try to update nickname
    try {
      if (message.member.manageable && !message.member.displayName.startsWith('[AFK]')) {
        await message.member.setNickname(`[AFK] ${message.member.displayName.slice(0, 26)}`);
      }
    } catch (error) {
      // Can't change nickname, that's fine
    }
  }
};
