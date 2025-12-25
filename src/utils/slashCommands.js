import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define slash commands for moderation
const slashCommands = [
  // Moderation Commands
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('delete_messages')
        .setDescription('Delete messages from this user (last 24h)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member (prevent them from sending messages)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g., 5m, 1h, 1d, 1w)')
        .setRequired(true)
        .addChoices(
          { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' },
          { name: '30 minutes', value: '30m' },
          { name: '1 hour', value: '1h' },
          { name: '6 hours', value: '6h' },
          { name: '12 hours', value: '12h' },
          { name: '1 day', value: '1d' },
          { name: '3 days', value: '3d' },
          { name: '1 week', value: '1w' },
          { name: 'Remove', value: 'off' }
        ))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages at once')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('userhistory')
    .setDescription('View moderation history of a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  // AutoMod Configuration Commands
  new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automod settings')
    .addSubcommand(subcommand =>
      subcommand.setName('enable')
        .setDescription('Enable automod'))
    .addSubcommand(subcommand =>
      subcommand.setName('disable')
        .setDescription('Disable automod'))
    .addSubcommand(subcommand =>
      subcommand.setName('status')
        .setDescription('View current automod settings'))
    .addSubcommand(subcommand =>
      subcommand.setName('badwords')
        .setDescription('Configure bad words filter')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to take')
            .setRequired(true)
            .addChoices(
              { name: 'Add words', value: 'add' },
              { name: 'Remove words', value: 'remove' },
              { name: 'List words', value: 'list' },
              { name: 'Set action', value: 'setaction' },
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' }
            ))
        .addStringOption(option =>
          option.setName('words')
            .setDescription('Words to add/remove (comma separated)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('punishment')
            .setDescription('Punishment for bad words')
            .setRequired(false)
            .addChoices(
              { name: 'Delete message', value: 'delete' },
              { name: 'Warn user', value: 'warn' },
              { name: 'Timeout user', value: 'timeout' },
              { name: 'Kick user', value: 'kick' }
            )))
    .addSubcommand(subcommand =>
      subcommand.setName('antispam')
        .setDescription('Configure anti-spam settings')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable anti-spam')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('message_limit')
            .setDescription('Number of messages allowed in time window')
            .setRequired(false)
            .setMinValue(2)
            .setMaxValue(20))
        .addIntegerOption(option =>
          option.setName('time_window')
            .setDescription('Time window in seconds')
            .setRequired(false)
            .setMinValue(3)
            .setMaxValue(30)))
    .addSubcommand(subcommand =>
      subcommand.setName('antiraid')
        .setDescription('Configure anti-raid settings')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable anti-raid')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('join_threshold')
            .setDescription('Number of joins to trigger raid mode')
            .setRequired(false)
            .setMinValue(5)
            .setMaxValue(50))
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action when raid is detected')
            .setRequired(false)
            .addChoices(
              { name: 'Lockdown server', value: 'lockdown' },
              { name: 'Kick new members', value: 'kick' },
              { name: 'Ban new members', value: 'ban' }
            )))
    .addSubcommand(subcommand =>
      subcommand.setName('antinuke')
        .setDescription('Configure anti-nuke settings')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable anti-nuke')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action when nuke is detected')
            .setRequired(false)
            .addChoices(
              { name: 'Remove roles', value: 'removeRoles' },
              { name: 'Kick user', value: 'kick' },
              { name: 'Ban user', value: 'ban' }
            )))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Lockdown Command
  new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock or unlock the server')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Lock or unlock')
        .setRequired(true)
        .addChoices(
          { name: 'Lock server', value: 'on' },
          { name: 'Unlock server', value: 'off' }
        ))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for lockdown')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Set Role Command  
  new SlashCommandBuilder()
    .setName('setrole')
    .setDescription('Configure roles for bot features')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of role to set')
        .setRequired(true)
        .addChoices(
          { name: 'Staff/Moderator', value: 'staff' },
          { name: 'Admin', value: 'admin' },
          { name: 'Suspicious member', value: 'sus' },
          { name: 'New account', value: 'newaccount' },
          { name: 'Muted', value: 'muted' }
        ))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to set')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Set Channel Command
  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Configure channels for bot features')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of channel to set')
        .setRequired(true)
        .addChoices(
          { name: 'Mod Log', value: 'modlog' },
          { name: 'Alert Log', value: 'alertlog' },
          { name: 'Join Log', value: 'joinlog' },
          { name: 'Leave Log', value: 'leavelog' },
          { name: 'Message Log', value: 'messagelog' },
          { name: 'Staff Channel', value: 'staff' }
        ))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to set')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Slash Command Management
  new SlashCommandBuilder()
    .setName('slashcommands')
    .setDescription('Manage slash commands')
    .addSubcommand(subcommand =>
      subcommand.setName('enable')
        .setDescription('Enable a slash command')
        .addStringOption(option =>
          option.setName('command')
            .setDescription('Command to enable')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('disable')
        .setDescription('Disable a slash command')
        .addStringOption(option =>
          option.setName('command')
            .setDescription('Command to disable')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('list')
        .setDescription('List all slash commands and their status'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Refresh Cache Command
  new SlashCommandBuilder()
    .setName('refreshcache')
    .setDescription('Refresh cached data for this server')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of cache to refresh')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Guild Settings', value: 'guild' },
          { name: 'Members', value: 'members' },
          { name: 'Roles', value: 'roles' },
          { name: 'Channels', value: 'channels' },
          { name: 'Invites', value: 'invites' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

export async function registerSlashCommands(client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔧 Started refreshing slash commands...');

    const commandData = slashCommands.map(cmd => cmd.toJSON());

    // Register globally
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandData }
    );

    console.log(`✅ Successfully registered ${commandData.length} slash commands globally`);

    return commandData.length;
  } catch (error) {
    console.error('Error registering slash commands:', error);
    throw error;
  }
}

export async function registerGuildSlashCommands(client, guildId) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    const commandData = slashCommands.map(cmd => cmd.toJSON());

    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guildId),
      { body: commandData }
    );

    console.log(`✅ Registered slash commands for guild ${guildId}`);
    return true;
  } catch (error) {
    console.error(`Error registering slash commands for guild ${guildId}:`, error);
    return false;
  }
}

export function getSlashCommands() {
  return slashCommands;
}

export default { registerSlashCommands, registerGuildSlashCommands, getSlashCommands };
