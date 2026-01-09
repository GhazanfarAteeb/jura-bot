import { PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'setcoin',
  description: 'Customize coin emoji and name (Admin only)',
  usage: 'setcoin <emoji|name> <value>',
  category: 'config',
  aliases: ['coinconfig', 'customcoin'],
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 5,

  execute: async (message, args) => {
    const guildId = message.guild.id;
    const guildConfig = await Guild.getGuild(guildId);

    // Check for admin role
    const hasAdminRole = guildConfig.roles.adminRoles?.some(roleId =>
      message.member.roles.cache.has(roleId)
    );

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Permission Denied',
          `${GLYPHS.LOCK} You need Administrator permissions to configure coins.`)]
      });
    }

    try {
      if (!args[0]) {
        const guild = await Guild.getGuild(guildId);
        const currentEmoji = guild.economy?.coinEmoji || '💰';
        const currentName = guild.economy?.coinName || 'coins';
        const prefix = await getPrefix(guildId);

        const embed = await infoEmbed(guildId, 'Coin Configuration',
          `**Current Settings:**\n` +
          `${GLYPHS.ARROW_RIGHT} Emoji: ${currentEmoji}\n` +
          `${GLYPHS.ARROW_RIGHT} Name: ${currentName}\n\n` +
          `**Usage:**\n` +
          `${GLYPHS.ARROW_RIGHT} \`${prefix}setcoin emoji <emoji>\` - Change coin emoji\n` +
          `${GLYPHS.ARROW_RIGHT} \`${prefix}setcoin name <name>\` - Change coin name\n\n` +
          `**Examples:**\n` +
          `${GLYPHS.ARROW_RIGHT} \`${prefix}setcoin emoji 🪙\`\n` +
          `${GLYPHS.ARROW_RIGHT} \`${prefix}setcoin name credits\``
        );

        return message.reply({ embeds: [embed] });
      }

      const type = args[0].toLowerCase();
      const value = args.slice(1).join(' ');

      if (!value) {
        const prefix = await getPrefix(guildId);
        return message.reply({
          embeds: [await errorEmbed(guildId, `Please provide a value!\n\nUsage: \`${prefix}setcoin <emoji|name> <value>\``)]
        });
      }

      const guild = await Guild.getGuild(guildId);

      if (!guild.economy) {
        guild.economy = {};
      }

      if (type === 'emoji' || type === 'emote') {
        // Validate emoji - use spread operator to count actual characters (handles Unicode properly)
        const emojiChars = [...value];

        // Check for custom Discord emoji format <:name:id> or <a:name:id>
        const customEmojiRegex = /^<a?:\w+:\d+>$/;
        const isCustomEmoji = customEmojiRegex.test(value);

        // Allow single emoji or custom Discord emoji
        if (!isCustomEmoji && emojiChars.length > 2) {
          return message.reply({
            embeds: [await errorEmbed(guildId, 'Emoji is too long! Please use a single emoji.')]
          });
        }

        guild.economy.coinEmoji = value;
        await guild.save();

        const embed = await successEmbed(guildId, 'Coin Emoji Updated!',
          `Coin emoji has been changed to ${value}\n\n` +
          `Example: **100** ${value}`
        );

        return message.reply({ embeds: [embed] });

      } else if (type === 'name') {
        if (value.length > 20) {
          return message.reply({
            embeds: [await errorEmbed(guildId, 'Name is too long! Maximum 20 characters.')]
          });
        }

        guild.economy.coinName = value.toLowerCase();
        await guild.save();

        const emoji = guild.economy.coinEmoji || '💰';

        const embed = await successEmbed(guildId, 'Coin Name Updated!',
          `Coin name has been changed to **${value}**\n\n` +
          `Example: **100** ${emoji} ${value}`
        );

        return message.reply({ embeds: [embed] });

      } else {
        const prefix = await getPrefix(guildId);
        return message.reply({
          embeds: [await errorEmbed(guildId,
            `Invalid type! Use \`emoji\` or \`name\`.\n\n` +
            `Usage: \`${prefix}setcoin <emoji|name> <value>\``
          )]
        });
      }

    } catch (error) {
      console.error('Error in setcoin command:', error);
      return message.reply({
        embeds: [await errorEmbed(guildId, 'An error occurred while updating coin settings.')]
      });
    }
  }
};
