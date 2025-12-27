import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import Economy from '../../models/Economy.js';
import { getBackground } from '../../utils/shopItems.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'inventory',
    description: 'View your purchased items',
    usage: 'inventory [backgrounds/badges/items]',
    category: 'economy',
    aliases: ['inv', 'bag', 'items'],
    cooldown: 3,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const economy = await Economy.getEconomy(userId, guildId);
            
            const category = args[0]?.toLowerCase() || 'backgrounds';
            
            if (category === 'backgrounds' || category === 'bg') {
                if (economy.inventory.backgrounds.length === 0) {
                    const prefix = await getPrefix(guildId);
                    return message.reply(`📦 You don't have any backgrounds yet! Check out \`${prefix}shop\` to purchase some.`);
                }
                
                let currentPage = 0;
                const itemsPerPage = 5;
                const maxPages = Math.ceil(economy.inventory.backgrounds.length / itemsPerPage);
                
                const generateEmbed = (page) => {
                    const start = page * itemsPerPage;
                    const end = start + itemsPerPage;
                    const pageItems = economy.inventory.backgrounds.slice(start, end);
                    
                    const embed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setAuthor({ 
                            name: `${message.author.tag}'s Inventory`, 
                            iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                        })
                        .setTitle('🎨 Backgrounds')
                        .setDescription(
                            pageItems.map((bg, index) => {
                                const bgData = getBackground(bg.id);
                                const isEquipped = economy.profile.background === bg.id;
                                const equippedText = isEquipped ? ' **[EQUIPPED]**' : '';
                                return `${start + index + 1}. 🎨 **${bg.name}**${equippedText}\nPurchased: <t:${Math.floor(bg.purchasedAt.getTime() / 1000)}:R>`;
                            }).join('\n\n')
                        )
                        .setFooter({ 
                            text: `Page ${page + 1}/${maxPages} | Total: ${economy.inventory.backgrounds.length} backgrounds | Use !setbg to equip` 
                        })
                        .setTimestamp();
                    
                    return embed;
                };
                
                const generateButtons = (page) => {
                    return new ActionRowBuilder()
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
                                .setCustomId('close')
                                .setLabel('Close')
                                .setStyle(ButtonStyle.Danger)
                        );
                };
                
                const embed = generateEmbed(currentPage);
                const buttons = generateButtons(currentPage);
                
                const invMessage = await message.reply({ 
                    embeds: [embed], 
                    components: [buttons] 
                });
                
                const collector = invMessage.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter: (i) => i.user.id === message.author.id,
                    time: 120000
                });
                
                collector.on('collect', async (interaction) => {
                    if (interaction.customId === 'previous') {
                        currentPage = Math.max(0, currentPage - 1);
                        await interaction.update({
                            embeds: [generateEmbed(currentPage)],
                            components: [generateButtons(currentPage)]
                        });
                    } else if (interaction.customId === 'next') {
                        currentPage = Math.min(maxPages - 1, currentPage + 1);
                        await interaction.update({
                            embeds: [generateEmbed(currentPage)],
                            components: [generateButtons(currentPage)]
                        });
                    } else if (interaction.customId === 'close') {
                        await interaction.update({
                            components: []
                        });
                        collector.stop();
                    }
                });
                
                collector.on('end', () => {
                    invMessage.edit({ components: [] }).catch(() => {});
                });
                
            } else if (category === 'badges') {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setAuthor({ 
                        name: `${message.author.tag}'s Inventory`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTitle('🏅 Badges')
                    .setDescription(
                        economy.inventory.badges.length > 0
                            ? economy.inventory.badges.map((badge, i) => 
                                `${i + 1}. 🏅 **${badge.name}**\nEarned: <t:${Math.floor(badge.earnedAt.getTime() / 1000)}:R>`
                              ).join('\n\n')
                            : 'No badges earned yet! Complete achievements to earn badges.'
                    )
                    .setFooter({ text: `Total: ${economy.inventory.badges.length} badges` })
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
                
            } else if (category === 'items') {
                const embed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setAuthor({ 
                        name: `${message.author.tag}'s Inventory`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTitle('📦 Items')
                    .setDescription(
                        economy.inventory.items.length > 0
                            ? economy.inventory.items.map((item, i) => 
                                `${i + 1}. **${item.name}** x${item.quantity}\nPurchased: <t:${Math.floor(item.purchasedAt.getTime() / 1000)}:R>`
                              ).join('\n\n')
                            : 'No items yet!'
                    )
                    .setFooter({ text: `Total: ${economy.inventory.items.length} item types` })
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
                
            } else {
                message.reply('❌ Invalid category! Use: `backgrounds`, `badges`, or `items`');
            }
            
        } catch (error) {
            console.error('Inventory command error:', error);
            message.reply('❌ An error occurred while loading your inventory. Please try again!');
        }
    }
};
