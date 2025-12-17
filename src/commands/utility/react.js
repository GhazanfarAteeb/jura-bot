import { EmbedBuilder } from 'discord.js';

const reactions = {
    // Positive reactions
    hug: ['hug anime', 'anime hug'],
    kiss: ['anime kiss', 'kiss anime'],
    pat: ['head pat anime', 'anime pat'],
    cuddle: ['cuddle anime', 'anime cuddle'],
    highfive: ['high five anime', 'anime high five'],
    wave: ['wave anime', 'anime wave'],
    smile: ['smile anime', 'anime smile'],
    blush: ['blush anime', 'anime blush'],
    
    // Fun reactions
    dance: ['anime dance', 'dance gif'],
    celebrate: ['celebrate anime', 'party anime'],
    laugh: ['laugh anime', 'anime laugh'],
    cry: ['cry anime', 'anime cry'],
    poke: ['poke anime', 'anime poke'],
    bonk: ['bonk meme', 'bonk anime'],
    nom: ['nom anime', 'eating anime'],
    
    // Negative reactions
    slap: ['slap anime', 'anime slap'],
    punch: ['punch anime', 'anime punch'],
    angry: ['angry anime', 'anime angry'],
    rage: ['rage anime', 'anime rage'],
    
    // Misc
    think: ['thinking anime', 'anime think'],
    shrug: ['shrug anime', 'anime shrug'],
    sleep: ['sleep anime', 'anime sleep'],
    yawn: ['yawn anime', 'anime yawn'],
    confused: ['confused anime', 'anime confused']
};

export default {
    name: 'react',
    description: 'Send anime reaction GIFs',
    usage: 'react <action> [@user]',
    aliases: ['reaction', 'anime'],
    category: 'utility',
    cooldown: 3,
    
    execute: async (message, args) => {
        if (!args.length) {
            const availableReactions = Object.keys(reactions).join(', ');
            return message.reply(
                `❌ Please specify a reaction!\n\n**Available reactions:**\n${availableReactions}\n\n**Usage:** \`!react <action> [@user]\`\n**Example:** \`!react hug @user\``
            );
        }
        
        const action = args[0].toLowerCase();
        const targetUser = message.mentions.users.first();
        
        if (!reactions[action]) {
            const availableReactions = Object.keys(reactions).join(', ');
            return message.reply(
                `❌ Unknown reaction: **${action}**\n\n**Available reactions:**\n${availableReactions}`
            );
        }
        
        const apiKey = process.env.TENOR_API_KEY || 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
        const searchQueries = reactions[action];
        const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
        
        try {
            const response = await fetch(
                `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(randomQuery)}&key=${apiKey}&client_key=jura_bot&limit=20&media_filter=gif`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch reaction GIF');
            }
            
            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                return message.reply(`❌ No reaction GIF found. Try again!`);
            }
            
            const randomGif = data.results[Math.floor(Math.random() * data.results.length)];
            const gifUrl = randomGif.media_formats.gif.url;
            
            // Create action text
            let actionText = '';
            if (targetUser) {
                if (targetUser.id === message.author.id) {
                    actionText = `**${message.author.username}** ${action}s themselves!`;
                } else {
                    actionText = `**${message.author.username}** ${action}s **${targetUser.username}**!`;
                }
            } else {
                actionText = `**${message.author.username}** ${action}s!`;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setDescription(actionText)
                .setImage(gifUrl)
                .setFooter({ 
                    text: `Powered by Tenor`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('React command error:', error);
            return message.reply('❌ Failed to fetch reaction GIF. Please try again later!');
        }
    }
};
