import { infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'serverinfo',
    description: 'Get information about the server',
    usage: '',
    aliases: ['server', 'guild', 'guildinfo'],
    cooldown: 5,
    
    async execute(message) {
        const guild = message.guild;
        
        const embed = await infoEmbed(guild.id, `Server Analysis`, 
            `**Report:** Comprehensive data compiled for **${guild.name}**, Master.`
        );
        
        // Basic info
        embed.addFields({
            name: `▸ Core Data`,
            value:
                `**Designation:** ${guild.name}\n` +
                `**Identifier:** \`${guild.id}\`\n` +
                `**Administrator:** <@${guild.ownerId}>\n` +
                `**Established:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
            inline: false
        });
        
        // Statistics
        const stats = await guild.members.fetch();
        const botCount = stats.filter(m => m.user.bot).size;
        const humanCount = stats.size - botCount;
        
        embed.addFields({
            name: `▸ Population Metrics`,
            value:
                `**Total Entities:** ${guild.memberCount}\n` +
                `◇ Organic Users: ${humanCount}\n` +
                `◇ Automated Systems: ${botCount}\n` +
                `**Authority Levels:** ${guild.roles.cache.size}\n` +
                `**Communication Channels:** ${guild.channels.cache.size}\n` +
                `◇ Text: ${guild.channels.cache.filter(c => c.type === 0).size}\n` +
                `◇ Voice: ${guild.channels.cache.filter(c => c.type === 2).size}\n` +
                `**Custom Expressions:** ${guild.emojis.cache.size}`,
            inline: false
        });
        
        // Server features
        const features = guild.features.map(f => 
            f.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
        ).slice(0, 10);
        
        if (features.length > 0) {
            embed.addFields({
                name: `▸ Enabled Capabilities`,
                value: features.map(f => `◇ ${f}`).join('\n'),
                inline: false
            });
        }
        
        // Boost info
        if (guild.premiumTier > 0) {
            embed.addFields({
                name: `▸ Enhancement Status`,
                value:
                    `**Tier Classification:** ${guild.premiumTier}\n` +
                    `**Active Enhancements:** ${guild.premiumSubscriptionCount || 0}`,
                inline: false
            });
        }
        
        if (guild.icon) {
            embed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
        }
        
        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }
        
        embed.setFooter({ text: getRandomFooter() });
        
        return message.reply({ embeds: [embed] });
    }
};
