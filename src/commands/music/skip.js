import { players } from '../../utils/shoukaku.js';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'skip',
    aliases: ['s', 'next'],
    description: 'Skip the current song',
    usage: 'skip',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in voice channel
        const voiceCheck = checkVoiceChannel(message);
        if (voiceCheck.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Voice Channel Error', voiceCheck.message)] });
        }
        
        const playerData = players.get(guildId);
        
        if (!playerData || !playerData.nowPlaying) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Not Playing', 'There is no song currently playing!')]
            });
        }
        
        const currentTrack = playerData.nowPlaying.info.title;
        
        // Stop current track - will trigger 'end' event which plays next
        playerData.player.stopTrack();
        
        message.reply({
            embeds: [await successEmbed(guildId, '⏭️ Skipped!', `Skipped **${currentTrack}**`)]
        });
    }
};
