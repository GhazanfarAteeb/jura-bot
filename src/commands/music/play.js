import Command from '../../structures/Command.js';
import play from 'play-dl';
import logger from '../../utils/logger.js';

export default class Play extends Command {
  constructor(client) {
    super(client, {
      name: 'play',
      description: 'Plays a song from YouTube/SoundCloud/Spotify',
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

      if (isURL) {
        // It's a link - check if it's Spotify or SoundCloud
        logger.info(`[Play Command] Detected URL, checking platform...`);

        // Check for SoundCloud link
        if (query.includes('soundcloud.com')) {
          logger.info(`[Play Command] Detected SoundCloud URL`);

          // Resolve SoundCloud link directly via Lavalink
          const res = await queue.player.node.rest.resolve(query);
          logger.info(`[Play Command] SoundCloud direct resolve response:`, res);

          if (!res || !res.data || !res.data.length) {
            logger.error(`[Play Command] Failed to resolve SoundCloud URL`);
            return message.reply('Could not resolve this SoundCloud link.');
          }

          const tracks = res.data;

          // Handle SoundCloud playlists
          if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') {
            logger.info(`[Play Command] SoundCloud playlist detected: ${res.playlistInfo?.name || 'Unknown'} with ${tracks.length} tracks`);
            for (const track of tracks) {
              queue.queue.push({
                track: track.encoded,
                info: track.info,
                requester: message.author
              });
              logger.info(`[Play Command] Added SoundCloud playlist track: ${track.info.title}`);
            }
            logger.info(`[Play Command] SoundCloud playlist added. Queue size now: ${queue.queue.length}`);
            message.reply(`Loaded SoundCloud playlist **${res.playlistInfo?.name || 'Unknown'}** with ${tracks.length} tracks!`);
          } else {
            const track = tracks[0];
            logger.info(`[Play Command] SoundCloud track resolved: ${track.info.title}`);
            queue.queue.push({
              track: track.encoded,
              info: track.info,
              requester: message.author
            });
            logger.info(`[Play Command] SoundCloud track added to queue. Queue size: ${queue.queue.length}`);
            message.reply(`Added **${track.info.title}** (from SoundCloud) to the queue!`);
          }

          logger.info(`[Play Command] Queue isPlaying: ${queue.isPlaying()}`);
          if (!queue.isPlaying()) {
            logger.info(`[Play Command] Starting playback for SoundCloud track`);
            await queue.play();
          }
          return;
        }

        // Check for Spotify link
        logger.info(`[Play Command] Checking if query is a Spotify URL`);
        const spType = play.sp_validate(query);

        if (spType === 'track') {
          // Handle Spotify track
          logger.info(`[Play Command] Detected Spotify track URL`);
          let spData;
          try {
            logger.info(`[Play Command] Attempting Spotify API resolution`);
            spData = await play.spotify(query);
            logger.info(`[Play Command] Spotify API resolved: ${spData.name} by ${spData.artists[0].name}`);
          } catch (e) {
            logger.warn(`[Play Command] Spotify API failed: ${e.message}, falling back to scraping`);
            // Fallback: Scrape title
            try {
              logger.info(`[Play Command] Scraping Spotify page for metadata`);
              const response = await fetch(query, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const text = await response.text();
              const titleMatch = text.match(/<title>(.*?)<\/title>/i);
              if (titleMatch && titleMatch[1]) {
                let title = titleMatch[1]
                  .replace('| Spotify', '')
                  .replace('- song and lyrics by', '')
                  .replace(/on Spotify/i, '')
                  .trim();
                logger.info(`[Play Command] Scraped title: ${title}`);
                if (title && title !== 'Spotify') {
                  spData = { name: title, artists: [{ name: '' }] };
                }
              } else {
                logger.warn(`[Play Command] Failed to scrape title from Spotify page`);
              }
            } catch (scrapeErr) {
              logger.error(`[Play Command] Scraping failed: ${scrapeErr.message}`);
            }
          }

          if (!spData) {
            logger.error(`[Play Command] Failed to resolve Spotify URL through all methods`);
            return message.reply('Could not resolve Spotify URL. Please check your link or try a different search query.');
          }

          const search = `scsearch:${spData.name} ${spData.artists[0].name}`.trim();
          logger.info(`[Play Command] Searching SoundCloud for: ${search}`);

          // Use player.node.rest.resolve() as per Shoukaku v4
          const res = await queue.player.node.rest.resolve(search);
          logger.info(`[Play Command] SoundCloud search returned ${res.data?.length || 0} results`);

          if (!res || !res.data || !res.data.length) {
            logger.error(`[Play Command] No SoundCloud results for "${spData.name}"`);
            return message.reply(`Could not find "**${spData.name}**" on SoundCloud.`);
          }

          // Use smart matching to find best track (avoid previews)
          const Dispatcher = (await import('../../structures/Dispatcher.js')).default;
          const targetDuration = spData.durationInMs || null; // Use Spotify duration if available
          const track = Dispatcher.findBestMatch(
            res.data, 
            spData.name, 
            spData.artists[0].name,
            targetDuration
          );
          
          logger.info(`[Play Command] Selected best match: "${track.info.title}" by "${track.info.author}" (${track.info.length}ms)`);
          
          // Warn if track seems like a preview
          if (track.info.length < 60000) {
            logger.warn(`[Play Command] WARNING: Selected track is ${track.info.length}ms - might be a preview/snippet!`);
          }

          queue.queue.push({
            track: track.encoded,
            info: track.info,
            requester: message.author
          });
          logger.info(`[Play Command] Spotify track added to queue. Queue size: ${queue.queue.length}`);

          message.reply(`Added **${spData.name}** (from Spotify) to the queue!`);
          logger.info(`[Play Command] Queue isPlaying: ${queue.isPlaying()}`);
          if (!queue.isPlaying()) {
            logger.info(`[Play Command] Starting playback for Spotify track`);
            await queue.play();
          }
          return;
        } else {
          // Not a Spotify or SoundCloud link - unsupported platform
          logger.warn(`[Play Command] Unsupported platform URL detected: ${query}`);
          const embed = this.client.embed()
            .setTitle('Platform Not Supported')
            .setDescription('This platform is not supported. Please use one of the following:\n\nSupported:\n- Spotify links\n- SoundCloud links\n- Search queries (song name, artist, etc.)\n\nNot Supported:\n- YouTube links\n- Other platform links')
            .setColor(this.client.color.red)
            .setFooter({ text: 'Tip: Just search by song name instead!' });

          return message.reply({ embeds: [embed] });
        }
      } else {
        // Not a URL - treat as search query
        logger.info(`[Play Command] Treating as search query: "${query}"`);

        // Use SoundCloud search for non-URL queries
        const searchQuery = query.startsWith('scsearch:') || query.startsWith('ytsearch:')
          ? query
          : `scsearch:${query}`;

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
