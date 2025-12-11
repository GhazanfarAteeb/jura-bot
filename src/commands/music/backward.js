import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'backward',
    description: 'Rewind the current song',
    usage: 'backward <seconds>',
    category: 'music',
    aliases: ['rewind', 'rw', 'back'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Error', check.message)] });
        }
        
        const queue = check.queue;
        const currentTrack = queue.currentTrack;
        
        if (!currentTrack) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'There is no song currently playing!')]
            });
        }
        
        const seconds = parseInt(args[0]);
        if (!seconds || seconds < 1) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide a valid number of seconds to rewind!')]
            });
        }
        
        const currentTime = queue.node.getTimestamp().current.value;
        const newTime = Math.max(0, currentTime - (seconds * 1000));
        
        await queue.node.seek(newTime);
        
        message.reply({
            embeds: [await successEmbed(guildId, '⏪ Rewound', `Rewound **${seconds}** seconds`)]
        });
    }
};
