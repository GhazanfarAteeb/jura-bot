import { getQueue, checkBotInVoice, checkSameVoiceChannel } from '../../utils/customMusicPlayer.js';

export default {
    name: 'cskip',
    description: 'Skip the current song',
    category: 'music',
    
    async execute(message) {
        const botCheck = checkBotInVoice(message);
        if (botCheck.error) {
            return message.reply(botCheck.message);
        }
        
        const sameCheck = checkSameVoiceChannel(message);
        if (sameCheck.error) {
            return message.reply(sameCheck.message);
        }
        
        const queue = getQueue(message.guild.id);
        
        if (!queue.currentSong) {
            return message.reply('❌ Nothing is playing!');
        }
        
        queue.skip();
        
        return message.reply('⏭️ Skipped the song!');
    }
};
