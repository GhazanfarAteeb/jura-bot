import Command from '../../structures/Command.js';
import { createNowPlayingEmbed, createPlayerButtons, createErrorEmbed, createSuccessEmbed } from '../utils/PlayerEmbeds.js';
import { PermissionFlagsBits } from 'discord.js';
import logger from '../../utils/logger.js';

export default class Play extends Command {
  constructor(client) {
    super(client, {
      name: 'play',
      description: 'Play music from YouTube, Spotify, Apple Music, SoundCloud, Deezer, and more!',
      usage: 'play <song name | URL>',
      category: 'Music',
      aliases: ['p'],
      cooldown: 3,
      examples: [
        'play never gonna give you up',
        'play https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'play https://open.spotify.com/track/...',
        'play https://music.apple.com/...',
        'play https://soundcloud.com/...'
      ]
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    const riffyManager = client.riffyManager;

    // Check if user is in a voice channel
    const memberVoiceChannel = message.member.voice.channel;
    if (!memberVoiceChannel) {
      const embed = createErrorEmbed('You need to be in a voice channel to play music!');
      return message.reply({ embeds: [embed] });
    }

    // Check bot permissions
    const permissions = memberVoiceChannel.permissionsFor(client.user);
    if (!permissions.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
      const embed = createErrorEmbed('I don\'t have permissions to join or speak in your voice channel!');
      return message.reply({ embeds: [embed] });
    }

    // Check if query is provided
    if (!args.length) {
      const embed = createErrorEmbed(
        'Please provide a song name or URL!',
        'Supported platforms: YouTube, Spotify, Apple Music, SoundCloud, Deezer, and more'
      );
      return message.reply({ embeds: [embed] });
    }

    const query = args.join(' ');
    logger.info(`[Play Command] Query: "${query}" by ${message.author.tag} in guild ${message.guild.id}`);

    try {
      // Create or get existing player
      let player = riffyManager.getPlayer(message.guild.id);

      if (!player) {
        player = riffyManager.createPlayer(
          message.guild.id,
          memberVoiceChannel.id,
          message.channel.id
        );
        logger.info(`[Play Command] Created new player for guild ${message.guild.id}`);
      } else {
        // Check if bot is in the same voice channel
        const botVoiceChannel = message.guild.members.cache.get(client.user.id)?.voice.channel;
        if (botVoiceChannel && botVoiceChannel.id !== memberVoiceChannel.id) {
          const embed = createErrorEmbed('I\'m already playing music in a different voice channel!');
          return message.reply({ embeds: [embed] });
        }
      }

      // Send searching message
      const searchMsg = await message.reply('🔍 Searching...');

      // Search for tracks
      const result = await riffyManager.search(query);

      if (!result || !result.tracks || result.tracks.length === 0) {
        const embed = createErrorEmbed('No results found for your query!');
        return searchMsg.edit({ content: null, embeds: [embed] });
      }

      logger.info(`[Play Command] Found ${result.tracks.length} tracks, load type: ${result.loadType}`);

      // Handle different load types
      if (result.loadType === 'playlist') {
        // Playlist loaded
        const tracks = result.tracks;
        logger.info(`[Play Command] Adding ${tracks.length} tracks from playlist`);

        for (const track of tracks) {
          track.info.requester = message.author;
          player.queue.add(track);
        }

        logger.info(`[Play Command] Playlist added. Queue length: ${player.queue.length}`);

        const embed = createSuccessEmbed(
          `Added ${tracks.length} tracks to the queue`,
          `📜 Playlist: **${result.playlistInfo?.name || 'Unknown'}**`
        );
        await searchMsg.edit({ content: null, embeds: [embed] });

        // Start playing if not already playing
        logger.info(`[Play Command] Player state before play: playing=${player.playing}, paused=${player.paused}, current=${!!player.current}`);
        if (!player.playing && !player.paused) {
          logger.info(`[Play Command] Calling player.play() to start playback`);
          player.play();
          logger.info(`[Play Command] player.play() called`);
        } else {
          logger.info(`[Play Command] Skipping player.play() - already playing or paused`);
        }
      } else {
        // Single track or search result
        logger.info(`[Play Command] Adding single track to queue`);
        logger.info(`[Play Command] Result: ${JSON.stringify(result)}`);
        const track = result.tracks[0];
        track.info.requester = message.author;

        // Add to queue
        player.queue.add(track);
        logger.info(`[Play Command] Track added to queue. Queue length: ${player.queue.length}`);

        const embed = createSuccessEmbed(
          'Added to queue',
          `🎵 **[${track.info.title}](${track.info.uri})**\n` +
          `🎤 ${track.info.author || 'Unknown'}\n` +
          `📍 Position in queue: **${player.queue.length}**`
        );
        await searchMsg.edit({ content: null, embeds: [embed] });

        // Start playing if not already playing
        logger.info(`[Play Command] Player state before play: playing=${player.playing}, paused=${player.paused}, current=${!!player.current}`);
        if (!player.playing && !player.paused) {
          logger.info(`[Play Command] Calling player.play() to start playback`);
          player.play();
          logger.info(`[Play Command] player.play() called`);
        } else {
          logger.info(`[Play Command] Skipping player.play() - already playing or paused`);
        }
      }
    } catch (error) {
      logger.error('[Play Command] Error:', error);
      const embed = createErrorEmbed(
        'An error occurred while trying to play music!',
        error.message
      );
      return message.reply({ embeds: [embed] });
    }
  }
}
