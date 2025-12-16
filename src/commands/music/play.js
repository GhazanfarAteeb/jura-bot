import Command from '../../structures/Command.js';
import play from 'play-dl';
import logger from '../../utils/logger.js';
import spotifyTokenManager from '../../utils/spotifyTokenManager.js';

export default class Play extends Command {
  constructor(client) {
    super(client, {
      name: 'play',
      description: 'Plays a song from Spotify',
      usage: 'play <query>',
      category: 'Music',
      aliases: ['p']
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    logger.info(`[Play Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);

    logger.info(`[Play Command] Spotify Credentials: ID=${process.env.SPOTIFY_CLIENT_ID ? 'Yes' : 'No'}, Secret=${process.env.SPOTIFY_CLIENT_SECRET ? 'Yes' : 'No'}`);

    if (!args.length) {
      logger.warn(`[Play Command] No query provided by ${message.author.tag}`);
      return message.reply('Please provide a song to play!');
    }

    const { channel } = message.member.voice;
    if (!channel) {
      logger.warn(`[Play Command] User ${message.author.tag} not in voice channel`);
      return message.reply('You need to be in a voice channel to play music!');
    }

    logger.info(`[Play Command] Voice channel: ${channel.name} (${channel.id})`);

    const permissions = channel.permissionsFor(this.client.user);
    if (!permissions.has(['Connect', 'Speak'])) {
      logger.warn(`[Play Command] Missing permissions in channel ${channel.id}`);
      return message.reply('I don\'t have permissions to connect and speak in that channel!');
    }

    const query = args.join(' ');
    logger.info(`[Play Command] Query: "${query}"`);

    const node = this.client.music.getNode();

    if (!node) {
      logger.error(`[Play Command] No music node available for guild ${message.guild.id}`);
      return message.reply('Music node is not ready yet, please try again later.');
    }

    logger.info(`[Play Command] Using node: ${node.name}`);

    try {
      // Check if query is a URL/link
      const isURL = /^https?:\/\//i.test(query);
      logger.info(`[Play Command] Query type: ${isURL ? 'URL/Link' : 'Search query'}`);

      // Create queue first to get player
      const queue = this.client.music.createQueue(message.guild, channel, message.channel);
      logger.info(`[Play Command] Queue obtained for guild ${message.guild.id}`);
      await spotifyTokenManager.ensureTokenValid();
      if (isURL) {
        // ==================== URL HANDLING ====================
        // Handle Spotify URLs directly
        logger.info(`[Play Command] Detected URL, checking platform...`);
        const spType = play.sp_validate(query);

        if (spType === 'track' || spType === 'album' || spType === 'artist' || spType === 'playlist') {
          logger.info(`[Play Command] Detected Spotify ${spType} URL`);

          // Resolve using the direct Spotify URL
          const res = await queue.player.node.rest.resolve(query);
          logger.info(`[Play Command] Response loadType: ${res.loadType}`);
          logger.info(`[Play Command] Response structure: ${JSON.stringify(Object.keys(res))}`);

          if (!res) {
            logger.error(`[Play Command] Failed to resolve Spotify ${spType}`);
            return message.reply(`Could not resolve this Spotify ${spType}.`);
          }

          // URL responses use different structures based on loadType
          let tracks;

          if (res.loadType === 'track') {
            // Single track: res.data is the track object
            tracks = [res.data];
            logger.info(`[Play Command] Single track loaded`);
          } else if (res.loadType === 'playlist' || res.loadType === 'album') {
            // Playlist/Album: res.tracks is the array of tracks
            tracks = res.tracks || res.data?.tracks;
            if (!tracks) {
              logger.error(`[Play Command] No tracks found in response for ${res.loadType}`);
              logger.error(`[Play Command] Response keys: ${JSON.stringify(Object.keys(res))}`);
              if (res.data) logger.error(`[Play Command] res.data keys: ${JSON.stringify(Object.keys(res.data))}`);
              return message.reply(`Could not load tracks from this Spotify ${spType}.`);
            }
            logger.info(`[Play Command] ${res.loadType} loaded with ${tracks.length} tracks`);
          } else if (res.loadType === 'search') {
            // Search results: res.data is array
            tracks = res.data;
            logger.info(`[Play Command] Search results with ${tracks.length} tracks`);
          } else {
            logger.error(`[Play Command] Unknown loadType: ${res.loadType}`);
            return message.reply(`Could not resolve this Spotify ${spType}.`);
          }

          if (!tracks || tracks.length === 0) {
            logger.error(`[Play Command] No tracks found`);
            return message.reply(`Could not find any tracks for this Spotify ${spType}.`);
          }

          // Add tracks to queue based on type
          if (tracks.length > 1) {
            // Multiple tracks (playlist/album/artist)
            for (const track of tracks) {
              queue.queue.push({
                track: track.encoded,
                info: track.info,
                requester: message.author
              });
            }
            logger.info(`[Play Command] Added ${tracks.length} tracks. Queue size: ${queue.queue.length}`);
            message.reply(`Loaded Spotify ${spType} with ${tracks.length} tracks!`);
          } else {
            // Single track
            const track = tracks[0];
            queue.queue.push({
              track: track.encoded,
              info: track.info,
              requester: message.author
            });
            logger.info(`[Play Command] Added track: ${track.info.title}`);
            message.reply(`Added **${track.info.title}** (from Spotify) to the queue!`);
          }

          logger.info(`[Play Command] Queue isPlaying: ${queue.isPlaying()}`);
          if (!queue.isPlaying()) {
            logger.info(`[Play Command] Starting playback`);
            await queue.play();
          }
          return;
        }

        // Not a Spotify link - unsupported platform
        logger.warn(`[Play Command] Unsupported platform URL detected: ${query}`);
        const embed = this.client.embed()
          .setTitle('Platform Not Supported')
          .setDescription('Only Spotify links are supported. Please use:\n\n✅ **Supported:**\n- Spotify track/album/artist/playlist links\n- Song name search (e.g., "shape of you")\n\n❌ **Not Supported:**\n- YouTube links\n- SoundCloud links\n- Other platform links')
          .setColor(this.client.color.red)
          .setFooter({ text: 'Tip: Just search by song name!' });

        return message.reply({ embeds: [embed] });
      } else {
        // ==================== SEARCH HANDLING ====================
        // Handle search queries (non-URL)
        logger.info(`[Play Command] Treating as search query: "${query}"`);

        // Use Spotify search for non-URL queries
        const searchQuery = query.startsWith('spsearch:')
          ? query
          : `spsearch:${query}`;

        logger.info(`[Play Command] Searching with: ${searchQuery}`);

        // Use player.node.rest.resolve() as per Shoukaku v4
        const res = await queue.player.node.rest.resolve(searchQuery);
        logger.info(`[Play Command] Search response - loadType: ${res.loadType}`);

        // Search responses use res.data for tracks
        const tracks = res.data || res.tracks;
        if (!res || !tracks || !tracks.length) {
          logger.warn(`[Play Command] No results found for search query: "${query}"`);
          return message.reply('No results found for your search query.');
        }

        logger.info(`[Play Command] Found ${tracks.length} track(s) for search query`);

        // Get the first track from search and extract its Spotify URL
        const firstTrack = tracks[0];
        const spotifyUrl = firstTrack.info?.uri;

        if (!spotifyUrl) {
          logger.warn(`[Play Command] No Spotify URL found in search result`);
          return message.reply('Could not get track information from search.');
        }

        logger.info(`[Play Command] Extracted Spotify URL from search: ${spotifyUrl}`);
        logger.info(`[Play Command] Re-resolving as direct URL to get full track...`);

        // Re-resolve the Spotify URL to get the full track (not preview)
        const trackRes = await queue.player.node.rest.resolve(spotifyUrl);
        logger.info(`[Play Command] Track resolution - loadType: ${trackRes.loadType}`);

        if (!trackRes || !trackRes.data) {
          logger.warn(`[Play Command] Failed to resolve track from URL: ${spotifyUrl}`);
          return message.reply('Could not load the full track.');
        }

        // Add the resolved track to queue
        const resolvedTrack = trackRes.data;
        logger.info(`[Play Command] Resolved track: ${resolvedTrack.info.title}`);
        queue.queue.push({
          track: resolvedTrack.encoded,
          info: resolvedTrack.info,
          requester: message.author
        });
        logger.info(`[Play Command] Track added. Queue size now: ${queue.queue.length}`);
        message.reply(`Added **${resolvedTrack.info.title}** by **${resolvedTrack.info.author}** to the queue!`);

        logger.info(`[Play Command] Queue isPlaying: ${queue.isPlaying()}`);
        if (!queue.isPlaying()) {
          logger.info(`[Play Command] Starting playback for search query`);
          await queue.play();
        }
      }

    } catch (error) {
      logger.error(`[Play Command] Error occurred in guild ${message.guild.id}:`, error);
      logger.info(`[Play Command] Error stack:`, error.stack);
      message.reply('There was an error while searching: ' + error.message);
    }
  }
}
