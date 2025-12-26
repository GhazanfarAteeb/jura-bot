import { EmbedBuilder } from 'discord.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'embedhelp',
    description: 'Guide for creating custom embeds',
    usage: 'embedhelp',
    category: 'utility',
    aliases: ['embedguide', 'embedinfo'],
    
    execute: async (message, args) => {
        const prefix = await getPrefix(message.guild.id);
        
        const embed1 = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📚 Custom Embed System Guide')
            .setDescription('Create beautiful custom embeds with images, GIFs, and user avatars!')
            .addFields(
                {
                    name: '🎯 Quick Start',
                    value: `\`\`\`\n${prefix}embed create welcome\n${prefix}embedset welcome title Welcome to {server}!\n${prefix}embedset welcome description Hello {user}!\n${prefix}embedset welcome thumbnail userAvatar\n${prefix}embed send welcome\n\`\`\``,
                    inline: false
                },
                {
                    name: '📝 Basic Commands',
                    value: `\`${prefix}embed create <name>\` - Create new embed\n` +
                           `\`${prefix}embed list\` - List all embeds\n` +
                           `\`${prefix}embed preview <name>\` - Preview embed\n` +
                           `\`${prefix}embed send <name> [#channel]\` - Send embed\n` +
                           `\`${prefix}embed delete <name>\` - Delete embed`,
                    inline: false
                },
                {
                    name: '⚙️ Configuration',
                    value: `\`${prefix}embedset <name> title <text>\` - Set title\n` +
                           `\`${prefix}embedset <name> description <text>\` - Set description\n` +
                           `\`${prefix}embedset <name> color <hex>\` - Set color (#FF0000)\n` +
                           `\`${prefix}embedset <name> content <text>\` - Set message text`,
                    inline: false
                }
            )
            .setTimestamp();
        
        const embed2 = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🖼️ Images & Avatars')
            .addFields(
                {
                    name: 'Images',
                    value: `\`${prefix}embedset <name> image <url>\` - Large image\n` +
                           `\`${prefix}embedset <name> thumbnail <url>\` - Small thumbnail\n` +
                           '• Attach an image instead of URL\n' +
                           '• Use GIF URLs for animated images',
                    inline: false
                },
                {
                    name: 'User Avatars',
                    value: `\`${prefix}embedset <name> thumbnail userAvatar\` - User's avatar as thumbnail\n` +
                           `\`${prefix}embedset <name> authorIcon userAvatar\` - User's avatar in author\n` +
                           `\`${prefix}embedset <name> footerIcon userAvatar\` - User's avatar in footer\n` +
                           `\`${prefix}embedset <name> footerIcon botAvatar\` - Bot's avatar in footer`,
                    inline: false
                },
                {
                    name: 'Example: Welcome Embed with Avatar',
                    value: `\`\`\`\n${prefix}embed create welcome\n${prefix}embedset welcome title Welcome {user.name}!\n${prefix}embedset welcome thumbnail userAvatar\n${prefix}embedset welcome color #00FF00\n${prefix}embed send welcome\n\`\`\``,
                    inline: false
                }
            )
            .setTimestamp();
        
        const embed3 = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('✨ Advanced Features')
            .addFields(
                {
                    name: 'Author Section',
                    value: `\`${prefix}embedset <name> author <text>\` - Set author name\n` +
                           `\`${prefix}embedset <name> author username\` - Use user's name\n` +
                           `\`${prefix}embedset <name> authorIcon <url>\` - Set author icon\n` +
                           `\`${prefix}embedset <name> authorIcon userAvatar\` - Use user avatar`,
                    inline: false
                },
                {
                    name: 'Footer',
                    value: `\`${prefix}embedset <name> footer <text>\` - Set footer text\n` +
                           `\`${prefix}embedset <name> footerIcon <url>\` - Set footer icon\n` +
                           `\`${prefix}embedset <name> footerIcon userAvatar\` - User avatar\n` +
                           `\`${prefix}embedset <name> footerIcon botAvatar\` - Bot avatar`,
                    inline: false
                },
                {
                    name: 'Fields',
                    value: `\`${prefix}embedset <name> addfield <name> | <value>\` - Add field\n` +
                           `\`${prefix}embedset <name> addfield <name> | <value> | inline\` - Inline field\n` +
                           `\`${prefix}embedset <name> removefield <number>\` - Remove field\n` +
                           '• Maximum 25 fields per embed',
                    inline: false
                },
                {
                    name: 'Other Options',
                    value: `\`${prefix}embedset <name> url <link>\` - Make title clickable\n` +
                           `\`${prefix}embedset <name> timestamp on/off\` - Toggle timestamp\n` +
                           `\`${prefix}embedset <name> category <type>\` - Set category`,
                    inline: false
                }
            )
            .setTimestamp();
        
        const embed4 = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🔤 Variables & Placeholders')
            .setDescription('Use these in any text field to dynamically insert information:')
            .addFields(
                {
                    name: 'User Variables',
                    value: '`{user}` - Mention user (@User)\n' +
                           '`{user.name}` - Username only\n' +
                           '`{user.displayName}` - Display name\n' +
                           '`{user.tag}` - User#1234 or @username\n' +
                           '`{user.id}` - User ID',
                    inline: true
                },
                {
                    name: 'Server Variables',
                    value: '`{server}` - Server name\n' +
                           '`{server.name}` - Server name\n' +
                           '`{server.members}` - Member count\n' +
                           '`{server.id}` - Server ID',
                    inline: true
                },
                {
                    name: 'Channel Variables',
                    value: '`{channel}` - Mention channel\n' +
                           '`{channel.name}` - Channel name\n' +
                           '`{channel.id}` - Channel ID',
                    inline: true
                },
                {
                    name: 'Date/Time Variables',
                    value: '`{date}` - Current date\n' +
                           '`{time}` - Current time\n' +
                           '`{datetime}` - Date and time',
                    inline: true
                },
                {
                    name: 'Example Usage',
                    value: '```\nWelcome {user} to {server}!\nWe now have {server.members} members!\nYou joined on {date}\n```',
                    inline: false
                }
            )
            .setTimestamp();
        
        const embed5 = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('💡 Example Templates')
            .addFields(
                {
                    name: '1️⃣ Welcome Message with Avatar',
                    value: '```\n!embed create welcome\n!embedset welcome title Welcome to {server}!\n!embedset welcome description Hey {user}, welcome to our community!\n!embedset welcome thumbnail userAvatar\n!embedset welcome color #00FF00\n!embedset welcome footer Enjoy your stay!\n!embedset welcome footerIcon botAvatar\n```',
                    inline: false
                },
                {
                    name: '2️⃣ Announcement with Image',
                    value: '```\n!embed create announcement\n!embedset announcement title 📢 Important Announcement\n!embedset announcement description Check out this update!\n!embedset announcement image https://i.imgur.com/example.gif\n!embedset announcement color #FF0000\n```',
                    inline: false
                },
                {
                    name: '3️⃣ Rules Embed with Fields',
                    value: '```\n!embed create rules\n!embedset rules title 📋 Server Rules\n!embedset rules color #5865F2\n!embedset rules addfield Rule 1 | Be respectful | inline\n!embedset rules addfield Rule 2 | No spam | inline\n!embedset rules addfield Rule 3 | Have fun! | inline\n```',
                    inline: false
                },
                {
                    name: '4️⃣ User Info Card',
                    value: '```\n!embed create usercard\n!embedset usercard author username\n!embedset usercard authorIcon userAvatar\n!embedset usercard thumbnail userAvatar\n!embedset usercard description Member since {date}\n!embedset usercard color #9B59B6\n```',
                    inline: false
                }
            )
            .setFooter({ text: 'Tip: Save embeds as templates and reuse them anytime!' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed1] });
        await message.channel.send({ embeds: [embed2] });
        await message.channel.send({ embeds: [embed3] });
        await message.channel.send({ embeds: [embed4] });
        await message.channel.send({ embeds: [embed5] });
    }
};
