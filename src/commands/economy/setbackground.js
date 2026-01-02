import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import { getBackground } from '../../utils/shopItems.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'setbackground',
  description: 'Set your profile background',
  usage: 'setbackground <background_name/id>',
  category: 'economy',
  aliases: ['setbg', 'background', 'bg'],
  cooldown: 3,

  execute: async (message, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!args[0]) {
      const prefix = await getPrefix(guildId);
      return message.reply(`**Error:** Please specify a background. Use \`${prefix}inventory backgrounds\` to view owned backgrounds, Master.`);
    }

    try {
      const economy = await Economy.getEconomy(userId, guildId);

      const bgQuery = args.join(' ').toLowerCase();

      // Find background in inventory
      const ownedBg = economy.inventory.backgrounds.find(bg =>
        bg.id.toLowerCase() === bgQuery || bg.name.toLowerCase() === bgQuery
      );

      if (!ownedBg) {
        const prefix = await getPrefix(guildId);
        return message.reply(`**Error:** You do not own this background. Use \`${prefix}inventory backgrounds\` to view your collection or \`${prefix}shop\` to acquire new ones, Master.`);
      }

      // Get background data
      const bgData = getBackground(ownedBg.id);

      // Set background
      economy.profile.background = ownedBg.id;
      await economy.save();

      const embed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle('『 Background Updated 』')
        .setDescription(`**Confirmed:** Profile background set to **${ownedBg.name}**, Master.`)
        .setImage(bgData?.image || null)
        .setFooter({ text: 'Use !profile to preview changes.' })
        .setTimestamp();

      message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Set background command error:', error);
      message.reply('**Error:** An anomaly occurred while setting your background, Master.');
    }
  }
};
