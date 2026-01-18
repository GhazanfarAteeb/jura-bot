import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Social from '../../models/Social.js';

export default {
  name: 'divorce',
  description: 'Initiate bond dissolution protocol, Master',
  usage: '',
  aliases: ['breakup'],
  category: 'social',
  cooldown: 60,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const odId = message.author.id;

    try {
      const userSocial = await Social.getSocial(odId, guildId);

      if (!userSocial.isMarried()) {
        return message.reply('**Notice:** Analysis indicates you are not bound to anyone, Master.');
      }

      const partnerId = userSocial.marriage.partnerId;
      const partner = await client.users.fetch(partnerId).catch(() => null);
      const partnerName = partner?.username || 'your partner';
      const marriageDays = userSocial.getMarriageDuration();

      const embed = new EmbedBuilder()
        .setColor('#FF4757')
        .setTitle('『 Bond Dissolution Protocol 』')
        .setDescription(`**Confirmation Required:**\n\nDo you wish to sever the bond with **${partnerName}**, Master?\n\n▸ **Duration:** ${marriageDays} days`)
        .setFooter({ text: 'Warning: This action is irreversible.' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`divorce_confirm_${odId}`)
            .setLabel('Confirm Dissolution')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`divorce_cancel_${odId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );

      const confirmMsg = await message.reply({ embeds: [embed], components: [row] });

      const filter = i => i.customId.startsWith('divorce_') && i.user.id === odId;

      const collector = confirmMsg.createMessageComponentCollector({
        filter,
        time: 30000,
        max: 1
      });

      collector.on('collect', async interaction => {
        if (interaction.customId.includes('confirm')) {
          // Process divorce
          const partnerSocial = await Social.getSocial(partnerId, guildId);

          userSocial.marriage = undefined;
          partnerSocial.marriage = undefined;

          await userSocial.save();
          await partnerSocial.save();

          const divorceEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('『 Bond Dissolved 』')
            .setDescription(`**Confirmed:** The bond between **${message.author.username}** and **${partnerName}** has been severed.\n\n▸ **Duration:** ${marriageDays} days`)
            .setFooter({ text: 'Acknowledged. May your paths diverge peacefully.' });

          await interaction.update({ embeds: [divorceEmbed], components: [] });

          // Notify partner if possible
          if (partner) {
            try {
              await partner.send({
                embeds: [new EmbedBuilder()
                  .setColor('#FF4757')
                  .setTitle('『 Notification 』')
                  .setDescription(`**Notice:** **${message.author.username}** has dissolved the bond in **${message.guild.name}**, Master.`)]
              });
            } catch (e) {
              // DMs disabled
            }
          }

        } else {
          const cancelEmbed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setTitle('『 Protocol Cancelled 』')
            .setDescription(`**Confirmed:** Bond with **${partnerName}** remains intact, Master.`);

          await interaction.update({ embeds: [cancelEmbed], components: [] });
        }
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          await confirmMsg.edit({ components: [] }).catch(() => { });
        }
      });

    } catch (error) {
      console.error('Divorce command error:', error);
      return message.reply('**Error:** An anomaly occurred during processing. Please try again, Master.');
    }
  }
};
