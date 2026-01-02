import { infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { Raphael, getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'ping',
    description: 'Check bot latency and response time',
    usage: '',
    aliases: ['latency', 'pong', 'diagnostics'],
    cooldown: 5,
    
    async execute(message, args, client) {
        const sent = await message.reply('**Notice:** Initiating system diagnostics...');
        
        const embed = await infoEmbed(message.guild.id, 
            'System Diagnostics',
            null
        );
        
        const roundtrip = sent.createdTimestamp - message.createdTimestamp;
        const wsLatency = client.ws.ping;
        
        // Raphael-style status assessment
        let status = '◉ Optimal Performance';
        let statusColor = '#00FF7F';
        if (roundtrip > 200 || wsLatency > 200) {
            status = '◈ Acceptable Parameters';
            statusColor = '#FFD700';
        }
        if (roundtrip > 500 || wsLatency > 500) {
            status = '◇ Suboptimal Performance';
            statusColor = '#FF8C00';
        }
        if (roundtrip > 1000 || wsLatency > 1000) {
            status = '⚠ Critical Latency Detected';
            statusColor = '#FF4757';
        }
        
        embed.setDescription(`**Analysis complete.** All systems operational, Master.`);
        
        embed.addFields(
            {
                name: `▸ Response Latency`,
                value: `\`${roundtrip}ms\``,
                inline: true
            },
            {
                name: `▸ Connection Latency`,
                value: `\`${wsLatency}ms\``,
                inline: true
            },
            {
                name: `▸ System Status`,
                value: status,
                inline: true
            }
        );
        
        embed.setFooter({ text: getRandomFooter() });
        
        await sent.edit({ content: null, embeds: [embed] });
    }
};
