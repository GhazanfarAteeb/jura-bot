import Command from '../../structures/Command.js';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';

export default new Command({
  name: 'antinuke',
  description: {
    content: 'Configure anti-nuke protection to prevent server raiding/nuking',
    usage: 'antinuke <enable|disable|config|whitelist> [options]',
    examples: [
      'antinuke enable',
      'antinuke config action ban',
      'antinuke config limit channelDelete 3',
      'antinuke whitelist add @user',
      'antinuke whitelist remove @user',
      'antinuke status'
    ]
  },
  aliases: ['an', 'nuke'],
  permissions: {
    user: [PermissionFlagsBits.Administrator],
    client: ['SendMessages', 'EmbedLinks']
  },
  category: 'config',
  
  async run(client, message, args) {
    const guildConfig = await Guild.findOne({ guildId: message.guild.id }) || 
      await Guild.create({ guildId: message.guild.id });

    if (!guildConfig.security) guildConfig.security = {};
    if (!guildConfig.security.antiNuke) {
      guildConfig.security.antiNuke = {
        enabled: false,
        action: 'kick', // ban, kick, removePerms
        timeWindow: 10000, // 10 seconds
        whitelist: [],
        limits: {
          channelDelete: 3,
          channelCreate: 5,
          roleDelete: 3,
          roleCreate: 5,
          ban: 3,
          kick: 5,
          memberRemove: 10
        }
      };
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'enable':
        guildConfig.security.antiNuke.enabled = true;
        await guildConfig.save();
        
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Anti-Nuke Enabled')
            .setDescription('Server protection is now active. The bot will monitor for suspicious mass actions.')
            .addFields(
              { name: 'Current Action', value: guildConfig.security.antiNuke.action, inline: true },
              { name: 'Time Window', value: `${guildConfig.security.antiNuke.timeWindow / 1000}s`, inline: true }
            )]
        });

      case 'disable':
        guildConfig.security.antiNuke.enabled = false;
        await guildConfig.save();
        
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#FF9900')
            .setTitle('⚠️ Anti-Nuke Disabled')
            .setDescription('Server protection has been disabled.')]
        });

      case 'config':
        const setting = args[1]?.toLowerCase();
        const value = args[2];

        if (!setting) {
          return message.reply('Please specify a setting: `action`, `limit`, or `timewindow`');
        }

        if (setting === 'action') {
          if (!['ban', 'kick', 'removeperms'].includes(value?.toLowerCase())) {
            return message.reply('Action must be: `ban`, `kick`, or `removePerms`');
          }
          guildConfig.security.antiNuke.action = value.toLowerCase();
          await guildConfig.save();
          
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#00FF00')
              .setDescription(`✅ Anti-nuke action set to: **${value}**`)]
          });
        }

        if (setting === 'limit') {
          const limitType = value;
          const limitValue = parseInt(args[3]);
          
          if (!limitType || isNaN(limitValue) || limitValue < 1) {
            return message.reply('Usage: `antinuke config limit <type> <number>`\nTypes: channelDelete, channelCreate, roleDelete, roleCreate, ban, kick, memberRemove');
          }

          if (!guildConfig.security.antiNuke.limits[limitType]) {
            return message.reply('Invalid limit type. Types: channelDelete, channelCreate, roleDelete, roleCreate, ban, kick, memberRemove');
          }

          guildConfig.security.antiNuke.limits[limitType] = limitValue;
          await guildConfig.save();
          
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#00FF00')
              .setDescription(`✅ ${limitType} limit set to **${limitValue}** actions`)]
          });
        }

        if (setting === 'timewindow') {
          const seconds = parseInt(value);
          if (isNaN(seconds) || seconds < 5 || seconds > 60) {
            return message.reply('Time window must be between 5 and 60 seconds.');
          }
          
          guildConfig.security.antiNuke.timeWindow = seconds * 1000;
          await guildConfig.save();
          
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#00FF00')
              .setDescription(`✅ Time window set to **${seconds} seconds**`)]
          });
        }

        return message.reply('Invalid setting. Use: `action`, `limit`, or `timewindow`');

      case 'whitelist':
        const whitelistAction = args[1]?.toLowerCase();
        const user = message.mentions.users.first() || await client.users.fetch(args[2]).catch(() => null);

        if (!user) {
          return message.reply('Please mention a user or provide their ID.');
        }

        if (whitelistAction === 'add') {
          if (guildConfig.security.antiNuke.whitelist.includes(user.id)) {
            return message.reply('This user is already whitelisted.');
          }
          
          guildConfig.security.antiNuke.whitelist.push(user.id);
          await guildConfig.save();
          
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#00FF00')
              .setDescription(`✅ Added **${user.tag}** to anti-nuke whitelist`)]
          });
        }

        if (whitelistAction === 'remove') {
          const index = guildConfig.security.antiNuke.whitelist.indexOf(user.id);
          if (index === -1) {
            return message.reply('This user is not whitelisted.');
          }
          
          guildConfig.security.antiNuke.whitelist.splice(index, 1);
          await guildConfig.save();
          
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#00FF00')
              .setDescription(`✅ Removed **${user.tag}** from anti-nuke whitelist`)]
          });
        }

        return message.reply('Use: `antinuke whitelist add @user` or `antinuke whitelist remove @user`');

      case 'status':
      default:
        const config = guildConfig.security.antiNuke;
        const whitelistUsers = config.whitelist.length > 0 
          ? (await Promise.all(config.whitelist.map(id => client.users.fetch(id).catch(() => null))))
              .filter(u => u)
              .map(u => u.tag)
              .join(', ')
          : 'None';

        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.enabled ? '#00FF00' : '#FF0000')
            .setTitle('🛡️ Anti-Nuke Configuration')
            .addFields(
              { name: 'Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
              { name: 'Action', value: config.action, inline: true },
              { name: 'Time Window', value: `${config.timeWindow / 1000}s`, inline: true },
              { name: 'Channel Delete Limit', value: `${config.limits.channelDelete}`, inline: true },
              { name: 'Channel Create Limit', value: `${config.limits.channelCreate}`, inline: true },
              { name: 'Role Delete Limit', value: `${config.limits.roleDelete}`, inline: true },
              { name: 'Role Create Limit', value: `${config.limits.roleCreate}`, inline: true },
              { name: 'Ban Limit', value: `${config.limits.ban}`, inline: true },
              { name: 'Kick Limit', value: `${config.limits.kick}`, inline: true },
              { name: 'Whitelisted Users', value: whitelistUsers }
            )
            .setFooter({ text: 'Use antinuke enable/disable to toggle protection' })]
        });
    }
  }
});
