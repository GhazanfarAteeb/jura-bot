import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import logger from '../../utils/logger.js';

/**
 * Platform configurations with colors, emojis, and metadata
 */
const PLATFORM_CONFIG = {
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    emoji: '▶️', // Fallback Unicode
    customEmojiId: process.env.YOUTUBE_EMOJI_ID || null,
    icon: 'https://www.youtube.com/favicon.ico'
  },
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    emoji: '🟢', // Fallback Unicode
    customEmojiId: process.env.SPOTIFY_EMOJI_ID || null,
    icon: 'https://www.scdn.co/i/_global/favicon.png'
  },
  applemusic: {
    name: 'Apple Music',
    color: '#FA243C',
    emoji: '🍎', // Fallback Unicode
    customEmojiId: process.env.APPLEMUSIC_EMOJI_ID || null,
    icon: 'https://www.apple.com/favicon.ico'
  },
  soundcloud: {
    name: 'SoundCloud',
    color: '#FF8800',
    emoji: '☁️', // Fallback Unicode
    customEmojiId: process.env.SOUNDCLOUD_EMOJI_ID || null,
    icon: 'https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14bdb.ico'
  },
  deezer: {
    name: 'Deezer',
    color: '#00C7F2',
    emoji: '💙', // Fallback Unicode
    customEmojiId: process.env.DEEZER_EMOJI_ID || null,
    icon: 'https://www.deezer.com/favicon.ico'
  },
  yandex: {
    name: 'Yandex Music',
    color: '#FFCC00',
    emoji: '🎵', // Fallback Unicode
    customEmojiId: process.env.YANDEX_EMOJI_ID || null,
    icon: 'https://music.yandex.ru/favicon.ico'
  },
  http: {
    name: 'Direct Link',
    color: '#808080',
    emoji: '🔗',
    customEmojiId: null,
    icon: null
  },
  unknown: {
    name: 'Unknown',
    color: '#808080',
    emoji: '🎵',
    customEmojiId: null,
    icon: null
  }
};

/**
 * Detect platform from track info
 */
function detectPlatform(track) {
  const uri = track.info.uri || '';
  const sourceName = track.info.sourceName?.toLowerCase() || '';

  if (uri.includes('youtube.com') || uri.includes('youtu.be') || sourceName.includes('youtube')) {
    return 'youtube';
  } else if (uri.includes('spotify.com') || sourceName.includes('spotify')) {
    return 'spotify';
  } else if (uri.includes('music.apple.com') || sourceName.includes('apple')) {
    return 'applemusic';
  } else if (uri.includes('soundcloud.com') || sourceName.includes('soundcloud')) {
    return 'soundcloud';
  } else if (uri.includes('deezer.com') || sourceName.includes('deezer')) {
    return 'deezer';
  } else if (uri.includes('music.yandex') || sourceName.includes('yandex')) {
    return 'yandex';
  } else if (uri.startsWith('http')) {
    return 'http';
  }

  return 'unknown';
}

/**
 * Get platform emoji (custom or fallback)
 */
function getPlatformEmoji(client, platform) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.unknown;

  if (config.customEmojiId) {
    try {
      const emoji = client.emojis.cache.get(config.customEmojiId);
      if (emoji) return emoji.toString();
    } catch (error) {
      logger.warn(`[PlayerEmbeds] Failed to get custom emoji for ${platform}:`, error.message);
    }
  }

  return config.emoji;
}

/**
 * Format duration from milliseconds to MM:SS or HH:MM:SS
 */
function formatDuration(ms) {
  if (!ms || ms === 0) return 'LIVE';

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create a progress bar with emojis
 */
function createProgressBar(current, total, length = 15) {
  if (!total || total === 0) return '━━━━━━━━━━━━━━━ LIVE';

  const progress = Math.min(Math.floor((current / total) * length), length);
  const emptyProgress = length - progress;

  const filledBar = '━'.repeat(progress);
  const emptyBar = '━'.repeat(emptyProgress);
  const progressEmoji = '●';

  return `${filledBar}${progressEmoji}${emptyBar}`;
}

/**
 * Create Now Playing Embed with beautiful design
 */
export async function createNowPlayingEmbed(track, player, client) {
  const platform = detectPlatform(track);
  const platformInfo = PLATFORM_CONFIG[platform];
  const platformEmoji = getPlatformEmoji(client, platform);

  const embed = new EmbedBuilder()
    .setColor(platformInfo.color)
    .setTitle(`${platformEmoji} Now Playing`)
    .setDescription(`**[${track.info.title}](${track.info.uri})**`)
    .addFields(
      {
        name: '👤 Requested by',
        value: track.requester ? `<@${track.requester.id}>` : 'Unknown',
        inline: true
      },
      {
        name: '🎵 Source',
        value: `${platformEmoji} ${platformInfo.name}`,
        inline: true
      },
      {
        name: '🕐 Duration',
        value: formatDuration(track.info.length),
        inline: true
      }
    )
    .setTimestamp()
    .setFooter({
      text: `Volume: ${player.volume || 100}% | Loop: ${player.loop === 'track' ? '🔂 Track' : player.loop === 'queue' ? '🔁 Queue' : 'Off'}`
    });

  // Add author if available
  if (track.info.author) {
    embed.addFields({
      name: '🎤 Artist',
      value: track.info.author,
      inline: true
    });
  }

  // Add thumbnail
  if (track.info.artworkUrl) {
    embed.setThumbnail(track.info.artworkUrl);
  } else if (track.info.thumbnail) {
    embed.setThumbnail(track.info.thumbnail);
  }

  // Add progress bar
  const currentPosition = player.position || 0;
  const progressBar = createProgressBar(currentPosition, track.info.length);
  const currentTime = formatDuration(currentPosition);
  const totalTime = formatDuration(track.info.length);

  embed.addFields({
    name: '⏱️ Progress',
    value: `${currentTime} ${progressBar} ${totalTime}`,
    inline: false
  });

  // Add queue info if there are more tracks
  if (player.queue && player.queue.length > 0) {
    const nextTrack = player.queue[0];
    embed.addFields({
      name: '⏭️ Up Next',
      value: `**${nextTrack.info.title}** by ${nextTrack.info.author || 'Unknown'}`,
      inline: false
    });

    embed.addFields({
      name: '📜 Queue',
      value: `${player.queue.length} track${player.queue.length > 1 ? 's' : ''} remaining`,
      inline: true
    });
  }

  return embed;
}

/**
 * Create Queue Embed with pagination
 */
export function createQueueEmbed(player, client, page = 1, pageSize = 10) {
  const queue = player.queue || [];
  const currentTrack = player.current;

  if (!currentTrack && queue.length === 0) {
    return new EmbedBuilder()
      .setColor('#808080')
      .setTitle('📜 Queue is Empty')
      .setDescription('Add some tracks using the play command!')
      .setTimestamp();
  }

  const totalPages = Math.ceil(queue.length / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, queue.length);

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('📜 Music Queue')
    .setTimestamp()
    .setFooter({ text: `Page ${page}/${totalPages} | Total: ${queue.length} track${queue.length !== 1 ? 's' : ''}` });

  // Add current track
  if (currentTrack) {
    const platform = detectPlatform(currentTrack);
    const platformEmoji = getPlatformEmoji(client, platform);
    const duration = formatDuration(currentTrack.info.length);

    embed.addFields({
      name: '🎵 Now Playing',
      value: `${platformEmoji} **[${currentTrack.info.title}](${currentTrack.info.uri})**\n` +
        `👤 ${currentTrack.requester ? `<@${currentTrack.requester.id}>` : 'Unknown'} | 🕐 ${duration}`,
      inline: false
    });
  }

  // Add queued tracks
  if (queue.length > 0) {
    const tracks = queue.slice(startIndex, endIndex);
    const trackList = tracks.map((track, index) => {
      const position = startIndex + index + 1;
      const platform = detectPlatform(track);
      const platformEmoji = getPlatformEmoji(client, platform);
      const duration = formatDuration(track.info.length);

      return `**${position}.** ${platformEmoji} [${track.info.title}](${track.info.uri})\n` +
        `    👤 ${track.requester ? `<@${track.requester.id}>` : 'Unknown'} | 🕐 ${duration}`;
    }).join('\n\n');

    embed.addFields({
      name: `⏭️ Up Next (${queue.length} total)`,
      value: trackList || 'No tracks in queue',
      inline: false
    });
  }

  // Calculate total duration
  const totalDuration = queue.reduce((acc, track) => acc + (track.info.length || 0), 0);
  if (totalDuration > 0) {
    embed.addFields({
      name: '⏱️ Total Queue Duration',
      value: formatDuration(totalDuration),
      inline: true
    });
  }

  return embed;
}

/**
 * Create Player Control Buttons
 */
export function createPlayerButtons(player, disabled = false) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('music_previous')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),

      new ButtonBuilder()
        .setCustomId('music_pause')
        .setEmoji(player.paused ? '▶️' : '⏸️')
        .setStyle(player.paused ? ButtonStyle.Success : ButtonStyle.Primary)
        .setDisabled(disabled),

      new ButtonBuilder()
        .setCustomId('music_stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),

      new ButtonBuilder()
        .setCustomId('music_skip')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),

      new ButtonBuilder()
        .setCustomId('music_loop')
        .setEmoji(player.loop === 'track' ? '🔂' : player.loop === 'queue' ? '🔁' : '➡️')
        .setStyle(player.loop ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(disabled)
    );

  return row;
}

/**
 * Create Search Result Embed
 */
export function createSearchEmbed(results, platform, query, client) {
  const platformInfo = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.unknown;
  const platformEmoji = getPlatformEmoji(client, platform);

  const embed = new EmbedBuilder()
    .setColor(platformInfo.color)
    .setTitle(`${platformEmoji} Search Results for: ${query}`)
    .setDescription(`Found ${results.length} results from ${platformInfo.name}`)
    .setTimestamp();

  const tracks = results.slice(0, 10).map((track, index) => {
    const duration = formatDuration(track.info.length);
    return `**${index + 1}.** [${track.info.title}](${track.info.uri})\n` +
      `    🎤 ${track.info.author || 'Unknown'} | 🕐 ${duration}`;
  }).join('\n\n');

  embed.addFields({
    name: '🎵 Top Results',
    value: tracks || 'No results found',
    inline: false
  });

  embed.setFooter({ text: 'React with the number to select a track (1-10)' });

  return embed;
}

/**
 * Create Error Embed
 */
export function createErrorEmbed(message, details = null) {
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('❌ Error')
    .setDescription(message)
    .setTimestamp();

  if (details) {
    embed.addFields({
      name: 'Details',
      value: `\`\`\`${details}\`\`\``,
      inline: false
    });
  }

  return embed;
}

/**
 * Create Success Embed
 */
export function createSuccessEmbed(message, details = null) {
  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('✅ Success')
    .setDescription(message)
    .setTimestamp();

  if (details) {
    embed.addFields({
      name: 'Details',
      value: details,
      inline: false
    });
  }

  return embed;
}

export {
  PLATFORM_CONFIG,
  detectPlatform,
  getPlatformEmoji,
  formatDuration,
  createProgressBar
};
