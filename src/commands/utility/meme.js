import { EmbedBuilder } from 'discord.js';

export default {
    name: 'meme',
    description: 'Get a random meme from Reddit',
    usage: 'meme [subreddit]',
    aliases: ['reddit', 'randommeme'],
    category: 'utility',
    cooldown: 3,
    
    execute: async (message, args) => {
        const subreddit = args[0] || ['memes', 'dankmemes', 'wholesomememes', 'me_irl'][Math.floor(Math.random() * 4)];
        
        try {
            const response = await fetch(
                `https://www.reddit.com/r/${subreddit}/random/.json`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch meme');
            }
            
            const data = await response.json();
            
            if (!data || !data[0] || !data[0].data || !data[0].data.children[0]) {
                return message.reply(`❌ No memes found in r/${subreddit}. Try a different subreddit!`);
            }
            
            const post = data[0].data.children[0].data;
            
            // Skip NSFW posts
            if (post.over_18) {
                return message.reply('❌ Found an NSFW post. Skipping... Try again!');
            }
            
            // Skip text posts without images
            if (!post.url || (!post.url.endsWith('.jpg') && !post.url.endsWith('.png') && !post.url.endsWith('.gif') && !post.url.includes('i.redd.it'))) {
                return message.reply('❌ Found a text post. Try again for an image meme!');
            }
            
            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle(post.title.length > 256 ? post.title.substring(0, 253) + '...' : post.title)
                .setURL(`https://reddit.com${post.permalink}`)
                .setImage(post.url)
                .setFooter({ 
                    text: `👍 ${post.ups || 0} | 💬 ${post.num_comments || 0} | r/${subreddit}`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();
            
            if (post.author) {
                embed.setAuthor({ name: `Posted by u/${post.author}` });
            }
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Meme command error:', error);
            return message.reply(`❌ Failed to fetch meme from r/${subreddit}. Try again or specify a different subreddit!`);
        }
    }
};
