import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'setprofile',
    description: 'Customize your profile settings',
    usage: 'setprofile <bio/title/color/accent> <value>',
    category: 'economy',
    aliases: ['customize', 'profileset'],
    cooldown: 5,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        const setting = args[0]?.toLowerCase();
        const value = args.slice(1).join(' ');
        
        if (!setting) {
            const prefix = await getPrefix(guildId);
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('⚙️ Profile Customization')
                    .setDescription('Customize your profile with these settings:')
                    .addFields(
                        { name: '📝 Bio', value: `\`${prefix}setprofile bio <text>\`\nSet your profile bio (max 200 chars)`, inline: false },
                        { name: '📄 Description', value: `\`${prefix}setprofile description <text>\`\nSet profile description (max 500 chars)`, inline: false },
                        { name: '👑 Title', value: `\`${prefix}setprofile title <text>\`\nSet a custom title`, inline: false },
                        { name: '🎨 Background Color', value: `\`${prefix}setprofile color <hex>\`\nSet background color (e.g., #FF0000)`, inline: false },
                        { name: '✨ Accent Color', value: `\`${prefix}setprofile accent <hex>\`\nSet accent color for borders`, inline: false },
                        { name: '💫 Blur Color', value: `\`${prefix}setprofile blurcolor <rgba>\`\nSet description blur (e.g., rgba(0,0,0,0.7))`, inline: false },
                        { name: '🔘 Toggle Stats', value: `\`${prefix}setprofile stats on/off\`\nShow/hide stats on profile`, inline: false },
                        { name: '🏅 Toggle Badges', value: `\`${prefix}setprofile badges on/off\`\nShow/hide badges on profile`, inline: false }
                    )
                    .setFooter({ text: `Use ${prefix}profile to preview changes` })
                ]
            });
        }
        
        try {
            const economy = await Economy.getEconomy(userId, guildId);
            
            switch (setting) {
                case 'bio':
                    if (!value) {
                        economy.profile.bio = '';
                        await economy.save();
                        return message.reply('✅ Bio cleared!');
                    }
                    
                    if (value.length > 200) {
                        return message.reply('❌ Bio must be 200 characters or less!');
                    }
                    
                    economy.profile.bio = value;
                    await economy.save();
                    message.reply(`✅ Bio updated to: "${value}"`);
                    break;
                    
                case 'description':
                case 'desc':
                    if (!value) {
                        economy.profile.description = '';
                        await economy.save();
                        return message.reply('✅ Description cleared!');
                    }
                    
                    if (value.length > 500) {
                        return message.reply('❌ Description must be 500 characters or less!');
                    }
                    
                    economy.profile.description = value;
                    await economy.save();
                    message.reply(`✅ Description updated! (${value.length}/500 characters)`);
                    break;
                    
                case 'title':
                    if (!value) {
                        economy.profile.title = '';
                        await economy.save();
                        return message.reply('✅ Title cleared!');
                    }
                    
                    if (value.length > 100) {
                        return message.reply('❌ Title must be 100 characters or less!');
                    }
                    
                    economy.profile.title = value;
                    await economy.save();
                    message.reply(`✅ Title updated to: "${value}"`);
                    break;
                    
                case 'color':
                case 'bgcolor':
                case 'backgroundcolor':
                    if (!value) {
                        return message.reply('❌ Please provide a hex color (e.g., #FF0000)');
                    }
                    
                    if (!/^#[0-9A-F]{6}$/i.test(value)) {
                        return message.reply('❌ Invalid hex color! Use format: #FF0000');
                    }
                    
                    economy.profile.backgroundColor = value;
                    await economy.save();
                    
                    const colorEmbed = new EmbedBuilder()
                        .setColor(value)
                        .setTitle('✅ Background Color Updated!')
                        .setDescription(`Set to: ${value}`)
                        .setFooter({ text: 'This applies to the solid color background' });
                    
                    message.reply({ embeds: [colorEmbed] });
                    break;
                    
                case 'accent':
                case 'accentcolor':
                case 'border':
                    if (!value) {
                        return message.reply('❌ Please provide a hex color (e.g., #7289DA)');
                    }
                    
                    if (!/^#[0-9A-F]{6}$/i.test(value)) {
                        return message.reply('❌ Invalid hex color! Use format: #7289DA');
                    }
                    
                    economy.profile.accentColor = value;
                    await economy.save();
                    
                    const accentEmbed = new EmbedBuilder()
                        .setColor(value)
                        .setTitle('✅ Accent Color Updated!')
                        .setDescription(`Set to: ${value}`)
                        .setFooter({ text: 'This applies to borders and highlights' });
                    
                    message.reply({ embeds: [accentEmbed] });
                    break;
                    
                case 'blur':
                case 'blurcolor':
                case 'descblur':
                    if (!value) {
                        return message.reply('❌ Please provide an rgba color (e.g., rgba(0,0,0,0.5))');
                    }
                    
                    // Validate rgba format
                    const rgbaRegex = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/;
                    if (!rgbaRegex.test(value)) {
                        return message.reply('❌ Invalid rgba format! Use: rgba(r, g, b, a)\nExample: rgba(0, 0, 0, 0.7)');
                    }
                    
                    economy.profile.blurColor = value;
                    await economy.save();
                    
                    const blurEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('✅ Blur Color Updated!')
                        .setDescription(`Set to: ${value}`)
                        .setFooter({ text: 'This applies to the description background blur' });
                    
                    message.reply({ embeds: [blurEmbed] });
                    break;
                    
                case 'stats':
                case 'showstats':
                    const statsValue = value.toLowerCase();
                    if (statsValue === 'on' || statsValue === 'true' || statsValue === 'yes') {
                        economy.profile.showStats = true;
                        await economy.save();
                        message.reply('✅ Stats will now be shown on your profile!');
                    } else if (statsValue === 'off' || statsValue === 'false' || statsValue === 'no') {
                        economy.profile.showStats = false;
                        await economy.save();
                        message.reply('✅ Stats will now be hidden on your profile!');
                    } else {
                        message.reply('❌ Use: on/off, true/false, or yes/no');
                    }
                    break;
                    
                case 'badges':
                case 'showbadges':
                    const badgesValue = value.toLowerCase();
                    if (badgesValue === 'on' || badgesValue === 'true' || badgesValue === 'yes') {
                        economy.profile.showBadges = true;
                        await economy.save();
                        message.reply('✅ Badges will now be shown on your profile!');
                    } else if (badgesValue === 'off' || badgesValue === 'false' || badgesValue === 'no') {
                        economy.profile.showBadges = false;
                        await economy.save();
                        message.reply('✅ Badges will now be hidden on your profile!');
                    } else {
                        message.reply('❌ Use: on/off, true/false, or yes/no');
                    }
                    break;
                    
                default:
                    message.reply('❌ Invalid setting! Use: bio, description, title, color, accent, blurcolor, stats, or badges');
            }
            
        } catch (error) {
            console.error('Set profile command error:', error);
            message.reply('❌ An error occurred while updating your profile. Please try again!');
        }
    }
};
