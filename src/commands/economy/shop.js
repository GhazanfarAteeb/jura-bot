import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
  name: 'shop',
  description: 'Access the acquisition catalog for profile customizations, Master',
  usage: 'shop [category]',
  category: 'economy',
  aliases: ['store', 'buy'],
  cooldown: 3,

  execute: async (message, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;

    try {
      const economy = await Economy.getEconomy(userId, guildId);
      const guildConfig = await Guild.getGuild(guildId);

      // Get custom coin settings
      const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
      const coinName = guildConfig.economy?.coinName || 'coins';

      // Get custom shop backgrounds only (exclude default)
      const customBackgrounds = (guildConfig.customShopItems || []).filter(item => item.type === 'background');
      let allBackgrounds = customBackgrounds.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || 'A custom background',
        price: item.price,
        image: item.image || '',
        color: item.color || '#2C2F33'
      }));

      // Check if shop is empty
      if (allBackgrounds.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#FF4757')
          .setTitle('『 Acquisition Module 』')
          .setDescription('**Notice:** The inventory is currently vacant, Master.\n\nRequest an administrator to add items using the `manageshop` command.')
          .setFooter({ text: getRandomFooter() });

        return message.reply({ embeds: [embed] });
      }

      // Filter backgrounds by category if provided
      const category = args[0]?.toLowerCase();
      let filteredBackgrounds = allBackgrounds;

      let currentPage = 0;
      const itemsPerPage = 1; // Show one item at a time for better visibility
      const maxPages = filteredBackgrounds.length;

      const generateEmbed = (page) => {
        const item = filteredBackgrounds[page];
        const owned = economy.inventory.backgrounds.some(bg => bg.id === item.id);
        const canAfford = economy.coins >= item.price;

        const embed = new EmbedBuilder()
          .setColor('#00CED1')
          .setTitle('『 Acquisition Module 』')
          .setDescription(`**${item.name}**\n${item.description || 'A custom visual template'}`)
          .addFields(
            { name: '▸ Value', value: `**${item.price.toLocaleString()}** ${coinEmoji}`, inline: true },
            { name: `▸ Balance`, value: `**${economy.coins.toLocaleString()}**`, inline: true },
            { name: '▸ Status', value: owned ? '◉ Acquired' : canAfford ? '◈ Available' : '○ Insufficient Resources', inline: true }
          )
          .setImage(item.image)
          .setFooter({ text: `${getRandomFooter()} | Item ${page + 1} of ${maxPages}` })
          .setTimestamp();

        return embed;
      };

      const generateButtons = (page) => {
        const item = filteredBackgrounds[page];
        const owned = economy.inventory.backgrounds.some(bg => bg.id === item.id);
        const canAfford = economy.coins >= item.price;

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('previous')
              .setLabel('◀ Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId('buy')
              .setLabel(owned ? '◉ Acquired' : `Acquire (${item.price.toLocaleString()})`)
              .setStyle(owned ? ButtonStyle.Secondary : canAfford ? ButtonStyle.Success : ButtonStyle.Danger)
              .setDisabled(owned || !canAfford),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === maxPages - 1)
          );

        return [row];
      };

      const embed = generateEmbed(currentPage);
      const buttons = generateButtons(currentPage);

      const shopMessage = await message.reply({
        embeds: [embed],
        components: buttons
      });

      // Create collector that doesn't timeout until purchase or cancel
      const collector = shopMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === message.author.id
      });

      collector.on('collect', async (interaction) => {
        try {
          if (interaction.customId === 'previous') {
            currentPage = Math.max(0, currentPage - 1);
            await interaction.update({
              embeds: [generateEmbed(currentPage)],
              components: generateButtons(currentPage)
            });
          } else if (interaction.customId === 'next') {
            currentPage = Math.min(maxPages - 1, currentPage + 1);
            await interaction.update({
              embeds: [generateEmbed(currentPage)],
              components: generateButtons(currentPage)
            });
          } else if (interaction.customId === 'buy') {
            const item = filteredBackgrounds[currentPage];

            // Refresh economy data
            const freshEconomy = await Economy.getEconomy(userId, guildId);

            // Check if already owned
            if (freshEconomy.inventory.backgrounds.some(bg => bg.id === item.id)) {
              await interaction.reply({
                content: '**Notice:** This item is already in your inventory, Master.',
                ephemeral: true
              });
              return;
            }

            // Check if can afford
            if (freshEconomy.coins < item.price) {
              await interaction.reply({
                content: `**Warning:** You require **${(item.price - freshEconomy.coins).toLocaleString()}** additional coins, Master.`,
                ephemeral: true
              });
              return;
            }

            // Purchase background
            await freshEconomy.removeCoins(item.price, `Purchased background: ${item.name}`);
            freshEconomy.inventory.backgrounds.push({
              id: item.id,
              name: item.name,
              purchasedAt: new Date()
            });
            await freshEconomy.save();

            const successEmbed = new EmbedBuilder()
              .setColor('#00FF7F')
              .setTitle('『 Acquisition Complete 』')
              .setDescription(`**Confirmed:** **${item.name}** has been added to your inventory, Master.`)
              .addFields(
                { name: `▸ Expended`, value: `${item.price.toLocaleString()} ${coinName}`, inline: true },
                { name: '▸ Remaining', value: `${freshEconomy.coins.toLocaleString()} ${coinName}`, inline: true }
              )
              .setFooter({ text: `${getRandomFooter()} | Use !setbg to apply` })
              .setTimestamp();

            await interaction.update({
              embeds: [successEmbed],
              components: []
            });

            collector.stop();
          }
        } catch (error) {
          console.error('Shop interaction error:', error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: '**Warning:** An error occurred during processing, Master. Please retry.',
              ephemeral: true
            });
          }
        }
      });

      collector.on('end', (collected, reason) => {
        // Only edit if not already handled
        if (reason === 'time') {
          shopMessage.edit({ components: [] }).catch(() => { });
        }
      });

    } catch (error) {
      console.error('Shop command error:', error);
      message.reply('**Warning:** An error occurred while loading the acquisition module, Master. Please retry.');
    }
  }
};
