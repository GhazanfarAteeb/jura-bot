import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'swap',
    description: 'Swap two songs in the queue',
    usage: 'swap <position1> <position2>',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Error', check.message)] });
        }
        
        const queue = check.queue;
        
        if (queue.tracks.data.length < 2) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Need at least 2 songs in the queue to swap!')]
            });
        }
        
        const pos1 = parseInt(args[0]);
        const pos2 = parseInt(args[1]);
        
        if (!pos1 || !pos2) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide both positions! Example: `!swap 1 3`')]
            });
        }
        
        if (pos1 < 1 || pos1 > queue.tracks.data.length || pos2 < 1 || pos2 > queue.tracks.data.length) {
            return message.reply({
                embeds: [await errorEmbed(guildId, `Both positions must be between 1 and ${queue.tracks.data.length}!`)]
            });
        }
        
        if (pos1 === pos2) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Cannot swap a song with itself!')]
            });
        }
        
        const track1 = queue.tracks.data[pos1 - 1];
        const track2 = queue.tracks.data[pos2 - 1];
        
        // Swap using discord-player methods
        queue.node.remove(track1);
        queue.node.insert(track2, pos1 - 1);
        queue.node.remove(track2);
        queue.node.insert(track1, pos2 - 1);
        
        message.reply({
            embeds: [await successEmbed(guildId, '🔄 Songs Swapped', `Swapped:\n**${pos1}.** ${track1.title}\n**${pos2}.** ${track2.title}`)]
        });
    }
};
