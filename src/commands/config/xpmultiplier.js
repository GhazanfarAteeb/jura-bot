import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'xpmultiplier',
    description: 'Manage XP multipliers for roles',
    usage: 'xpmultiplier add @role <multiplier> | xpmultiplier remove @role | xpmultiplier list | xpmultiplier booster <multiplier>',
    category: 'config',
    aliases: ['xpmult', 'xpboost', 'xpbonus'],
    permissions: {
        user: PermissionFlagsBits.ManageGuild
    },
    cooldown: 5,

    async execute(message, args) {
        const guildId = message.guild.id;
        const subCommand = args[0]?.toLowerCase();

        const guildConfig = await Guild.getGuild(guildId);

        // Initialize xpMultipliers array if not exists
        if (!guildConfig.features.levelSystem.xpMultipliers) {
            guildConfig.features.levelSystem.xpMultipliers = [];
        }

        // No args - show help
        if (!subCommand) {
            return this.showHelp(message, guildId, guildConfig);
        }

        switch (subCommand) {
            case 'add':
            case 'set':
                return this.addMultiplier(message, args.slice(1), guildConfig, guildId);
            case 'remove':
            case 'delete':
                return this.removeMultiplier(message, args.slice(1), guildConfig, guildId);
            case 'list':
            case 'show':
                return this.listMultipliers(message, guildConfig, guildId);
            case 'booster':
            case 'boost':
                return this.setBoosterMultiplier(message, args.slice(1), guildConfig, guildId);
            case 'clear':
                return this.clearMultipliers(message, guildConfig, guildId);
            default:
                return this.showHelp(message, guildId, guildConfig);
        }
    },

    async showHelp(message, guildId, guildConfig) {
        const multipliers = guildConfig.features.levelSystem.xpMultipliers || [];
        const boosterMult = guildConfig.features.levelSystem.boosterMultiplier || 1.5;
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('⚡ XP Multipliers')
            .setDescription(
                `**Role Multipliers:** ${multipliers.length}\n` +
                `**Booster Multiplier:** ${boosterMult}x\n\n` +
                `**Commands:**\n` +
                `${GLYPHS.ARROW_RIGHT} \`!xpmultiplier add @role <mult>\` - Add multiplier\n` +
                `${GLYPHS.ARROW_RIGHT} \`!xpmultiplier remove @role\` - Remove multiplier\n` +
                `${GLYPHS.ARROW_RIGHT} \`!xpmultiplier list\` - View all multipliers\n` +
                `${GLYPHS.ARROW_RIGHT} \`!xpmultiplier booster <mult>\` - Set booster bonus\n` +
                `${GLYPHS.ARROW_RIGHT} \`!xpmultiplier clear\` - Remove all\n\n` +
                `**Example:**\n` +
                `\`!xpmultiplier add @VIP 2.0\` - VIPs get 2x XP\n` +
                `\`!xpmultiplier booster 1.5\` - Boosters get 1.5x XP`
            )
            .setFooter({ text: 'Multipliers stack! VIP + Booster = 2.0 + 0.5 = 2.5x' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async addMultiplier(message, args, guildConfig, guildId) {
        const role = message.mentions.roles.first();
        const multiplier = parseFloat(args[1] || args[0]);

        if (!role) {
            const embed = await errorEmbed(guildId, 'No Role',
                `${GLYPHS.ERROR} Please mention a role.\n\n` +
                `**Usage:** \`!xpmultiplier add @role <multiplier>\``
            );
            return message.reply({ embeds: [embed] });
        }

        if (!multiplier || isNaN(multiplier) || multiplier < 0.1 || multiplier > 10) {
            const embed = await errorEmbed(guildId, 'Invalid Multiplier',
                `${GLYPHS.ERROR} Please provide a valid multiplier (0.1 - 10).\n\n` +
                `**Usage:** \`!xpmultiplier add @role <multiplier>\`\n` +
                `**Example:** \`!xpmultiplier add @VIP 2.0\``
            );
            return message.reply({ embeds: [embed] });
        }

        // Check if role already has a multiplier
        const existingIndex = guildConfig.features.levelSystem.xpMultipliers.findIndex(
            m => m.roleId === role.id
        );

        if (existingIndex !== -1) {
            guildConfig.features.levelSystem.xpMultipliers[existingIndex].multiplier = multiplier;
        } else {
            guildConfig.features.levelSystem.xpMultipliers.push({
                roleId: role.id,
                multiplier
            });
        }

        await guildConfig.save();

        // Clear cache
        if (global.guildCache) global.guildCache.delete(guildId);

        const embed = await successEmbed(guildId, 'Multiplier Set',
            `${GLYPHS.SUCCESS} ${role} now has a **${multiplier}x** XP multiplier!\n\n` +
            `Members with this role will earn ${multiplier}x more XP.`
        );
        return message.reply({ embeds: [embed] });
    },

    async removeMultiplier(message, args, guildConfig, guildId) {
        const role = message.mentions.roles.first() || 
            message.guild.roles.cache.get(args[0]);

        if (!role) {
            const embed = await errorEmbed(guildId, 'No Role',
                `${GLYPHS.ERROR} Please mention a role or provide a role ID.\n\n` +
                `**Usage:** \`!xpmultiplier remove @role\``
            );
            return message.reply({ embeds: [embed] });
        }

        const index = guildConfig.features.levelSystem.xpMultipliers.findIndex(
            m => m.roleId === role.id
        );

        if (index === -1) {
            const embed = await errorEmbed(guildId, 'Not Found',
                `${GLYPHS.ERROR} ${role} doesn't have an XP multiplier set.`
            );
            return message.reply({ embeds: [embed] });
        }

        guildConfig.features.levelSystem.xpMultipliers.splice(index, 1);
        await guildConfig.save();

        // Clear cache
        if (global.guildCache) global.guildCache.delete(guildId);

        const embed = await successEmbed(guildId, 'Multiplier Removed',
            `${GLYPHS.SUCCESS} Removed the XP multiplier from ${role}.`
        );
        return message.reply({ embeds: [embed] });
    },

    async listMultipliers(message, guildConfig, guildId) {
        const multipliers = guildConfig.features.levelSystem.xpMultipliers || [];
        const boosterMult = guildConfig.features.levelSystem.boosterMultiplier || 1.5;

        let description = `**🚀 Server Booster Bonus:** ${boosterMult}x\n\n`;

        if (multipliers.length === 0) {
            description += `**Role Multipliers:**\nNo role multipliers set.\n\nUse \`!xpmultiplier add @role <mult>\` to add one!`;
        } else {
            description += `**Role Multipliers:**\n`;
            description += multipliers.map(m => {
                const role = message.guild.roles.cache.get(m.roleId);
                return `${GLYPHS.ARROW_RIGHT} ${role || '<Deleted Role>'} — **${m.multiplier}x**`;
            }).join('\n');
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('⚡ XP Multipliers')
            .setDescription(description)
            .setFooter({ text: 'Highest role multiplier is used (they don\'t stack)' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async setBoosterMultiplier(message, args, guildConfig, guildId) {
        const multiplier = parseFloat(args[0]);

        if (!multiplier || isNaN(multiplier) || multiplier < 1 || multiplier > 5) {
            const embed = await errorEmbed(guildId, 'Invalid Multiplier',
                `${GLYPHS.ERROR} Please provide a valid multiplier (1.0 - 5.0).\n\n` +
                `**Usage:** \`!xpmultiplier booster <multiplier>\`\n` +
                `**Example:** \`!xpmultiplier booster 1.5\``
            );
            return message.reply({ embeds: [embed] });
        }

        guildConfig.features.levelSystem.boosterMultiplier = multiplier;
        await guildConfig.save();

        // Clear cache
        if (global.guildCache) global.guildCache.delete(guildId);

        const embed = await successEmbed(guildId, 'Booster Multiplier Set',
            `${GLYPHS.SUCCESS} Server boosters now get **${multiplier}x** XP!\n\n` +
            `🚀 Thank your boosters with bonus XP!`
        );
        return message.reply({ embeds: [embed] });
    },

    async clearMultipliers(message, guildConfig, guildId) {
        guildConfig.features.levelSystem.xpMultipliers = [];
        await guildConfig.save();

        // Clear cache
        if (global.guildCache) global.guildCache.delete(guildId);

        const embed = await successEmbed(guildId, 'Multipliers Cleared',
            `${GLYPHS.SUCCESS} All role XP multipliers have been cleared.\n\n` +
            `Note: Booster multiplier is still active.`
        );
        return message.reply({ embeds: [embed] });
    }
};
