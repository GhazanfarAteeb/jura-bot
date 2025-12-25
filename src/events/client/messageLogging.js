import { Events, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { GLYPHS } from '../../utils/embeds.js';
import { cacheDeletedMessage } from '../../commands/utility/snipe.js';
import { cacheEditedMessage } from '../../commands/utility/editsnipe.js';

export default {
  name: 'messageLogging',

  async initialize(client) {
    // Message Delete
    client.on(Events.MessageDelete, async (message) => {
      if (!message.guild || message.author?.bot) return;
      
      // Cache for snipe command
      cacheDeletedMessage(message);
      
      await logMessageDelete(message);
    });

    // Message Update (Edit)
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
      if (!newMessage.guild || newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return; // Embed updates, etc.
      
      // Cache for editsnipe command
      cacheEditedMessage(oldMessage, newMessage);
      
      await logMessageEdit(oldMessage, newMessage);
    });

    // Bulk Message Delete
    client.on(Events.MessageBulkDelete, async (messages, channel) => {
      await logBulkDelete(messages, channel);
    });

    console.log('📝 Message logging initialized');
  }
};

async function logMessageDelete(message) {
  try {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    if (!guildConfig.channels.messageLog) return;

    const logChannel = message.guild.channels.cache.get(guildConfig.channels.messageLog);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle(`${GLYPHS.DELETE || '🗑️'} Message Deleted`)
      .setColor('#FF6B6B')
      .setDescription(message.content?.substring(0, 1024) || '*No text content*')
      .addFields(
        { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
        { name: 'Channel', value: `${message.channel} (${message.channel.id})`, inline: true }
      )
      .setTimestamp();

    // Add attachment info if any
    if (message.attachments.size > 0) {
      const attachmentList = message.attachments.map(a => a.name).join(', ');
      embed.addFields({ name: 'Attachments', value: attachmentList.substring(0, 1024), inline: false });
    }

    // Add message ID
    embed.setFooter({ text: `Message ID: ${message.id}` });

    await logChannel.send({ embeds: [embed] });

  } catch (error) {
    console.error('Error logging message delete:', error);
  }
}

async function logMessageEdit(oldMessage, newMessage) {
  try {
    const guildConfig = await Guild.getGuild(newMessage.guild.id, newMessage.guild.name);

    if (!guildConfig.channels.messageLog) return;

    const logChannel = newMessage.guild.channels.cache.get(guildConfig.channels.messageLog);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle(`${GLYPHS.EDIT || '✏️'} Message Edited`)
      .setColor('#FFD93D')
      .addFields(
        { name: 'Before', value: oldMessage.content?.substring(0, 1024) || '*No content*', inline: false },
        { name: 'After', value: newMessage.content?.substring(0, 1024) || '*No content*', inline: false },
        { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
        { name: 'Channel', value: `${newMessage.channel} (${newMessage.channel.id})`, inline: true },
        { name: 'Jump to Message', value: `[Click here](${newMessage.url})`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Message ID: ${newMessage.id}` });

    await logChannel.send({ embeds: [embed] });

  } catch (error) {
    console.error('Error logging message edit:', error);
  }
}

async function logBulkDelete(messages, channel) {
  try {
    if (!channel.guild) return;

    const guildConfig = await Guild.getGuild(channel.guild.id, channel.guild.name);

    if (!guildConfig.channels.messageLog) return;

    const logChannel = channel.guild.channels.cache.get(guildConfig.channels.messageLog);
    if (!logChannel) return;

    // Create a text file with deleted messages
    const messageLog = messages.map(msg => {
      const author = msg.author ? `${msg.author.tag} (${msg.author.id})` : 'Unknown';
      const content = msg.content || '*No content*';
      const time = msg.createdAt.toISOString();
      return `[${time}] ${author}: ${content}`;
    }).reverse().join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`${GLYPHS.DELETE || '🗑️'} Bulk Message Delete`)
      .setColor('#FF4757')
      .setDescription(`**${messages.size}** messages were deleted in ${channel}`)
      .addFields(
        { name: 'Channel', value: `${channel} (${channel.id})`, inline: true }
      )
      .setTimestamp();

    // If message log is small enough, include in embed
    if (messageLog.length < 1800) {
      embed.addFields({ name: 'Messages', value: `\`\`\`\n${messageLog.substring(0, 1000)}\n\`\`\``, inline: false });
      await logChannel.send({ embeds: [embed] });
    } else {
      // Send as file
      const buffer = Buffer.from(messageLog, 'utf-8');
      await logChannel.send({
        embeds: [embed],
        files: [{
          attachment: buffer,
          name: `deleted_messages_${Date.now()}.txt`
        }]
      });
    }

  } catch (error) {
    console.error('Error logging bulk delete:', error);
  }
}
