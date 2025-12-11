import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'seek',
    description: 'Seek to a specific time in the current song',
    usage: 'seek <time> (e.g., 1:30 or 90)',
    category: 'music',
    aliases: ['goto', 'jump'],
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
        
        if (!args[0]) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide a time to seek to! (e.g., `1:30` or `90`)')]
            });
        }
        
        // Parse time input (supports both "1:30" and "90" formats)
        let seekTime;
        const timeArg = args[0];
        
        if (timeArg.includes(':')) {
            // Format: MM:SS or HH:MM:SS
            const parts = timeArg.split(':').map(p => parseInt(p));
            if (parts.length === 2) {
                seekTime = (parts[0] * 60 + parts[1]) * 1000;
            } else if (parts.length === 3) {
                seekTime = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
            } else {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid time format! Use `MM:SS` or seconds.')]
                });
            }
        } else {
            // Format: seconds
            const seconds = parseInt(timeArg);
            if (isNaN(seconds)) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid time format! Use `MM:SS` or seconds.')]
                });
            }
            seekTime = seconds * 1000;
        }
        
        if (seekTime < 0 || seekTime > currentTrack.durationMS) {
            return message.reply({
                embeds: [await errorEmbed(guildId, `Seek time must be between 0 and ${Math.floor(currentTrack.durationMS / 1000)} seconds!`)]
            });
        }
        
        await queue.node.seek(seekTime);
        
        const minutes = Math.floor(seekTime / 60000);
        const seconds = Math.floor((seekTime % 60000) / 1000);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        message.reply({
            embeds: [await successEmbed(guildId, '⏩ Seeked', `Jumped to **${timeString}** in **${currentTrack.title}**`)]
        });
    }
};
