import { Events, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Guild from '../../models/Guild.js';
import Ticket from '../../models/Ticket.js';

export default {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('ticket_') && interaction.customId !== 'create_ticket') return;

        const guildId = interaction.guild.id;
        const guildConfig = await Guild.getGuild(guildId);

        // Check if ticket system is enabled
        if (!guildConfig.features.ticketSystem.enabled) {
            return interaction.reply({
                content: '❌ The ticket system is not enabled.',
                ephemeral: true
            });
        }

        // Handle create ticket button
        if (interaction.customId === 'create_ticket') {
            return handleCreateTicket(interaction, guildConfig, guildId);
        }

        // Handle ticket close button
        if (interaction.customId === 'ticket_close') {
            return handleCloseTicket(interaction, guildConfig, guildId);
        }

        // Handle ticket claim button
        if (interaction.customId === 'ticket_claim') {
            return handleClaimTicket(interaction, guildConfig, guildId);
        }
    }
};

async function handleCreateTicket(interaction, guildConfig, guildId) {
        const categoryId = guildConfig.features.ticketSystem.category;
        const maxTickets = guildConfig.features.ticketSystem.maxTickets || 5;

        // Check if user already has max tickets
        const userTickets = await Ticket.find({
            guildId,
            userId: interaction.user.id,
            status: { $in: ['open', 'claimed'] }
        });

        if (userTickets.length >= maxTickets) {
            return interaction.reply({
                content: `❌ You already have ${maxTickets} open tickets. Please close an existing ticket first.`,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get next ticket number
            const ticketNumber = await Ticket.getNextTicketNumber(guildId);

            // Create ticket channel
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${ticketNumber}`,
                type: ChannelType.GuildText,
                parent: categoryId,
                topic: `Ticket #${ticketNumber} | ${interaction.user.tag} | Support Request`,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles
                        ]
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.EmbedLinks
                        ]
                    }
                ]
            });

            // Add support roles
            const supportRoles = guildConfig.features.ticketSystem.supportRoles || [];
            for (const roleId of supportRoles) {
                try {
                    await ticketChannel.permissionOverwrites.create(roleId, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });
                } catch (e) { }
            }

            // Create ticket in database
            const ticket = await Ticket.create({
                guildId,
                ticketNumber,
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                username: interaction.user.tag,
                subject: 'Support Request',
                status: 'open',
                participants: [interaction.user.id]
            });

            // Send welcome embed
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🎫 Ticket #${ticketNumber}`)
                .setDescription(
                    `Hello ${interaction.user}! Thank you for creating a ticket.\n\n` +
                    `Our support team will be with you shortly.\n` +
                    `Please describe your issue in detail.`
                )
                .setFooter({ text: `Ticket ID: ${ticketNumber}` })
                .setTimestamp();

            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✋')
            );

            await ticketChannel.send({ 
                content: `${interaction.user}`,
                embeds: [welcomeEmbed], 
                components: [buttonRow] 
            });

            // Log to ticket log
            const logChannelId = guildConfig.channels.ticketLog;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('🎫 Ticket Created')
                        .addFields(
                            { name: 'Ticket', value: `#${ticketNumber}`, inline: true },
                            { name: 'User', value: interaction.user.tag, inline: true },
                            { name: 'Channel', value: `${ticketChannel}`, inline: true }
                        )
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

            await interaction.editReply({
                content: `✅ Your ticket has been created: ${ticketChannel}`
            });

        } catch (error) {
            console.error('Ticket creation error:', error);
            await interaction.editReply({
                content: '❌ Failed to create ticket. Please try again.'
            });
        }
    }

async function handleCloseTicket(interaction, guildConfig, guildId) {
        // Check if in a ticket channel
        const ticket = await Ticket.findOne({
            guildId,
            channelId: interaction.channel.id,
            status: { $in: ['open', 'claimed'] }
        });

        if (!ticket) {
            return interaction.reply({
                content: '❌ This is not a valid ticket channel.',
                ephemeral: true
            });
        }

        await interaction.deferUpdate();

        // Update ticket status
        ticket.status = 'closed';
        ticket.closedBy = interaction.user.id;
        ticket.closedByTag = interaction.user.tag;
        ticket.closedAt = new Date();
        ticket.closeReason = 'Closed via button';
        await ticket.save();

        // Send closing message
        const closeEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🔒 Ticket Closed')
            .setDescription(
                `This ticket has been closed by ${interaction.user}.\n\n` +
                `This channel will be deleted in 5 seconds.`
            )
            .setTimestamp();

        await interaction.channel.send({ embeds: [closeEmbed] });

        // Log to ticket log
        const logChannelId = guildConfig.channels.ticketLog;
        if (logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('🔒 Ticket Closed')
                    .addFields(
                        { name: 'Ticket', value: `#${ticket.ticketNumber}`, inline: true },
                        { name: 'Opened By', value: ticket.username, inline: true },
                        { name: 'Closed By', value: interaction.user.tag, inline: true }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // Delete channel after 5 seconds
        setTimeout(async () => {
            try {
                await interaction.channel.delete('Ticket closed');
            } catch (e) {
                console.error('Failed to delete ticket channel:', e);
            }
        }, 5000);
    }

async function handleClaimTicket(interaction, guildConfig, guildId) {
        const ticket = await Ticket.findOne({
            guildId,
            channelId: interaction.channel.id,
            status: 'open'
        });

        if (!ticket) {
            return interaction.reply({
                content: '❌ This ticket is already claimed or closed.',
                ephemeral: true
            });
        }

        // Update ticket
        ticket.status = 'claimed';
        ticket.claimedBy = interaction.user.id;
        ticket.claimedByTag = interaction.user.tag;
        ticket.claimedAt = new Date();
        await ticket.save();

        const claimEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✋ Ticket Claimed')
            .setDescription(
                `${interaction.user} has claimed this ticket!\n\n` +
                `They will be handling your support request.`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [claimEmbed] });

        // Update the channel name
        try {
            await interaction.channel.setName(`claimed-${ticket.ticketNumber}`);
        } catch (e) { }
    }
