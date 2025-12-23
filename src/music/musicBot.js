/**
 * Music Bot Integration Module
 * This module integrates the working common-js music bot with the main bot
 */

import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

class MusicBot {
  constructor(mainClient) {
    this.mainClient = mainClient;
    this.musicCommands = new Collection();
    this.musicSlashCommands = new Collection();
    this.riffy = null;
    
    // Configuration from environment
    this.config = {
      nodes: JSON.parse(process.env.LAVALINK_NODES || '[{"host":"localhost","port":2333,"password":"youshallnotpass","secure":false}]')
    };
  }

  /**
   * Initialize the music bot system
   */
  async initialize() {
    console.log('🎵 Initializing music bot module...');
    
    try {
      // Import Riffy using require for CommonJS compatibility
      const { Riffy } = require('riffy');
      
      // Initialize Riffy
      this.riffy = new Riffy(this.mainClient, this.config.nodes, {
        send: (payload) => {
          const guild = this.mainClient.guilds.cache.get(payload.d.guild_id);
          if (guild) guild.shard.send(payload);
        },
        defaultSearchPlatform: "ytmsearch",
        restVersion: "v4"
      });

      // Attach riffy to main client for command access
      this.mainClient.riffy = this.riffy;

      // Load music commands and events
      await this.loadMusicCommands();
      await this.loadMusicSlashCommands();
      await this.loadRiffyEvents();

      console.log('✅ Music bot module initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize music bot:', error);
      throw error;
    }
  }

  /**
   * Initialize Riffy after client is ready
   */
  async initRiffy() {
    if (this.riffy && this.mainClient.user) {
      try {
        await this.riffy.init(this.mainClient.user.id);
        console.log('🎵 Riffy music system initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Riffy:', error);
        throw error;
      }
    }
  }

  /**
   * Load music commands from working-common-js-music-bot
   */
  async loadMusicCommands() {
    const commandsPath = path.join(__dirname, '../../working-common-js-music-bot/structures/commands');
    
    if (!readdirSync(commandsPath).length) {
      console.log('⚠️ No music command directories found');
      return;
    }

    const commandFolders = readdirSync(commandsPath);
    let loadedCount = 0;

    for (const folder of commandFolders) {
      const commandFiles = readdirSync(path.join(commandsPath, folder))
        .filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        try {
          // Use dynamic import for CommonJS files
          const commandPath = path.join(commandsPath, folder, file);
          const command = require(commandPath);
          
          if (command.name) {
            // Store with music prefix to avoid conflicts
            this.musicCommands.set(command.name, command);
            this.mainClient.commands.set(command.name, command);
            
            if (command.aliases && Array.isArray(command.aliases)) {
              command.aliases.forEach(alias => {
                this.mainClient.aliases.set(alias, command.name);
              });
            }
            
            loadedCount++;
            console.log(`  🎵 Loaded music command: ${command.name}`);
          }
        } catch (error) {
          console.error(`  ❌ Failed to load music command ${file}:`, error);
        }
      }
    }

    console.log(`✅ Loaded ${loadedCount} music commands`);
  }

  /**
   * Load music slash commands
   */
  async loadMusicSlashCommands() {
    const slashCommandsPath = path.join(__dirname, '../../working-common-js-music-bot/structures/slashcommands');
    
    if (!readdirSync(slashCommandsPath).length) {
      console.log('⚠️ No music slash command directories found');
      return;
    }

    const slashFolders = readdirSync(slashCommandsPath);
    let loadedCount = 0;

    for (const folder of slashFolders) {
      const slashFiles = readdirSync(path.join(slashCommandsPath, folder))
        .filter(file => file.endsWith('.js'));

      for (const file of slashFiles) {
        try {
          const commandPath = path.join(slashCommandsPath, folder, file);
          const command = require(commandPath);
          
          if (command.data && command.execute) {
            this.musicSlashCommands.set(command.data.name, command);
            this.mainClient.slashCommands = this.mainClient.slashCommands || new Collection();
            this.mainClient.slashCommands.set(command.data.name, command);
            
            loadedCount++;
            console.log(`  🎵 Loaded music slash command: ${command.data.name}`);
          }
        } catch (error) {
          console.error(`  ❌ Failed to load music slash command ${file}:`, error);
        }
      }
    }

    console.log(`✅ Loaded ${loadedCount} music slash commands`);
  }

  /**
   * Load Riffy events
   */
  async loadRiffyEvents() {
    const eventsPath = path.join(__dirname, '../../working-common-js-music-bot/structures/riffy');
    
    // Load node events
    const nodeEventsPath = path.join(eventsPath, 'node');
    if (readdirSync(nodeEventsPath).length) {
      const nodeEvents = readdirSync(nodeEventsPath).filter(file => file.endsWith('.js'));
      
      for (const file of nodeEvents) {
        try {
          const eventPath = path.join(nodeEventsPath, file);
          const event = require(eventPath);
          const eventName = file.split('.')[0];
          
          this.riffy.on(eventName, (...args) => event(this.mainClient, ...args));
          console.log(`  🎵 Loaded Riffy node event: ${eventName}`);
        } catch (error) {
          console.error(`  ❌ Failed to load Riffy node event ${file}:`, error);
        }
      }
    }

    // Load track events
    const trackEventsPath = path.join(eventsPath, 'tracks');
    if (readdirSync(trackEventsPath).length) {
      const trackEvents = readdirSync(trackEventsPath).filter(file => file.endsWith('.js'));
      
      for (const file of trackEvents) {
        try {
          const eventPath = path.join(trackEventsPath, file);
          const event = require(eventPath);
          const eventName = file.split('.')[0];
          
          this.riffy.on(eventName, (...args) => event(this.mainClient, ...args));
          console.log(`  🎵 Loaded Riffy track event: ${eventName}`);
        } catch (error) {
          console.error(`  ❌ Failed to load Riffy track event ${file}:`, error);
        }
      }
    }

    // Load button events
    const buttonEventPath = path.join(__dirname, '../../working-common-js-music-bot/structures/events/riffy/buttons.js');
    try {
      const buttonEvent = require(buttonEventPath);
      this.mainClient.on('interactionCreate', async (interaction) => {
        if (interaction.isButton() && interaction.customId.startsWith('music_')) {
          await buttonEvent(this.mainClient, interaction);
        }
      });
      console.log('  🎵 Loaded music button event handler');
    } catch (error) {
      console.error('  ❌ Failed to load music button event:', error);
    }

    console.log('✅ Riffy events loaded successfully');
  }
}

export default MusicBot;
