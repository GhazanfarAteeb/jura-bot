import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'volume',
    aliases: ['vol', 'v'],
    description: 'Change the music volume',
    usage: 'volume <0-200>',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        
        // Show current volume if no argument
        if (!args[0]) {
            return message.reply({
                embeds: [await successEmbed(guildId, '🔊 Current Volume', `Volume is set to **${queue.node.volume}%**`)]
            });
        }
        
        const volume = parseInt(args[0]);
        
        if (isNaN(volume) || volume < 0 || volume > 200) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide a valid volume number between 0 and 200!')]
            });
        }
        
        queue.node.setVolume(volume);
        
        const emoji = volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊';
        
        message.reply({
            embeds: [await successEmbed(guildId, `${emoji} Volume Changed`, `Volume set to **${volume}%**`)]
        });
    }
};
