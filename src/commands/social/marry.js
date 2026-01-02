import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Social from '../../models/Social.js';
import { getPrefix } from '../../utils/helpers.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
  name: 'marry',
  description: 'Propose marriage to another user',
  usage: '<@user>',
  aliases: ['propose', 'wedding'],
  category: 'social',
  cooldown: 30,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const userId = message.author.id;
    const prefix = await getPrefix(guildId);

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.reply(`**Notice:** Please specify a subject for your proposal, Master.\n\nSyntax: \`${prefix}marry @user\``);
    }

    if (targetUser.id === userId) {
      return message.reply('**Warning:** Self-bonding is not a valid operation, Master.');
    }

    if (targetUser.bot) {
      return message.reply('**Warning:** Automated systems cannot participate in bonding rituals, Master.');
    }

    try {
      const userSocial = await Social.getSocial(userId, guildId);
      const targetSocial = await Social.getSocial(targetUser.id, guildId);

      // Check if already married
      if (userSocial.isMarried()) {
        const partner = await client.users.fetch(userSocial.marriage.partnerId).catch(() => null);
        return message.reply(`**Notice:** You are already bonded to **${partner?.username || 'someone'}**, Master. Use \`${prefix}divorce\` to dissolve the union first.`);
      }

      if (targetSocial.isMarried()) {
        const partner = await client.users.fetch(targetSocial.marriage.partnerId).catch(() => null);
        return message.reply(`**Notice:** **${targetUser.username}** is already bonded to **${partner?.username || 'someone'}**, Master.`);
      }

      // Check for existing proposal
      const existingProposal = targetSocial.pendingProposals.find(p => p.odId === odId);
      if (existingProposal) {
        return message.reply(`**Notice:** You already have a pending proposal to **${targetUser.username}**, Master.`);
      }

      // Create proposal embed
      const embed = new EmbedBuilder()
        .setColor('#00CED1')
        .setTitle('『 Bonding Proposal 』')
        .setDescription(`**${message.author.username}** is requesting a permanent bond with **${targetUser.username}**.\n\n${targetUser}, do you accept this proposal?`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `${getRandomFooter()} | Expires in 60 seconds` });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`marry_accept_${userId}_${targetUser.id}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`marry_reject_${userId}_${targetUser.id}`)
            .setLabel('Reject')
            .setStyle(ButtonStyle.Danger)
        );

      const proposalMsg = await message.reply({
        content: `${targetUser}`,
        embeds: [embed],
        components: [row]
      });

      // Add pending proposal
      targetSocial.pendingProposals.push({
        odId: odId,
        timestamp: new Date(),
        message: proposalMsg.id
      });
      await targetSocial.save();

      // Create button collector
      const filter = i => {
        return i.customId.startsWith('marry_') &&
          (i.user.id === targetUser.id || i.user.id === userId);
      };

      const collector = proposalMsg.createMessageComponentCollector({
        filter,
        time: 60000,
        max: 1
      });

      collector.on('collect', async interaction => {
        // Remove pending proposal
        targetSocial.pendingProposals = targetSocial.pendingProposals.filter(
          p => p.odId !== odId
        );
        await targetSocial.save();

        if (interaction.user.id !== targetUser.id) {
          return interaction.reply({
            content: '❌ Only the person being proposed to can respond!',
            ephemeral: true
          });
        }

        if (interaction.customId.includes('accept')) {
          // Marry them!
          const now = new Date();

          userSocial.marriage = {
            partnerId: targetUser.id,
            marriedAt: now,
            proposedBy: userId
          };

          targetSocial.marriage = {
            partnerId: odId,
            marriedAt: now,
            proposedBy: userId
          };

          // Add first marriage badge
          await userSocial.addBadge(Social.BADGES.FIRST_MARRIAGE);
          await targetSocial.addBadge(Social.BADGES.FIRST_MARRIAGE);

          await userSocial.save();
          await targetSocial.save();

          const weddingEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎊 Congratulations! 🎊')
            .setDescription(`**${message.author.username}** 💍 **${targetUser.username}**\n\nThey are now married! Wishing you a lifetime of happiness! 💕`)
            .setImage('https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif')
            .setFooter({ text: `Married on ${now.toLocaleDateString()}` });

          await interaction.update({ embeds: [weddingEmbed], components: [] });

        } else {
          // Rejected
          const rejectEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('💔 Proposal Rejected')
            .setDescription(`**${targetUser.username}** has rejected **${message.author.username}**'s proposal.`)
            .setFooter({ text: 'Better luck next time!' });

          await interaction.update({ embeds: [rejectEmbed], components: [] });
        }
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          // Remove pending proposal
          targetSocial.pendingProposals = targetSocial.pendingProposals.filter(
            p => p.odId !== odId
          );
          await targetSocial.save();

          const expiredEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('⏰ Proposal Expired')
            .setDescription(`The proposal from **${message.author.username}** to **${targetUser.username}** has expired.`);

          await proposalMsg.edit({ embeds: [expiredEmbed], components: [] }).catch(() => { });
        }
      });

    } catch (error) {
      console.error('Marry command error:', error);
      return message.reply('❌ An error occurred while processing the proposal.');
    }
  }
};
