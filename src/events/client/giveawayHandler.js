import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Giveaway from '../../models/Giveaway.js';
import Guild from '../../models/Guild.js';
import { endGiveawayById } from '../../commands/community/giveaway.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Only handle giveaway button interactions
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('giveaway_')) return;

    const giveaway = await Giveaway.findOne({
      messageId: interaction.message.id,
      guildId: interaction.guild.id
    });

    if (!giveaway) {
      return interaction.reply({
        content: '**Error:** This giveaway no longer exists, Master.',
        ephemeral: true
      });
    }

    if (giveaway.ended) {
      return interaction.reply({
        content: '**Notice:** This giveaway has already concluded, Master.',
        ephemeral: true
      });
    }

    const action = interaction.customId.replace('giveaway_', '');

    if (action === 'enter') {
      return handleEnter(interaction, giveaway);
    } else if (action === 'participants') {
      return handleParticipants(interaction, giveaway);
    }
  }
};

async function handleEnter(interaction, giveaway) {
  const userId = interaction.user.id;

  // Check if already entered
  if (giveaway.participants.includes(userId)) {
    // Remove from giveaway
    await giveaway.removeParticipant(userId);

    await updateGiveawayMessage(interaction, giveaway);

    return interaction.reply({
      content: '**Confirmed:** You have withdrawn from the giveaway, Master.',
      ephemeral: true
    });
  }

  // Check requirements if any
  if (giveaway.requirements) {
    // Check role requirement
    if (giveaway.requirements.roleId) {
      if (!interaction.member.roles.cache.has(giveaway.requirements.roleId)) {
        return interaction.reply({
          content: `**Error:** The <@&${giveaway.requirements.roleId}> role is required for giveaway entry, Master.`,
          ephemeral: true
        });
      }
    }

    // Could add level/message requirements check here
  }

  // Add to giveaway
  await giveaway.addParticipant(userId);

  await updateGiveawayMessage(interaction, giveaway);

  return interaction.reply({
    content: `**Confirmed:** Giveaway entry registered for **${giveaway.prize}**, Master.\n**Notice:** Activate again to withdraw.`,
    ephemeral: true
  });
}

async function handleParticipants(interaction, giveaway) {
  const participants = giveaway.participants;

  if (participants.length === 0) {
    return interaction.reply({
      content: 'No one has entered this giveaway yet.',
      ephemeral: true
    });
  }

  const participantList = participants.slice(0, 20).map(id => `<@${id}>`).join(', ');
  const moreCount = participants.length > 20 ? ` and ${participants.length - 20} more...` : '';

  return interaction.reply({
    content: `**Participants (${participants.length}):**\n${participantList}${moreCount}`,
    ephemeral: true
  });
}

async function updateGiveawayMessage(interaction, giveaway) {
  const guildConfig = await Guild.getGuild(interaction.guild.id, interaction.guild.name);

  const embed = new EmbedBuilder()
    .setColor(guildConfig.embedStyle?.color || '#00CED1')
    .setTitle('『 GIVEAWAY 』')
    .setDescription(
      `**▸ Prize:** ${giveaway.prize}\n\n` +
      `**▸ Winners:** ${giveaway.winners}\n` +
      `**▸ Hosted by:** <@${giveaway.hostId}>\n\n` +
      `**▸ Ends:** <t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>\n\n` +
      `Activate the button below to enter, Master.`
    )
    .setFooter({ text: `Ends at` })
    .setTimestamp(giveaway.endsAt);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel(`◉ Enter (${giveaway.participants.length})`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('giveaway_participants')
      .setLabel('◇ Participants')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.message.edit({ embeds: [embed], components: [row] });
}

// Export function to check and end giveaways (called from scheduler)
export async function checkGiveaways(client) {
  try {
    // Check if database is connected before proceeding
    if (!client.db || !client.db.testConnection || !(await client.db.testConnection())) {
      console.log('[Giveaways] Database not connected, skipping check');
      return;
    }
    const endedGiveaways = await Giveaway.getActiveGiveaways();

    for (const giveaway of endedGiveaways) {
      const guild = client.guilds.cache.get(giveaway.guildId);
      if (!guild) continue;

      await endGiveawayById(guild, giveaway);
    }
  } catch (error) {
    console.error('Error checking giveaways:', error);
  }
}
