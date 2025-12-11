import { QueueRepeatMode } from 'discord-player';
import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'loop',
    description: 'Set loop mode for the queue',
    usage: 'loop [off/track/queue]',
    category: 'music',
    aliases: ['repeat', 'l'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Error', check.message)] });
        }
        
        const queue = check.queue;
        const mode = args[0]?.toLowerCase();
        
        // If no mode provided, show current mode
        if (!mode) {
            const currentMode = queue.repeatMode;
            let modeText;
            switch (currentMode) {
                case QueueRepeatMode.OFF:
                    modeText = 'Off';
                    break;
                case QueueRepeatMode.TRACK:
                    modeText = 'Track';
                    break;
                case QueueRepeatMode.QUEUE:
                    modeText = 'Queue';
                    break;
                case QueueRepeatMode.AUTOPLAY:
                    modeText = 'Autoplay';
                    break;
                default:
                    modeText = 'Off';
            }
            
            return message.reply({
                embeds: [await successEmbed(guildId, '🔁 Loop Mode', `Current loop mode: **${modeText}**\n\nAvailable modes:\n\`off\` - No loop\n\`track\` - Loop current track\n\`queue\` - Loop entire queue`)]
            });
        }
        
        let newMode;
        let modeEmoji;
        let modeText;
        
        switch (mode) {
            case 'off':
            case 'disable':
            case '0':
                newMode = QueueRepeatMode.OFF;
                modeEmoji = '▶️';
                modeText = 'Off';
                break;
            case 'track':
            case 'song':
            case 'current':
            case '1':
                newMode = QueueRepeatMode.TRACK;
                modeEmoji = '🔂';
                modeText = 'Track';
                break;
            case 'queue':
            case 'all':
            case '2':
                newMode = QueueRepeatMode.QUEUE;
                modeEmoji = '🔁';
                modeText = 'Queue';
                break;
            case 'autoplay':
            case '3':
                newMode = QueueRepeatMode.AUTOPLAY;
                modeEmoji = '🔀';
                modeText = 'Autoplay';
                break;
            default:
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid loop mode! Use: `off`, `track`, or `queue`')]
                });
        }
        
        queue.setRepeatMode(newMode);
        
        message.reply({
            embeds: [await successEmbed(guildId, `${modeEmoji} Loop Mode Changed`, `Loop mode set to: **${modeText}**`)]
        });
    }
};
