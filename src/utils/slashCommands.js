import { SlashCommandBuilder } from 'discord.js';

/**
 * Creates a slash command data object from a traditional command
 * @param {Object} command - Traditional command object
 * @returns {SlashCommandBuilder} Slash command data
 */
export function createSlashCommand(name, description, options = []) {
    const builder = new SlashCommandBuilder()
        .setName(name)
        .setDescription(description);
    
    // Add options if provided
    for (const option of options) {
        if (option.type === 'string') {
            builder.addStringOption(opt =>
                opt.setName(option.name)
                    .setDescription(option.description)
                    .setRequired(option.required || false)
            );
        } else if (option.type === 'user') {
            builder.addUserOption(opt =>
                opt.setName(option.name)
                    .setDescription(option.description)
                    .setRequired(option.required || false)
            );
        } else if (option.type === 'integer') {
            builder.addIntegerOption(opt =>
                opt.setName(option.name)
                    .setDescription(option.description)
                    .setRequired(option.required || false)
            );
        } else if (option.type === 'boolean') {
            builder.addBooleanOption(opt =>
                opt.setName(option.name)
                    .setDescription(option.description)
                    .setRequired(option.required || false)
            );
        }
    }
    
    return builder;
}

/**
 * Wrapper to convert message-based command execution to slash command
 * @param {Function} execute - Original execute function
 * @returns {Function} Slash command execute function
 */
export async function executeSlashWrapper(interaction, originalExecute) {
    // Create a pseudo-message object for compatibility
    const args = [];
    
    // Extract options as args array
    interaction.options.data.forEach(option => {
        if (option.value !== undefined) {
            args.push(option.value.toString());
        }
    });
    
    // Create pseudo message object
    const pseudoMessage = {
        author: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel,
        member: interaction.member,
        mentions: {
            users: new Map(),
            members: new Map()
        },
        reply: async (options) => {
            if (interaction.deferred) {
                return await interaction.editReply(options);
            } else if (interaction.replied) {
                return await interaction.followUp(options);
            } else {
                return await interaction.reply(options);
            }
        }
    };
    
    // Add mentioned users
    if (interaction.options.getUser('user')) {
        const user = interaction.options.getUser('user');
        pseudoMessage.mentions.users.set(user.id, user);
        if (interaction.guild) {
            const member = await interaction.guild.members.fetch(user.id);
            pseudoMessage.mentions.members.set(user.id, member);
        }
    }
    
    // Defer reply for long operations
    await interaction.deferReply();
    
    // Execute original command
    return await originalExecute(pseudoMessage, args);
}
