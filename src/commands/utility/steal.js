import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'steal',
    aliases: ['addemoji', 'stealemoji', 'yoink'],
    description: 'Add an emoji or sticker from another server, URL, or replied message to this server',
    usage: 'steal [emoji or URL] [name] OR reply to a message with steal [name]',
    category: 'utility',
    cooldown: 5,
    permissions: ['ManageGuildExpressions'],
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const prefix = await getPrefix(guildId);
        
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'You need **Manage Expressions** permission to add emojis/stickers!')]
            });
        }
        
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'I need **Manage Expressions** permission to add emojis/stickers!')]
            });
        }
        
        // Check if replying to a message
        const repliedMessage = message.reference ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null) : null;
        
        // Collect stealable items from replied message
        let stealableItems = [];
        
        if (repliedMessage) {
            // Check if it's a forwarded message (has messageSnapshots)
            if (repliedMessage.messageSnapshots?.size > 0) {
                for (const snapshot of repliedMessage.messageSnapshots.values()) {
                    // Check for stickers in forwarded message
                    if (snapshot.stickers?.size > 0) {
                        for (const sticker of snapshot.stickers.values()) {
                            stealableItems.push({
                                type: 'sticker',
                                name: sticker.name,
                                url: sticker.url,
                                id: sticker.id,
                                format: sticker.format,
                                isAnimated: sticker.format === 2 // APNG
                            });
                        }
                    }
                    
                    // Check for custom emojis in forwarded message content
                    if (snapshot.content) {
                        const emojiRegex = /<(a)?:(\w{2,32}):(\d{17,19})>/g;
                        let match;
                        while ((match = emojiRegex.exec(snapshot.content)) !== null) {
                            const isAnimated = !!match[1];
                            const emojiName = match[2];
                            const emojiId = match[3];
                            stealableItems.push({
                                type: 'emoji',
                                name: emojiName,
                                id: emojiId,
                                url: `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=128`,
                                isAnimated
                            });
                        }
                    }
                    
                    // Check for image attachments in forwarded message
                    if (snapshot.attachments?.size > 0) {
                        for (const attachment of snapshot.attachments.values()) {
                            if (attachment.contentType?.startsWith('image/')) {
                                stealableItems.push({
                                    type: 'image',
                                    name: args[0] || attachment.name?.split('.')[0] || 'stolen',
                                    url: attachment.url,
                                    isAnimated: attachment.contentType === 'image/gif'
                                });
                            }
                        }
                    }
                    
                    // Check for embeds with images/GIFs in forwarded message
                    if (snapshot.embeds?.length > 0) {
                        for (const embed of snapshot.embeds) {
                            if (embed.video?.url) {
                                let gifUrl = embed.thumbnail?.url || embed.image?.url;
                                if (gifUrl) {
                                    stealableItems.push({
                                        type: 'image',
                                        name: args[0] || 'stolen_gif',
                                        url: gifUrl,
                                        isAnimated: true
                                    });
                                }
                            } else if (embed.image?.url) {
                                stealableItems.push({
                                    type: 'image',
                                    name: args[0] || 'stolen_image',
                                    url: embed.image.url,
                                    isAnimated: embed.image.url.toLowerCase().includes('.gif')
                                });
                            } else if (embed.thumbnail?.url && !embed.video) {
                                stealableItems.push({
                                    type: 'image',
                                    name: args[0] || 'stolen_image',
                                    url: embed.thumbnail.url,
                                    isAnimated: embed.thumbnail.url.toLowerCase().includes('.gif')
                                });
                            }
                        }
                    }
                }
            }
            
            // Check for stickers in replied message (non-forwarded)
            if (repliedMessage.stickers?.size > 0) {
                for (const sticker of repliedMessage.stickers.values()) {
                    stealableItems.push({
                        type: 'sticker',
                        name: sticker.name,
                        url: sticker.url,
                        id: sticker.id,
                        format: sticker.format,
                        isAnimated: sticker.format === 2 // APNG
                    });
                }
            }
            
            // Check for custom emojis in replied message content
            const emojiRegex = /<(a)?:(\w{2,32}):(\d{17,19})>/g;
            let match;
            while ((match = emojiRegex.exec(repliedMessage.content)) !== null) {
                const isAnimated = !!match[1];
                const emojiName = match[2];
                const emojiId = match[3];
                stealableItems.push({
                    type: 'emoji',
                    name: emojiName,
                    id: emojiId,
                    url: `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=128`,
                    isAnimated
                });
            }
            
            // Check for image attachments in replied message
            if (repliedMessage.attachments?.size > 0) {
                for (const attachment of repliedMessage.attachments.values()) {
                    if (attachment.contentType?.startsWith('image/')) {
                        stealableItems.push({
                            type: 'image',
                            name: args[0] || attachment.name?.split('.')[0] || 'stolen',
                            url: attachment.url,
                            isAnimated: attachment.contentType === 'image/gif'
                        });
                    }
                }
            }
            
            // Check for embeds with images/GIFs (Tenor, Giphy, etc.)
            if (repliedMessage.embeds?.length > 0) {
                for (const embed of repliedMessage.embeds) {
                    // Check for video embeds (Tenor/Giphy GIFs are usually video type)
                    if (embed.video?.url) {
                        // Try to get the GIF URL from Tenor/Giphy
                        let gifUrl = null;
                        let gifName = args[0] || 'stolen_gif';
                        
                        // Tenor GIFs
                        if (embed.url?.includes('tenor.com')) {
                            // Use the thumbnail or image as it's usually a GIF
                            gifUrl = embed.thumbnail?.url || embed.image?.url;
                            if (!gifUrl && embed.video?.url) {
                                // Convert mp4 to gif for tenor
                                gifUrl = embed.video.url.replace('.mp4', '.gif');
                            }
                        }
                        // Giphy GIFs
                        else if (embed.url?.includes('giphy.com')) {
                            gifUrl = embed.thumbnail?.url || embed.image?.url;
                        }
                        // Generic video embed with thumbnail
                        else if (embed.thumbnail?.url) {
                            gifUrl = embed.thumbnail.url;
                        }
                        
                        if (gifUrl) {
                            stealableItems.push({
                                type: 'image',
                                name: gifName,
                                url: gifUrl,
                                isAnimated: true
                            });
                        }
                    }
                    // Check for image embeds
                    else if (embed.image?.url) {
                        const url = embed.image.url;
                        const isGif = url.toLowerCase().includes('.gif');
                        stealableItems.push({
                            type: 'image',
                            name: args[0] || 'stolen_image',
                            url: url,
                            isAnimated: isGif
                        });
                    }
                    // Check for thumbnail only embeds
                    else if (embed.thumbnail?.url && !embed.video) {
                        const url = embed.thumbnail.url;
                        const isGif = url.toLowerCase().includes('.gif');
                        stealableItems.push({
                            type: 'image',
                            name: args[0] || 'stolen_image',
                            url: url,
                            isAnimated: isGif
                        });
                    }
                }
            }
            
            // Remove duplicates based on URL
            stealableItems = stealableItems.filter((item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
            );
        }
        
        // If we have stealable items from reply, show options
        if (stealableItems.length > 0) {
            const customName = args[0] || null;
            
            // If only one item, show buttons to choose emoji or sticker
            if (stealableItems.length === 1) {
                const item = stealableItems[0];
                const itemName = customName || item.name;
                
                return await showStealOptions(message, item, itemName, guildId);
            }
            
            // Multiple items - for now, use the first emoji or sticker found
            const item = stealableItems[0];
            const itemName = customName || item.name;
            
            return await showStealOptions(message, item, itemName, guildId);
        }
        
        // No reply or no stealable items in reply - check args
        if (!args[0] && !repliedMessage) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 
                    'Please provide an emoji, image URL, or reply to a message!\n\n' +
                    '**Usage:**\n' +
                    `\`${prefix}steal :emoji:\` - Steal an emoji from another server\n` +
                    `\`${prefix}steal :emoji: newname\` - Steal with a custom name\n` +
                    `\`${prefix}steal <url> name\` - Add emoji from image URL\n` +
                    `Reply to a message with \`${prefix}steal [name]\` - Steal emoji/sticker from the replied message`
                )]
            });
        }
        
        if (!args[0] && repliedMessage) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'No stealable emoji, sticker, or image found in the replied message!')]
            });
        }
        
        let emojiUrl = null;
        let emojiName = args[1] || null;
        let isAnimated = false;
        
        // Check if it's a custom emoji
        const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
        const emojiMatch = args[0].match(emojiRegex);
        
        if (emojiMatch) {
            isAnimated = !!emojiMatch[1];
            emojiName = emojiName || emojiMatch[2];
            const emojiId = emojiMatch[3];
            emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=128`;
        } 
        // Check if it's a URL
        else if (args[0].match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)/i)) {
            emojiUrl = args[0];
            isAnimated = args[0].toLowerCase().endsWith('.gif');
            
            if (!emojiName) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Please provide a name for the emoji!\n\n\`${prefix}steal <url> <name>\``)]
                });
            }
        }
        // Check for emoji in message attachments
        else if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
                emojiUrl = attachment.url;
                emojiName = args[0];
                isAnimated = attachment.contentType === 'image/gif';
            }
        }
        
        if (!emojiUrl) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Could not find a valid emoji or image URL!')]
            });
        }
        
        // Validate emoji name
        if (!emojiName || emojiName.length < 2 || emojiName.length > 32) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Emoji name must be between 2 and 32 characters!')]
            });
        }
        
        // Remove invalid characters from name
        emojiName = emojiName.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Show steal options with buttons
        const item = {
            type: 'emoji',
            name: emojiName,
            url: emojiUrl,
            isAnimated
        };
        
        return await showStealOptions(message, item, emojiName, guildId);
    }
};

async function showStealOptions(message, item, itemName, guildId) {
    // Sanitize name
    let sanitizedName = itemName.replace(/[^a-zA-Z0-9_]/g, '_');
    if (sanitizedName.length < 2) sanitizedName = 'stolen_' + sanitizedName;
    if (sanitizedName.length > 32) sanitizedName = sanitizedName.substring(0, 32);
    
    const embed = new EmbedBuilder()
        .setTitle('🎨 Steal Expression')
        .setDescription(
            `**Found:** ${item.type === 'sticker' ? 'Sticker' : item.type === 'emoji' ? 'Emoji' : 'Image'}\n` +
            `**Name:** \`${sanitizedName}\`\n` +
            `**Animated:** ${item.isAnimated ? 'Yes' : 'No'}\n\n` +
            `Choose how you want to add this to your server:`
        )
        .setThumbnail(item.url)
        .setColor(0x5865F2)
        .setFooter({ text: 'Buttons expire in 60 seconds' });
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`steal_emoji_${message.id}`)
            .setLabel('Add as Emoji')
            .setEmoji('😀')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`steal_sticker_${message.id}`)
            .setLabel('Add as Sticker')
            .setEmoji('🏷️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`steal_cancel_${message.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
    );
    
    const response = await message.reply({
        embeds: [embed],
        components: [row]
    });
    
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: (i) => i.user.id === message.author.id
    });
    
    collector.on('collect', async (interaction) => {
        const customId = interaction.customId;
        
        if (customId.startsWith('steal_cancel_')) {
            await interaction.update({
                embeds: [await infoEmbed(guildId, 'Cancelled', 'Steal operation cancelled.')],
                components: []
            });
            collector.stop();
            return;
        }
        
        if (customId.startsWith('steal_emoji_')) {
            // Show modal for emoji name
            const modal = new ModalBuilder()
                .setCustomId(`steal_emoji_modal_${message.id}`)
                .setTitle('Add as Emoji');
            
            const nameInput = new TextInputBuilder()
                .setCustomId('emoji_name')
                .setLabel('Emoji Name')
                .setPlaceholder('Enter emoji name (2-32 characters)')
                .setStyle(TextInputStyle.Short)
                .setValue(sanitizedName)
                .setMinLength(2)
                .setMaxLength(32)
                .setRequired(true);
            
            const actionRow = new ActionRowBuilder().addComponents(nameInput);
            modal.addComponents(actionRow);
            
            await interaction.showModal(modal);
            
            // Wait for modal submission
            try {
                const modalInteraction = await interaction.awaitModalSubmit({
                    time: 120000,
                    filter: (i) => i.customId === `steal_emoji_modal_${message.id}` && i.user.id === message.author.id
                });
                
                const finalName = modalInteraction.fields.getTextInputValue('emoji_name').replace(/[^a-zA-Z0-9_]/g, '_');
                
                await modalInteraction.deferUpdate();
                await response.edit({
                    embeds: [embed.setFooter({ text: '⏳ Adding emoji...' })],
                    components: []
                });
                
                try {
                    const newEmoji = await message.guild.emojis.create({
                        attachment: item.url,
                        name: finalName,
                        reason: `Stolen by ${message.author.tag}`
                    });
                    
                    await response.edit({
                        embeds: [await successEmbed(guildId, 'Emoji Added!',
                            `Successfully added ${newEmoji} as **:${newEmoji.name}:**\n\n` +
                            `**ID:** \`${newEmoji.id}\`\n` +
                            `**Animated:** ${newEmoji.animated ? 'Yes' : 'No'}\n` +
                            `**Added by:** ${message.author}`
                        )],
                        components: []
                    });
                } catch (error) {
                    console.error('Steal emoji error:', error);
                    let errorMessage = 'Failed to add emoji. ';
                    
                    if (error.message.includes('Maximum number of emojis reached')) {
                        errorMessage += 'This server has reached the maximum number of emojis!';
                    } else if (error.message.includes('File cannot be larger than')) {
                        errorMessage += 'The image is too large! Discord emojis must be under 256KB.';
                    } else if (error.message.includes('Invalid Form Body')) {
                        errorMessage += 'The image format is not supported.';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    await response.edit({
                        embeds: [await errorEmbed(guildId, errorMessage)],
                        components: []
                    });
                }
            } catch (err) {
                // Modal timed out or was dismissed
                await response.edit({
                    embeds: [await infoEmbed(guildId, 'Cancelled', 'Modal was closed or timed out.')],
                    components: []
                }).catch(() => {});
            }
            collector.stop();
            return;
        }
        
        if (customId.startsWith('steal_sticker_')) {
            // Show modal for sticker name
            const modal = new ModalBuilder()
                .setCustomId(`steal_sticker_modal_${message.id}`)
                .setTitle('Add as Sticker');
            
            const nameInput = new TextInputBuilder()
                .setCustomId('sticker_name')
                .setLabel('Sticker Name')
                .setPlaceholder('Enter sticker name (2-30 characters)')
                .setStyle(TextInputStyle.Short)
                .setValue(sanitizedName.substring(0, 30))
                .setMinLength(2)
                .setMaxLength(30)
                .setRequired(true);
            
            const actionRow = new ActionRowBuilder().addComponents(nameInput);
            modal.addComponents(actionRow);
            
            await interaction.showModal(modal);
            
            // Wait for modal submission
            try {
                const modalInteraction = await interaction.awaitModalSubmit({
                    time: 120000,
                    filter: (i) => i.customId === `steal_sticker_modal_${message.id}` && i.user.id === message.author.id
                });
                
                const finalName = modalInteraction.fields.getTextInputValue('sticker_name').replace(/[^a-zA-Z0-9_]/g, '_');
                
                await modalInteraction.deferUpdate();
                await response.edit({
                    embeds: [embed.setFooter({ text: '⏳ Adding sticker...' })],
                    components: []
                });
                
                try {
                    // Check sticker permissions
                    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                        await response.edit({
                            embeds: [await errorEmbed(guildId, 'I need **Manage Expressions** permission to add stickers!')],
                            components: []
                        });
                        collector.stop();
                        return;
                    }
                    
                    const newSticker = await message.guild.stickers.create({
                        file: item.url,
                        name: finalName,
                        tags: 'stolen',
                        description: `Stolen by ${message.author.tag}`,
                        reason: `Stolen by ${message.author.tag}`
                    });
                    
                    await response.edit({
                        embeds: [await successEmbed(guildId, 'Sticker Added!',
                            `Successfully added sticker **${newSticker.name}**\n\n` +
                            `**ID:** \`${newSticker.id}\`\n` +
                            `**Format:** ${newSticker.format === 1 ? 'PNG' : newSticker.format === 2 ? 'APNG' : 'Lottie'}\n` +
                            `**Added by:** ${message.author}`
                        )],
                        components: []
                    });
                } catch (error) {
                    console.error('Steal sticker error:', error);
                    let errorMessage = 'Failed to add sticker. ';
                    
                    if (error.message.includes('Maximum number of stickers reached')) {
                        errorMessage += 'This server has reached the maximum number of stickers!';
                    } else if (error.message.includes('File cannot be larger than')) {
                        errorMessage += 'The image is too large! Discord stickers must be under 512KB.';
                    } else if (error.message.includes('Invalid Form Body')) {
                        errorMessage += 'The image format is not supported for stickers. Stickers require PNG or APNG format.';
                    } else if (error.message.includes('Invalid Asset')) {
                        errorMessage += 'Invalid image. Stickers must be exactly 320x320 pixels in PNG format.';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    await response.edit({
                        embeds: [await errorEmbed(guildId, errorMessage)],
                        components: []
                    });
                }
            } catch (err) {
                // Modal timed out or was dismissed
                await response.edit({
                    embeds: [await infoEmbed(guildId, 'Cancelled', 'Modal was closed or timed out.')],
                    components: []
                }).catch(() => {});
            }
            collector.stop();
            return;
        }
    });
    
    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            try {
                await response.edit({
                    embeds: [await infoEmbed(guildId, 'Timed Out', 'Steal operation timed out. Please try again.')],
                    components: []
                });
            } catch (e) {
                // Message might be deleted
            }
        }
    });
}
