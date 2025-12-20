import Command from '../../structures/Command.js';
import { createSearchEmbed, createErrorEmbed, createSuccessEmbed } from '../../utils/PlayerEmbeds.js';
import { PermissionFlagsBits } from 'discord.js';
import logger from '../../../utils/logger.js';

export default class Search extends Command {
  constructor(client) {
    super(client, {
      name: 'search',
      description: 'Search for music across multiple platforms using lavaSearch',
      usage: 'search <platform> <query>',
      category: 'Music',
      aliases: ['find'],
      cooldown: 5,
      examples: [
        'search youtube never gonna give you up',
        'search spotify despacito',
        'search soundcloud remix'
      ]
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    const riffyManager = client.riffyManager;

    // Check if user is in a voice channel
    const memberVoiceChannel = message.member.voice.channel;
    if (!memberVoiceChannel) {
      const embed = createErrorEmbed('You need to be in a voice channel to search for music!');
      return message.reply({ embeds: [embed] });
    }

    // Check bot permissions
    const permissions = memberVoiceChannel.permissionsFor(client.user);
    if (!permissions.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
      const embed = createErrorEmbed('I don\'t have permissions to join or speak in your voice channel!');
      return message.reply({ embeds: [embed] });
    }

    if (args.length < 2) {
      const embed = createErrorEmbed(
        'Please provide a platform and search query!',
        'Usage: `search <platform> <query>`\nPlatforms: youtube, spotify, soundcloud, applemusic, deezer'
      );
      return message.reply({ embeds: [embed] });
    }

    const platform = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    const validPlatforms = ['youtube', 'youtubemusic', 'spotify', 'soundcloud', 'applemusic', 'deezer', 'yandex'];
    if (!validPlatforms.includes(platform)) {
      const embed = createErrorEmbed(
        'Invalid platform!',
        `Valid platforms: ${validPlatforms.join(', ')}`
      );
      return message.reply({ embeds: [embed] });
    }

    logger.info(`[Search Command] Platform: ${platform}, Query: "${query}" by ${message.author.tag}`);

    try {
      const searchMsg = await message.reply('🔍 Searching...');

      const result = await riffyManager.search(query, platform);

      if (!result || !result.tracks || result.tracks.length === 0) {
        const embed = createErrorEmbed(`No results found for "${query}" on ${platform}!`);
        return searchMsg.edit({ content: null, embeds: [embed] });
      }

      const embed = createSearchEmbed(result.tracks, platform, query, client);
      const searchResultMsg = await searchMsg.edit({ content: null, embeds: [embed] });

      // Add number reactions for selection
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const maxReactions = Math.min(result.tracks.length, 10);

      for (let i = 0; i < maxReactions; i++) {
        await searchResultMsg.react(emojis[i]);
      }

      // Create reaction collector
      const filter = (reaction, user) => {
        return emojis.includes(reaction.emoji.name) && user.id === message.author.id;
      };

      const collector = searchResultMsg.createReactionCollector({ filter, time: 60000, max: 1 });

      collector.on('collect', async (reaction, user) => {
        const index = emojis.indexOf(reaction.emoji.name);
        const selectedTrack = result.tracks[index];

        if (!selectedTrack) return;

        // Create or get player
        let player = riffyManager.getPlayer(message.guild.id);

        if (!player) {
          player = riffyManager.createPlayer(
            message.guild.id,
            memberVoiceChannel.id,
            message.channel.id
          );
        }

        selectedTrack.requester = message.author;
        player.queue.push(selectedTrack);

        const embed = createSuccessEmbed(
          'Added to queue',
          `🎵 **[${selectedTrack.info.title}](${selectedTrack.info.uri})**\n` +
          `🎤 ${selectedTrack.info.author || 'Unknown'}\n` +
          `📍 Position in queue: **${player.queue.length}**`
        );

        await searchResultMsg.edit({ embeds: [embed] });
        await searchResultMsg.reactions.removeAll().catch(() => { });

        if (!player.playing && !player.paused) {
          player.play();
        }
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          searchResultMsg.reactions.removeAll().catch(() => { });
        }
      });

    } catch (error) {
      logger.error('[Search Command] Error:', error);
      const embed = createErrorEmbed(
        'An error occurred while searching!',
        error.message
      );
      return message.reply({ embeds: [embed] });
    }
  }
}
