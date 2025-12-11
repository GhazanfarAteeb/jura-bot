import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            const startTime = Date.now();
            
            // Convert interaction to message-like object
            const fakeMessage = {
                author: interaction.user,
                guild: interaction.guild,
                channel: interaction.channel,
                member: interaction.member,
                mentions: {
                    users: new Map(),
                    members: new Map()
                },
                reply: async (options) => {
                    if (interaction.deferred || interaction.replied) {
                        return await interaction.followUp(options);
                    }
                    return await interaction.reply(options);
                }
            };

            // Parse slash command options into args array
            const args = [];
            
            // Handle different option types
            for (const option of interaction.options.data) {
                if (option.type === 6) { // USER type
                    const user = interaction.options.getUser(option.name);
                    fakeMessage.mentions.users.set(user.id, user);
                    if (interaction.guild) {
                        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                        if (member) fakeMessage.mentions.members.set(user.id, member);
                    }
                } else if (option.value !== undefined) {
                    args.push(String(option.value));
                }
            }

            // Defer reply for commands that might take time
            await interaction.deferReply();

            // Execute the command
            await command.execute(fakeMessage, args, client);
            
            const duration = Date.now() - startTime;
            logger.command(command.name, interaction.user, interaction.guild, true);
            logger.performance(`Slash Command: ${command.name}`, duration, {
                user: interaction.user.tag,
                guild: interaction.guild?.name || 'DM'
            });

        } catch (error) {
            logger.command(command.name, interaction.user, interaction.guild, false, error);
            logger.error(`Slash command execution failed: ${command.name}`, error);
            console.error(`Error executing ${interaction.commandName}:`, error);
            
            const errorMessage = 'There was an error while executing this command!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};
