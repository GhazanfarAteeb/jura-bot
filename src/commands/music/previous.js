import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'previous',
    description: 'Play the previous song',
    usage: 'previous',
    category: 'music',
    aliases: ['prev', 'back'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        const history = queue.history;
        
        if (history.tracks.data.length === 0) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'There are no previous songs in the history!')]
            });
        }
        
        await queue.history.previous();
        
        const previousTrack = queue.currentTrack;
        
        message.reply({
            embeds: [await successEmbed(guildId, '⏮️ Playing Previous', `Now playing: **${previousTrack.title}** by **${previousTrack.author}**`)]
        });
    }
};
