import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'banner',
    aliases: ['userbanner', 'profilebanner'],
    description: 'Get a user\'s profile banner in full size',
    usage: 'banner [@user]',
    category: 'utility',
    cooldown: 3,
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        
        // Get target user - need to force fetch for banner
        let userId = message.mentions.users.first()?.id || args[0] || message.author.id;
        
        try {
            // Force fetch user to get banner
            const user = await client.users.fetch(userId, { force: true });
            
            if (!user.banner) {
                // Check if user has accent color instead
                if (user.accentColor) {
                    const hexColor = user.hexAccentColor || `#${user.accentColor.toString(16).padStart(6, '0')}`;
                    const embed = new EmbedBuilder()
                        .setTitle(`${user.username}'s Profile`)
                        .setDescription(`This user doesn't have a banner, but has a profile color: **${hexColor}**`)
                        .setColor(user.accentColor)
                        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({
                    embeds: [await errorEmbed(guildId, `**${user.username}** doesn't have a profile banner.`)]
                });
            }
            
            // Get banner URL
            const bannerUrl = user.bannerURL({ extension: 'png', size: 4096 });
            
            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Banner`)
                .setColor(user.accentColor || '#5865F2')
                .setImage(bannerUrl)
                .setTimestamp();
            
            // Format links for different sizes
            const sizes = [256, 512, 1024, 2048, 4096];
            const formatLinks = sizes.map(size => {
                const sizedUrl = bannerUrl.replace(/size=\d+/, `size=${size}`);
                return `[${size}](${sizedUrl})`;
            }).join(' • ');
            
            embed.addFields({
                name: '📐 Sizes',
                value: formatLinks,
                inline: false
            });
            
            // Create button for quick access
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Open Banner')
                    .setStyle(ButtonStyle.Link)
                    .setURL(bannerUrl)
                    .setEmoji('🖼️')
            );
            
            // Add GIF version if animated
            if (user.banner?.startsWith('a_')) {
                const gifUrl = user.bannerURL({ extension: 'gif', size: 4096 });
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel('GIF Version')
                        .setStyle(ButtonStyle.Link)
                        .setURL(gifUrl)
                        .setEmoji('🎞️')
                );
            }
            
            message.reply({ embeds: [embed], components: [row] });
            
        } catch (error) {
            console.error('Banner fetch error:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to fetch user banner. Please try again.')]
            });
        }
    }
};
