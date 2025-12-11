import { player, checkVoiceChannel } from '../../utils/musicPlayer.js';
import { QueryType } from 'discord-player';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import playdl from 'play-dl';

export default {
    name: 'play',
    aliases: ['p'],
    description: 'Play music from YouTube, Spotify, and Apple Music',
    usage: 'play <song name | url>',
    category: 'music',
    cooldown: 3,
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in voice channel
        const voiceCheck = checkVoiceChannel(message);
        if (voiceCheck.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Voice Channel Error', voiceCheck.message)] });
        }
        
        if (!args.length) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Missing Arguments', 'Please provide a song name or URL!\n\n**Usage:** `R!play <song|url>`\n\n**Examples:**\n• `R!play never gonna give you up`\n• `R!play rick astley - never gonna give you up`\n• `R!play https://youtube.com/watch?v=...`\n• `R!play https://open.spotify.com/track/...`\n• `R!play https://music.apple.com/...`\n\n**Supported Platforms:**\n✅ YouTube (search or URL)\n✅ Spotify (URL only)\n✅ Apple Music (URL only)')]
            });
        }
        
        // Join all args to support "song name artist name"
        const query = args.join(' ');
        const channel = message.member.voice.channel;
        
        try {
            await message.channel.sendTyping();
            
            // Determine if query is a URL and which type
            const isURL = query.includes('http://') || query.includes('https://');
            const isYouTubeURL = isURL && (query.includes('youtube.com') || query.includes('youtu.be') || query.includes('m.youtube.com'));
            const isSpotifyURL = isURL && query.includes('spotify.com');
            const isAppleMusicURL = isURL && query.includes('music.apple.com');
            
            let searchResult;
            
            // For YouTube URLs - bypass discord-player's search entirely and use direct URL
            if (isYouTubeURL) {
                console.log(`🎥 YouTube URL detected - using direct URL extraction`);
                
                // Clean up URL format
                let cleanURL = query
                    .replace('m.youtube.com', 'www.youtube.com')
                    .replace('youtu.be/', 'youtube.com/watch?v=');
                
                // Extract video ID to ensure exact match
                let videoId = null;
                const urlPatterns = [
                    /(?:youtube\.com\/watch\?v=)([^&]+)/,
                    /(?:youtube\.com\/embed\/)([^?]+)/,
                    /(?:youtube\.com\/v\/)([^?]+)/
                ];
                
                for (const pattern of urlPatterns) {
                    const match = cleanURL.match(pattern);
                    if (match) {
                        videoId = match[1];
                        break;
                    }
                }
                
                if (videoId) {
                    // Construct clean URL with just video ID
                    cleanURL = `https://www.youtube.com/watch?v=${videoId}`;
                    console.log(`✅ Extracted video ID: ${videoId}`);
                    console.log(`   Clean URL: ${cleanURL}`);
                }
                
                try {
                    // Use AUTO but with the clean URL - this should force exact match
                    searchResult = await player.search(cleanURL, {
                        requestedBy: message.author,
                        searchEngine: QueryType.AUTO
                    });
                    
                    if (searchResult && searchResult.tracks.length > 0) {
                        console.log(`✅ Discord-player found:`, {
                            title: searchResult.tracks[0].title,
                            author: searchResult.tracks[0].author,
                            url: searchResult.tracks[0].url,
                            duration: searchResult.tracks[0].duration
                        });
                    }
                } catch (searchError) {
                    console.error('❌ discord-player failed, trying play-dl fallback:', searchError.message);
                    
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'YouTube Error', `Could not load YouTube video.\n\n**Possible reasons:**\n• Video is age-restricted\n• Video is region-locked\n• Video is private/deleted\n• Rate limit reached\n\n**Try:** A different video or wait a moment`)]
                    });
                }
                
            } else if (isSpotifyURL) {
                console.log(`🎵 Spotify URL detected: ${query}`);
                
                // Get Spotify metadata using play-dl DIRECTLY (bypass discord-player extractors)
                let spotifyInfo = null;
                try {
                    // play-dl can fetch Spotify track info directly without any extractor
                    spotifyInfo = await playdl.spotify(query);
                    
                    if (spotifyInfo) {
                        console.log(`✅ Spotify metadata from play-dl:`, {
                            title: spotifyInfo.name,
                            artists: spotifyInfo.artists?.map(a => a.name).join(', '),
                            duration: `${Math.floor(spotifyInfo.durationInMs / 1000)}s`
                        });
                    }
                } catch (spotifyError) {
                    console.error('❌ play-dl Spotify fetch failed:', spotifyError.message);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Spotify Error', `Could not access Spotify track.\n\n**Error:** ${spotifyError.message}\n\n**Try:** Using a direct YouTube URL instead`)]
                    });
                }
                
                if (!spotifyInfo || !spotifyInfo.name) {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Spotify Error', `Could not get track information from Spotify.\n\n**Try:** Using the song name directly or a YouTube URL`)]
                    });
                }
                
                // Clean up search terms
                const cleanTitle = spotifyInfo.name
                    .replace(/\s*\(feat\.?.*?\)/gi, '')
                    .replace(/\s*\[.*?\]/g, '')
                    .replace(/\s*\(official.*?\)/gi, '')
                    .replace(/\s*-\s*remaster.*$/gi, '')
                    .trim();
                
                const artistName = spotifyInfo.artists?.[0]?.name || '';
                const cleanArtist = artistName
                    .split(',')[0]
                    .split('&')[0]
                    .split('feat')[0]
                    .trim();
                
                // Multiple search queries with decreasing specificity (MusicBot strategy)
                const searchQueries = [
                    `"${cleanTitle}" "${cleanArtist}" audio`,    // Exact match with "audio" keyword (MOST accurate)
                    `${cleanArtist} ${cleanTitle} official audio`, // Official audio version
                    `${cleanArtist} ${cleanTitle}`,              // Normal search
                    `${cleanTitle} ${cleanArtist}`,              // Reversed order
                    `${cleanTitle}`                               // Title only (last resort)
                ];
                
                console.log(`🔍 MusicBot Strategy - ${searchQueries.length} attempts for: "${cleanTitle}" by "${cleanArtist}"`);
                
                let bestYouTubeUrl = null;
                let bestYouTubeTitle = null;
                
                for (let i = 0; i < searchQueries.length; i++) {
                    const searchQuery = searchQueries[i];
                    try {
                        console.log(`   [${i+1}/${searchQueries.length}] "${searchQuery}"`);
                        
                        const playDlResults = await playdl.search(searchQuery, {
                            limit: 5,
                            source: { youtube: 'video' }
                        });
                        
                        if (playDlResults && playDlResults.length > 0) {
                            // Filter for best match - prefer Topic channels and official
                            for (const result of playDlResults) {
                                const title = result.title?.toLowerCase() || '';
                                const channel = result.channel?.name?.toLowerCase() || '';
                                
                                console.log(`      → ${result.title} [${result.channel?.name}]`);
                                
                                // BEST: Topic channels (auto-generated by YouTube Music - most accurate!)
                                if (channel.includes('- topic')) {
                                    bestYouTubeUrl = result.url;
                                    bestYouTubeTitle = result.title;
                                    console.log(`      ✅ TOPIC CHANNEL! Perfect match`);
                                    break;
                                }
                                
                                // GOOD: Contains "official" and matches title/artist
                                if (title.includes('official') && 
                                    (title.includes(cleanTitle.toLowerCase()) || title.includes(cleanArtist.toLowerCase()))) {
                                    if (!bestYouTubeUrl) {
                                        bestYouTubeUrl = result.url;
                                        bestYouTubeTitle = result.title;
                                        console.log(`      ✅ Official version`);
                                    }
                                }
                                
                                // OKAY: First result
                                if (!bestYouTubeUrl) {
                                    bestYouTubeUrl = result.url;
                                    bestYouTubeTitle = result.title;
                                }
                            }
                            
                            if (bestYouTubeUrl) {
                                console.log(`🎯 Selected: ${bestYouTubeTitle}`);
                                break; // Stop searching, we found a good match
                            }
                        } else {
                            console.log(`      ❌ No results`);
                        }
                    } catch (searchError) {
                        console.log(`      ❌ Failed: ${searchError.message}`);
                        continue;
                    }
                }
                
                if (!bestYouTubeUrl) {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'No YouTube Match', `Could not find **${spotifyInfo.name}** by **${artistName}** on YouTube.\n\n**Try:**\n• Search directly: \`R!play ${cleanTitle} ${cleanArtist}\`\n• Use a YouTube URL`)]
                    });
                }
                
                console.log(`🎬 Loading YouTube: ${bestYouTubeUrl}`);
                
                // Use discord-player to load the exact YouTube URL we found
                try {
                    searchResult = await player.search(bestYouTubeUrl, {
                        requestedBy: message.author,
                        searchEngine: QueryType.YOUTUBE_VIDEO
                    });
                    
                    if (searchResult && searchResult.tracks.length > 0) {
                        console.log(`✅ Ready to play: ${searchResult.tracks[0].title}`);
                    }
                } catch (loadError) {
                    console.error(`❌ Failed to load YouTube URL:`, loadError.message);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Playback Error', `Found the song but couldn't load it: ${loadError.message}`)]
                    });
                }
                
            } else if (isAppleMusicURL) {
                console.log(`🍎 Apple Music URL detected: ${query}`);
                try {
                    // Use AUTO to let discord-player handle Apple Music and bridge to YouTube
                    searchResult = await player.search(query, {
                        requestedBy: message.author,
                        searchEngine: QueryType.AUTO
                    });
                    
                    if (searchResult && searchResult.tracks.length > 0) {
                        console.log(`✅ Apple Music bridge successful:`, {
                            title: searchResult.tracks[0].title,
                            author: searchResult.tracks[0].author,
                            source: searchResult.tracks[0].source
                        });
                    }
                } catch (searchError) {
                    console.error('❌ Apple Music search error:', searchError);
                    console.error('Full error:', searchError.message, searchError.stack);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Apple Music Error', `Could not load Apple Music track.\n\n**Error:** ${searchError.message}\n\n**Try:** Searching by song name instead`)]
                    });
                }
                
            } else if (isURL) {
                console.log(`🔗 Generic URL detected`);
                try {
                    searchResult = await player.search(query, {
                        requestedBy: message.author,
                        searchEngine: QueryType.AUTO
                    });
                } catch (searchError) {
                    console.error('❌ URL search error:', searchError);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'URL Error', `Could not load URL: ${searchError.message}`)]
                    });
                }
                
            } else {
                // Plain text search
                console.log(`🔍 Text search: "${query}"`);
                try {
                    searchResult = await player.search(query, {
                        requestedBy: message.author,
                        searchEngine: QueryType.YOUTUBE_SEARCH
                    });
                } catch (searchError) {
                    console.error('❌ Text search error:', searchError);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Search Error', `Search failed: ${searchError.message}`)]
                    });
                }
            }
            
            // Check if we got results
            if (!searchResult || !searchResult.tracks.length) {
                console.log(`❌ No results found for query type: ${isSpotifyURL ? 'Spotify' : isYouTubeURL ? 'YouTube' : isAppleMusicURL ? 'Apple Music' : 'Search'}`);
                console.log(`   Query: ${query}`);
                console.log(`   Search result object:`, searchResult);
                
                if (isSpotifyURL) {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Spotify Track Not Found', `Could not find this Spotify track on YouTube.\n\n**This usually means:**\n• The track is not available on YouTube\n• Regional restrictions\n• The track was removed\n\n**Try:** Searching for the song name directly instead of using Spotify URL`)]
                    });
                }
                
                if (isURL) {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'No Results', `Could not access that URL.\n\n**Check:**\n• Video/song is not private\n• Not region-locked\n• URL is correct\n\n**URL:** ${query}`)]
                    });
                }
                
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'No Results', `No results for: **${query}**\n\n**Try:**\n• Direct YouTube/Spotify URL\n• Simpler search terms\n• Include artist name`)]
                });
            }
            
            console.log(`✅ Found: ${searchResult.tracks[0].title} by ${searchResult.tracks[0].author}`);
            
            // Create or get queue
            const queue = player.nodes.create(message.guild, {
                metadata: {
                    channel: message.channel,
                    client: message.guild.members.me,
                    requestedBy: message.author
                },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 300000, // 5 minutes
                leaveOnEnd: false,
                leaveOnEndCooldown: 300000
            });
            
            // Connect to voice channel if not connected
            let justConnected = false;
            try {
                if (!queue.connection) {
                    await queue.connect(channel, {
                        deaf: true
                    });
                    justConnected = true;
                    console.log(`✅ Connected to voice channel: ${channel.name} in guild: ${message.guild.name}`);
                    await message.channel.send(`🎵 Joined **${channel.name}**! Preparing to play...`);
                }
            } catch (error) {
                console.error('Voice connection error:', error);
                player.nodes.delete(message.guild.id);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Voice Connection Failed', `Could not join your voice channel!\n\n**Error:** ${error.message}\n\nMake sure I have permission to **Connect** and **Speak** in the voice channel.`)]
                });
            }
            
            // Add track(s) to queue
            if (searchResult.playlist) {
                queue.addTrack(searchResult.tracks);
                const embed = await successEmbed(
                    guildId,
                    '📂 Playlist Added!',
                    `**${searchResult.playlist.title}**\n\n${searchResult.tracks.length} tracks added to queue`
                );
                embed.setThumbnail(searchResult.playlist.thumbnail);
                await message.reply({ embeds: [embed] });
            } else {
                const track = searchResult.tracks[0];
                queue.addTrack(track);
                
                if (queue.tracks.size > 1) {
                    const embed = await successEmbed(
                        guildId,
                        '✅ Added to Queue',
                        `**${track.title}**\nby ${track.author}`
                    );
                    embed.addFields(
                        { name: 'Duration', value: track.duration, inline: true },
                        { name: 'Position in Queue', value: `${queue.tracks.size}`, inline: true }
                    );
                    if (track.thumbnail) embed.setThumbnail(track.thumbnail);
                    await message.reply({ embeds: [embed] });
                }
            }
            
            // Start playing if not already
            if (!queue.node.isPlaying()) {
                try {
                    // Wait 2 seconds after joining before playing
                    if (justConnected) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    console.log(`🎵 Starting playback in ${message.guild.name}...`);
                    console.log(`   Track: ${queue.tracks.toArray()[0]?.title || 'Unknown'}`);
                    console.log(`   Volume: ${queue.node.volume}%`);
                    
                    // Play with retry mechanism
                    let playAttempts = 0;
                    let playSuccess = false;
                    
                    while (playAttempts < 3 && !playSuccess) {
                        try {
                            await queue.node.play();
                            playSuccess = true;
                            
                            // Set volume explicitly
                            queue.node.setVolume(80);
                            
                            console.log(`▶️ Playback started successfully in ${message.guild.name}`);
                        } catch (attemptError) {
                            playAttempts++;
                            console.error(`❌ Play attempt ${playAttempts} failed:`, attemptError.message);
                            
                            if (playAttempts < 3) {
                                console.log(`🔄 Retrying in 1 second...`);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            } else {
                                throw attemptError;
                            }
                        }
                    }
                    
                } catch (playError) {
                    console.error('❌ Play error:', playError);
                    console.error('Play error details:', playError.message, playError.stack);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Playback Error', `Failed to start playback after 3 attempts: ${playError.message}`)]
                    });
                }
            }
            
        } catch (error) {
            console.error('Error playing music:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while trying to play the song!')]
            });
        }
    }
};
