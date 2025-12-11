import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define slash commands manually - add new commands here
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube, Spotify, or SoundCloud')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL (e.g., "payphone maroon 5")')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your customized profile card')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view profile of')
                .setRequired(false)
        ),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get help for a specific command')
                .setRequired(false)
        ),
    
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your coin balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Check another user\'s balance')
                .setRequired(false)
        ),
    
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily coins'),
    
    new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn coins'),
    
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View server or user statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view stats for')
                .setRequired(false)
        ),
    
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View server leaderboards')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of leaderboard')
                .setRequired(false)
                .addChoices(
                    { name: 'Coins', value: 'coins' },
                    { name: 'Level', value: 'level' },
                    { name: 'Messages', value: 'messages' }
                )
        ),
    
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop music and clear the queue'),
    
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the music queue'),
    
    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    
    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the music volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-200)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(200)
        ),
    
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    
    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),
    
    new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),
    
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to get info about')
                .setRequired(false)
        ),
    
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get information about the server'),
    
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get user avatar')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to get avatar of')
                .setRequired(false)
        ),
    
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View the shop'),
    
    new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory'),
    
    new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Give reputation to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to give reputation to')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin and bet')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10)
        )
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Heads or Tails')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                )
        ),
    
    new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play roulette')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(50)
        )
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Your bet (red/black/green/number)')
                .setRequired(true)
        ),
].map(command => command.toJSON());

// Deploy commands
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.\n`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`\n✅ Successfully registered ${data.length} application (/) commands.`);
        console.log('\n📋 Registered commands:');
        data.forEach(cmd => console.log(`   /${cmd.name} - ${cmd.description}`));
        console.log('\n✨ You can now use slash commands in Discord!\n');
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();
