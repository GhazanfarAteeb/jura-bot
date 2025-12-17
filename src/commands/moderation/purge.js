import { PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'purge',
    description: 'Delete multiple messages',
    usage: '<amount> [@user]',
    aliases: ['clear', 'clean', 'delete'],
    permissions: {
        user: PermissionFlagsBits.ManageMessages,
        client: PermissionFlagsBits.ManageMessages
    },
    cooldown: 3,
    
    async execute(message, args) {
        if (!args[0]) {
            const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
                `${GLYPHS.ARROW_RIGHT} Usage: \`purge <amount> [@user]\``
            );
            return message.reply({ embeds: [embed] });
        }
        
        const amount = parseInt(args[0]);
        
        if (isNaN(amount) || amount < 1 || amount > 100) {
            const embed = await errorEmbed(message.guild.id, 'Invalid Amount',
                `${GLYPHS.WARNING} Please provide a number between 1 and 100.`
            );
            return message.reply({ embeds: [embed] });
        }
        
        // Check if targeting specific user
        const targetUser = args[1] ? args[1].replace(/[<@!>]/g, '') : null;
        
        try {
            // Fetch messages
            const messages = await message.channel.messages.fetch({ limit: amount + 1 });
            
            // Filter messages
            let toDelete;
            if (targetUser) {
                toDelete = messages.filter(m => m.author.id === targetUser);
            } else {
                toDelete = messages;
            }
            
            // Remove messages older than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            toDelete = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);
            
            // Bulk delete
            const deleted = await message.channel.bulkDelete(toDelete, true);
            
            const embed = await successEmbed(message.guild.id, 'Messages Purged',
                `${GLYPHS.ARROW_RIGHT} Deleted **${deleted.size}** messages${targetUser ? ` from <@${targetUser}>` : ''}.`
            );
            
            const reply = await message.channel.send({ embeds: [embed] });
            
            // Delete confirmation after 5 seconds
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            
        } catch (error) {
            console.error('Error purging messages:', error);
            const embed = await errorEmbed(message.guild.id, 'Purge Failed',
                `${GLYPHS.ERROR} Failed to delete messages. They may be too old (>14 days).`
            );
            return message.reply({ embeds: [embed] });
        }
    }
};
