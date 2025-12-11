import { getQueue, checkBotInVoice, checkSameVoiceChannel } from '../../utils/customMusicPlayer.js';

export default {
    name: 'cpause',
    description: 'Pause the current song',
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
        queue.pause();
        
        return message.reply('⏸️ Paused the music!');
    }
};
