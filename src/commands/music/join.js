import { player, checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'join',
    aliases: ['connect'],
    description: 'Make the bot join your voice channel',
    usage: 'join',
    category: 'music',
    cooldown: 3,
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in voice channel
        const voiceCheck = checkVoiceChannel(message);
        if (voiceCheck.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Voice Channel Error', voiceCheck.message)] });
        }
        
        const channel = message.member.voice.channel;
        
        // Check if bot is already in a voice channel
        const queue = player.nodes.get(message.guild.id);
        if (queue && queue.connection) {
            if (queue.connection.channel.id === channel.id) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Already Connected', `I'm already in **${channel.name}**!`)]
                });
            } else {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Already Connected', `I'm already in **${queue.connection.channel.name}**! Use \`disconnect\` first.`)]
                });
            }
        }
        
        try {
            // Create a queue without playing anything
            const newQueue = player.nodes.create(message.guild, {
                metadata: {
                    channel: message.channel,
                    client: message.guild.members.me,
                    requestedBy: message.author
                },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 300000, // 5 minutes
                leaveOnEnd: false,
                leaveOnEndCooldown: 300000
            });
            
            // Connect to voice channel
            await newQueue.connect(channel);
            
            const embed = await successEmbed(
                guildId,
                '🎵 Connected!',
                `Successfully joined **${channel.name}**!\n\nUse \`play\` to start playing music.`
            );
            
            return message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error joining voice channel:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Connection Failed', `Could not join your voice channel!\n\n**Error:** ${error.message}`)]
            });
        }
    }
};
