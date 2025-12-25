import { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Giveaway from '../../models/Giveaway.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'giveaway',
  description: 'Create and manage giveaways',
  usage: '<start|end|reroll|list|delete> [options]',
  aliases: ['gw', 'gaway'],
  permissions: {
    user: PermissionFlagsBits.ManageGuild
  },
  cooldown: 5,

  async execute(message, args) {
    if (!args[0]) {
      return showHelp(message);
    }

    const action = args[0].toLowerCase();

    switch (action) {
      case 'start':
      case 'create':
        return startGiveaway(message, args.slice(1));
      case 'end':
      case 'stop':
        return endGiveaway(message, args[1]);
      case 'reroll':
        return rerollGiveaway(message, args[1]);
      case 'list':
        return listGiveaways(message);
      case 'delete':
      case 'cancel':
        return deleteGiveaway(message, args[1]);
      default:
        return showHelp(message);
    }
  }
};

async function showHelp(message) {
  const embed = await infoEmbed(message.guild.id, '🎉 Giveaway Commands',
    `**Commands:**\n` +
    `${GLYPHS.DOT} \`giveaway start <duration> <winners> <prize>\`\n` +
    `  Example: \`giveaway start 1d 2 Nitro Classic\`\n\n` +
    `${GLYPHS.DOT} \`giveaway end <messageId>\` - End a giveaway early\n` +
    `${GLYPHS.DOT} \`giveaway reroll <messageId>\` - Pick new winners\n` +
    `${GLYPHS.DOT} \`giveaway list\` - List active giveaways\n` +
    `${GLYPHS.DOT} \`giveaway delete <messageId>\` - Cancel a giveaway\n\n` +
    `**Duration formats:**\n` +
    `${GLYPHS.DOT} \`s\` - seconds (30s)\n` +
    `${GLYPHS.DOT} \`m\` - minutes (10m)\n` +
    `${GLYPHS.DOT} \`h\` - hours (2h)\n` +
    `${GLYPHS.DOT} \`d\` - days (1d)\n` +
    `${GLYPHS.DOT} \`w\` - weeks (1w)`
  );
  return message.reply({ embeds: [embed] });
}

async function startGiveaway(message, args) {
  // Parse arguments: duration, winners, prize
  if (args.length < 3) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Missing Arguments',
        'Usage: `giveaway start <duration> <winners> <prize>`\n' +
        'Example: `giveaway start 1d 2 Nitro Classic`')]
    });
  }

  const duration = parseDuration(args[0]);
  if (!duration) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Duration',
        'Please provide a valid duration (e.g., 30s, 10m, 2h, 1d, 1w)')]
    });
  }

  const winners = parseInt(args[1]);
  if (isNaN(winners) || winners < 1 || winners > 20) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Winners',
        'Winner count must be between 1 and 20.')]
    });
  }

  const prize = args.slice(2).join(' ');
  if (!prize) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Prize',
        'Please provide a prize description.')]
    });
  }

  const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
  const endsAt = new Date(Date.now() + duration);

  // Create giveaway embed
  const embed = new EmbedBuilder()
    .setColor(guildConfig.embedStyle?.color || '#FF69B4')
    .setTitle('🎉 GIVEAWAY 🎉')
    .setDescription(
      `**Prize:** ${prize}\n\n` +
      `**Winners:** ${winners}\n` +
      `**Hosted by:** ${message.author}\n\n` +
      `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n\n` +
      `Click the button below to enter!`
    )
    .setFooter({ text: `Ends at` })
    .setTimestamp(endsAt);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel('🎉 Enter (0)')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('giveaway_participants')
      .setLabel('👥 Participants')
      .setStyle(ButtonStyle.Secondary)
  );

  const giveawayMessage = await message.channel.send({
    embeds: [embed],
    components: [row]
  });

  // Save to database
  await Giveaway.create({
    guildId: message.guild.id,
    channelId: message.channel.id,
    messageId: giveawayMessage.id,
    hostId: message.author.id,
    prize,
    winners,
    endsAt,
    participants: []
  });

  await message.reply({
    embeds: [await successEmbed(message.guild.id, 'Giveaway Started!',
      `${GLYPHS.SUCCESS} Giveaway for **${prize}** has started!\n` +
      `Ends <t:${Math.floor(endsAt.getTime() / 1000)}:R>`)]
  });
}

async function endGiveaway(message, messageId) {
  if (!messageId) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Missing Message ID',
        'Please provide the giveaway message ID.')]
    });
  }

  const giveaway = await Giveaway.findOne({ messageId, guildId: message.guild.id });

  if (!giveaway) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Not Found',
        'Could not find a giveaway with that message ID.')]
    });
  }

  if (giveaway.ended) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Already Ended',
        'This giveaway has already ended.')]
    });
  }

  await endGiveawayById(message.guild, giveaway);

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Giveaway Ended',
      `${GLYPHS.SUCCESS} The giveaway has been ended!`)]
  });
}

async function rerollGiveaway(message, messageId) {
  if (!messageId) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Missing Message ID',
        'Please provide the giveaway message ID.')]
    });
  }

  const giveaway = await Giveaway.findOne({ messageId, guildId: message.guild.id });

  if (!giveaway) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Not Found',
        'Could not find a giveaway with that message ID.')]
    });
  }

  if (!giveaway.ended) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Not Ended',
        'This giveaway has not ended yet. Use `giveaway end` first.')]
    });
  }

  if (giveaway.participants.length === 0) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Participants',
        'There were no participants in this giveaway.')]
    });
  }

  // Pick new winners
  const newWinners = giveaway.pickWinners();
  giveaway.winnerIds = newWinners;
  await giveaway.save();

  const channel = message.guild.channels.cache.get(giveaway.channelId);
  if (channel) {
    const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
    await channel.send({
      content: `🎉 **REROLL!** New winner(s): ${winnerMentions}\n**Prize:** ${giveaway.prize}`
    });
  }

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Giveaway Rerolled',
      `${GLYPHS.SUCCESS} New winners have been selected!`)]
  });
}

async function listGiveaways(message) {
  const giveaways = await Giveaway.getGuildGiveaways(message.guild.id);

  if (giveaways.length === 0) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'No Active Giveaways',
        'There are no active giveaways in this server.')]
    });
  }

  const giveawayList = giveaways.map((g, i) =>
    `**${i + 1}.** ${g.prize}\n` +
    `   ${GLYPHS.DOT} Ends: <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>\n` +
    `   ${GLYPHS.DOT} Participants: ${g.participants.length}\n` +
    `   ${GLYPHS.DOT} Message ID: \`${g.messageId}\``
  ).join('\n\n');

  const embed = await infoEmbed(message.guild.id, '🎉 Active Giveaways', giveawayList);
  return message.reply({ embeds: [embed] });
}

async function deleteGiveaway(message, messageId) {
  if (!messageId) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Missing Message ID',
        'Please provide the giveaway message ID.')]
    });
  }

  const giveaway = await Giveaway.findOneAndDelete({ messageId, guildId: message.guild.id });

  if (!giveaway) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Not Found',
        'Could not find a giveaway with that message ID.')]
    });
  }

  // Try to delete the giveaway message
  try {
    const channel = message.guild.channels.cache.get(giveaway.channelId);
    const msg = await channel?.messages.fetch(giveaway.messageId);
    await msg?.delete();
  } catch (e) {
    // Message might already be deleted
  }

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Giveaway Deleted',
      `${GLYPHS.SUCCESS} The giveaway has been cancelled and deleted.`)]
  });
}

// Helper function to parse duration
function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return value * multipliers[unit];
}

// Export helper function for ending giveaways (used by scheduler)
export async function endGiveawayById(guild, giveaway) {
  const guildConfig = await Guild.getGuild(guild.id, guild.name);

  // Pick winners
  const winners = giveaway.pickWinners();
  giveaway.ended = true;
  giveaway.winnerIds = winners;
  await giveaway.save();

  const channel = guild.channels.cache.get(giveaway.channelId);
  if (!channel) return;

  try {
    const giveawayMessage = await channel.messages.fetch(giveaway.messageId);

    // Update embed
    const embed = new EmbedBuilder()
      .setColor('#808080')
      .setTitle('🎉 GIVEAWAY ENDED 🎉')
      .setDescription(
        `**Prize:** ${giveaway.prize}\n\n` +
        `**Winners:** ${winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'No valid participants'}\n` +
        `**Hosted by:** <@${giveaway.hostId}>\n\n` +
        `**Participants:** ${giveaway.participants.length}`
      )
      .setFooter({ text: 'Ended' })
      .setTimestamp();

    // Disable buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel('🎉 Ended')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('giveaway_participants')
        .setLabel(`👥 ${giveaway.participants.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    await giveawayMessage.edit({ embeds: [embed], components: [row] });

    // Announce winners
    if (winners.length > 0) {
      const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
      await channel.send({
        content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
        reply: { messageReference: giveaway.messageId }
      });
    } else {
      await channel.send({
        content: `😢 No one entered the giveaway for **${giveaway.prize}**.`,
        reply: { messageReference: giveaway.messageId }
      });
    }
  } catch (error) {
    console.error('Error ending giveaway:', error);
  }
}
