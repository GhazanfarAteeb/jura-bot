import { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, UserSelectMenuBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import TempVoice from '../../models/TempVoice.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Handle TempVoice buttons
    if (interaction.isButton() && interaction.customId.startsWith('tempvc_')) {
      return handleTempVCButton(interaction);
    }

    // Handle TempVoice modals
    if (interaction.isModalSubmit() && interaction.customId.startsWith('tempvc_modal_')) {
      return handleTempVCModal(interaction);
    }

    // Handle TempVoice user select menus
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('tempvc_select_')) {
      return handleTempVCUserSelect(interaction);
    }
  }
};

/**
 * Check if user owns a temp channel and return it
 */
async function getUserTempChannel(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  
  // Check if user owns a temp channel
  const tempChannel = await TempVoice.findUserChannel(interaction.guild.id, interaction.user.id);
  
  if (tempChannel) {
    return interaction.guild.channels.cache.get(tempChannel.channelId);
  }
  
  // Check if they're in a temp channel (even if not owner)
  if (voiceChannel) {
    const channelData = await TempVoice.findByChannel(voiceChannel.id);
    if (channelData && channelData.ownerId === interaction.user.id) {
      return voiceChannel;
    }
  }
  
  return null;
}

/**
 * Handle TempVoice button interactions
 */
async function handleTempVCButton(interaction) {
  const action = interaction.customId.replace('tempvc_', '');
  
  // Actions that don't require owning a channel
  const noChannelRequired = ['claim', 'info'];
  
  if (!noChannelRequired.includes(action)) {
    const channel = await getUserTempChannel(interaction);
    if (!channel) {
      return interaction.reply({
        content: '❌ **Attention!**\nYou are not in a temporary voice channel. Join a **➕ Join to Create** channel first!',
        ephemeral: true
      });
    }
  }

  switch (action) {
    case 'name':
      return showNameModal(interaction);
    case 'limit':
      return showLimitModal(interaction);
    case 'privacy':
      return togglePrivacy(interaction);
    case 'hide':
      return toggleHide(interaction);
    case 'bitrate':
      return showBitrateModal(interaction);
    case 'permit':
      return showUserSelectMenu(interaction, 'permit', '✅ Select a user to PERMIT to your channel');
    case 'reject':
      return showUserSelectMenu(interaction, 'reject', '❌ Select a user to REJECT from your channel');
    case 'invite':
      return sendInvite(interaction);
    case 'kick':
      return showUserSelectMenu(interaction, 'kick', '👢 Select a user to KICK from your channel');
    case 'claim':
      return claimChannel(interaction);
    case 'transfer':
      return showUserSelectMenu(interaction, 'transfer', '🔄 Select a user to TRANSFER ownership to');
    case 'delete':
      return deleteChannel(interaction);
    case 'info':
      return showChannelInfo(interaction);
    default:
      return interaction.reply({ content: '❌ Unknown action.', ephemeral: true });
  }
}

/**
 * Show modal for renaming channel
 */
async function showNameModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('tempvc_modal_name')
    .setTitle('🎙️ Raphael - Rename Channel');

  const nameInput = new TextInputBuilder()
    .setCustomId('channel_name')
    .setLabel('Choose a name for your voice channel')
    .setPlaceholder('Leave blank to reset the name')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
  await interaction.showModal(modal);
}

/**
 * Show modal for setting user limit
 */
async function showLimitModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('tempvc_modal_limit')
    .setTitle('🎙️ Raphael - Set User Limit');

  const limitInput = new TextInputBuilder()
    .setCustomId('user_limit')
    .setLabel('Set user limit (0 = unlimited, max 99)')
    .setPlaceholder('Enter a number between 0 and 99')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
  await interaction.showModal(modal);
}

/**
 * Show modal for setting bitrate
 */
async function showBitrateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('tempvc_modal_bitrate')
    .setTitle('🎙️ Raphael - Set Bitrate');

  const bitrateInput = new TextInputBuilder()
    .setCustomId('bitrate')
    .setLabel('Set audio bitrate (8-96 kbps)')
    .setPlaceholder('Enter a number between 8 and 96')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(bitrateInput));
  await interaction.showModal(modal);
}

/**
 * Toggle channel privacy (lock/unlock)
 */
async function togglePrivacy(interaction) {
  const channel = await getUserTempChannel(interaction);
  const tempData = await TempVoice.findByChannel(channel.id);
  
  const isLocked = tempData?.locked || false;
  const newLockState = !isLocked;

  await channel.permissionOverwrites.edit(interaction.guild.id, {
    Connect: newLockState ? false : null
  });

  await TempVoice.findOneAndUpdate(
    { channelId: channel.id },
    { locked: newLockState }
  );

  const embed = new EmbedBuilder()
    .setColor(newLockState ? 0xED4245 : 0x57F287)
    .setTitle(newLockState ? '🔒 Channel Locked' : '🔓 Channel Unlocked')
    .setDescription(newLockState 
      ? 'Your channel is now **locked**. Only permitted users can join.'
      : 'Your channel is now **unlocked**. Anyone can join.')
    .setFooter({ text: 'Raphael Temp Voice' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Toggle channel visibility (hide/show)
 */
async function toggleHide(interaction) {
  const channel = await getUserTempChannel(interaction);
  
  // Check current state
  const everyonePerms = channel.permissionOverwrites.cache.get(interaction.guild.id);
  const isHidden = everyonePerms?.deny.has(PermissionFlagsBits.ViewChannel) || false;
  const newHideState = !isHidden;

  await channel.permissionOverwrites.edit(interaction.guild.id, {
    ViewChannel: newHideState ? false : null
  });

  const embed = new EmbedBuilder()
    .setColor(newHideState ? 0x5865F2 : 0x57F287)
    .setTitle(newHideState ? '👁️ Channel Hidden' : '👁️ Channel Visible')
    .setDescription(newHideState 
      ? 'Your channel is now **hidden** from the channel list.'
      : 'Your channel is now **visible** to everyone.')
    .setFooter({ text: 'Raphael Temp Voice' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Show user select menu for various actions
 */
async function showUserSelectMenu(interaction, action, placeholder) {
  const row = new ActionRowBuilder()
    .addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`tempvc_select_${action}`)
        .setPlaceholder(placeholder)
        .setMinValues(1)
        .setMaxValues(1)
    );

  await interaction.reply({
    content: `**Select a user for: ${action.toUpperCase()}**`,
    components: [row],
    ephemeral: true
  });
}

/**
 * Send channel invite link
 */
async function sendInvite(interaction) {
  const channel = await getUserTempChannel(interaction);
  
  const invite = await channel.createInvite({
    maxAge: 3600, // 1 hour
    maxUses: 10,
    unique: true
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📨 Channel Invite Created')
    .setDescription(`Here's your invite link:\n${invite.url}\n\n*Expires in 1 hour or after 10 uses*`)
    .setFooter({ text: 'Raphael Temp Voice' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Claim an abandoned channel
 */
async function claimChannel(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply({
      content: '❌ You must be in a voice channel to claim it.',
      ephemeral: true
    });
  }

  const tempData = await TempVoice.findByChannel(voiceChannel.id);
  if (!tempData) {
    return interaction.reply({
      content: '❌ This is not a temporary voice channel.',
      ephemeral: true
    });
  }

  // Check if original owner is still in channel
  const owner = voiceChannel.members.get(tempData.ownerId);
  if (owner) {
    return interaction.reply({
      content: '❌ The owner is still in the channel. You cannot claim it.',
      ephemeral: true
    });
  }

  // Transfer ownership
  const oldOwnerId = tempData.ownerId;
  tempData.ownerId = interaction.user.id;
  await tempData.save();

  // Update permissions
  try {
    await voiceChannel.permissionOverwrites.delete(oldOwnerId);
  } catch (e) { /* ignore */ }

  await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
    ViewChannel: true,
    Connect: true,
    ManageChannels: true,
    MuteMembers: true,
    DeafenMembers: true,
    MoveMembers: true
  });

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('👑 Channel Claimed!')
    .setDescription(`You are now the owner of **${voiceChannel.name}**!`)
    .setFooter({ text: 'Raphael Temp Voice' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Delete the user's temp channel
 */
async function deleteChannel(interaction) {
  const channel = await getUserTempChannel(interaction);
  const tempData = await TempVoice.findByChannel(channel.id);

  if (!tempData) {
    return interaction.reply({
      content: '❌ Channel data not found.',
      ephemeral: true
    });
  }

  // Delete from database
  await TempVoice.findByIdAndDelete(tempData._id);

  // Reply first before deleting channel
  await interaction.reply({
    content: '🗑️ Your channel has been deleted.',
    ephemeral: true
  });

  // Delete the channel
  await channel.delete('Owner requested deletion via TempVoice interface');
}

/**
 * Show channel info
 */
async function showChannelInfo(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply({
      content: '❌ You must be in a voice channel to see its info.',
      ephemeral: true
    });
  }

  const tempData = await TempVoice.findByChannel(voiceChannel.id);
  if (!tempData) {
    return interaction.reply({
      content: '❌ This is not a temporary voice channel.',
      ephemeral: true
    });
  }

  const owner = await interaction.guild.members.fetch(tempData.ownerId).catch(() => null);
  const memberCount = voiceChannel.members.size;
  const userLimit = voiceChannel.userLimit || 'Unlimited';
  const bitrate = Math.floor(voiceChannel.bitrate / 1000);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎙️ Channel Info')
    .addFields(
      { name: '📝 Name', value: voiceChannel.name, inline: true },
      { name: '👑 Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
      { name: '👥 Members', value: `${memberCount}/${userLimit}`, inline: true },
      { name: '🎵 Bitrate', value: `${bitrate} kbps`, inline: true },
      { name: '🔒 Locked', value: tempData.locked ? 'Yes' : 'No', inline: true },
      { name: '⏰ Created', value: `<t:${Math.floor(tempData.createdAt.getTime() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: 'Raphael Temp Voice' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle TempVoice modal submissions
 */
async function handleTempVCModal(interaction) {
  const action = interaction.customId.replace('tempvc_modal_', '');
  const channel = await getUserTempChannel(interaction);

  if (!channel) {
    return interaction.reply({
      content: '❌ You don\'t own a temporary voice channel.',
      ephemeral: true
    });
  }

  switch (action) {
    case 'name': {
      let newName = interaction.fields.getTextInputValue('channel_name');
      
      // If blank, reset to default
      if (!newName || newName.trim() === '') {
        const guildConfig = await Guild.getGuild(interaction.guild.id, interaction.guild.name);
        const tempVoice = guildConfig.features.tempVoice;
        newName = (tempVoice?.defaultName || "{user}'s Channel")
          .replace(/{user}/gi, interaction.member.displayName)
          .replace(/{username}/gi, interaction.user.username)
          .replace(/{tag}/gi, interaction.user.tag);
      }

      await channel.setName(newName);
      await TempVoice.findOneAndUpdate({ channelId: channel.id }, { name: newName });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✏️ Channel Renamed')
        .setDescription(`Your channel has been renamed to **${newName}**`)
        .setFooter({ text: 'Raphael Temp Voice' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    case 'limit': {
      const limitStr = interaction.fields.getTextInputValue('user_limit');
      const limit = parseInt(limitStr);

      if (isNaN(limit) || limit < 0 || limit > 99) {
        return interaction.reply({
          content: '❌ Invalid limit. Please enter a number between 0 and 99.',
          ephemeral: true
        });
      }

      await channel.setUserLimit(limit);
      await TempVoice.findOneAndUpdate({ channelId: channel.id }, { userLimit: limit });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('👥 User Limit Set')
        .setDescription(`User limit set to: **${limit || 'Unlimited'}**`)
        .setFooter({ text: 'Raphael Temp Voice' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    case 'bitrate': {
      const bitrateStr = interaction.fields.getTextInputValue('bitrate');
      const bitrate = parseInt(bitrateStr);

      if (isNaN(bitrate) || bitrate < 8 || bitrate > 96) {
        return interaction.reply({
          content: '❌ Invalid bitrate. Please enter a number between 8 and 96.',
          ephemeral: true
        });
      }

      await channel.setBitrate(bitrate * 1000);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🎵 Bitrate Set')
        .setDescription(`Audio bitrate set to: **${bitrate} kbps**`)
        .setFooter({ text: 'Raphael Temp Voice' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    default:
      return interaction.reply({ content: '❌ Unknown action.', ephemeral: true });
  }
}

/**
 * Handle TempVoice user select menu interactions
 */
async function handleTempVCUserSelect(interaction) {
  const action = interaction.customId.replace('tempvc_select_', '');
  const channel = await getUserTempChannel(interaction);
  const targetUser = interaction.users.first();
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!channel) {
    return interaction.reply({
      content: '❌ You don\'t own a temporary voice channel.',
      ephemeral: true
    });
  }

  if (!targetMember) {
    return interaction.reply({
      content: '❌ Could not find that member.',
      ephemeral: true
    });
  }

  if (targetUser.bot) {
    return interaction.reply({
      content: '❌ You cannot perform this action on a bot.',
      ephemeral: true
    });
  }

  switch (action) {
    case 'permit': {
      await channel.permissionOverwrites.edit(targetUser.id, {
        Connect: true,
        ViewChannel: true
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ User Permitted')
        .setDescription(`${targetUser} can now join your channel.`)
        .setFooter({ text: 'Raphael Temp Voice' });

      return interaction.update({ content: null, embeds: [embed], components: [] });
    }

    case 'reject': {
      await channel.permissionOverwrites.edit(targetUser.id, {
        Connect: false,
        ViewChannel: false
      });

      // Disconnect if in channel
      if (targetMember.voice.channel?.id === channel.id) {
        await targetMember.voice.disconnect();
      }

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('❌ User Rejected')
        .setDescription(`${targetUser} is now blocked from your channel.`)
        .setFooter({ text: 'Raphael Temp Voice' });

      return interaction.update({ content: null, embeds: [embed], components: [] });
    }

    case 'kick': {
      if (!targetMember.voice.channel || targetMember.voice.channel.id !== channel.id) {
        return interaction.update({
          content: '❌ That user is not in your voice channel.',
          embeds: [],
          components: []
        });
      }

      await targetMember.voice.disconnect();

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('👢 User Kicked')
        .setDescription(`${targetUser} has been kicked from your channel.`)
        .setFooter({ text: 'Raphael Temp Voice' });

      return interaction.update({ content: null, embeds: [embed], components: [] });
    }

    case 'transfer': {
      if (!targetMember.voice.channel || targetMember.voice.channel.id !== channel.id) {
        return interaction.update({
          content: '❌ That user must be in your voice channel to transfer ownership.',
          embeds: [],
          components: []
        });
      }

      // Remove old owner permissions
      try {
        await channel.permissionOverwrites.delete(interaction.user.id);
      } catch (e) { /* ignore */ }

      // Add new owner permissions
      await channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        Connect: true,
        ManageChannels: true,
        MuteMembers: true,
        DeafenMembers: true,
        MoveMembers: true
      });

      // Rename channel
      const guildConfig = await Guild.getGuild(interaction.guild.id, interaction.guild.name);
      const tempVoice = guildConfig.features.tempVoice;
      const newName = (tempVoice?.defaultName || "{user}'s Channel")
        .replace(/{user}/gi, targetMember.displayName)
        .replace(/{username}/gi, targetUser.username)
        .replace(/{tag}/gi, targetUser.tag);

      await channel.setName(newName);

      await TempVoice.findOneAndUpdate(
        { channelId: channel.id },
        { ownerId: targetUser.id, name: newName }
      );

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🔄 Ownership Transferred')
        .setDescription(`${targetUser} is now the owner of **${newName}**!`)
        .setFooter({ text: 'Raphael Temp Voice' });

      // Notify new owner
      try {
        await targetUser.send({
          content: `🎙️ You are now the owner of **${newName}** in **${interaction.guild.name}**!`
        });
      } catch (e) { /* DMs disabled */ }

      return interaction.update({ content: null, embeds: [embed], components: [] });
    }

    default:
      return interaction.update({ content: '❌ Unknown action.', embeds: [], components: [] });
  }
}
