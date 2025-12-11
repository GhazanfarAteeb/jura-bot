import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                const startTime = Date.now();
                
                // Execute slash command
                await command.executeSlash(interaction);
                
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
        }
        // Handle button interactions
        else if (interaction.isButton()) {
            // Button interactions handled by individual commands
        }
        // Handle select menu interactions
        else if (interaction.isStringSelectMenu()) {
            // Select menu interactions handled by individual commands
        }
    },
};
