import { EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'noxp',
    description: 'Manage channels where XP is not earned',
    usage: 'noxp add #channel | noxp remove #channel | noxp list',
    category: 'config',
    aliases: ['xpblacklist', 'ignorexp', 'noxpchannel'],
    permissions: {
        user: PermissionFlagsBits.ManageGuild
    },
    cooldown: 5,

    async execute(message, args) {
        const guildId = message.guild.id;
        const subCommand = args[0]?.toLowerCase();

        const guildConfig = await Guild.getGuild(guildId);

        // Initialize noXpChannels array if not exists
        if (!guildConfig.features.levelSystem.noXpChannels) {
            guildConfig.features.levelSystem.noXpChannels = [];
        }

        // No args - show help
        if (!subCommand) {
            return this.showHelp(message, guildId, guildConfig);
        }

        switch (subCommand) {
            case 'add':
                return this.addChannel(message, args.slice(1), guildConfig, guildId);
            case 'remove':
            case 'delete':
                return this.removeChannel(message, args.slice(1), guildConfig, guildId);
            case 'list':
            case 'show':
                return this.listChannels(message, guildConfig, guildId);
            case 'clear':
                return this.clearChannels(message, guildConfig, guildId);
            default:
                return this.showHelp(message, guildId, guildConfig);
        }
    },

    async showHelp(message, guildId, guildConfig) {
        const channels = guildConfig.features.levelSystem.noXpChannels || [];
        const prefix = await getPrefix(guildId);
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🚫 No-XP Channels')
            .setDescription(
                `**Blacklisted Channels:** ${channels.length}\n\n` +
                `Messages in these channels won't earn XP.\n\n` +
                `**Commands:**\n` +
                `${GLYPHS.ARROW_RIGHT} \`${prefix}noxp add #channel\` - Blacklist channel\n` +
                `${GLYPHS.ARROW_RIGHT} \`${prefix}noxp remove #channel\` - Remove from blacklist\n` +
                `${GLYPHS.ARROW_RIGHT} \`${prefix}noxp list\` - View blacklisted channels\n` +
                `${GLYPHS.ARROW_RIGHT} \`${prefix}noxp clear\` - Clear all\n\n` +
                `**Example:**\n` +
                `\`${prefix}noxp add #spam\`\n` +
                `\`${prefix}noxp add #bot-commands\``
            )
            .setFooter({ text: 'Great for spam/bot command channels!' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async addChannel(message, args, guildConfig, guildId) {
        const channel = message.mentions.channels.first() || 
            message.guild.channels.cache.get(args[0]);
        const prefix = await getPrefix(guildId);

        if (!channel) {
            const embed = await errorEmbed(guildId, 'No Channel',
                `${GLYPHS.ERROR} Please mention a channel or provide a channel ID.\n\n` +
                `**Usage:** \`${prefix}noxp add #channel\``
            );
            return message.reply({ embeds: [embed] });
        }

        if (channel.type !== ChannelType.GuildText) {
            const embed = await errorEmbed(guildId, 'Invalid Channel',
                `${GLYPHS.ERROR} Please select a text channel.`
            );
            return message.reply({ embeds: [embed] });
        }

        // Check if already blacklisted
        if (guildConfig.features.levelSystem.noXpChannels.includes(channel.id)) {
            const embed = await errorEmbed(guildId, 'Already Blacklisted',
                `${GLYPHS.ERROR} ${channel} is already blacklisted from earning XP.`
            );
            return message.reply({ embeds: [embed] });
        }

        await Guild.updateGuild(guildId, {
            $push: { 'features.levelSystem.noXpChannels': channel.id }
        });

        const embed = await successEmbed(guildId, 'Channel Blacklisted',
            `${GLYPHS.SUCCESS} ${channel} has been added to the no-XP list.\n\n` +
            `Messages in this channel will no longer earn XP.`
        );
        return message.reply({ embeds: [embed] });
    },

    async removeChannel(message, args, guildConfig, guildId) {
        const channel = message.mentions.channels.first() || 
            message.guild.channels.cache.get(args[0]);
        const prefix = await getPrefix(guildId);

        if (!channel) {
            const embed = await errorEmbed(guildId, 'No Channel',
                `${GLYPHS.ERROR} Please mention a channel or provide a channel ID.\n\n` +
                `**Usage:** \`${prefix}noxp remove #channel\``
            );
            return message.reply({ embeds: [embed] });
        }

        const index = guildConfig.features.levelSystem.noXpChannels.indexOf(channel.id);

        if (index === -1) {
            const embed = await errorEmbed(guildId, 'Not Blacklisted',
                `${GLYPHS.ERROR} ${channel} is not in the no-XP list.`
            );
            return message.reply({ embeds: [embed] });
        }

        await Guild.updateGuild(guildId, {
            $pull: { 'features.levelSystem.noXpChannels': channel.id }
        });

        const embed = await successEmbed(guildId, 'Channel Removed',
            `${GLYPHS.SUCCESS} ${channel} has been removed from the no-XP list.\n\n` +
            `Messages in this channel will now earn XP again.`
        );
        return message.reply({ embeds: [embed] });
    },

    async listChannels(message, guildConfig, guildId) {
        const channels = guildConfig.features.levelSystem.noXpChannels || [];
        const prefix = await getPrefix(guildId);

        if (channels.length === 0) {
            const embed = await infoEmbed(guildId, 'No Blacklisted Channels',
                `${GLYPHS.INFO} No channels are blacklisted from earning XP.\n\n` +
                `Use \`${prefix}noxp add #channel\` to add one!`
            );
            return message.reply({ embeds: [embed] });
        }

        const channelList = channels.map(id => {
            const channel = message.guild.channels.cache.get(id);
            return channel ? `${GLYPHS.ARROW_RIGHT} ${channel}` : `${GLYPHS.ARROW_RIGHT} <Deleted Channel>`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🚫 No-XP Channels')
            .setDescription(
                `**Blacklisted Channels:**\n\n${channelList}`
            )
            .setFooter({ text: `${channels.length} channel(s) blacklisted` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async clearChannels(message, guildConfig, guildId) {
        if (guildConfig.features.levelSystem.noXpChannels.length === 0) {
            const embed = await errorEmbed(guildId, 'No Channels',
                `${GLYPHS.ERROR} There are no blacklisted channels to clear.`
            );
            return message.reply({ embeds: [embed] });
        }

        await Guild.updateGuild(guildId, {
            $set: { 'features.levelSystem.noXpChannels': [] }
        });

        const embed = await successEmbed(guildId, 'Channels Cleared',
            `${GLYPHS.SUCCESS} All channels have been removed from the no-XP list.`
        );
        return message.reply({ embeds: [embed] });
    }
};
