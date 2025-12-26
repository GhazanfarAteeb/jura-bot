import { 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import Guild from '../../models/Guild.js';
import Ticket from '../../models/Ticket.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'ticket',
    description: 'Manage support tickets',
    usage: 'ticket create | ticket close [reason] | ticket add @user | ticket remove @user',
    category: 'utility',
    aliases: ['tickets', 'support'],
    cooldown: 5,

    async execute(message, args) {
        const guildId = message.guild.id;
        const subCommand = args[0]?.toLowerCase();

        const guildConfig = await Guild.getGuild(guildId);

        // Check if ticket system is enabled
        if (!guildConfig.features.ticketSystem.enabled) {
            const embed = await errorEmbed(guildId, 'Tickets Disabled',
                `${GLYPHS.ERROR} The ticket system is not enabled.\n\n` +
                `Use \`!setup\` to set up the ticket system.`
            );
            return message.reply({ embeds: [embed] });
        }

        // No args - show help
        if (!subCommand) {
            return this.showHelp(message, guildId, guildConfig);
        }

        switch (subCommand) {
            case 'create':
            case 'new':
            case 'open':
                return this.createTicket(message, args.slice(1), guildConfig, guildId);
            case 'close':
                return this.closeTicket(message, args.slice(1), guildConfig, guildId);
            case 'add':
                return this.addUser(message, args.slice(1), guildConfig, guildId);
            case 'remove':
                return this.removeUser(message, args.slice(1), guildConfig, guildId);
            case 'claim':
                return this.claimTicket(message, guildConfig, guildId);
            case 'rename':
                return this.renameTicket(message, args.slice(1), guildConfig, guildId);
            case 'panel':
                return this.createPanel(message, guildConfig, guildId);
            default:
                return this.showHelp(message, guildId, guildConfig);
        }
    },

    async showHelp(message, guildId, guildConfig) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎫 Ticket System')
            .setDescription(
                `**Commands:**\n` +
                `${GLYPHS.ARROW_RIGHT} \`!ticket create [subject]\` - Create a new ticket\n` +
                `${GLYPHS.ARROW_RIGHT} \`!ticket close [reason]\` - Close current ticket\n` +
                `${GLYPHS.ARROW_RIGHT} \`!ticket add @user\` - Add user to ticket\n` +
                `${GLYPHS.ARROW_RIGHT} \`!ticket remove @user\` - Remove user from ticket\n` +
                `${GLYPHS.ARROW_RIGHT} \`!ticket claim\` - Claim the ticket (staff)\n` +
                `${GLYPHS.ARROW_RIGHT} \`!ticket rename <name>\` - Rename ticket\n\n` +
                `**Admin Commands:**\n` +
                `${GLYPHS.ARROW_RIGHT} \`!ticket panel\` - Create ticket panel`
            )
            .setFooter({ text: 'Create tickets for support!' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async createTicket(message, args, guildConfig, guildId) {
        const subject = args.join(' ') || 'Support Request';
        const categoryId = guildConfig.features.ticketSystem.category;
        const maxTickets = guildConfig.features.ticketSystem.maxTickets || 5;

        // Check if user already has max tickets
        const userTickets = await Ticket.find({
            guildId,
            userId: message.author.id,
            status: { $in: ['open', 'claimed'] }
        });

        if (userTickets.length >= maxTickets) {
            const embed = await errorEmbed(guildId, 'Ticket Limit',
                `${GLYPHS.ERROR} You already have ${maxTickets} open tickets.\n\n` +
                `Please close an existing ticket before creating a new one.`
            );
            return message.reply({ embeds: [embed] });
        }

        // Get next ticket number
        const ticketNumber = await Ticket.getNextTicketNumber(guildId);

        // Create ticket channel
        const ticketChannel = await message.guild.channels.create({
            name: `ticket-${ticketNumber}`,
            type: ChannelType.GuildText,
            parent: categoryId,
            topic: `Ticket #${ticketNumber} | ${message.author.tag} | ${subject}`,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: message.author.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: message.client.user.id,
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
            userId: message.author.id,
            username: message.author.tag,
            subject,
            status: 'open',
            participants: [message.author.id]
        });

        // Send welcome embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🎫 Ticket #${ticketNumber}`)
            .setDescription(
                `Hello ${message.author}! Thank you for creating a ticket.\n\n` +
                `**Subject:** ${subject}\n\n` +
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
            content: `${message.author}`,
            embeds: [welcomeEmbed], 
            components: [buttonRow] 
        });

        // Log to ticket log
        const logChannelId = guildConfig.channels.ticketLog;
        if (logChannelId) {
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('🎫 Ticket Created')
                    .addFields(
                        { name: 'Ticket', value: `#${ticketNumber}`, inline: true },
                        { name: 'User', value: `${message.author.tag}`, inline: true },
                        { name: 'Channel', value: `${ticketChannel}`, inline: true },
                        { name: 'Subject', value: subject, inline: false }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        const embed = await successEmbed(guildId, 'Ticket Created',
            `${GLYPHS.SUCCESS} Your ticket has been created: ${ticketChannel}`
        );
        return message.reply({ embeds: [embed] });
    },

    async closeTicket(message, args, guildConfig, guildId) {
        // Check if in a ticket channel
        const ticket = await Ticket.findOne({
            guildId,
            channelId: message.channel.id,
            status: { $in: ['open', 'claimed'] }
        });

        if (!ticket) {
            const embed = await errorEmbed(guildId, 'Not a Ticket',
                `${GLYPHS.ERROR} This command can only be used in a ticket channel.`
            );
            return message.reply({ embeds: [embed] });
        }

        const reason = args.join(' ') || 'No reason provided';

        // Update ticket status
        ticket.status = 'closed';
        ticket.closedBy = message.author.id;
        ticket.closedByTag = message.author.tag;
        ticket.closedAt = new Date();
        ticket.closeReason = reason;
        await ticket.save();

        // Send closing message
        const closeEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🔒 Ticket Closed')
            .setDescription(
                `This ticket has been closed by ${message.author}.\n\n` +
                `**Reason:** ${reason}\n\n` +
                `This channel will be deleted in 5 seconds.`
            )
            .setTimestamp();

        await message.channel.send({ embeds: [closeEmbed] });

        // Log to ticket log
        const logChannelId = guildConfig.channels.ticketLog;
        if (logChannelId) {
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('🔒 Ticket Closed')
                    .addFields(
                        { name: 'Ticket', value: `#${ticket.ticketNumber}`, inline: true },
                        { name: 'Opened By', value: ticket.username, inline: true },
                        { name: 'Closed By', value: message.author.tag, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // Delete channel after 5 seconds
        setTimeout(async () => {
            try {
                await message.channel.delete('Ticket closed');
            } catch (e) {
                console.error('Failed to delete ticket channel:', e);
            }
        }, 5000);
    },

    async addUser(message, args, guildConfig, guildId) {
        const ticket = await Ticket.findOne({
            guildId,
            channelId: message.channel.id,
            status: { $in: ['open', 'claimed'] }
        });

        if (!ticket) {
            const embed = await errorEmbed(guildId, 'Not a Ticket',
                `${GLYPHS.ERROR} This command can only be used in a ticket channel.`
            );
            return message.reply({ embeds: [embed] });
        }

        const user = message.mentions.users.first();
        if (!user) {
            const embed = await errorEmbed(guildId, 'No User',
                `${GLYPHS.ERROR} Please mention a user to add.\n\n` +
                `**Usage:** \`!ticket add @user\``
            );
            return message.reply({ embeds: [embed] });
        }

        // Add user to channel
        await message.channel.permissionOverwrites.create(user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        // Add to participants
        if (!ticket.participants.includes(user.id)) {
            ticket.participants.push(user.id);
            await ticket.save();
        }

        const embed = await successEmbed(guildId, 'User Added',
            `${GLYPHS.SUCCESS} ${user} has been added to this ticket.`
        );
        return message.reply({ embeds: [embed] });
    },

    async removeUser(message, args, guildConfig, guildId) {
        const ticket = await Ticket.findOne({
            guildId,
            channelId: message.channel.id,
            status: { $in: ['open', 'claimed'] }
        });

        if (!ticket) {
            const embed = await errorEmbed(guildId, 'Not a Ticket',
                `${GLYPHS.ERROR} This command can only be used in a ticket channel.`
            );
            return message.reply({ embeds: [embed] });
        }

        const user = message.mentions.users.first();
        if (!user) {
            const embed = await errorEmbed(guildId, 'No User',
                `${GLYPHS.ERROR} Please mention a user to remove.\n\n` +
                `**Usage:** \`!ticket remove @user\``
            );
            return message.reply({ embeds: [embed] });
        }

        // Can't remove ticket creator
        if (user.id === ticket.userId) {
            const embed = await errorEmbed(guildId, 'Cannot Remove',
                `${GLYPHS.ERROR} You cannot remove the ticket creator.`
            );
            return message.reply({ embeds: [embed] });
        }

        // Remove user from channel
        await message.channel.permissionOverwrites.delete(user.id);

        // Remove from participants
        ticket.participants = ticket.participants.filter(p => p !== user.id);
        await ticket.save();

        const embed = await successEmbed(guildId, 'User Removed',
            `${GLYPHS.SUCCESS} ${user} has been removed from this ticket.`
        );
        return message.reply({ embeds: [embed] });
    },

    async claimTicket(message, guildConfig, guildId) {
        const ticket = await Ticket.findOne({
            guildId,
            channelId: message.channel.id,
            status: 'open'
        });

        if (!ticket) {
            const embed = await errorEmbed(guildId, 'Not Available',
                `${GLYPHS.ERROR} This ticket is not available to claim.`
            );
            return message.reply({ embeds: [embed] });
        }

        // Update ticket
        ticket.status = 'claimed';
        ticket.claimedBy = message.author.id;
        ticket.claimedByTag = message.author.tag;
        ticket.claimedAt = new Date();
        await ticket.save();

        const embed = await successEmbed(guildId, 'Ticket Claimed',
            `${GLYPHS.SUCCESS} ${message.author} has claimed this ticket!\n\n` +
            `They will be handling your support request.`
        );
        return message.reply({ embeds: [embed] });
    },

    async renameTicket(message, args, guildConfig, guildId) {
        const ticket = await Ticket.findOne({
            guildId,
            channelId: message.channel.id,
            status: { $in: ['open', 'claimed'] }
        });

        if (!ticket) {
            const embed = await errorEmbed(guildId, 'Not a Ticket',
                `${GLYPHS.ERROR} This command can only be used in a ticket channel.`
            );
            return message.reply({ embeds: [embed] });
        }

        const newName = args.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!newName) {
            const embed = await errorEmbed(guildId, 'Invalid Name',
                `${GLYPHS.ERROR} Please provide a valid name.\n\n` +
                `**Usage:** \`!ticket rename <name>\``
            );
            return message.reply({ embeds: [embed] });
        }

        await message.channel.setName(`ticket-${newName}`);

        const embed = await successEmbed(guildId, 'Ticket Renamed',
            `${GLYPHS.SUCCESS} Ticket has been renamed to \`ticket-${newName}\`.`
        );
        return message.reply({ embeds: [embed] });
    },

    async createPanel(message, guildConfig, guildId) {
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const embed = await errorEmbed(guildId, 'Permission Denied',
                `${GLYPHS.ERROR} You need Manage Server permission.`
            );
            return message.reply({ embeds: [embed] });
        }

        const panelEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎫 Support Tickets')
            .setDescription(
                '**Need help? Open a support ticket!**\n\n' +
                'Click the button below to create a new ticket.\n' +
                'Our support team will assist you as soon as possible.\n\n' +
                '📋 **Guidelines:**\n' +
                '• Be patient and respectful\n' +
                '• Provide clear details about your issue\n' +
                '• One issue per ticket'
            )
            .setFooter({ text: 'Click below to open a ticket' })
            .setTimestamp();

        const ticketButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

        await message.channel.send({ embeds: [panelEmbed], components: [ticketButton] });

        try {
            await message.delete();
        } catch (e) { }
    }
};
