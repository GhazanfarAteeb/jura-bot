import { EmbedBuilder } from 'discord.js';
import Afk from '../../models/Afk.js';
import Guild from '../../models/Guild.js';
import { successEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix, parseDuration } from '../../utils/helpers.js';
import { getRandomFooter } from '../../utils/raphael.js';

// URL regex pattern
const urlRegex = /(https?:\/\/[^\s]+)/gi;

// Image URL pattern - handles query strings like ?size=4096
const imageUrlPattern = /\.(png|jpg|jpeg|gif|webp)($|\?)/i;

export default {
  name: 'afk',
  description: 'Set your AFK status with an optional reason and options',
  usage: '[reason] [--time <duration>] [--sticky]',
  aliases: ['away', 'brb'],
  cooldown: 5,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
    const prefix = await getPrefix(message.guild.id);

    // Parse options
    const options = {
      autoRemove: true,
      scheduledReturn: null,
      originalNickname: message.member.displayName
    };

    // Filter out flags
    let reasonArgs = [];
    let i = 0;
    while (i < args.length) {
      if (args[i] === '--time' || args[i] === '-t') {
        const duration = args[i + 1];
        if (duration) {
          const ms = parseDuration(duration);
          if (ms) {
            options.scheduledReturn = new Date(Date.now() + ms);
          }
          i += 2;
          continue;
        }
      } else if (args[i] === '--sticky' || args[i] === '-s') {
        options.autoRemove = false;
        i++;
        continue;
      }
      reasonArgs.push(args[i]);
      i++;
    }

    const reason = reasonArgs.join(' ') || 'AFK';

    // Set AFK status
    await Afk.setAfk(message.guild.id, message.author.id, reason, options);

    // Check if reason contains links
    const links = reason.match(urlRegex);
    const textWithoutLinks = reason.replace(urlRegex, '').trim();

    // Build response
    if (links && links.length > 0) {
      // Has links - create embed for links
      const embed = new EmbedBuilder()
        .setColor('#00CED1')
        .setAuthor({
          name: `『 ${message.author.username} • Away Status 』`,
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
        else if (imageUrlPattern.test(link)) linkTitle = '🖼️ Image';
        else linkTitle = `🔗 Link ${links.length > 1 ? index + 1 : ''}`;

        embed.addFields({ name: linkTitle, value: link, inline: false });
      });

      // If it's an image link, set it as the embed image
      const imageLink = links.find(link => imageUrlPattern.test(link));
      if (imageLink) {
        embed.setImage(imageLink);
      }

      // Add options info
      let footerText = '';
      if (options.scheduledReturn) {
        footerText += `Auto-return: <t:${Math.floor(options.scheduledReturn.getTime() / 1000)}:R>`;
      }
      if (!options.autoRemove) {
        footerText += (footerText ? ' | ' : '') + 'Sticky mode enabled';
      }
      if (footerText) {
        embed.setFooter({ text: footerText });
      }

      await message.reply({ embeds: [embed] });
    } else {
      // No links - just text
      let description = `**Notice:** ${message.author} has entered away status.\n\n▸ **Reason:** ${reason}`;

      if (options.scheduledReturn) {
        description += `\n\n▸ **Scheduled Return:** <t:${Math.floor(options.scheduledReturn.getTime() / 1000)}:R>`;
      }
      if (!options.autoRemove) {
        description += `\n▸ **Sticky Mode:** Use \`${prefix}afk off\` to deactivate`;
      }

      const embed = await successEmbed(message.guild.id, 'Away Status Active', description);
      embed.setFooter({ text: getRandomFooter() });
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
