import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import Verification from '../../models/Verification.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'verify',
  description: 'Setup or manage the verification system',
  usage: '<setup|panel|config|manual> [options]',
  aliases: ['verification'],
  category: 'moderation',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const prefix = await getPrefix(guildId);

    const subCommand = args[0]?.toLowerCase();

    if (!subCommand) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🔐 Verification System')
        .setDescription('Protect your server with user verification!')
        .addFields(
          { name: `${prefix}verify setup`, value: 'Interactive setup wizard', inline: true },
          { name: `${prefix}verify panel`, value: 'Send verification panel', inline: true },
          { name: `${prefix}verify config <option>`, value: 'Configure settings', inline: true },
          { name: `${prefix}verify manual @user`, value: 'Manually verify a user', inline: true },
          { name: `${prefix}verify status`, value: 'View current settings', inline: true }
        );

      return message.reply({ embeds: [embed] });
    }

    const guildConfig = await Guild.getGuild(guildId);

    switch (subCommand) {
      case 'setup': {
        // Interactive setup
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🔐 Verification Setup')
          .setDescription('Let\'s set up verification for your server!\n\nFirst, what type of verification would you like?')
          .addFields(
            { name: '🔘 Button', value: 'Users click a button to verify', inline: true },
            { name: '🎭 Captcha', value: 'Users solve a captcha code', inline: true },
            { name: '⚛️ Reaction', value: 'Users react to verify', inline: true }
          );

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('verify_setup_button')
              .setLabel('Button')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('verify_setup_captcha')
              .setLabel('Captcha')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('verify_setup_reaction')
              .setLabel('Reaction')
              .setStyle(ButtonStyle.Secondary)
          );

        const setupMsg = await message.reply({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === message.author.id && i.customId.startsWith('verify_setup_');
        const collector = setupMsg.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async interaction => {
          const type = interaction.customId.split('_')[2];

          // Save type
          if (!guildConfig.features.verificationSystem) {
            guildConfig.features.verificationSystem = {};
          }
          guildConfig.features.verificationSystem.type = type;
          guildConfig.features.verificationSystem.enabled = true;
          await guildConfig.save();

          // Ask for verified role
          const roleEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🔐 Verification Setup - Step 2')
            .setDescription(`Great! Verification type set to **${type}**.\n\nNow, mention the role that verified users should receive:\n\n*Example: @Verified or @Member*`);

          await interaction.update({ embeds: [roleEmbed], components: [] });

          // Wait for role mention
          const roleFilter = m => m.author.id === message.author.id && m.mentions.roles.size > 0;
          const roleCollector = message.channel.createMessageCollector({ filter: roleFilter, time: 60000, max: 1 });

          roleCollector.on('collect', async roleMsg => {
            const role = roleMsg.mentions.roles.first();
            guildConfig.features.verificationSystem.role = role.id;
            guildConfig.roles.verifiedRole = role.id;
            await guildConfig.save();

            // Ask for channel
            const channelEmbed = new EmbedBuilder()
              .setColor('#5865F2')
              .setTitle('🔐 Verification Setup - Step 3')
              .setDescription(`Verified role set to ${role}!\n\nNow, mention the channel where the verification panel should be:\n\n*Example: #verify or #welcome*`);

            await message.channel.send({ embeds: [channelEmbed] });

            const channelFilter = m => m.author.id === message.author.id && m.mentions.channels.size > 0;
            const channelCollector = message.channel.createMessageCollector({ filter: channelFilter, time: 60000, max: 1 });

            channelCollector.on('collect', async channelMsg => {
              const channel = channelMsg.mentions.channels.first();
              guildConfig.features.verificationSystem.channel = channel.id;
              await guildConfig.save();

              // Send panel
              await sendVerificationPanel(channel, guildConfig, client);

              const completeEmbed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('『 Verification System Configured 』')
                .setDescription(`**Confirmed:** Verification system is now active, Master.\n\n**▸ Type:** ${type}\n**▸ Role:** ${role}\n**▸ Channel:** ${channel}\n\nNew members will require verification for server access.`)
                .setFooter({ text: `Use ${prefix}verify panel to resend the panel` });

              await message.channel.send({ embeds: [completeEmbed] });
            });
          });
        });
        break;
      }

      case 'panel': {
        if (!guildConfig.features?.verificationSystem?.enabled) {
          return message.reply(`**Error:** Verification system not configured. Use \`${prefix}verify setup\` first, Master.`);
        }

        const channel = message.mentions.channels.first() || message.channel;
        await sendVerificationPanel(channel, guildConfig, client);

        if (channel.id !== message.channel.id) {
          await message.reply(`**Confirmed:** Verification panel deployed to ${channel}, Master.`);
        }
        break;
      }

      case 'manual': {
        const targetUser = message.mentions.members.first();
        if (!targetUser) {
          return message.reply(`**Error:** Please mention a user to verify. Usage: \`${prefix}verify manual @user\`, Master.`);
        }

        const verifiedRole = guildConfig.features?.verificationSystem?.role || guildConfig.roles?.verifiedRole;
        if (!verifiedRole) {
          return message.reply(`**Error:** No verified role configured. Use \`${prefix}verify setup\` first, Master.`);
        }

        try {
          await targetUser.roles.add(verifiedRole);

          // Remove unverified role if configured
          const unverifiedRole = guildConfig.features?.verificationSystem?.unverifiedRole;
          if (unverifiedRole && targetUser.roles.cache.has(unverifiedRole)) {
            await targetUser.roles.remove(unverifiedRole).catch(() => {});
          }

          // Update verification record
          const verification = await Verification.getVerification(guildId, targetUser.id);
          await verification.verify(`staff:${message.author.id}`);

          const embed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setDescription(`**Confirmed:** **${targetUser.user.username}** has been manually verified, Master.`);

          await message.reply({ embeds: [embed] });
        } catch (error) {
          return message.reply(`**Error:** Failed to verify user: ${error.message}`);
        }
        break;
      }

      case 'config': {
        const setting = args[1]?.toLowerCase();
        const value = args.slice(2).join(' ');

        if (!setting) {
          const configEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🔐 Verification Config')
            .addFields(
              { name: 'type <button|captcha|reaction>', value: 'Set verification type' },
              { name: 'role <@role>', value: 'Set verified role' },
              { name: 'unverifiedrole <@role|remove>', value: 'Set role to remove on verify' },
              { name: 'channel <#channel>', value: 'Set verification channel' },
              { name: 'enable/disable', value: 'Toggle verification' }
            );
          return message.reply({ embeds: [configEmbed] });
        }

        if (!guildConfig.features.verificationSystem) {
          guildConfig.features.verificationSystem = {};
        }

        switch (setting) {
          case 'type':
            if (!['button', 'captcha', 'reaction'].includes(value)) {
              return message.reply('**Error:** Type must be: button, captcha, or reaction, Master.');
            }
            guildConfig.features.verificationSystem.type = value;
            await guildConfig.save();
            return message.reply(`**Confirmed:** Verification type set to **${value}**, Master.`);

          case 'role':
            const role = message.mentions.roles.first();
            if (!role) return message.reply('**Error:** Please mention a role, Master.');
            guildConfig.features.verificationSystem.role = role.id;
            guildConfig.roles.verifiedRole = role.id;
            await guildConfig.save();
            return message.reply(`**Confirmed:** Verified role set to ${role}, Master.`);

          case 'unverifiedrole':
            if (value?.toLowerCase() === 'remove' || value?.toLowerCase() === 'none') {
              guildConfig.features.verificationSystem.unverifiedRole = undefined;
              await guildConfig.save();
              return message.reply('**Confirmed:** Unverified role cleared, Master.');
            }
            const unverifiedRole = message.mentions.roles.first();
            if (!unverifiedRole) return message.reply('**Error:** Please mention a role or use `remove` to clear, Master.');
            guildConfig.features.verificationSystem.unverifiedRole = unverifiedRole.id;
            await guildConfig.save();
            return message.reply(`**Confirmed:** Unverified role set to ${unverifiedRole}. This role will be **removed** when a user verifies, Master.`);

          case 'channel':
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply('**Error:** Please mention a channel, Master.');
            guildConfig.features.verificationSystem.channel = channel.id;
            await guildConfig.save();
            return message.reply(`**Confirmed:** Verification channel set to ${channel}, Master.`);

          case 'enable':
            guildConfig.features.verificationSystem.enabled = true;
            await guildConfig.save();
            return message.reply('**Confirmed:** Verification system activated, Master.');

          case 'disable':
            guildConfig.features.verificationSystem.enabled = false;
            await guildConfig.save();
            return message.reply('**Notice:** Verification system deactivated, Master.');
        }
        break;
      }

      case 'status': {
        const vs = guildConfig.features?.verificationSystem;
        const role = vs?.role ? message.guild.roles.cache.get(vs.role) : null;
        const unverifiedRole = vs?.unverifiedRole ? message.guild.roles.cache.get(vs.unverifiedRole) : null;
        const channel = vs?.channel ? message.guild.channels.cache.get(vs.channel) : null;

        const embed = new EmbedBuilder()
          .setColor(vs?.enabled ? '#00FF7F' : '#FF4757')
          .setTitle('『 Verification Status 』')
          .addFields(
            { name: '▸ Status', value: vs?.enabled ? '◉ Active' : '◎ Inactive', inline: true },
            { name: '▸ Type', value: vs?.type || 'Not configured', inline: true },
            { name: '▸ Verified Role', value: role ? role.toString() : 'Not configured', inline: true },
            { name: '▸ Unverified Role', value: unverifiedRole ? unverifiedRole.toString() : 'Not configured', inline: true },
            { name: '▸ Channel', value: channel ? channel.toString() : 'Not configured', inline: true }
          );

        await message.reply({ embeds: [embed] });
        break;
      }

      default:
        return message.reply(`**Error:** Unknown subcommand. Use \`${prefix}verify\` for guidance, Master.`);
    }
  }
};

async function sendVerificationPanel(channel, guildConfig, client) {
  const type = guildConfig.features?.verificationSystem?.type || 'button';

  const embed = new EmbedBuilder()
    .setColor('#00CED1')
    .setTitle('『 Server Verification 』')
    .setDescription('**Notice:** Access to this server requires verification, Master.\n\n' +
      (type === 'button' ? '**Activate the button below to proceed.**' :
        type === 'captcha' ? '**Activate the button below to receive verification code.**' :
          '**Apply the reaction below to verify.**'))
    .setFooter({ text: 'Security protocol active.' });

  if (type === 'button' || type === 'captcha') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_${type}`)
          .setLabel(type === 'captcha' ? 'Get Captcha' : 'Verify')
          .setStyle(ButtonStyle.Success)
          .setEmoji('◉')
      );

    await channel.send({ embeds: [embed], components: [row] });
  } else {
    const msg = await channel.send({ embeds: [embed] });
    await msg.react('✅');
  }
}
