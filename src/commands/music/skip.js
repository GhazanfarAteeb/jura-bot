import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'skip',
    aliases: ['s', 'next'],
    description: 'Skip the current song',
    usage: 'skip',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        const currentTrack = queue.currentTrack;
        
        if (!currentTrack) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'There is no song currently playing!')]
            });
        }
        
        // Skip the song
        queue.node.skip();
        
        message.reply({
            embeds: [await successEmbed(guildId, '⏭️ Skipped!', `Skipped **${currentTrack.title}**`)]
        });
    }
};
