import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Social from '../../models/Social.js';

export default {
  name: 'divorce',
  description: 'Divorce your partner',
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
        return message.reply('💔 You are not married to anyone!');
      }

      const partnerId = userSocial.marriage.partnerId;
      const partner = await client.users.fetch(partnerId).catch(() => null);
      const partnerName = partner?.username || 'your partner';
      const marriageDays = userSocial.getMarriageDuration();

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💔 Divorce Confirmation')
        .setDescription(`Are you sure you want to divorce **${partnerName}**?\n\nYou have been married for **${marriageDays} days**.`)
        .setFooter({ text: 'This action cannot be undone!' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`divorce_confirm_${odId}`)
            .setLabel('Yes, Divorce')
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
            .setTitle('💔 Divorced')
            .setDescription(`**${message.author.username}** and **${partnerName}** are no longer married.\n\nThe marriage lasted **${marriageDays} days**.`)
            .setFooter({ text: 'We wish you both the best.' });

          await interaction.update({ embeds: [divorceEmbed], components: [] });

          // Notify partner if possible
          if (partner) {
            try {
              await partner.send({
                embeds: [new EmbedBuilder()
                  .setColor('#FF0000')
                  .setTitle('💔 Divorce Notice')
                  .setDescription(`**${message.author.username}** has divorced you in **${message.guild.name}**.`)]
              });
            } catch (e) {
              // DMs disabled
            }
          }

        } else {
          const cancelEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💕 Divorce Cancelled')
            .setDescription(`You decided to stay with **${partnerName}**!`);

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
      return message.reply('❌ An error occurred while processing the divorce.');
    }
  }
};
