import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'roleinfo',
    aliases: ['ri', 'role'],
    description: 'Get information about a role',
    usage: 'roleinfo <@role or role name>',
    category: 'info',
    cooldown: 3,
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        
        if (!args[0]) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please mention a role or provide a role name!\n\n`!roleinfo @role` or `!roleinfo Admin`')]
            });
        }
        
        // Find the role
        const query = args.join(' ').toLowerCase();
        const role = message.mentions.roles.first() 
            || message.guild.roles.cache.get(args[0])
            || message.guild.roles.cache.find(r => r.name.toLowerCase() === query)
            || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(query));
        
        if (!role) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Could not find that role!')]
            });
        }
        
        // Get members with this role
        const membersWithRole = role.members.size;
        
        // Format permissions
        const permissions = role.permissions.toArray();
        const keyPermissions = [
            'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
            'KickMembers', 'BanMembers', 'ManageMessages', 'MentionEveryone',
            'ManageNicknames', 'ManageWebhooks', 'ManageGuildExpressions'
        ];
        
        const hasKeyPerms = keyPermissions.filter(p => permissions.includes(p));
        const permText = hasKeyPerms.length > 0 
            ? hasKeyPerms.map(p => `\`${p}\``).join(', ')
            : permissions.length > 0 ? `${permissions.length} permissions` : 'None';
        
        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(`Role Info: ${role.name}`)
            .setColor(role.color || '#99AAB5')
            .setThumbnail(role.iconURL({ size: 128 }) || null)
            .addFields(
                {
                    name: '📋 General',
                    value: [
                        `**ID:** \`${role.id}\``,
                        `**Color:** ${role.hexColor}`,
                        `**Position:** ${role.position}/${message.guild.roles.cache.size}`,
                        `**Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⚙️ Settings',
                    value: [
                        `**Hoisted:** ${role.hoist ? '✅' : '❌'}`,
                        `**Mentionable:** ${role.mentionable ? '✅' : '❌'}`,
                        `**Managed:** ${role.managed ? '✅' : '❌'}`,
                        `**Bot Role:** ${role.tags?.botId ? '✅' : '❌'}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: `👥 Members (${membersWithRole})`,
                    value: membersWithRole > 0 
                        ? (membersWithRole <= 10 
                            ? role.members.map(m => m.user.tag).join(', ')
                            : `${role.members.first(10).map(m => m.user.tag).join(', ')} and ${membersWithRole - 10} more...`)
                        : 'No members',
                    inline: false
                },
                {
                    name: '🔐 Key Permissions',
                    value: permText,
                    inline: false
                }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();
        
        // Add mention if role is mentionable
        if (role.mentionable) {
            embed.addFields({
                name: '💬 Mention',
                value: `\`<@&${role.id}>\``,
                inline: false
            });
        }
        
        // Add integration info if managed
        if (role.managed) {
            let managedBy = 'Unknown integration';
            if (role.tags?.botId) {
                const bot = await client.users.fetch(role.tags.botId).catch(() => null);
                managedBy = bot ? `Bot: ${bot.tag}` : `Bot ID: ${role.tags.botId}`;
            } else if (role.tags?.integrationId) {
                managedBy = `Integration ID: ${role.tags.integrationId}`;
            } else if (role.tags?.premiumSubscriberRole) {
                managedBy = 'Server Boost Role';
            }
            
            embed.addFields({
                name: '🔗 Managed By',
                value: managedBy,
                inline: false
            });
        }
        
        message.reply({ embeds: [embed] });
    }
};
