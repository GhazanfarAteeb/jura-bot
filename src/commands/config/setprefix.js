import { PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'setprefix',
    description: 'Change the bot prefix for this server',
    usage: '<new_prefix>',
    aliases: ['prefix'],
    permissions: [PermissionFlagsBits.Administrator],
    cooldown: 5,
    
    async execute(message, args) {
        const guild = await Guild.getGuild(message.guild.id, message.guild.name);

        // Check for admin role
        const hasAdminRole = guild.roles.adminRoles?.some(roleId =>
            message.member.roles.cache.has(roleId)
        );

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
            return message.reply({
                embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
                    `${GLYPHS.LOCK} You need Administrator permissions to change the prefix.`)]
            });
        }

        if (!args[0]) {
            const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
                `${GLYPHS.ARROW_RIGHT} Usage: \`${await getPrefix(message.guild.id)}setprefix <new_prefix>\``
            );
            return message.reply({ embeds: [embed] });
        }
        
        const newPrefix = args[0];
        
        if (newPrefix.length > 5) {
            const embed = await errorEmbed(message.guild.id, 'Prefix Too Long',
                `${GLYPHS.WARNING} Prefix must be 5 characters or less.`
            );
            return message.reply({ embeds: [embed] });
        }
        
        const guild = await Guild.getGuild(message.guild.id, message.guild.name);
        guild.prefix = newPrefix;
        await guild.save();
        
        const embed = await successEmbed(message.guild.id, 'Prefix Updated',
            `${GLYPHS.ARROW_RIGHT} Server prefix has been changed to: \`${newPrefix}\``
        );
        
        return message.reply({ embeds: [embed] });
    }
};

async function getPrefix(guildId) {
    const guild = await Guild.getGuild(guildId);
    return guild?.prefix || process.env.DEFAULT_PREFIX || '!';
}
