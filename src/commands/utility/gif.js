import { EmbedBuilder } from 'discord.js';

export default {
  name: 'gif',
  description: 'Search and send GIFs from Tenor',
  usage: 'gif <search query>',
  aliases: ['giphy', 'tenor'],
  category: 'utility',
  cooldown: 3,

  execute: async (message, args) => {
    if (!args.length) {
      return message.reply('❌ Please provide a search query! Usage: `!gif <search term>`');
    }

    const searchQuery = args.join(' ');
    const apiKey = process.env.TENOR_API_KEY || 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google's free Tenor API key

    try {
      // Fetch from Tenor API
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchQuery)}&key=${apiKey}&client_key=jura_bot&limit=10&media_filter=gif,tinygif`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch GIFs');
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return message.reply(`❌ No GIFs found for **${searchQuery}**. Try a different search term!`);
      }

      // Get random GIF from results
      const randomGif = data.results[Math.floor(Math.random() * data.results.length)];
      const gifUrl = randomGif.media_formats.gif.url;

      const embed = new EmbedBuilder()
        .setColor('#00D9FF')
        .setTitle(`🎬 ${searchQuery}`)
        .setImage(gifUrl)
        .setFooter({
          text: `Powered by Tenor • Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('GIF command error:', error);
      return message.reply('❌ Failed to fetch GIF. Please try again later!');
    }
  }
};
