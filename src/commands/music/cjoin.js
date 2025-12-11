import { getQueue, checkVoiceChannel, checkSameVoiceChannel } from '../../utils/customMusicPlayer.js';

export default {
    name: 'cjoin',
    description: 'Make the bot join your voice channel (custom player)',
    category: 'music',
    aliases: ['cconnect'],
    
    async execute(message) {
        try {
            // Check if user is in voice channel
            const voiceCheck = checkVoiceChannel(message);
            if (voiceCheck.error) {
                return message.reply(voiceCheck.message);
            }
            
            // Check if bot is in same voice channel
            const sameChannelCheck = checkSameVoiceChannel(message);
            if (sameChannelCheck.error) {
                return message.reply(sameChannelCheck.message);
            }
            
            const voiceChannel = message.member.voice.channel;
            const queue = getQueue(message.guild.id);
            
            // Check if already connected
            if (queue.connection) {
                return message.reply(`✅ Already connected to ${voiceChannel.name}!`);
            }
            
            await message.reply('🔌 Connecting to voice channel...');
            
            try {
                await queue.connect(voiceChannel);
                return message.channel.send(`✅ Successfully joined **${voiceChannel.name}**!`);
            } catch (error) {
                console.error('Failed to join voice channel:', error);
                return message.channel.send(`❌ Failed to join voice channel: ${error.message}`);
            }
            
        } catch (error) {
            console.error('❌ Error in cjoin command:', error);
            return message.reply('❌ An error occurred while trying to join the voice channel.');
        }
    }
};
