import { players } from '../../utils/shoukaku.js';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'pause',
    description: 'Pause the current song',
    usage: 'pause',
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
        
        if (playerData.player.paused) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Already Paused', 'The music is already paused!')]
            });
        }
        
        playerData.player.setPaused(true);
        
        message.reply({
            embeds: [await successEmbed(guildId, '⏸️ Paused', 'Music has been paused. Use `R!resume` to continue.')]
        });
    }
};
