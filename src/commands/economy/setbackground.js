import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import { getBackground } from '../../utils/shopItems.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'setbackground',
    description: 'Set your profile background',
    usage: 'setbackground <background_name/id>',
    category: 'economy',
    aliases: ['setbg', 'background', 'bg'],
    cooldown: 3,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        if (!args[0]) {
            const prefix = await getPrefix(guildId);
            return message.reply(`❌ Please specify a background! Use \`${prefix}inventory backgrounds\` to see your backgrounds.`);
        }
        
        try {
            const economy = await Economy.getEconomy(userId, guildId);
            
            const bgQuery = args.join(' ').toLowerCase();
            
            // Find background in inventory
            const ownedBg = economy.inventory.backgrounds.find(bg => 
                bg.id.toLowerCase() === bgQuery || bg.name.toLowerCase() === bgQuery
            );
            
            if (!ownedBg) {
                const prefix = await getPrefix(guildId);
                return message.reply(`❌ You don't own this background! Use \`${prefix}inventory backgrounds\` to see your backgrounds or \`${prefix}shop\` to purchase new ones.`);
            }
            
            // Get background data
            const bgData = getBackground(ownedBg.id);
            
            // Set background
            economy.profile.background = ownedBg.id;
            await economy.save();
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Background Updated!')
                .setDescription(`Your profile background has been set to **${ownedBg.name}**!`)
                .setImage(bgData?.image || null)
                .setFooter({ text: 'Use !profile to see your updated profile' })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Set background command error:', error);
            message.reply('❌ An error occurred while setting your background. Please try again!');
        }
    }
};
