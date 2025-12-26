import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

const activePolls = new Map();

export default {
    name: 'poll',
    description: 'Create an interactive poll',
    usage: 'poll <question> | <option1> | <option2> | [option3] | [option4]',
    category: 'utility',
    aliases: ['vote', 'survey'],
    cooldown: 10,

    async execute(message, args) {
        const guildId = message.guild.id;
        const input = args.join(' ');

        // Check for end poll command
        if (args[0]?.toLowerCase() === 'end' && args[1]) {
            return this.endPoll(message, args[1], guildId);
        }

        // Parse the poll: question | option1 | option2 | ...
        const parts = input.split('|').map(p => p.trim()).filter(p => p);

        if (parts.length < 3) {
            const prefix = await getPrefix(guildId);
            const embed = await errorEmbed(guildId, 'Invalid Format',
                `${GLYPHS.ERROR} Please provide a question and at least 2 options.\n\n` +
                `**Usage:** \`${prefix}poll Question | Option 1 | Option 2\`\n` +
                `**Example:** \`${prefix}poll Best pizza topping? | Pepperoni | Cheese | Mushrooms\`\n\n` +
                `**To end a poll:** \`${prefix}poll end <messageId>\``
            );
            return message.reply({ embeds: [embed] });
        }

        if (parts.length > 5) {
            const embed = await errorEmbed(guildId, 'Too Many Options',
                `${GLYPHS.ERROR} Maximum 4 options allowed!`
            );
            return message.reply({ embeds: [embed] });
        }

        const question = parts[0];
        const options = parts.slice(1);
        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

        // Create poll embed
        const pollEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Poll')
            .setDescription(
                `**${question}**\n\n` +
                options.map((opt, i) => `${optionEmojis[i]} ${opt} — **0** votes (0%)`).join('\n\n') +
                `\n\n👥 **Total Votes:** 0`
            )
            .setFooter({ text: `Created by ${message.author.username} • Poll ID will be shown below` })
            .setTimestamp();

        // Create buttons
        const row = new ActionRowBuilder().addComponents(
            ...options.map((opt, i) =>
                new ButtonBuilder()
                    .setCustomId(`poll_${i}`)
                    .setLabel(opt.length > 20 ? opt.substring(0, 17) + '...' : opt)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(optionEmojis[i])
            )
        );

        // Delete the command message
        try {
            await message.delete();
        } catch (e) { }

        const pollMsg = await message.channel.send({ embeds: [pollEmbed], components: [row] });

        // Store poll data
        const pollData = {
            question,
            options,
            votes: new Array(options.length).fill(0),
            voters: new Map(), // Map<userId, optionIndex>
            creatorId: message.author.id,
            createdAt: Date.now()
        };

        activePolls.set(pollMsg.id, pollData);

        // Update footer with poll ID
        pollEmbed.setFooter({ text: `Created by ${message.author.username} • Poll ID: ${pollMsg.id}` });
        await pollMsg.edit({ embeds: [pollEmbed] });

        // Handle votes
        const collector = pollMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 24 * 60 * 60 * 1000 // 24 hours
        });

        collector.on('collect', async (interaction) => {
            const poll = activePolls.get(pollMsg.id);
            if (!poll) {
                return interaction.reply({ content: '❌ This poll has ended.', ephemeral: true });
            }

            const optionIndex = parseInt(interaction.customId.split('_')[1]);
            const previousVote = poll.voters.get(interaction.user.id);

            // Check if user is changing their vote
            if (previousVote === optionIndex) {
                // Remove vote
                poll.votes[optionIndex]--;
                poll.voters.delete(interaction.user.id);
                await interaction.reply({ 
                    content: `🗑️ Your vote for **${options[optionIndex]}** has been removed.`, 
                    ephemeral: true 
                });
            } else {
                // Remove previous vote if exists
                if (previousVote !== undefined) {
                    poll.votes[previousVote]--;
                }
                // Add new vote
                poll.votes[optionIndex]++;
                poll.voters.set(interaction.user.id, optionIndex);

                if (previousVote !== undefined) {
                    await interaction.reply({ 
                        content: `✅ Changed vote from **${options[previousVote]}** to **${options[optionIndex]}**`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: `✅ Voted for **${options[optionIndex]}**`, 
                        ephemeral: true 
                    });
                }
            }

            // Update embed
            await this.updatePollEmbed(pollMsg, poll, options, optionEmojis, message.author.username);
        });

        collector.on('end', async () => {
            const poll = activePolls.get(pollMsg.id);
            if (poll) {
                await this.finalizePoll(pollMsg, poll, options, optionEmojis);
                activePolls.delete(pollMsg.id);
            }
        });
    },

    async updatePollEmbed(pollMsg, poll, options, optionEmojis, creatorName) {
        const totalVotes = poll.votes.reduce((a, b) => a + b, 0);
        
        const updatedEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Poll')
            .setDescription(
                `**${poll.question}**\n\n` +
                options.map((opt, i) => {
                    const votes = poll.votes[i];
                    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const bar = this.createProgressBar(percentage);
                    return `${optionEmojis[i]} ${opt}\n${bar} **${votes}** votes (${percentage}%)`;
                }).join('\n\n') +
                `\n\n👥 **Total Votes:** ${totalVotes}`
            )
            .setFooter({ text: `Created by ${creatorName} • Poll ID: ${pollMsg.id}` })
            .setTimestamp();

        await pollMsg.edit({ embeds: [updatedEmbed] });
    },

    createProgressBar(percentage) {
        const filled = Math.round(percentage / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    },

    async finalizePoll(pollMsg, poll, options, optionEmojis) {
        const totalVotes = poll.votes.reduce((a, b) => a + b, 0);
        const maxVotes = Math.max(...poll.votes);
        const winnerIndices = poll.votes.map((v, i) => v === maxVotes ? i : -1).filter(i => i !== -1);

        let winnerText;
        if (totalVotes === 0) {
            winnerText = '❌ No votes were cast';
        } else if (winnerIndices.length > 1) {
            winnerText = `🤝 **Tie between:** ${winnerIndices.map(i => options[i]).join(' & ')}`;
        } else {
            winnerText = `🏆 **Winner:** ${options[winnerIndices[0]]} with **${maxVotes}** votes!`;
        }

        const finalEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('📊 Poll Ended')
            .setDescription(
                `**${poll.question}**\n\n` +
                options.map((opt, i) => {
                    const votes = poll.votes[i];
                    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isWinner = votes === maxVotes && totalVotes > 0;
                    const bar = this.createProgressBar(percentage);
                    return `${isWinner ? '🏆' : optionEmojis[i]} ${opt}\n${bar} **${votes}** votes (${percentage}%)`;
                }).join('\n\n') +
                `\n\n👥 **Total Votes:** ${totalVotes}\n` +
                winnerText
            )
            .setFooter({ text: 'Poll has ended' })
            .setTimestamp();

        await pollMsg.edit({ embeds: [finalEmbed], components: [] });
    },

    async endPoll(message, messageId, guildId) {
        const poll = activePolls.get(messageId);

        if (!poll) {
            const embed = await errorEmbed(guildId, 'Poll Not Found',
                `${GLYPHS.ERROR} Could not find an active poll with that ID.`
            );
            return message.reply({ embeds: [embed] });
        }

        // Check permissions
        const isAdmin = message.member.permissions.has(PermissionFlagsBits.ManageMessages);
        if (poll.creatorId !== message.author.id && !isAdmin) {
            const embed = await errorEmbed(guildId, 'Permission Denied',
                `${GLYPHS.ERROR} Only the poll creator or moderators can end this poll.`
            );
            return message.reply({ embeds: [embed] });
        }

        try {
            const pollMsg = await message.channel.messages.fetch(messageId);
            const options = poll.options;
            const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

            await this.finalizePoll(pollMsg, poll, options, optionEmojis);
            activePolls.delete(messageId);

            const embed = await successEmbed(guildId, 'Poll Ended',
                `${GLYPHS.SUCCESS} The poll has been ended successfully!`
            );
            return message.reply({ embeds: [embed] });

        } catch (error) {
            const embed = await errorEmbed(guildId, 'Error',
                `${GLYPHS.ERROR} Could not end the poll. The message may have been deleted.`
            );
            return message.reply({ embeds: [embed] });
        }
    }
};
