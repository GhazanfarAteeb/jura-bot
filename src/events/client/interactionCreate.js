import { Events, Collection } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            await interaction.reply({ 
                content: `Command \`/${interaction.commandName}\` not found! The command may not be implemented yet.`,
                ephemeral: true 
            }).catch(console.error);
            return;
        }

        try {
            const startTime = Date.now();
            
            // Parse slash command options into args array (do this before deferring)
            const args = [];
            
            // Handle different option types
            for (const option of interaction.options.data) {
                if (option.type === 6) { // USER type
                    const user = interaction.options.getUser(option.name);
                    if (user) args.push(`<@${user.id}>`); // Add as mention string for compatibility
                } else if (option.value !== undefined) {
                    args.push(String(option.value));
                }
            }
            
            // Convert interaction to message-like object with Collection instead of Map
            const fakeMessage = {
                author: interaction.user,
                guild: interaction.guild,
                channel: interaction.channel,
                member: interaction.member,
                mentions: {
                    users: new Collection(),
                    members: new Collection()
                },
                reply: async (options) => {
                    try {
                        if (interaction.deferred || interaction.replied) {
                            return await interaction.editReply(options);
                        }
                        return await interaction.reply(options);
                    } catch (error) {
                        console.error('Error replying to interaction:', error);
                        return null;
                    }
                }
            };
            
            // Defer reply now, before heavy operations
            await interaction.deferReply().catch(() => {});
            
            // Add mentioned users to fake message
            for (const option of interaction.options.data) {
                if (option.type === 6) { // USER type
                    const user = interaction.options.getUser(option.name);
                    if (user) {
                        fakeMessage.mentions.users.set(user.id, user);
                        if (interaction.guild) {
                            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                            if (member) fakeMessage.mentions.members.set(user.id, member);
                        }
                    }
                }
            }

            // Check cooldowns
            if (command.cooldown) {
                const { cooldowns } = client;
                
                if (!cooldowns.has(command.name)) {
                    cooldowns.set(command.name, new Map());
                }
                
                const now = Date.now();
                const timestamps = cooldowns.get(command.name);
                const cooldownAmount = (command.cooldown || 3) * 1000;
                
                if (timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                    
                    if (now < expirationTime) {
                        const timeLeft = Math.ceil((expirationTime - now) / 1000);
                        
                        // Format time left nicely
                        let timeString;
                        if (timeLeft >= 60) {
                            const minutes = Math.floor(timeLeft / 60);
                            const seconds = timeLeft % 60;
                            timeString = `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
                        } else {
                            timeString = `${timeLeft} second${timeLeft !== 1 ? 's' : ''}`;
                        }
                        
                        await interaction.editReply({
                            content: `⏰ **Cooldown Active**\n\n⏱️ Please wait **${timeString}** before using \`${command.name}\` again.\n\nAvailable <t:${Math.floor(expirationTime / 1000)}:R>`,
                            ephemeral: true
                        });
                        return;
                    }
                }
                
                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            }

            // Execute the command
            // Wave-Music Command class (uses run method with Context)
            if (typeof command.run === 'function') {
                const Context = (await import('../../structures/Context.js')).default;
                const ctx = new Context(interaction, args);
                await command.run(client, ctx, args);
            }
            // Legacy command object (uses execute method)
            else if (typeof command.execute === 'function') {
                await command.execute(fakeMessage, args, client);
            }
            
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
