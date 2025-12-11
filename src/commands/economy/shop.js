import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import Economy from '../../models/Economy.js';
import { BACKGROUNDS, RARITY_COLORS, RARITY_EMOJIS } from '../../utils/shopItems.js';

export default {
    name: 'shop',
    description: 'Browse and purchase profile backgrounds',
    usage: 'shop [category]',
    category: 'economy',
    aliases: ['store', 'buy'],
    cooldown: 3,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const economy = await Economy.getEconomy(userId, guildId);
            
            // Filter backgrounds
            const category = args[0]?.toLowerCase();
            let filteredBackgrounds = BACKGROUNDS;
            
            if (category && ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].includes(category)) {
                filteredBackgrounds = BACKGROUNDS.filter(bg => bg.rarity === category);
            }
            
            let currentPage = 0;
            const itemsPerPage = 1; // Show one item at a time for better visibility
            const maxPages = filteredBackgrounds.length;
            
            const generateEmbed = (page) => {
                const item = filteredBackgrounds[page];
                const owned = economy.inventory.backgrounds.some(bg => bg.id === item.id);
                const canAfford = economy.coins >= item.price;
                
                const embed = new EmbedBuilder()
                    .setColor(RARITY_COLORS[item.rarity] || '#5865F2')
                    .setTitle('🛍️ Background Shop')
                    .setDescription(`**${RARITY_EMOJIS[item.rarity]} ${item.name}**\n${item.description}`)
                    .addFields(
                        { name: '💎 Price', value: `**${item.price.toLocaleString()}** coins`, inline: true },
                        { name: '🎨 Rarity', value: item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1), inline: true },
                        { name: '💰 Your Balance', value: `**${economy.coins.toLocaleString()}** coins`, inline: true }
                    )
                    .setImage(item.image)
                    .setFooter({ text: `Page ${page + 1}/${maxPages} | ${owned ? '✅ Owned' : canAfford ? '💳 Can purchase' : '❌ Insufficient funds'}` })
                    .setTimestamp();
                
                if (owned) {
                    embed.addFields({ 
                        name: '✅ Status', 
                        value: 'You already own this background!', 
                        inline: false 
                    });
                }
                
                return embed;
            };
            
            const generateButtons = (page) => {
                const item = filteredBackgrounds[page];
                const owned = economy.inventory.backgrounds.some(bg => bg.id === item.id);
                const canAfford = economy.coins >= item.price;
                
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('previous')
                            .setLabel('◀️ Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next ▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === maxPages - 1),
                        new ButtonBuilder()
                            .setCustomId('cancel')
                            .setLabel('Close')
                            .setStyle(ButtonStyle.Danger)
                    );
                
                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('buy')
                            .setLabel(owned ? 'Already Owned' : `Purchase (${item.price.toLocaleString()} coins)`)
                            .setStyle(owned ? ButtonStyle.Secondary : canAfford ? ButtonStyle.Success : ButtonStyle.Danger)
                            .setDisabled(owned || !canAfford),
                        new ButtonBuilder()
                            .setCustomId('preview')
                            .setLabel('Preview')
                            .setStyle(ButtonStyle.Secondary)
                    );
                
                return [row1, row2];
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
                    } else if (interaction.customId === 'cancel') {
                        await interaction.update({
                            content: '🛍️ Thanks for browsing! Come back anytime.',
                            embeds: [],
                            components: []
                        });
                        collector.stop();
                    } else if (interaction.customId === 'buy') {
                        const item = filteredBackgrounds[currentPage];
                        
                        // Refresh economy data
                        const freshEconomy = await Economy.getEconomy(userId, guildId);
                        
                        // Check if already owned
                        if (freshEconomy.inventory.backgrounds.some(bg => bg.id === item.id)) {
                            await interaction.reply({
                                content: '❌ You already own this background!',
                                ephemeral: true
                            });
                            return;
                        }
                        
                        // Check if can afford
                        if (freshEconomy.coins < item.price) {
                            await interaction.reply({
                                content: `❌ You need **${(item.price - freshEconomy.coins).toLocaleString()}** more coins!`,
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
                            .setColor('#00FF00')
                            .setTitle('✅ Purchase Successful!')
                            .setDescription(`You purchased **${item.name}**!`)
                            .addFields(
                                { name: '💰 Spent', value: `${item.price.toLocaleString()} coins`, inline: true },
                                { name: '💵 Balance', value: `${freshEconomy.coins.toLocaleString()} coins`, inline: true }
                            )
                            .setFooter({ text: 'Use !setbg to apply this background to your profile' })
                            .setTimestamp();
                        
                        await interaction.update({
                            embeds: [successEmbed],
                            components: []
                        });
                        
                        collector.stop();
                    } else if (interaction.customId === 'preview') {
                        const item = filteredBackgrounds[currentPage];
                        
                        const previewEmbed = new EmbedBuilder()
                            .setColor(RARITY_COLORS[item.rarity])
                            .setTitle(`🔍 Preview: ${item.name}`)
                            .setDescription(item.description)
                            .setImage(item.image)
                            .setFooter({ text: 'This is how the background will look!' });
                        
                        await interaction.reply({
                            embeds: [previewEmbed],
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    console.error('Shop interaction error:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ An error occurred. Please try again!',
                            ephemeral: true
                        });
                    }
                }
            });
            
            collector.on('end', (collected, reason) => {
                // Only edit if not already handled
                if (reason === 'time') {
                    shopMessage.edit({ components: [] }).catch(() => {});
                }
            });
            
        } catch (error) {
            console.error('Shop command error:', error);
            message.reply('❌ An error occurred while loading the shop. Please try again!');
        }
    }
};
