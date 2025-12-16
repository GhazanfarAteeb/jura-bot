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
        logger.info(`[Play Command - SEARCH STEP 1] Treating as search query: "${query}"`);

        // Use Spotify search for non-URL queries
        const searchQuery = query.startsWith('spsearch:')
          ? query
          : `spsearch:${query}`;

        logger.info(`[Play Command - SEARCH STEP 2] Prepared search query: ${searchQuery}`);
        logger.info(`[Play Command - SEARCH STEP 3] Calling player.node.rest.resolve()...`);

        // Use player.node.rest.resolve() as per Shoukaku v4
        const res = await queue.player.node.rest.resolve(searchQuery);
        
        logger.info(`[Play Command - SEARCH STEP 4] Received search response`);
        logger.info(`[Play Command - SEARCH STEP 4a] Response loadType: ${res.loadType}`);
        logger.info(`[Play Command - SEARCH STEP 4b] Response keys: ${JSON.stringify(Object.keys(res))}`);
        logger.info(`[Play Command - SEARCH STEP 4c] Full response structure: ${JSON.stringify(res, null, 2)}`);

        // Search responses use res.data for tracks
        logger.info(`[Play Command - SEARCH STEP 5] Extracting tracks from response...`);
        logger.info(`[Play Command - SEARCH STEP 5a] res.data exists: ${!!res.data}`);
        logger.info(`[Play Command - SEARCH STEP 5b] res.tracks exists: ${!!res.tracks}`);
        
        const tracks = res.data || res.tracks;
        
        if (!res || !tracks || !tracks.length) {
          logger.warn(`[Play Command - SEARCH STEP 5c] No results found for search query: "${query}"`);
          return message.reply('No results found for your search query.');
        }

        logger.info(`[Play Command - SEARCH STEP 6] Found ${tracks.length} track(s) for search query`);
        logger.info(`[Play Command - SEARCH STEP 6a] First track structure: ${JSON.stringify(tracks[0], null, 2)}`);

        // Get the first track from search
        const firstTrack = tracks[0];
        logger.info(`[Play Command - SEARCH STEP 7] Extracted first track`);
        logger.info(`[Play Command - SEARCH STEP 7a] First track encoded: ${firstTrack.encoded ? 'present' : 'missing'}`);
        logger.info(`[Play Command - SEARCH STEP 7b] First track info: ${firstTrack.info ? JSON.stringify(firstTrack.info) : 'missing'}`);
        
        // Extract Spotify URL and convert if needed
        logger.info(`[Play Command - SEARCH STEP 8] Extracting Spotify URL from track...`);
        let spotifyUrl = firstTrack.info?.uri;
        logger.info(`[Play Command - SEARCH STEP 8a] Raw URI from track: ${spotifyUrl}`);
        
        // If uri is a spotify: protocol, convert to HTTP URL
        if (spotifyUrl && spotifyUrl.startsWith('spotify:')) {
          logger.info(`[Play Command - SEARCH STEP 8b] URI is Spotify protocol, converting to HTTP URL...`);
          const parts = spotifyUrl.split(':');
          logger.info(`[Play Command - SEARCH STEP 8c] Split URI parts: ${JSON.stringify(parts)}`);
          
          if (parts.length === 3) {
            // spotify:track:id -> https://open.spotify.com/track/id
            spotifyUrl = `https://open.spotify.com/${parts[1]}/${parts[2]}`;
            logger.info(`[Play Command - SEARCH STEP 8d] Converted Spotify URI to URL: ${spotifyUrl}`);
          } else {
            logger.warn(`[Play Command - SEARCH STEP 8e] Unexpected URI format, parts length: ${parts.length}`);
          }
        } else {
          logger.info(`[Play Command - SEARCH STEP 8f] URI is already HTTP or missing: ${spotifyUrl}`);
        }

        if (!spotifyUrl) {
          logger.warn(`[Play Command - SEARCH STEP 9] No Spotify URL found, using search result directly`);
          logger.info(`[Play Command - SEARCH STEP 9a] Adding track to queue with encoded: ${firstTrack.encoded?.substring(0, 20)}...`);
          
          queue.queue.push({
            track: firstTrack.encoded,
            info: firstTrack.info,
            requester: message.author
          });
          
          logger.info(`[Play Command - SEARCH STEP 9b] Track added from search. Queue size now: ${queue.queue.length}`);
          message.reply(`Added **${firstTrack.info.title}** by **${firstTrack.info.author}** to the queue!`);
        } else {
          logger.info(`[Play Command - SEARCH STEP 10] Starting re-resolution with URL: ${spotifyUrl}`);
          logger.info(`[Play Command - SEARCH STEP 10a] Calling player.node.rest.resolve() for URL...`);

          // Re-resolve the Spotify URL to get the full track
          const trackRes = await queue.player.node.rest.resolve(spotifyUrl);
          
          logger.info(`[Play Command - SEARCH STEP 11] Received track resolution response`);
          logger.info(`[Play Command - SEARCH STEP 11a] Track resolution loadType: ${trackRes.loadType}`);
          logger.info(`[Play Command - SEARCH STEP 11b] Track resolution response keys: ${JSON.stringify(Object.keys(trackRes))}`);
          logger.info(`[Play Command - SEARCH STEP 11c] Full track resolution response: ${JSON.stringify(trackRes, null, 2)}`);
          
          if (trackRes.data) {
            logger.info(`[Play Command - SEARCH STEP 11d] Track data exists, keys: ${JSON.stringify(Object.keys(trackRes.data))}`);
          } else {
            logger.warn(`[Play Command - SEARCH STEP 11e] No data in trackRes`);
          }

          if (!trackRes || !trackRes.data) {
            logger.warn(`[Play Command - SEARCH STEP 12] No data in response, falling back to search result`);
            logger.info(`[Play Command - SEARCH STEP 12a] Adding original search track to queue`);
            
            queue.queue.push({
              track: firstTrack.encoded,
              info: firstTrack.info,
              requester: message.author
            });
            
            logger.info(`[Play Command - SEARCH STEP 12b] Track added (fallback). Queue size now: ${queue.queue.length}`);
            message.reply(`Added **${firstTrack.info.title}** by **${firstTrack.info.author}** to the queue!`);
          } else {
            // Add the resolved track to queue
            logger.info(`[Play Command - SEARCH STEP 13] Processing resolved track data`);
            const resolvedTrack = trackRes.data;
            
            logger.info(`[Play Command - SEARCH STEP 13a] Resolved track encoded: ${resolvedTrack.encoded ? 'present (' + resolvedTrack.encoded.substring(0, 20) + '...)' : 'missing'}`);
            logger.info(`[Play Command - SEARCH STEP 13b] Resolved track info exists: ${resolvedTrack.info ? 'yes' : 'no'}`);
            
            if (resolvedTrack.info) {
              logger.info(`[Play Command - SEARCH STEP 13c] Resolved track info: ${JSON.stringify(resolvedTrack.info)}`);
            }
            
            logger.info(`[Play Command - SEARCH STEP 14] Adding resolved track to queue`);
            queue.queue.push({
              track: resolvedTrack.encoded,
              info: resolvedTrack.info,
              requester: message.author
            });
            
            logger.info(`[Play Command - SEARCH STEP 15] Resolved track added. Queue size now: ${queue.queue.length}`);
            message.reply(`Added **${resolvedTrack.info.title}** by **${resolvedTrack.info.author}** to the queue!`);
          }
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
