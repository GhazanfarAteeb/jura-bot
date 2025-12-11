import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];

// Load all commands
const commandFolders = readdirSync(join(__dirname, 'commands'));

for (const folder of commandFolders) {
    const commandFiles = readdirSync(join(__dirname, 'commands', folder))
        .filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const { default: command } = await import(`./commands/${folder}/${file}`);
        
        if (command.data) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded slash command: ${command.data.name}`);
        }
    }
}

// Deploy commands
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.\n`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`\n✅ Successfully reloaded ${data.length} application (/) commands.`);
        console.log('\nRegistered commands:');
        data.forEach(cmd => console.log(`  - /${cmd.name}`));
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();
