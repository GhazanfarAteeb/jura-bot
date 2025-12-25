import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'avatar',
    aliases: ['av', 'pfp', 'icon'],
    description: 'Get a user\'s avatar in full size',
    usage: 'avatar [@user]',
    category: 'utility',
    cooldown: 3,
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        
        // Get target user
        const user = message.mentions.users.first() 
            || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null)
            || message.author;
        
        const member = message.guild.members.cache.get(user.id);
        
        // Get avatar URLs in different formats
        const globalAvatar = user.displayAvatarURL({ extension: 'png', size: 4096 });
        const serverAvatar = member?.displayAvatarURL({ extension: 'png', size: 4096 });
        
        const hasServerAvatar = serverAvatar && serverAvatar !== globalAvatar;
        
        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Avatar`)
            .setColor('#5865F2')
            .setImage(globalAvatar)
            .setTimestamp();
        
        // Format links for different sizes
        const sizes = [128, 256, 512, 1024, 4096];
        const formatLinks = (url) => {
            return sizes.map(size => {
                const sizedUrl = url.replace(/size=\d+/, `size=${size}`);
                return `[${size}](${sizedUrl})`;
            }).join(' • ');
        };
        
        embed.addFields({
            name: '🖼️ Global Avatar',
            value: formatLinks(globalAvatar),
            inline: false
        });
        
        if (hasServerAvatar) {
            embed.addFields({
                name: '🏠 Server Avatar',
                value: formatLinks(serverAvatar),
                inline: false
            });
        }
        
        // Create buttons for quick access
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Global Avatar')
                .setStyle(ButtonStyle.Link)
                .setURL(globalAvatar)
                .setEmoji('🌐')
        );
        
        if (hasServerAvatar) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Server Avatar')
                    .setStyle(ButtonStyle.Link)
                    .setURL(serverAvatar)
                    .setEmoji('🏠')
            );
        }
        
        // Add animated versions if available
        if (user.avatar?.startsWith('a_')) {
            const gifUrl = user.displayAvatarURL({ extension: 'gif', size: 4096 });
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('GIF Version')
                    .setStyle(ButtonStyle.Link)
                    .setURL(gifUrl)
                    .setEmoji('🎞️')
            );
        }
        
        message.reply({ embeds: [embed], components: [row] });
    }
};
