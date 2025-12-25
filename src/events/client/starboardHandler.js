import { Events, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import StarboardEntry from '../../models/StarboardEntry.js';

export default {
  name: Events.MessageReactionAdd,
  async execute(reaction, user, client) {
    // Ignore bot reactions
    if (user.bot) return;

    // Fetch partial reaction if needed
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    const message = reaction.message;
    if (!message.guild) return;

    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
    const starboard = guildConfig.features.starboard;

    // Check if starboard is enabled
    if (!starboard?.enabled) return;

    // Check if it's the star emoji
    const starEmoji = starboard.emoji || '⭐';
    if (reaction.emoji.name !== starEmoji && reaction.emoji.toString() !== starEmoji) return;

    // Check if channel is ignored
    if (starboard.ignoredChannels?.includes(message.channel.id)) return;

    // Check if it's the starboard channel (prevent starring starboard messages)
    if (message.channel.id === starboard.channel) return;

    // Check for self-starring
    if (!starboard.selfStar && message.author.id === user.id) {
      // Remove the reaction
      await reaction.users.remove(user.id).catch(() => { });
      return;
    }

    // Get reaction count
    const reactionCount = reaction.count;

    // Check threshold
    if (reactionCount < (starboard.threshold || 3)) return;

    // Check if already on starboard
    let entry = await StarboardEntry.findByOriginalMessage(message.guild.id, message.id);

    const starboardChannel = message.guild.channels.cache.get(starboard.channel);
    if (!starboardChannel) return;

    if (entry) {
      // Update existing entry
      if (!entry.starrers.includes(user.id)) {
        entry.starrers.push(user.id);
      }
      entry.starCount = reactionCount;
      await entry.save();

      // Update starboard message
      try {
        const starboardMessage = await starboardChannel.messages.fetch(entry.starboardMessageId);
        const embed = createStarboardEmbed(message, reactionCount, starEmoji, guildConfig);
        await starboardMessage.edit({
          content: `${starEmoji} **${reactionCount}** | <#${message.channel.id}>`,
          embeds: [embed]
        });
      } catch (error) {
        // Starboard message might be deleted
        console.error('Error updating starboard message:', error);
      }
    } else {
      // Create new starboard entry
      const embed = createStarboardEmbed(message, reactionCount, starEmoji, guildConfig);

      const starboardMessage = await starboardChannel.send({
        content: `${starEmoji} **${reactionCount}** | <#${message.channel.id}>`,
        embeds: [embed]
      });

      await StarboardEntry.create({
        guildId: message.guild.id,
        originalMessageId: message.id,
        originalChannelId: message.channel.id,
        starboardMessageId: starboardMessage.id,
        authorId: message.author.id,
        starCount: reactionCount,
        starrers: [user.id]
      });
    }
  }
};

function createStarboardEmbed(message, starCount, emoji, guildConfig) {
  const embed = new EmbedBuilder()
    .setColor(getStarColor(starCount))
    .setAuthor({
      name: message.author.tag,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp(message.createdTimestamp)
    .setFooter({ text: `ID: ${message.id}` });

  // Add message content
  if (message.content) {
    embed.setDescription(message.content.slice(0, 4000));
  }

  // Add image if present
  const attachment = message.attachments.first();
  if (attachment && attachment.contentType?.startsWith('image/')) {
    embed.setImage(attachment.url);
  }

  // Check for embeds with images
  if (message.embeds.length > 0) {
    const embedImage = message.embeds[0].image || message.embeds[0].thumbnail;
    if (embedImage && !embed.data.image) {
      embed.setImage(embedImage.url);
    }
  }

  // Add jump link
  embed.addFields({
    name: 'Source',
    value: `[Jump to message](${message.url})`
  });

  return embed;
}

// Get color based on star count
function getStarColor(count) {
  if (count >= 20) return '#FFD700'; // Gold
  if (count >= 15) return '#FFA500'; // Orange
  if (count >= 10) return '#FFFF00'; // Yellow
  if (count >= 5) return '#FFFACD';  // Light yellow
  return '#FFFFFF'; // White
}

// Export handler for reaction remove
export async function handleReactionRemove(reaction, user, client) {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      return;
    }
  }

  const message = reaction.message;
  if (!message.guild) return;

  const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
  const starboard = guildConfig.features.starboard;

  if (!starboard?.enabled) return;

  const starEmoji = starboard.emoji || '⭐';
  if (reaction.emoji.name !== starEmoji && reaction.emoji.toString() !== starEmoji) return;

  const entry = await StarboardEntry.findByOriginalMessage(message.guild.id, message.id);
  if (!entry) return;

  const reactionCount = reaction.count;

  // Remove from starrers
  entry.starrers = entry.starrers.filter(id => id !== user.id);
  entry.starCount = reactionCount;
  await entry.save();

  const starboardChannel = message.guild.channels.cache.get(starboard.channel);
  if (!starboardChannel) return;

  try {
    const starboardMessage = await starboardChannel.messages.fetch(entry.starboardMessageId);

    // If below threshold, delete from starboard
    if (reactionCount < (starboard.threshold || 3)) {
      await starboardMessage.delete();
      await StarboardEntry.findByIdAndDelete(entry._id);
    } else {
      // Update count
      const embed = createStarboardEmbed(message, reactionCount, starEmoji, guildConfig);
      await starboardMessage.edit({
        content: `${starEmoji} **${reactionCount}** | <#${message.channel.id}>`,
        embeds: [embed]
      });
    }
  } catch (error) {
    console.error('Error handling reaction remove:', error);
  }
}
