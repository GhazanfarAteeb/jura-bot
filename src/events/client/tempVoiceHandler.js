import { Events, ChannelType, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import TempVoice from '../../models/TempVoice.js';

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    const guildId = newState.guild?.id || oldState.guild?.id;
    if (!guildId) return;

    const guildConfig = await Guild.getGuild(guildId, newState.guild?.name || oldState.guild?.name);
    const tempVoice = guildConfig.features.tempVoice;

    // Check if temp voice is enabled
    if (!tempVoice?.enabled) return;

    // User joined a channel
    if (newState.channelId && newState.channelId !== oldState.channelId) {
      // Check if they joined the "Join to Create" channel
      if (newState.channelId === tempVoice.createChannelId) {
        await createTempChannel(newState, guildConfig);
      }
    }

    // User left a channel
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      // Check if they left a temp channel
      await checkAndDeleteTempChannel(oldState);
    }
  }
};

async function createTempChannel(voiceState, guildConfig) {
  const member = voiceState.member;
  const guild = voiceState.guild;
  const tempVoice = guildConfig.features.tempVoice;

  try {
    // Check if user already has a temp channel
    const existingChannel = await TempVoice.findUserChannel(guild.id, member.id);
    if (existingChannel) {
      const channel = guild.channels.cache.get(existingChannel.channelId);
      if (channel) {
        // Move user to their existing channel
        await member.voice.setChannel(channel);
        return;
      } else {
        // Channel doesn't exist anymore, clean up
        await TempVoice.findByIdAndDelete(existingChannel._id);
      }
    }

    // Generate channel name
    const channelName = (tempVoice.defaultName || "{user}'s Channel")
      .replace(/{user}/gi, member.displayName)
      .replace(/{username}/gi, member.user.username)
      .replace(/{tag}/gi, member.user.tag);

    // Create the temp channel
    const newChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: tempVoice.categoryId || voiceState.channel?.parentId,
      userLimit: tempVoice.defaultLimit || 0,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
            PermissionFlagsBits.MoveMembers
          ]
        }
      ]
    });

    // Save to database
    await TempVoice.create({
      guildId: guild.id,
      channelId: newChannel.id,
      ownerId: member.id,
      createdFromId: tempVoice.createChannelId,
      name: channelName,
      userLimit: tempVoice.defaultLimit || 0
    });

    // Move user to the new channel
    await member.voice.setChannel(newChannel);

    console.log(`Created temp voice channel "${channelName}" for ${member.user.tag}`);
  } catch (error) {
    console.error('Error creating temp voice channel:', error);
  }
}

async function checkAndDeleteTempChannel(voiceState) {
  const channelId = voiceState.channelId;
  const leavingUserId = voiceState.member?.id;

  // Check if this was a temp channel
  const tempData = await TempVoice.findByChannel(channelId);
  if (!tempData) return;

  const guild = voiceState.guild;
  const channel = guild.channels.cache.get(channelId);

  // If channel doesn't exist or is empty, delete it
  if (!channel || channel.members.size === 0) {
    try {
      // Delete from database
      await TempVoice.findByIdAndDelete(tempData._id);

      // Delete the channel
      if (channel) {
        await channel.delete('Temp voice channel empty');
        console.log(`Deleted empty temp voice channel: ${tempData.name}`);
      }
    } catch (error) {
      console.error('Error deleting temp voice channel:', error);
    }
    return;
  }

  // If the owner left but there are still members, transfer ownership
  if (leavingUserId === tempData.ownerId && channel.members.size > 0) {
    await transferOwnership(channel, tempData, guild);
  }
}

async function transferOwnership(channel, tempData, guild) {
  try {
    // Get remaining members (excluding bots)
    const remainingMembers = channel.members.filter(m => !m.user.bot);

    if (remainingMembers.size === 0) {
      // Only bots left, delete the channel
      await TempVoice.findByIdAndDelete(tempData._id);
      await channel.delete('Temp voice channel - no human members left');
      console.log(`Deleted temp voice channel (only bots): ${tempData.name}`);
      return;
    }

    // Pick the first remaining member as new owner
    const newOwner = remainingMembers.first();
    const oldOwnerId = tempData.ownerId;

    // Update channel name to reflect new owner
    const guildConfig = await Guild.getGuild(guild.id, guild.name);
    const tempVoice = guildConfig.features.tempVoice;
    const newChannelName = (tempVoice?.defaultName || "{user}'s Channel")
      .replace(/{user}/gi, newOwner.displayName)
      .replace(/{username}/gi, newOwner.user.username)
      .replace(/{tag}/gi, newOwner.user.tag);

    // Update channel permissions - remove old owner's special perms, add new owner's
    await channel.permissionOverwrites.edit(newOwner.id, {
      ViewChannel: true,
      Connect: true,
      ManageChannels: true,
      MuteMembers: true,
      DeafenMembers: true,
      MoveMembers: true
    });

    // Remove old owner's special permissions (if they're not in the channel)
    try {
      await channel.permissionOverwrites.delete(oldOwnerId);
    } catch (e) {
      // Old owner permission might not exist, ignore
    }

    // Rename the channel
    await channel.setName(newChannelName);

    // Update database
    tempData.ownerId = newOwner.id;
    tempData.name = newChannelName;
    await tempData.save();

    console.log(`Transferred temp voice channel ownership from ${oldOwnerId} to ${newOwner.user.tag}`);

    // Notify the new owner (optional - send DM)
    try {
      await newOwner.send({
        content: `🎙️ You are now the owner of **${newChannelName}** in **${guild.name}**!\n\nUse \`!tempvc\` commands to manage your channel.`
      });
    } catch (e) {
      // DM might be disabled, ignore
    }
  } catch (error) {
    console.error('Error transferring temp voice channel ownership:', error);
  }
}

// Cleanup function for orphaned temp channels (run on bot startup)
export async function cleanupTempChannels(client) {
  try {
    const allTempChannels = await TempVoice.find({});

    for (const tempData of allTempChannels) {
      const guild = client.guilds.cache.get(tempData.guildId);
      if (!guild) {
        // Guild no longer accessible, delete record
        await TempVoice.findByIdAndDelete(tempData._id);
        continue;
      }

      const channel = guild.channels.cache.get(tempData.channelId);
      if (!channel) {
        // Channel no longer exists, delete record
        await TempVoice.findByIdAndDelete(tempData._id);
        continue;
      }

      // If channel is empty, delete it
      if (channel.members.size === 0) {
        await channel.delete('Temp voice channel cleanup on startup');
        await TempVoice.findByIdAndDelete(tempData._id);
        console.log(`Cleaned up orphaned temp channel: ${tempData.name}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp channels:', error);
  }
}
