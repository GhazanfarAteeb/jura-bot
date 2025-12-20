// NodeLink Configuration
// Based on: https://github.com/PerformanC/NodeLink/blob/v3/config.default.js
// Docs: https://nodelink.js.org/docs/config

export default {
  server: {
    host: '0.0.0.0',
    port: 2333,
    password: 'youshallnotpass',
    useBunServer: false
  },

  cluster: {
    enabled: false,
    workers: 0,
    minWorkers: 1,
    commandTimeout: 6000,
    fastCommandTimeout: 4000,
    maxRetries: 2,
    scaling: {
      maxPlayersPerWorker: 20,
      targetUtilization: 0.7,
      scaleUpThreshold: 0.75,
      scaleDownThreshold: 0.3,
      checkIntervalMs: 5000,
      idleWorkerTimeoutMs: 60000,
      queueLengthScaleUpFactor: 5
    }
  },

  logging: {
    level: 'info',
    file: {
      enabled: false,
      path: 'logs',
      rotation: 'daily',
      ttlDays: 7
    }
  },

  connection: {
    logAllChecks: false,
    interval: 300000,
    timeout: 10000,
    thresholds: {
      bad: 1,
      average: 5
    }
  },

  maxSearchResults: 10,
  maxAlbumPlaylistLength: 100,
  playerUpdateInterval: 2000,
  trackStuckThresholdMs: 10000,
  zombieThresholdMs: 60000,
  enableHoloTracks: false,
  enableTrackStreamEndpoint: false,
  resolveExternalLinks: false,
  fetchChannelInfo: false,

  filters: {
    enabled: {
      tremolo: true,
      vibrato: true,
      lowpass: true,
      highpass: true,
      rotation: true,
      karaoke: true,
      distortion: true,
      channelMix: true,
      equalizer: true,
      chorus: true,
      compressor: true,
      echo: true,
      phaser: true,
      timescale: true
    }
  },

  defaultSearchSource: 'youtube',
  unifiedSearchSources: ['youtube', 'soundcloud'],

  sources: {
    youtube: {
      enabled: true,
      allowItag: [],
      targetItag: null,
      getOAuthToken: false,
      hl: 'en',
      gl: 'US',
      clients: {
        search: ['Android'],
        playback: ['AndroidVR', 'TV', 'TVEmbedded', 'IOS'],
        resolve: ['AndroidVR', 'TV', 'TVEmbedded', 'IOS', 'Web'],
        settings: {
          TV: {
            refreshToken: ''
          }
        }
      },
      cipher: {
        url: 'https://cipher.kikkia.dev/api',
        token: null
      }
    },

    spotify: {
      enabled: true,
      clientId: '723cb39cfe904b7080b109effd050dfb',
      clientSecret: '6bd3eefcae1f452184a077ba414295ac',
      market: 'US',
      playlistLoadLimit: 1,
      playlistPageLoadConcurrency: 10,
      albumLoadLimit: 1,
      albumPageLoadConcurrency: 5,
      allowExplicit: true
    },

    applemusic: {
      enabled: true,
      mediaApiToken: 'token_here',
      market: 'US',
      playlistLoadLimit: 0,
      albumLoadLimit: 0,
      playlistPageLoadConcurrency: 5,
      albumPageLoadConcurrency: 5,
      allowExplicit: true
    },

    deezer: {
      enabled: true
    },

    soundcloud: {
      enabled: true
    },

    bandcamp: {
      enabled: true
    },

    twitch: {
      enabled: true
    },

    http: {
      enabled: true
    },

    local: {
      enabled: false,
      basePath: './local-music/'
    }
  },

  lyrics: {
    fallbackSource: 'genius',
    youtube: {
      enabled: true
    },
    genius: {
      enabled: true
    },
    musixmatch: {
      enabled: true
    },
    lrclib: {
      enabled: true
    },
    applemusic: {
      enabled: true,
      advanceSearch: true
    }
  },

  audio: {
    quality: 'high',
    encryption: 'aead_aes256_gcm_rtpsize',
    resamplingQuality: 'best'
  },

  routePlanner: {
    strategy: 'RotateOnBan',
    bannedIpCooldown: 600000,
    ipBlocks: []
  },

  rateLimit: {
    enabled: true,
    global: {
      maxRequests: 1000,
      timeWindowMs: 60000
    },
    perIp: {
      maxRequests: 100,
      timeWindowMs: 10000
    },
    perUserId: {
      maxRequests: 50,
      timeWindowMs: 5000
    },
    perGuildId: {
      maxRequests: 20,
      timeWindowMs: 5000
    },
    ignorePaths: []
  },

  dosProtection: {
    enabled: true,
    thresholds: {
      burstRequests: 50,
      timeWindowMs: 10000
    },
    mitigation: {
      delayMs: 500,
      blockDurationMs: 300000
    }
  },

  metrics: {
    enabled: true,
    authorization: {
      type: 'Bearer',
      password: ''
    }
  },

  mix: {
    enabled: true,
    defaultVolume: 0.8,
    maxLayersMix: 5,
    autoCleanup: true
  }
}
