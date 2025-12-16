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
        // It's a link - check if it's Spotify
        logger.info(`[Play Command] Detected URL, checking platform...`);

        // Check for Spotify link
        logger.info(`[Play Command] Checking if query is a Spotify URL`);
        const spType = play.sp_validate(query);

        if (spType === 'track' || spType === 'album' || spType === 'artist' || spType === 'playlist') {
          // Ensure Spotify token is valid before attempting to resolve
          logger.info(`[Play Command] Validating Spotify token before ${spType} resolution`);

          // Pass the Spotify URL directly to Lavalink
          logger.info(`[Play Command] Detected Spotify ${spType} - resolving URL directly: ${query}`);
          logger.info(`[Play Command] Resolving Spotify ${spType}...`);
          // Resolve using the direct Spotify URL
          const res = await queue.player.node.rest.resolve(query);
          logger.info(`[Play Command] Spotify ${spType} resolution completed`);
          logger.info(`[Play Command] Load type: ${res.loadType}`);
          logger.info(`[Play Command] Tracks data: ${JSON.stringify(res.data)}`);
          logger.info(`[Play Command] Spotify ${spType} resolution returned ${res.data?.length || 0} results`);

          if (!res || !res.data) {
            logger.error(`[Play Command] Failed to resolve Spotify ${spType}`);
            return message.reply(`Could not resolve this Spotify ${spType}.`);
          }

          const tracks = res.data;

          // Handle playlists and albums (multiple tracks)
          if (spType === 'playlist' || spType === 'album' || res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') {
            logger.info(`[Play Command] Spotify ${spType} detected with ${tracks.length} tracks`);
            for (const track of tracks) {
              queue.queue.push({
                track: track.encoded,
                info: track.info,
                requester: message.author
              });
            }
            logger.info(`[Play Command] Spotify ${spType} added. Queue size now: ${queue.queue.length}`);
            message.reply(`Loaded Spotify ${spType} with ${tracks.length} tracks!`);
          } else if (spType === 'track' || res.loadType === 'track') {
            // Single track
            const track = tracks;
            logger.info(`[Play Command] Spotify track resolved: ${track.info.title}`);
            queue.queue.push({
              track: track.encoded,
              info: track.info,
              requester: message.author
            });
            logger.info(`[Play Command] Spotify track added to queue. Queue size: ${queue.queue.length}`);
            message.reply(`Added **${track.info.title}** (from Spotify) to the queue!`);
          }
          else if (spType === 'search') {
            const track = tracks[0];
            logger.info(`[Play Command] Spotify search track resolved: ${JSON.stringify(track)}`);
            logger.info(`[Play Command] Spotify track resolved: ${track.info.title}`);
            const res = await queue.player.node.rest.resolve(track.info.uri);
            const resolvedTrack = res.data;
            queue.queue.push({
              track: resolvedTrack.encoded,
              info: resolvedTrack.info,
              requester: message.author
            });
            logger.info(`[Play Command] Spotify track added to queue. Queue size: ${queue.queue.length}`);
            message.reply(`Added **${track.info.title}** (from Spotify) to the queue!`);
          }

          logger.info(`[Play Command] Queue isPlaying: ${queue.isPlaying()}`);
          if (!queue.isPlaying()) {
            logger.info(`[Play Command] Starting playback for Spotify ${spType}`);
            await queue.play();
          }
          return;
        }
        else {

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
        // Not a URL - treat as search query
        logger.info(`[Play Command] Treating as search query: "${query}"`);

        // Use Spotify search for non-URL queries
        const searchQuery = query.startsWith('spsearch:')
          ? query
          : `spsearch:${query}`;

        logger.info(`[Play Command] Searching with: ${searchQuery}`);

        // Use player.node.rest.resolve() as per Shoukaku v4
        const res = await queue.player.node.rest.resolve(searchQuery);
        logger.info(`[Play Command] Search response - loadType: ${res.loadType}`);

        // Shoukaku v4 uses res.data instead of res.tracks
        const tracks = res.tracks || res.data;
        if (!res || !tracks || !tracks.length) {
          logger.warn(`[Play Command] No results found for search query: "${query}"`);
          return message.reply('No results found for your search query.');
        }

        logger.info(`[Play Command] Found ${tracks.length} track(s) for search query`);

        // Handle playlists (in case search returns playlist)
        if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') {
          logger.info(`[Play Command] Playlist detected: ${res.playlistInfo?.name || 'Unknown'} with ${tracks.length} tracks`);
          for (const track of tracks) {
            queue.queue.push({
              track: track.encoded,
              info: track.info,
              requester: message.author
            });
            logger.info(`[Play Command] Added playlist track: ${track.info.title}`);
          }
          logger.info(`[Play Command] Playlist added. Queue size now: ${queue.queue.length}`);
          message.reply(`Loaded playlist **${res.playlistInfo?.name || 'Unknown'}** with ${tracks.length} tracks!`);
        } else {
          const track = tracks[0];
          logger.info(`[Play Command] Single track found: ${track.info.title}`);
          queue.queue.push({
            track: track.encoded,
            info: track.info,
            requester: message.author
          });
          logger.info(`[Play Command] Track added. Queue size now: ${queue.queue.length}`);
          message.reply(`Added **${track.info.title}** to the queue!`);
        }

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
