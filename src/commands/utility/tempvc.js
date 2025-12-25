import { PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import TempVoice from '../../models/TempVoice.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'tempvc',
  description: 'Configure temporary voice channels',
  usage: '<setup|disable|name|limit|lock|unlock|kick|permit|reject>',
  aliases: ['tempvoice', 'vc', 'voice'],
  cooldown: 3,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    // Initialize temp voice settings if not exist
    if (!guildConfig.features.tempVoice) {
      guildConfig.features.tempVoice = {
        enabled: false,
        createChannelId: null,
        categoryId: null,
        defaultName: "{user}'s Channel",
        defaultLimit: 0
      };
      await guildConfig.save();
    }

    if (!args[0]) {
      return showStatus(message, guildConfig);
    }

    const action = args[0].toLowerCase();

    // Admin commands
    if (['setup', 'disable', 'category', 'defaultname', 'defaultlimit'].includes(action)) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
            'You need Manage Server permission for this command.')]
        });
      }
    }

    switch (action) {
      case 'setup':
        return setupTempVC(message, guildConfig);

      case 'disable':
        guildConfig.features.tempVoice.enabled = false;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Temp VC Disabled',
            `${GLYPHS.SUCCESS} Temporary voice channels are now disabled.`)]
        });

      case 'category':
        return setCategory(message, args[1], guildConfig);

      case 'defaultname':
        const name = args.slice(1).join(' ');
        if (!name) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'No Name',
              'Please provide a default channel name.\nUse `{user}` as a placeholder for the username.')]
          });
        }
        guildConfig.features.tempVoice.defaultName = name;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Default Name Set',
            `${GLYPHS.SUCCESS} Default channel name set to: **${name}**`)]
        });

      case 'defaultlimit':
        const limit = parseInt(args[1]);
        if (isNaN(limit) || limit < 0 || limit > 99) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Limit',
              'Limit must be between 0 (unlimited) and 99.')]
          });
        }
        guildConfig.features.tempVoice.defaultLimit = limit;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Default Limit Set',
            `${GLYPHS.SUCCESS} Default user limit set to: **${limit || 'Unlimited'}**`)]
        });

      // User commands for their own temp channel
      case 'name':
        return renameChannel(message, args.slice(1).join(' '));

      case 'limit':
        return setLimit(message, args[1]);

      case 'lock':
        return lockChannel(message, true);

      case 'unlock':
        return lockChannel(message, false);

      case 'kick':
        return kickUser(message, args.slice(1));

      case 'permit':
      case 'allow':
        return permitUser(message, args.slice(1), true);

      case 'reject':
      case 'deny':
        return permitUser(message, args.slice(1), false);

      case 'claim':
        return claimChannel(message);

      case 'transfer':
        return transferOwnership(message, args.slice(1));

      case 'hide':
        return hideChannel(message, true);

      case 'unhide':
      case 'show':
        return hideChannel(message, false);

      case 'bitrate':
        return setBitrate(message, args[1]);

      case 'info':
        return channelInfo(message);

      default:
        return showStatus(message, guildConfig);
    }
  }
};

async function showStatus(message, guildConfig) {
  const tv = guildConfig.features.tempVoice;
  const createChannel = tv?.createChannelId ? message.guild.channels.cache.get(tv.createChannelId) : null;
  const category = tv?.categoryId ? message.guild.channels.cache.get(tv.categoryId) : null;

  // Check if user has a temp channel
  const userChannel = await TempVoice.findUserChannel(message.guild.id, message.author.id);

  const embed = await infoEmbed(message.guild.id, '🎙️ Temporary Voice Channels',
    `**Status:** ${tv?.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
    `**Join to Create:** ${createChannel || 'Not set'}\n` +
    `**Category:** ${category || 'Auto'}\n` +
    `**Default Name:** ${tv?.defaultName || "{user}'s Channel"}\n` +
    `**Default Limit:** ${tv?.defaultLimit || 'Unlimited'}\n\n` +
    (userChannel ? `**Your Channel:** <#${userChannel.channelId}>\n\n` : '') +
    `**Admin Commands:**\n` +
    `${GLYPHS.DOT} \`tempvc setup\` - Set up temp voice\n` +
    `${GLYPHS.DOT} \`tempvc disable\` - Disable temp voice\n` +
    `${GLYPHS.DOT} \`tempvc defaultname <name>\` - Set default name\n` +
    `${GLYPHS.DOT} \`tempvc defaultlimit <num>\` - Set default limit\n\n` +
    `**User Commands (in your temp channel):**\n` +
    `${GLYPHS.DOT} \`tempvc name <name>\` - Rename your channel\n` +
    `${GLYPHS.DOT} \`tempvc limit <num>\` - Set user limit\n` +
    `${GLYPHS.DOT} \`tempvc lock\` - Lock channel\n` +
    `${GLYPHS.DOT} \`tempvc unlock\` - Unlock channel\n` +
    `${GLYPHS.DOT} \`tempvc permit @user\` - Allow user to join\n` +
    `${GLYPHS.DOT} \`tempvc reject @user\` - Deny user from joining\n` +
    `${GLYPHS.DOT} \`tempvc kick @user\` - Kick user from channel\n` +
    `${GLYPHS.DOT} \`tempvc transfer @user\` - Transfer ownership\n` +
    `${GLYPHS.DOT} \`tempvc claim\` - Claim abandoned channel\n` +
    `${GLYPHS.DOT} \`tempvc hide\` - Hide channel from everyone\n` +
    `${GLYPHS.DOT} \`tempvc unhide\` - Show channel to everyone\n` +
    `${GLYPHS.DOT} \`tempvc bitrate <8-96>\` - Set audio bitrate\n` +
    `${GLYPHS.DOT} \`tempvc info\` - Show channel info`
  );

  return message.reply({ embeds: [embed] });
}

async function setupTempVC(message, guildConfig) {
  // Create category if needed
  let category = guildConfig.features.tempVoice.categoryId
    ? message.guild.channels.cache.get(guildConfig.features.tempVoice.categoryId)
    : null;

  if (!category) {
    category = await message.guild.channels.create({
      name: '🎙️ Temp Voice',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: message.guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        }
      ]
    });
    guildConfig.features.tempVoice.categoryId = category.id;
  }

  // Create "Join to Create" channel
  let createChannel = guildConfig.features.tempVoice.createChannelId
    ? message.guild.channels.cache.get(guildConfig.features.tempVoice.createChannelId)
    : null;

  if (!createChannel) {
    createChannel = await message.guild.channels.create({
      name: '➕ Join to Create',
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: message.guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        }
      ]
    });
    guildConfig.features.tempVoice.createChannelId = createChannel.id;
  }

  guildConfig.features.tempVoice.enabled = true;
  await guildConfig.save();

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Temp VC Setup Complete!',
      `${GLYPHS.SUCCESS} Temporary voice channels are now enabled!\n\n` +
      `**Join to Create:** ${createChannel}\n` +
      `**Category:** ${category}\n\n` +
      `Users can now join ${createChannel} to create their own voice channel!`)]
  });
}

async function setCategory(message, categoryId, guildConfig) {
  const category = message.guild.channels.cache.get(categoryId);

  if (!category || category.type !== ChannelType.GuildCategory) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Category',
        'Please provide a valid category ID.')]
    });
  }

  guildConfig.features.tempVoice.categoryId = category.id;
  await guildConfig.save();

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Category Set',
      `${GLYPHS.SUCCESS} Temp voice channels will be created in ${category.name}`)]
  });
}

async function getUserTempChannel(message) {
  // First check if user is in a voice channel
  const voiceChannel = message.member.voice.channel;

  // Check if user owns a temp channel
  const tempChannel = await TempVoice.findUserChannel(message.guild.id, message.author.id);

  if (tempChannel) {
    return message.guild.channels.cache.get(tempChannel.channelId);
  }

  // Check if they're in a temp channel (even if not owner)
  if (voiceChannel) {
    const channelData = await TempVoice.findByChannel(voiceChannel.id);
    if (channelData && channelData.ownerId === message.author.id) {
      return voiceChannel;
    }
  }

  return null;
}

async function renameChannel(message, name) {
  if (!name) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Name',
        'Please provide a new channel name.')]
    });
  }

  const channel = await getUserTempChannel(message);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You don\'t own a temporary voice channel.')]
    });
  }

  await channel.setName(name);
  await TempVoice.findOneAndUpdate(
    { channelId: channel.id },
    { name }
  );

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Channel Renamed',
      `${GLYPHS.SUCCESS} Your channel has been renamed to **${name}**`)]
  });
}

async function setLimit(message, limitStr) {
  const limit = parseInt(limitStr);
  if (isNaN(limit) || limit < 0 || limit > 99) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Limit',
        'Limit must be between 0 (unlimited) and 99.')]
    });
  }

  const channel = await getUserTempChannel(message);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You don\'t own a temporary voice channel.')]
    });
  }

  await channel.setUserLimit(limit);
  await TempVoice.findOneAndUpdate(
    { channelId: channel.id },
    { userLimit: limit }
  );

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Limit Set',
      `${GLYPHS.SUCCESS} User limit set to: **${limit || 'Unlimited'}**`)]
  });
}

async function lockChannel(message, lock) {
  const channel = await getUserTempChannel(message);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You don\'t own a temporary voice channel.')]
    });
  }

  await channel.permissionOverwrites.edit(message.guild.id, {
    Connect: lock ? false : null
  });

  await TempVoice.findOneAndUpdate(
    { channelId: channel.id },
    { locked: lock }
  );

  return message.reply({
    embeds: [await successEmbed(message.guild.id, lock ? 'Channel Locked' : 'Channel Unlocked',
      `${GLYPHS.SUCCESS} Your channel is now **${lock ? 'locked' : 'unlocked'}**.`)]
  });
}

async function kickUser(message, args) {
  const target = message.mentions.members.first();
  if (!target) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No User',
        'Please mention a user to kick.')]
    });
  }

  const channel = await getUserTempChannel(message);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You don\'t own a temporary voice channel.')]
    });
  }

  if (!target.voice.channel || target.voice.channel.id !== channel.id) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'User Not in Channel',
        'That user is not in your voice channel.')]
    });
  }

  await target.voice.disconnect();

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'User Kicked',
      `${GLYPHS.SUCCESS} ${target} has been kicked from your channel.`)]
  });
}

async function permitUser(message, args, allow) {
  const target = message.mentions.members.first();
  if (!target) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No User',
        'Please mention a user.')]
    });
  }

  const channel = await getUserTempChannel(message);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You don\'t own a temporary voice channel.')]
    });
  }

  await channel.permissionOverwrites.edit(target.id, {
    Connect: allow,
    ViewChannel: allow
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, allow ? 'User Permitted' : 'User Rejected',
      `${GLYPHS.SUCCESS} ${target} has been ${allow ? 'permitted to' : 'rejected from'} your channel.`)]
  });
}

async function claimChannel(message) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Not in Voice',
        'You must be in a voice channel to claim it.')]
    });
  }

  const tempData = await TempVoice.findByChannel(voiceChannel.id);
  if (!tempData) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Not a Temp Channel',
        'This is not a temporary voice channel.')]
    });
  }

  // Check if original owner is still in channel
  const owner = voiceChannel.members.get(tempData.ownerId);
  if (owner) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Owner Present',
        'The owner is still in the channel.')]
    });
  }

  // Transfer ownership
  tempData.ownerId = message.author.id;
  await tempData.save();

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Channel Claimed',
      `${GLYPHS.SUCCESS} You are now the owner of this channel!`)]
  });
}

async function transferOwnership(message, args) {
  const target = message.mentions.members.first();
  if (!target) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No User',
        'Please mention a user to transfer ownership to.')]
    });
  }

  if (target.user.bot) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid User',
        'You cannot transfer ownership to a bot.')]
    });
  }

  const channel = await getUserTempChannel(message);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You don\'t own a temporary voice channel.')]
    });
  }

  if (!target.voice.channel || target.voice.channel.id !== channel.id) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'User Not in Channel',
        'That user must be in your voice channel.')]
    });
  }

  // Remove old owner's special permissions
  try {
    await channel.permissionOverwrites.delete(message.author.id);
  } catch (e) {
    // Ignore if permission doesn't exist
  }

  // Grant new owner full permissions
  await channel.permissionOverwrites.edit(target.id, {
    ViewChannel: true,
    Connect: true,
    ManageChannels: true,
    MuteMembers: true,
    DeafenMembers: true,
    MoveMembers: true
  });

  // Rename channel to new owner
  const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
  const tempVoice = guildConfig.features.tempVoice;
  const newName = (tempVoice?.defaultName || "{user}'s Channel")
    .replace(/{user}/gi, target.displayName)
    .replace(/{username}/gi, target.user.username)
    .replace(/{tag}/gi, target.user.tag);

  await channel.setName(newName);

  await TempVoice.findOneAndUpdate(
    { channelId: channel.id },
    { ownerId: target.id, name: newName }
  );

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Ownership Transferred',
      `${GLYPHS.SUCCESS} ${target} is now the owner of **${newName}**!\nChannel has been renamed and permissions updated.`)]
  });
}

async function hideChannel(message, hide) {
  const channel = await getUserTempChannel(message);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You don\'t own a temporary voice channel.')]
    });
  }

  await channel.permissionOverwrites.edit(message.guild.id, {
    ViewChannel: hide ? false : null
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, hide ? 'Channel Hidden' : 'Channel Visible',
      `${GLYPHS.SUCCESS} Your channel is now **${hide ? 'hidden' : 'visible'}** to everyone.`)]
  });
}

async function setBitrate(message, bitrateStr) {
  const bitrate = parseInt(bitrateStr);
  if (isNaN(bitrate) || bitrate < 8 || bitrate > 96) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Bitrate',
        'Bitrate must be between 8 and 96 kbps.')]
    });
  }

  const channel = await getUserTempChannel(message);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You don\'t own a temporary voice channel.')]
    });
  }

  await channel.setBitrate(bitrate * 1000); // Convert to bps

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Bitrate Set',
      `${GLYPHS.SUCCESS} Channel bitrate set to **${bitrate} kbps**`)]
  });
}

async function channelInfo(message) {
  const channel = await getUserTempChannel(message);
  const voiceChannel = message.member.voice.channel;
  
  // Try to get info for the channel user is in if they don't own one
  let targetChannel = channel || voiceChannel;
  if (!targetChannel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'You are not in a temporary voice channel.')]
    });
  }

  const tempData = await TempVoice.findByChannel(targetChannel.id);
  if (!tempData) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Not a Temp Channel',
        'This is not a temporary voice channel.')]
    });
  }

  const owner = await message.guild.members.fetch(tempData.ownerId).catch(() => null);
  const memberCount = targetChannel.members.size;
  const userLimit = targetChannel.userLimit || 'Unlimited';
  const bitrate = Math.floor(targetChannel.bitrate / 1000);

  const embed = await infoEmbed(message.guild.id, '🎙️ Channel Info',
    `**Channel:** ${targetChannel.name}\n` +
    `**Owner:** ${owner ? owner.user.tag : 'Unknown'}\n` +
    `**Members:** ${memberCount}/${userLimit}\n` +
    `**Bitrate:** ${bitrate} kbps\n` +
    `**Locked:** ${tempData.locked ? 'Yes 🔒' : 'No 🔓'}\n` +
    `**Created:** <t:${Math.floor(tempData.createdAt.getTime() / 1000)}:R>`
  );

  return message.reply({ embeds: [embed] });
}
