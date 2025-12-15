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
        
        logger.debug(`[Play Command] Spotify Credentials: ID=${process.env.SPOTIFY_CLIENT_ID ? 'Yes' : 'No'}, Secret=${process.env.SPOTIFY_CLIENT_SECRET ? 'Yes' : 'No'}`);

        if (!args.length) {
            logger.warn(`[Play Command] No query provided by ${message.author.tag}`);
            return message.reply('Please provide a song to play!');
        }

        const { channel } = message.member.voice;
        if (!channel) {
            logger.warn(`[Play Command] User ${message.author.tag} not in voice channel`);
            return message.reply('You need to be in a voice channel to play music!');
        }

        logger.debug(`[Play Command] Voice channel: ${channel.name} (${channel.id})`);

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
        
        logger.debug(`[Play Command] Using node: ${node.name}`);

        try {
            // 1. Try resolving with Lavalink Direct (Lavasrc plugin support)
            logger.debug(`[Play Command] Attempting direct Lavalink resolution for query: "${query}"`);
            try {
                const directRes = await node.rest.resolve(query);
                if (directRes && directRes.tracks && directRes.tracks.length > 0) {
                    logger.info(`[Play Command] Direct resolve successful - loadType: ${directRes.loadType}, tracks: ${directRes.tracks.length}`);
                    
                    const queue = this.client.music.createQueue(message.guild, channel, message.channel);
                    logger.debug(`[Play Command] Queue obtained for guild ${message.guild.id}, existing queue: ${!!queue}`);
                    
                    if (directRes.loadType === 'playlist' || directRes.loadType === 'PLAYLIST_LOADED') {
                        logger.info(`[Play Command] Playlist detected: ${directRes.playlistInfo.name} with ${directRes.tracks.length} tracks`);
                        for (const track of directRes.tracks) {
                            queue.queue.push({ track: track.encoded || track.track, info: track.info, requester: message.author });
                            logger.debug(`[Play Command] Added track to queue: ${track.info.title}`);
                        }
                        logger.info(`[Play Command] Playlist added. Queue size now: ${queue.queue.length}`);
                        message.reply(`Loaded playlist **${directRes.playlistInfo.name}** with ${directRes.tracks.length} tracks!`);
                    } else {
                        const track = directRes.tracks[0];
                        logger.info(`[Play Command] Single track resolved: ${track.info.title}`);
                        queue.queue.push({ track: track.encoded || track.track, info: track.info, requester: message.author });
                        logger.debug(`[Play Command] Track added. Queue size now: ${queue.queue.length}`);
                        message.reply(`Added **${track.info.title}** to the queue!`);
                    }
                    logger.debug(`[Play Command] Queue isPlaying: ${queue.isPlaying()}, will ${queue.isPlaying() ? 'NOT' : ''} call play()`);
                    if (!queue.isPlaying()) {
                        logger.info(`[Play Command] Starting playback for guild ${message.guild.id}`);
                        await queue.play();
                    }
                    return;
                } else {
                    logger.debug(`[Play Command] Direct resolve returned no tracks or invalid response`);
                }
            } catch (err) {
                logger.debug(`[Play Command] Direct resolve failed: ${err.message}, falling back to other methods`);
                // Ignore and continue to fallbacks
            }


            // 2. Client-side Spotify Resolution (play-dl / scraping)
            // Validates track, album, or playlist
            logger.debug(`[Play Command] Checking if query is a Spotify URL`);
            const spType = play.sp_validate(query);
            if (spType === 'track') {
                logger.info(`[Play Command] Detected Spotify track URL`);
                let spData;
                try {
                    logger.debug(`[Play Command] Attempting Spotify API resolution`);
                    spData = await play.spotify(query);
                    logger.info(`[Play Command] Spotify API resolved: ${spData.name} by ${spData.artists[0].name}`);
                } catch (e) {
                    logger.warn(`[Play Command] Spotify API failed: ${e.message}, falling back to scraping`);
                    // Fallback: Scrape title
                    try {
                        logger.debug(`[Play Command] Scraping Spotify page for metadata`);
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
                    return message.reply('Could not resolve Spotify URL. Please check your link or try a YouTube link.');
                }

                const search = `scsearch:${spData.name} ${spData.artists[0].name}`.trim();
                logger.info(`[Play Command] Searching SoundCloud for: ${search}`);
                const res = await node.rest.resolve(search);
                logger.debug(`[Play Command] SoundCloud search response:`, res);
                
                if (!res || !res.data || !res.data.length) {
                    logger.error(`[Play Command] No SoundCloud results for "${spData.name}"`);
                    return message.reply(`Could not find "**${spData.name}**" on YouTube.`);
                }
                
                const track = res.data[0];
                logger.info(`[Play Command] Spotify track resolved to: ${track.info.title}`);
                const queue = this.client.music.createQueue(message.guild, channel, message.channel);
                logger.debug(`[Play Command] Queue obtained for Spotify track`);
                
                queue.queue.push({
                    track: track.encoded || track.track,
                    info: track.info,
                    requester: message.author
                });
                logger.info(`[Play Command] Spotify track added to queue. Queue size: ${queue.queue.length}`);
                
                message.reply(`Added **${spData.name}** (from Spotify) to the queue!`);
                logger.debug(`[Play Command] Queue isPlaying: ${queue.isPlaying()}`);
                if (!queue.isPlaying()) {
                    logger.info(`[Play Command] Starting playback for Spotify track`);
                    await queue.play();
                }
                return;
            }

            logger.info(`[Play Command] Attempting standard resolution for query: "${query}"`);
            const res = await node.rest.resolve(query);
            logger.debug(`[Play Command] Resolution response - loadType: ${res.loadType}`);
            
            // Shoukaku v4 uses res.data instead of res.tracks
            const tracks = res.tracks || res.data;
            if (!res || !tracks || !tracks.length) {
                logger.warn(`[Play Command] No results found for query: "${query}"`);
                return message.reply('No results found for your query.');
            }
            
            logger.info(`[Play Command] Found ${tracks.length} track(s) for query`);

            const queue = this.client.music.createQueue(message.guild, channel, message.channel);
            logger.debug(`[Play Command] Queue obtained for guild ${message.guild.id}`);
            
            // Handle playlists
            if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') { 
                logger.info(`[Play Command] Playlist detected: ${res.playlistInfo?.name || 'Unknown'} with ${tracks.length} tracks`);
                for (const track of tracks) {
                    queue.queue.push({
                        track: track.encoded || track.track,
                        info: track.info,
                        requester: message.author
                    });
                    logger.debug(`[Play Command] Added playlist track: ${track.info.title}`);
                }
                logger.info(`[Play Command] Playlist added. Queue size now: ${queue.queue.length}`);
                message.reply(`Loaded playlist **${res.playlistInfo?.name || 'Unknown'}** with ${tracks.length} tracks!`);
            } else {
                const track = tracks[0];
                logger.info(`[Play Command] Single track found: ${track.info.title}`);
                queue.queue.push({
                    track: track.encoded || track.track,
                    info: track.info,
                    requester: message.author
                });
                logger.debug(`[Play Command] Track added. Queue size now: ${queue.queue.length}`);
                message.reply(`Added **${track.info.title}** to the queue!`);
            }

            logger.debug(`[Play Command] Queue isPlaying: ${queue.isPlaying()}`);
            if (!queue.isPlaying()) {
                logger.info(`[Play Command] Starting playback for guild ${message.guild.id}`);
                await queue.play();
            }

        } catch (error) {
            logger.error(`[Play Command] Error occurred in guild ${message.guild.id}:`, error);
            logger.debug(`[Play Command] Error stack:`, error.stack);
            message.reply('There was an error while searching: ' + error.message);
        }
    }
}
