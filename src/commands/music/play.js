import Command from '../../structures/Command.js';
import play from 'play-dl';

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
        
        console.log(`[DEBUG] Spotify Credentials: ID=${process.env.SPOTIFY_CLIENT_ID ? 'Yes' : 'No'}, Secret=${process.env.SPOTIFY_CLIENT_SECRET ? 'Yes' : 'No'}`);

        if (!args.length) return message.reply('Please provide a song to play!');

        const { channel } = message.member.voice;
        if (!channel) return message.reply('You need to be in a voice channel to play music!');

        const permissions = channel.permissionsFor(this.client.user);
        if (!permissions.has(['Connect', 'Speak'])) return message.reply('I don\'t have permissions to connect and speak in that channel!');

        const query = args.join(' ');
        const node = this.client.music.getNode();
        
        if (!node) return message.reply('Music node is not ready yet, please try again later.');

        try {
            // 1. Try resolving with Lavalink Direct (Lavasrc plugin support)
            try {
                const directRes = await node.rest.resolve(query);
                if (directRes && directRes.tracks && directRes.tracks.length > 0) {
                    console.log('[Direct Resolve] Successfully resolved via Lavalink directly.');
                    // Reuse the existing playlist handling logic below by continuing
                    // or just handle it here. Best to refactor or just let it fall through if I structure it right.
                    // But to keep it simple, I'll return here if it works.
                    
                    const queue = this.client.music.createQueue(message.guild, channel, message.channel);
                    console.log(`[Play] Queue created/retrieved for guild ${message.guild.id}`);
                    
                    if (directRes.loadType === 'playlist' || directRes.loadType === 'PLAYLIST_LOADED') {
                        console.log(`[Play] Adding ${directRes.tracks.length} playlist tracks to queue`);
                        for (const track of directRes.tracks) {
                            queue.queue.push({ track: track.encoded, info: track.info, requester: message.author });
                        }
                        console.log(`[Play] Playlist added. Queue size: ${queue.queue.length}`);
                        message.reply(`Loaded playlist **${directRes.playlistInfo.name}** with ${directRes.tracks.length} tracks!`);
                    } else {
                        const track = directRes.tracks[0];
                        console.log(`[Play] Adding single track "${track.info.title}" to queue`);
                        queue.queue.push({ track: track.encoded, info: track.info, requester: message.author });
                        console.log(`[Play] Track added. Queue size: ${queue.queue.length}`);
                        message.reply(`Added **${track.info.title}** to the queue!`);
                    }
                    console.log(`[Play] Queue isPlaying: ${queue.isPlaying()}, will ${queue.isPlaying() ? 'NOT' : ''} call play()`);
                    if (!queue.isPlaying()) await queue.play();
                    return;
                }
            } catch (err) {
                // Ignore and continue to fallbacks
            }


            // 2. Client-side Spotify Resolution (play-dl / scraping)
            // Validates track, album, or playlist
            const spType = play.sp_validate(query);
            if (spType === 'track') {
                let spData;
                try {
                    spData = await play.spotify(query);
                } catch (e) {
                    console.error('[Spotify Auth Fail] Falling back to scraping. Error:', e.message);
                    // Fallback: Scrape title
                    try {
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
                            console.log(`[Scrape] Found title: ${title}`);
                            if (title && title !== 'Spotify') {
                                spData = { name: title, artists: [{ name: '' }] };
                            }
                        }
                    } catch (scrapeErr) {
                        console.error('Scraping failed:', scrapeErr.message);
                    }
                }

                if (!spData) return message.reply('Could not resolve Spotify URL. Please check your link or try a YouTube link.');

                const search = `scsearch:${spData.name} ${spData.artists[0].name}`.trim();
                const res = await node.rest.resolve(search);
                console.log("res data ", res);
                if (!res || !res.data || !res.data.length) return message.reply(`Could not find "**${spData.name}**" on YouTube.`);
                
                const track = res.data[0];
                console.log(`[Play] Spotify track resolved: "${spData.name}"`);
                const queue = this.client.music.createQueue(message.guild, channel, message.channel);
                console.log(`[Play] Queue created/retrieved for Spotify track`);
                
                queue.queue.push({
                    track: track.encoded,
                    info: track.info,
                    requester: message.author
                });
                console.log(`[Play] Spotify track added to queue. Queue size: ${queue.queue.length}`);
                
                message.reply(`Added **${spData.name}** (from Spotify) to the queue!`);
                console.log(`[Play] Queue isPlaying: ${queue.isPlaying()}, will ${queue.isPlaying() ? 'NOT' : ''} call play()`);
                if (!queue.isPlaying()) await queue.play();
                return;
            }

            const res = await node.rest.resolve(query);
            console.log(`[Play] Regular query resolved: ${query}`);
            
            if (!res || !res.tracks || !res.tracks.length) return message.reply('No results found for your query.');

            const queue = this.client.music.createQueue(message.guild, channel, message.channel);
            console.log(`[Play] Queue created/retrieved for guild ${message.guild.id}`);
            
            // Handle playlists
            if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') { 
                console.log(`[Play] Adding ${res.tracks.length} playlist tracks to queue`);
                for (const track of res.tracks) {
                    queue.queue.push({
                        track: track.encoded,
                        info: track.info,
                        requester: message.author
                    });
                }
                console.log(`[Play] Playlist added. Queue size: ${queue.queue.length}`);
                message.reply(`Loaded playlist **${res.playlistInfo.name}** with ${res.tracks.length} tracks!`);
            } else {
                const track = res.tracks[0];
                console.log(`[Play] Adding single track "${track.info.title}" to queue`);
                queue.queue.push({
                    track: track.encoded,
                    info: track.info,
                    requester: message.author
                });
                console.log(`[Play] Track added. Queue size: ${queue.queue.length}`);
                message.reply(`Added **${track.info.title}** to the queue!`);
            }

            console.log(`[Play] Queue isPlaying: ${queue.isPlaying()}, will ${queue.isPlaying() ? 'NOT' : ''} call play()`);
            if (!queue.isPlaying()) await queue.play();

        } catch (error) {
            console.error(error);
            message.reply('There was an error while searching: ' + error.message);
        }
    }
}
