import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { getPrefix } from '../../utils/helpers.js';

// Define timed rewards here (can be configured per server later)
const TIMED_REWARDS = {
    hourly: {
        name: 'Hourly Reward',
        interval: 60, // minutes
        amount: 100,
        description: 'Claim every hour'
    },
    work: {
        name: 'Work',
        interval: 30,
        amount: 150,
        description: 'Do some work and earn coins'
    },
    bonus: {
        name: 'Bonus',
        interval: 120, // 2 hours
        amount: 300,
        description: 'Special bonus reward'
    }
};

export default {
    name: 'claim',
    description: 'Claim timed rewards',
    usage: 'claim <hourly/work/bonus>',
    category: 'economy',
    aliases: ['hourly', 'work', 'bonus'],
    cooldown: 3,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        // Allow command name as reward type
        let rewardType = args[0]?.toLowerCase();
        if (!rewardType) {
            // Check if command was invoked with alias
            const commandName = message.content.split(' ')[0].replace(/^!/, '');
            if (TIMED_REWARDS[commandName]) {
                rewardType = commandName;
            }
        }
        
        if (!rewardType || !TIMED_REWARDS[rewardType]) {
            const prefix = await getPrefix(guildId);
            const availableRewards = Object.entries(TIMED_REWARDS)
                .map(([key, reward]) => 
                    `**${reward.name}** - ${reward.description}\n` +
                    `💰 Reward: **${reward.amount}** coins\n` +
                    `⏰ Cooldown: **${reward.interval}** minutes\n` +
                    `Command: \`${prefix}claim ${key}\` or \`${prefix}${key}\``
                )
                .join('\n\n');
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('⏰ Timed Rewards')
                .setDescription('Claim these rewards regularly!\n\n' + availableRewards)
                .setFooter({ text: 'Choose a reward to claim' })
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }
        
        try {
            const economy = await Economy.getEconomy(userId, guildId);
            const guildConfig = await Guild.getGuild(guildId);
            const reward = TIMED_REWARDS[rewardType];
            
            // Get custom coin settings
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const coinName = guildConfig.economy?.coinName || 'coins';
            
            // Try to claim
            const amount = await economy.claimTimed(
                rewardType,
                reward.interval,
                reward.amount,
                `${reward.name} reward`
            );
            
            const rewardData = economy.timedRewards.find(r => r.commandName === rewardType);
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setAuthor({ 
                    name: message.author.tag, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setTitle(`✅ ${reward.name} Claimed!`)
                .setDescription(`You earned **${amount.toLocaleString()}** ${coinEmoji} ${coinName}!`)
                .addFields(
                    { 
                        name: `${coinEmoji} Balance`, 
                        value: `**${economy.coins.toLocaleString()}** ${coinName}`, 
                        inline: true 
                    },
                    { 
                        name: '📊 Times Claimed', 
                        value: `**${rewardData.claimCount}** times`, 
                        inline: true 
                    },
                    { 
                        name: '⏰ Next Claim', 
                        value: `In **${reward.interval}** minutes`, 
                        inline: true 
                    }
                )
                .setFooter({ text: `Come back in ${reward.interval} minutes!` })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            if (error.message.includes('claim this reward again')) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('⏰ Cooldown Active')
                    .setDescription(error.message)
                    .setFooter({ text: 'Check back soon!' })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
            
            console.error('Claim command error:', error);
            message.reply('❌ An error occurred while claiming your reward. Please try again!');
        }
    }
};
