import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'ping',
    description: 'Check bot latency and response time',
    usage: '',
    aliases: ['latency', 'pong'],
    cooldown: 5,
    
    async execute(message, args, client) {
        const sent = await message.reply('🏓 Pinging...');
        
        const embed = await infoEmbed(message.guild.id, 
            `${GLYPHS.SPARKLE} Pong!`,
            null
        );
        
        const roundtrip = sent.createdTimestamp - message.createdTimestamp;
        const wsLatency = client.ws.ping;
        
        embed.addFields(
            {
                name: `${GLYPHS.ARROW_RIGHT} Roundtrip Latency`,
                value: `\`${roundtrip}ms\``,
                inline: true
            },
            {
                name: `${GLYPHS.ARROW_RIGHT} WebSocket Latency`,
                value: `\`${wsLatency}ms\``,
                inline: true
            }
        );
        
        // Status indicator
        let status = '🟢 Excellent';
        if (roundtrip > 200 || wsLatency > 200) status = '🟡 Good';
        if (roundtrip > 500 || wsLatency > 500) status = '🟠 Fair';
        if (roundtrip > 1000 || wsLatency > 1000) status = '🔴 Poor';
        
        embed.addFields({
            name: `${GLYPHS.ARROW_RIGHT} Status`,
            value: status,
            inline: true
        });
        
        await sent.edit({ content: null, embeds: [embed] });
    }
};
