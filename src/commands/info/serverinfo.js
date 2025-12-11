import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'serverinfo',
    description: 'Get information about the server',
    usage: '',
    aliases: ['server', 'guild', 'guildinfo'],
    cooldown: 5,
    
    async execute(message) {
        const guild = message.guild;
        
        const embed = await infoEmbed(guild.id, `Server Info: ${guild.name}`, null);
        
        // Basic info
        embed.addFields({
            name: `${GLYPHS.ARROW_RIGHT} Basic Information`,
            value:
                `**Name:** ${guild.name}\n` +
                `**ID:** \`${guild.id}\`\n` +
                `**Owner:** <@${guild.ownerId}>\n` +
                `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
            inline: false
        });
        
        // Statistics
        const stats = await guild.members.fetch();
        const botCount = stats.filter(m => m.user.bot).size;
        const humanCount = stats.size - botCount;
        
        embed.addFields({
            name: `${GLYPHS.ARROW_RIGHT} Statistics`,
            value:
                `**Members:** ${guild.memberCount}\n` +
                `${GLYPHS.DOT} Humans: ${humanCount}\n` +
                `${GLYPHS.DOT} Bots: ${botCount}\n` +
                `**Roles:** ${guild.roles.cache.size}\n` +
                `**Channels:** ${guild.channels.cache.size}\n` +
                `${GLYPHS.DOT} Text: ${guild.channels.cache.filter(c => c.type === 0).size}\n` +
                `${GLYPHS.DOT} Voice: ${guild.channels.cache.filter(c => c.type === 2).size}\n` +
                `**Emojis:** ${guild.emojis.cache.size}`,
            inline: false
        });
        
        // Server features
        const features = guild.features.map(f => 
            f.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
        ).slice(0, 10);
        
        if (features.length > 0) {
            embed.addFields({
                name: `${GLYPHS.ARROW_RIGHT} Features`,
                value: features.map(f => `${GLYPHS.DOT} ${f}`).join('\n'),
                inline: false
            });
        }
        
        // Boost info
        if (guild.premiumTier > 0) {
            embed.addFields({
                name: `${GLYPHS.SPARKLE} Boost Status`,
                value:
                    `**Tier:** ${guild.premiumTier}\n` +
                    `**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
                inline: false
            });
        }
        
        if (guild.icon) {
            embed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
        }
        
        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }
        
        return message.reply({ embeds: [embed] });
    }
};
