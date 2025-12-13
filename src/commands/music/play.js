import Command from '../../structures/Command.js';
import play from 'play-dl';

play.setToken({
    spotify: {
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        market: 'US'
    }
});

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
            // Check for Spotify URL
            if (play.sp_validate(query) === 'track') {
                let spData;
                try {
                    spData = await play.spotify(query);
                } catch (e) {
                    console.error('[Spotify Auth Fail] Falling back to scraping:', e.message);
                    // Fallback: Scrape title
                    try {
                        const response = await fetch(query);
                        const text = await response.text();
                        const titleMatch = text.match(/<title>(.*?)<\/title>/i);
                        if (titleMatch && titleMatch[1]) {
                            let title = titleMatch[1].replace('| Spotify', '').replace('- song and lyrics by', '').trim();
                            // Clean up "Song - Artist" format
                            spData = { name: title, artists: [{ name: '' }] };
                        }
                    } catch (scrapeErr) {
                        console.error('Scraping failed:', scrapeErr);
                    }
                }

                if (!spData) return message.reply('Could not resolve Spotify URL. Please check your link or try a YouTube link.');

                const search = `ytsearch:${spData.name} ${spData.artists[0].name}`.trim();
                const res = await node.rest.resolve(search);
                
                if (!res || !res.tracks || !res.tracks.length) return message.reply('Could not find that Spotify track on YouTube.');
                
                const track = res.tracks[0];
                const queue = this.client.music.createQueue(message.guild, channel, message.channel);
                queue.queue.push({
                    track: track.encoded,
                    info: track.info,
                    requester: message.author
                });
                
                message.reply(`Added **${spData.name}** (from Spotify) to the queue!`);
                if (!queue.player.playing && !queue.player.paused) await queue.play();
                return;
            }

            const res = await node.rest.resolve(query);
            
            if (!res || !res.tracks || !res.tracks.length) return message.reply('No results found for your query.');

            const queue = this.client.music.createQueue(message.guild, channel, message.channel);
            
            // Handle playlists
            if (res.loadType === 'playlist') { // Updated for newer Shoukaku/Lavalink response structure checks
                 for (const track of res.tracks) {
                    queue.queue.push({
                        track: track.encoded,
                        info: track.info,
                        requester: message.author
                    });
                }
                 message.reply(`Loaded playlist **${res.playlistInfo.name}** with ${res.tracks.length} tracks!`);
            } else {
                 const track = res.tracks[0];
                 queue.queue.push({
                     track: track.encoded,
                     info: track.info,
                     requester: message.author
                 });
                 message.reply(`Added **${track.info.title}** to the queue!`);
            }

            if (!queue.player.playing && !queue.player.paused) await queue.play();

        } catch (error) {
            console.error(error);
            message.reply('There was an error while searching: ' + error.message);
        }
    }
}
