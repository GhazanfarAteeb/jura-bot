import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { infoEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

const COMMANDS_BY_CATEGORY = {
    config: ['setup', 'config', 'setprefix', 'setchannel', 'setrole', 'setcoin'],
    moderation: ['warn', 'kick', 'ban', 'purge', 'userhistory'],
    economy: ['daily', 'balance', 'profile', 'level', 'shop', 'inventory', 'setprofile', 'setbackground', 
              'adventure', 'rep', 'addcoins', 'coinflip', 'slots', 'dice', 'roulette', 'claim'],
    music: ['play', 'pause', 'resume', 'skip', 'stop', 'queue', 'nowplaying', 'volume', 'shuffle', 
            'loop', 'search', 'seek', 'forward', 'backward', 'move', 'swap', 'remove', 'clear', 
            'previous', 'skipto', 'filters', 'bassboost', 'nightcore', 'vaporwave', '8d', 'karaoke'],
    community: ['setbirthday', 'birthdays', 'removebirthday', 'birthdaypreference', 
                'createevent', 'events', 'joinevent', 'cancelevent'],
    info: ['help', 'ping', 'serverinfo', 'userinfo', 'checkuser'],
    utility: ['rank', 'leaderboard', 'top', 'stats', 'embed', 'embedset', 'embedhelp']
};

const CATEGORY_INFO = {
    config: { emoji: '⚙️', name: 'Configuration', description: 'Server setup and configuration commands' },
    moderation: { emoji: '🛡️', name: 'Moderation', description: 'Moderation and security commands' },
    economy: { emoji: '💰', name: 'Economy', description: 'Coins, profile, and gambling commands' },
    music: { emoji: '🎵', name: 'Music', description: 'Music playback and audio effects' },
    community: { emoji: '🎉', name: 'Community', description: 'Birthdays, events, and community features' },
    info: { emoji: 'ℹ️', name: 'Information', description: 'Bot and server information commands' },
    utility: { emoji: '🔧', name: 'Utility', description: 'Useful utility commands' }
};

export default {
    name: 'help',
    description: 'Display all commands and information',
    usage: '[command]',
    category: 'info',
    aliases: ['h', 'commands'],
    cooldown: 5,
    
    async execute(message, args, client) {
        const prefix = await getPrefix(message.guild.id);
        
        // If specific command is requested
        if (args[0]) {
            return showCommandDetail(message, args[0], prefix, client);
        }
        
        // Show category selection menu
        const embed = await createMainHelpEmbed(message, prefix, client);
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category to view commands')
            .addOptions(
                Object.entries(CATEGORY_INFO).map(([key, info]) => ({
                    label: info.name,
                    description: info.description,
                    value: key,
                    emoji: info.emoji
                }))
            );
        
        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Documentation')
                .setStyle(ButtonStyle.Link)
                .setURL('https://github.com/GhazanfarAteeb/jura-bot#readme')
                .setEmoji('📖'),
            new ButtonBuilder()
                .setCustomId('help_refresh')
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄')
        );
        
        const reply = await message.reply({
            embeds: [embed],
            components: [row1, row2]
        });
        
        // Create collector for interactions
        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 300000 // 5 minutes
        });
        
        collector.on('collect', async (interaction) => {
            if (interaction.isStringSelectMenu()) {
                await interaction.deferUpdate();
                const category = interaction.values[0];
                const categoryEmbed = await createCategoryEmbed(category, prefix, client, message.guild.id);
                await interaction.editReply({ embeds: [categoryEmbed] });
            } else if (interaction.isButton() && interaction.customId === 'help_refresh') {
                await interaction.deferUpdate();
                const refreshedEmbed = await createMainHelpEmbed(message, prefix, client);
                await interaction.editReply({ embeds: [refreshedEmbed] });
            }
        });
        
        collector.on('end', () => {
            row1.components[0].setDisabled(true);
            row2.components[1].setDisabled(true);
            reply.edit({ components: [row1, row2] }).catch(() => {});
        });
    }
};

async function createMainHelpEmbed(message, prefix, client) {
    const totalCommands = client.commands.size;
    
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
            name: 'JURA BOT Help Menu',
            iconURL: client.user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`${GLYPHS.SPARKLE} Command Categories`)
        .setDescription(
            `Multi-purpose Discord bot with **${totalCommands} commands** across 7 categories.\n\n` +
            `**Current Prefix:** \`${prefix}\`\n` +
            `**Quick Help:** \`${prefix}help <command>\` for detailed info\n\n` +
            `**Select a category below to explore commands!**`
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ 
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
    
    // Add category overview
    for (const [key, info] of Object.entries(CATEGORY_INFO)) {
        const commandCount = COMMANDS_BY_CATEGORY[key].length;
        embed.addFields({
            name: `${info.emoji} ${info.name}`,
            value: `${info.description}\n*${commandCount} commands*`,
            inline: true
        });
    }
    
    return embed;
}

async function createCategoryEmbed(category, prefix, client, guildId) {
    const info = CATEGORY_INFO[category];
    const commands = COMMANDS_BY_CATEGORY[category];
    
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${info.emoji} ${info.name} Commands`)
        .setDescription(info.description + '\n\n' + `Use \`${prefix}help <command>\` for detailed information.`)
        .setTimestamp();
    
    // Group commands into chunks for better display
    const commandList = commands.map(cmdName => {
        const cmd = client.commands.get(cmdName);
        if (!cmd) return null;
        
        const aliases = cmd.aliases && cmd.aliases.length > 0 
            ? ` (${cmd.aliases.join(', ')})` 
            : '';
        
        return `**${prefix}${cmd.name}${aliases}**\n${cmd.description || 'No description'}`;
    }).filter(Boolean);
    
    // Split into multiple fields if too long
    const chunkSize = 5;
    for (let i = 0; i < commandList.length; i += chunkSize) {
        const chunk = commandList.slice(i, i + chunkSize);
        embed.addFields({
            name: i === 0 ? 'Available Commands' : '\u200b',
            value: chunk.join('\n\n'),
            inline: false
        });
    }
    
    return embed;
}

async function showCommandDetail(message, commandName, prefix, client) {
    const command = client.commands.get(commandName.toLowerCase()) || 
                   client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName.toLowerCase()));
    
    if (!command) {
        const embed = await errorEmbed(message.guild.id, 
            `${GLYPHS.ERROR} Command \`${commandName}\` not found.\n\n` +
            `Use \`${prefix}help\` to see all available commands.`
        );
        return message.reply({ embeds: [embed] });
    }
    
    const embed = await infoEmbed(message.guild.id, 
        `${GLYPHS.INFO} Command: ${command.name}`,
        command.description || 'No description available'
    );
    
    // Usage
    if (command.usage) {
        embed.addFields({
            name: '📝 Usage',
            value: `\`${prefix}${command.name} ${command.usage}\``,
            inline: false
        });
    } else {
        embed.addFields({
            name: '📝 Usage',
            value: `\`${prefix}${command.name}\``,
            inline: false
        });
    }
    
    // Aliases
    if (command.aliases && command.aliases.length > 0) {
        embed.addFields({
            name: '🔀 Aliases',
            value: command.aliases.map(a => `\`${a}\``).join(', '),
            inline: true
        });
    }
    
    // Category
    if (command.category) {
        const categoryInfo = CATEGORY_INFO[command.category];
        embed.addFields({
            name: '📂 Category',
            value: categoryInfo ? `${categoryInfo.emoji} ${categoryInfo.name}` : command.category,
            inline: true
        });
    }
    
    // Cooldown
    if (command.cooldown) {
        embed.addFields({
            name: '⏱️ Cooldown',
            value: `${command.cooldown} second(s)`,
            inline: true
        });
    }
    
    // Permissions
    if (command.permissions && command.permissions.length > 0) {
        embed.addFields({
            name: '🔒 Required Permissions',
            value: command.permissions.join(', '),
            inline: false
        });
    }
    
    // Examples (if available)
    if (command.examples) {
        embed.addFields({
            name: '💡 Examples',
            value: command.examples.map(ex => `\`${prefix}${ex}\``).join('\n'),
            inline: false
        });
    }
    
    return message.reply({ embeds: [embed] });
}
