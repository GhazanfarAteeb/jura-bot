/**
 * Music Command Loader
 * Dynamically loads all music commands from the commands folder
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadMusicCommands(client) {
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  logger.info(`[MusicLoader] Loading ${commandFiles.length} music commands...`);

  for (const file of commandFiles) {
    try {
      const filePath = join(commandsPath, file);
      const commandModule = await import(`file://${filePath}`);
      const command = new commandModule.default(client);

      // Add to client commands collection
      client.commands.set(command.name, command);

      // Add aliases
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => {
          client.aliases.set(alias, command.name);
        });
      }

      logger.info(`[MusicLoader] ✅ Loaded music command: ${command.name}`);
    } catch (error) {
      logger.error(`[MusicLoader] ❌ Failed to load command ${file}:`, error);
    }
  }

  logger.info(`[MusicLoader] Music commands loaded successfully!`);
}

export async function loadMusicEvents(client) {
  const eventsPath = join(__dirname, 'events');
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  logger.info(`[MusicLoader] Loading ${eventFiles.length} music event handlers...`);

  for (const file of eventFiles) {
    try {
      const filePath = join(eventsPath, file);
      const eventModule = await import(`file://${filePath}`);
      const event = eventModule.default;

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      logger.info(`[MusicLoader] ✅ Loaded music event: ${event.name}`);
    } catch (error) {
      logger.error(`[MusicLoader] ❌ Failed to load event ${file}:`, error);
    }
  }

  logger.info(`[MusicLoader] Music event handlers loaded successfully!`);
}
