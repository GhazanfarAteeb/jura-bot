import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'setprofile',
  description: 'Customize your profile settings',
  usage: 'setprofile <bio/title/color/accent> <value>',
  category: 'economy',
  aliases: ['customize', 'profileset'],
  cooldown: 5,

  execute: async (message, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;

    const setting = args[0]?.toLowerCase();
    const value = args.slice(1).join(' ');

    if (!setting) {
      const prefix = await getPrefix(guildId);
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#00CED1')
          .setTitle('『 Profile Customization 』')
          .setDescription('**Available customization parameters, Master:**')
          .addFields(
            { name: '▸ Bio', value: `\`${prefix}setprofile bio <text>\`\nSet profile bio (max 200 chars)`, inline: false },
            { name: '▸ Description', value: `\`${prefix}setprofile description <text>\`\nSet profile description (max 500 chars)`, inline: false },
            { name: '▸ Title', value: `\`${prefix}setprofile title <text>\`\nSet a custom title`, inline: false },
            { name: '▸ Background Color', value: `\`${prefix}setprofile color <hex>\`\nSet background color (e.g., #FF0000)`, inline: false },
            { name: '▸ Accent Color', value: `\`${prefix}setprofile accent <hex>\`\nSet accent color for borders`, inline: false },
            { name: '▸ Blur Color', value: `\`${prefix}setprofile blurcolor <rgba>\`\nSet description blur (e.g., rgba(0,0,0,0.7))`, inline: false },
            { name: '▸ Toggle Stats', value: `\`${prefix}setprofile stats on/off\`\nShow/hide stats on profile`, inline: false },
            { name: '▸ Toggle Badges', value: `\`${prefix}setprofile badges on/off\`\nShow/hide badges on profile`, inline: false }
          )
          .setFooter({ text: `Use ${prefix}profile to preview changes` })
        ]
      });
    }

    try {
      const economy = await Economy.getEconomy(userId, guildId);

      switch (setting) {
        case 'bio':
          if (!value) {
            economy.profile.bio = '';
            await economy.save();
            return message.reply('**Confirmed:** Bio data cleared, Master.');
          }

          if (value.length > 200) {
            return message.reply('**Error:** Bio must not exceed 200 characters, Master.');
          }

          economy.profile.bio = value;
          await economy.save();
          message.reply(`**Confirmed:** Bio updated to: "${value}"`);
          break;

        case 'description':
        case 'desc':
          if (!value) {
            economy.profile.description = '';
            await economy.save();
            return message.reply('**Confirmed:** Description data cleared, Master.');
          }

          if (value.length > 500) {
            return message.reply('**Error:** Description must not exceed 500 characters, Master.');
          }

          economy.profile.description = value;
          await economy.save();
          message.reply(`**Confirmed:** Description updated. (${value.length}/500 characters)`);
          break;

        case 'title':
          if (!value) {
            economy.profile.title = '';
            await economy.save();
            return message.reply('**Confirmed:** Title data cleared, Master.');
          }

          if (value.length > 100) {
            return message.reply('**Error:** Title must not exceed 100 characters, Master.');
          }

          economy.profile.title = value;
          await economy.save();
          message.reply(`**Confirmed:** Title set to: "${value}"`);
          break;

        case 'color':
        case 'bgcolor':
        case 'backgroundcolor':
          if (!value) {
            return message.reply('**Error:** Please provide a hex color (e.g., #FF0000), Master.');
          }

          if (!/^#[0-9A-F]{6}$/i.test(value)) {
            return message.reply('**Error:** Invalid hex color format. Use: #FF0000, Master.');
          }

          economy.profile.backgroundColor = value;
          await economy.save();

          const colorEmbed = new EmbedBuilder()
            .setColor(value)
            .setTitle('『 Background Color Updated 』')
            .setDescription(`**Confirmed:** Set to: ${value}`)
            .setFooter({ text: 'Applied to solid color background.' });

          message.reply({ embeds: [colorEmbed] });
          break;

        case 'accent':
        case 'accentcolor':
        case 'border':
          if (!value) {
            return message.reply('**Error:** Please provide a hex color (e.g., #7289DA), Master.');
          }

          if (!/^#[0-9A-F]{6}$/i.test(value)) {
            return message.reply('**Error:** Invalid hex color format. Use: #7289DA, Master.');
          }

          economy.profile.accentColor = value;
          await economy.save();

          const accentEmbed = new EmbedBuilder()
            .setColor(value)
            .setTitle('『 Accent Color Updated 』')
            .setDescription(`**Confirmed:** Set to: ${value}`)
            .setFooter({ text: 'Applied to borders and highlights.' });

          message.reply({ embeds: [accentEmbed] });
          break;

        case 'blur':
        case 'blurcolor':
        case 'descblur':
          if (!value) {
            return message.reply('**Error:** Please provide an rgba color (e.g., rgba(0,0,0,0.5)), Master.');
          }

          // Validate rgba format
          const rgbaRegex = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/;
          if (!rgbaRegex.test(value)) {
            return message.reply('**Error:** Invalid rgba format. Use: rgba(r, g, b, a) - Example: rgba(0, 0, 0, 0.7), Master.');
          }

          economy.profile.blurColor = value;
          await economy.save();

          const blurEmbed = new EmbedBuilder()
            .setColor('#00CED1')
            .setTitle('『 Blur Color Updated 』')
            .setDescription(`**Confirmed:** Set to: ${value}`)
            .setFooter({ text: 'Applied to description background blur.' });

          message.reply({ embeds: [blurEmbed] });
          break;

        case 'stats':
        case 'showstats':
          const statsValue = value.toLowerCase();
          if (statsValue === 'on' || statsValue === 'true' || statsValue === 'yes') {
            economy.profile.showStats = true;
            await economy.save();
            message.reply('**Confirmed:** Stats display enabled, Master.');
          } else if (statsValue === 'off' || statsValue === 'false' || statsValue === 'no') {
            economy.profile.showStats = false;
            await economy.save();
            message.reply('**Confirmed:** Stats display disabled, Master.');
          } else {
            message.reply('**Error:** Use: on/off, true/false, or yes/no, Master.');
          }
          break;

        case 'badges':
        case 'showbadges':
          const badgesValue = value.toLowerCase();
          if (badgesValue === 'on' || badgesValue === 'true' || badgesValue === 'yes') {
            economy.profile.showBadges = true;
            await economy.save();
            message.reply('**Confirmed:** Badges display enabled, Master.');
          } else if (badgesValue === 'off' || badgesValue === 'false' || badgesValue === 'no') {
            economy.profile.showBadges = false;
            await economy.save();
            message.reply('**Confirmed:** Badges display disabled, Master.');
          } else {
            message.reply('**Error:** Use: on/off, true/false, or yes/no, Master.');
          }
          break;

        default:
          message.reply('**Error:** Invalid setting. Valid options: bio, description, title, color, accent, blurcolor, stats, badges, Master.');
      }

    } catch (error) {
      console.error('Set profile command error:', error);
      message.reply('**Error:** An anomaly occurred while updating your profile, Master.');
    }
  }
};
