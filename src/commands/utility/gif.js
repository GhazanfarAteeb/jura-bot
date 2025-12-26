import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'gif',
  description: 'Search and send GIFs from Tenor with better results',
  usage: 'gif <search query>',
  aliases: ['giphy', 'tenor'],
  category: 'utility',
  cooldown: 3,

  execute: async (message, args) => {
    if (!args.length) {
      const prefix = await getPrefix(message.guild.id);
      return message.reply(`❌ Please provide a search query! Usage: \`${prefix}gif <search term>\`\n**Tip:** Use specific terms for better results!`);
    }

    const searchQuery = args.join(' ');
    const apiKey = process.env.TENOR_API_KEY || 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';

    try {
      // Enhanced search with better parameters
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchQuery)}&key=${apiKey}&client_key=jura_bot&limit=50&media_filter=gif&contentfilter=medium&ar_range=standard`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch GIFs');
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        // Suggest alternatives
        return message.reply(
          `❌ No GIFs found for **${searchQuery}**\n\n💡 **Tips:**\n` +
          `• Try simpler or more common terms\n` +
          `• Use English keywords\n` +
          `• Try related words (e.g., "happy" instead of "joyful")\n` +
          `• Check your spelling`
        );
      }

      // Get random GIF from results (better variety)
      const randomGif = data.results[Math.floor(Math.random() * Math.min(data.results.length, 20))];
      const gifUrl = randomGif.media_formats.gif.url;

      // Fun title variations
      const titlePrefixes = ['🎬', '✨', '🎭', '🎪', '🌟', '💫', '🎨', '🎯'];
      const randomPrefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];

      const embed = new EmbedBuilder()
        .setColor('#00D9FF')
        .setTitle(`${randomPrefix} ${searchQuery}`)
        .setImage(gifUrl)
        .setFooter({
          text: `Powered by Tenor • Requested by ${message.author.tag} • ${data.results.length} results found`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('GIF command error:', error);
      return message.reply('❌ Failed to fetch GIF. The API might be down or rate limited. Please try again later!');
    }
  }
};
