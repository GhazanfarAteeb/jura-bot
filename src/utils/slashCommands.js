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

  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout from a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to remove timeout from')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for removing the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Manage the verification system')
    .addSubcommand(subcommand =>
      subcommand.setName('setup')
        .setDescription('Run the verification setup wizard'))
    .addSubcommand(subcommand =>
      subcommand.setName('panel')
        .setDescription('Send a verification panel to a channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to send the panel to')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand.setName('manual')
        .setDescription('Manually verify a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to verify')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('status')
        .setDescription('View current verification settings'))
    .addSubcommand(subcommand =>
      subcommand.setName('enable')
        .setDescription('Enable the verification system'))
    .addSubcommand(subcommand =>
      subcommand.setName('disable')
        .setDescription('Disable the verification system'))
    .addSubcommand(subcommand =>
      subcommand.setName('setrole')
        .setDescription('Set the verified role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to give verified users')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('setchannel')
        .setDescription('Set the verification channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel for verification')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('settype')
        .setDescription('Set the verification type')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('The type of verification')
            .setRequired(true)
            .addChoices(
              { name: 'Button (simple click)', value: 'button' },
              { name: 'Captcha (image verification)', value: 'captcha' },
              { name: 'Reaction (react to message)', value: 'reaction' }
            )))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('cmdchannels')
    .setDescription('Restrict bot commands to specific channels')
    .addSubcommand(subcommand =>
      subcommand.setName('enable')
        .setDescription('Enable channel restrictions'))
    .addSubcommand(subcommand =>
      subcommand.setName('disable')
        .setDescription('Disable channel restrictions'))
    .addSubcommand(subcommand =>
      subcommand.setName('add')
        .setDescription('Add an allowed channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to allow commands in')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('Remove an allowed channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to remove from allowed list')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('bypass')
        .setDescription('Add a role that bypasses channel restrictions')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Add or remove bypass role')
            .setRequired(true)
            .addChoices(
              { name: 'Add bypass role', value: 'add' },
              { name: 'Remove bypass role', value: 'remove' }
            ))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to add/remove from bypass')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('list')
        .setDescription('View current channel restrictions'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configure server logging')
    .addSubcommand(subcommand =>
      subcommand.setName('enable')
        .setDescription('Enable a log type')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of log to enable')
            .setRequired(true)
            .addChoices(
              { name: 'All logs', value: 'all' },
              { name: 'Message logs', value: 'message' },
              { name: 'Member logs', value: 'member' },
              { name: 'Voice logs', value: 'voice' },
              { name: 'Moderation logs', value: 'moderation' },
              { name: 'Server logs', value: 'server' }
            )))
    .addSubcommand(subcommand =>
      subcommand.setName('disable')
        .setDescription('Disable a log type')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of log to disable')
            .setRequired(true)
            .addChoices(
              { name: 'All logs', value: 'all' },
              { name: 'Message logs', value: 'message' },
              { name: 'Member logs', value: 'member' },
              { name: 'Voice logs', value: 'voice' },
              { name: 'Moderation logs', value: 'moderation' },
              { name: 'Server logs', value: 'server' }
            )))
    .addSubcommand(subcommand =>
      subcommand.setName('channel')
        .setDescription('Set log channel')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of log')
            .setRequired(true)
            .addChoices(
              { name: 'Message logs', value: 'message' },
              { name: 'Member logs', value: 'member' },
              { name: 'Voice logs', value: 'voice' },
              { name: 'Moderation logs', value: 'moderation' },
              { name: 'Server logs', value: 'server' }
            ))
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel for logs')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('status')
        .setDescription('View current logging settings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Configure auto-role for new members')
    .addSubcommand(subcommand =>
      subcommand.setName('add')
        .setDescription('Add an auto-role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to automatically assign')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of members to assign to')
            .setRequired(false)
            .addChoices(
              { name: 'All members', value: 'all' },
              { name: 'Humans only', value: 'humans' },
              { name: 'Bots only', value: 'bots' }
            )))
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('Remove an auto-role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to remove from auto-assign')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('list')
        .setDescription('View current auto-roles'))
    .addSubcommand(subcommand =>
      subcommand.setName('clear')
        .setDescription('Remove all auto-roles'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

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

  // Birthday Settings Command (Admin)
  new SlashCommandBuilder()
    .setName('birthdaysettings')
    .setDescription('Configure birthday system settings (Admin)')
    .addSubcommand(subcommand =>
      subcommand.setName('channel')
        .setDescription('Set the birthday announcement channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for birthday announcements')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('role')
        .setDescription('Set the birthday role to assign')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to give on birthdays')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('message')
        .setDescription('Set custom birthday message')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Custom message ({user} = mention, {username} = name, {age} = age)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('enable')
        .setDescription('Enable the birthday system'))
    .addSubcommand(subcommand =>
      subcommand.setName('disable')
        .setDescription('Disable the birthday system'))
    .addSubcommand(subcommand =>
      subcommand.setName('status')
        .setDescription('View current birthday settings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Set Birthday Command (Admin)
  new SlashCommandBuilder()
    .setName('setbirthday')
    .setDescription('Set a member\'s birthday (Admin)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to set birthday for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('month')
        .setDescription('Birth month (1-12)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(12))
    .addIntegerOption(option =>
      option.setName('day')
        .setDescription('Birth day (1-31)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(31))
    .addIntegerOption(option =>
      option.setName('year')
        .setDescription('Birth year (optional, for age)')
        .setRequired(false)
        .setMinValue(1900)
        .setMaxValue(new Date().getFullYear()))
    .addBooleanOption(option =>
      option.setName('private')
        .setDescription('Hide age in announcements')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  // Config Command
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('View or change server configuration')
    .addSubcommand(subcommand =>
      subcommand.setName('view')
        .setDescription('View current server configuration'))
    .addSubcommand(subcommand =>
      subcommand.setName('prefix')
        .setDescription('Change the bot prefix')
        .addStringOption(option =>
          option.setName('prefix')
            .setDescription('New prefix (1-5 characters)')
            .setRequired(true)
            .setMaxLength(5)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Setup Command
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Run the initial server setup wizard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Welcome Settings Command
  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome message settings')
    .addSubcommand(subcommand =>
      subcommand.setName('channel')
        .setDescription('Set the welcome channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for welcome messages')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('message')
        .setDescription('Set the welcome message')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Welcome message ({user}, {server}, {memberCount})')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('enable')
        .setDescription('Enable welcome messages'))
    .addSubcommand(subcommand =>
      subcommand.setName('disable')
        .setDescription('Disable welcome messages'))
    .addSubcommand(subcommand =>
      subcommand.setName('status')
        .setDescription('View welcome settings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Shop Management Command (Backgrounds only)
  new SlashCommandBuilder()
    .setName('manageshop')
    .setDescription('Add, remove, or modify shop backgrounds')
    .addSubcommand(subcommand =>
      subcommand.setName('add')
        .setDescription('Add a new background to the shop')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Background name')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('price')
            .setDescription('Background price')
            .setRequired(true)
            .setMinValue(0))
        .addStringOption(option =>
          option.setName('image')
            .setDescription('Background image URL')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Background description')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('Remove an item from the shop')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Item ID to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('list')
        .setDescription('List all custom shop items'))
    .addSubcommand(subcommand =>
      subcommand.setName('setprice')
        .setDescription('Change item price')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Item ID')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('price')
            .setDescription('New price')
            .setRequired(true)
            .setMinValue(0)))
    .addSubcommand(subcommand =>
      subcommand.setName('edit')
        .setDescription('Edit background properties')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Background ID')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('field')
            .setDescription('Field to edit')
            .setRequired(true)
            .addChoices(
              { name: 'Name', value: 'name' },
              { name: 'Description', value: 'description' },
              { name: 'Image URL', value: 'image' }
            ))
        .addStringOption(option =>
          option.setName('value')
            .setDescription('New value')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('stock')
        .setDescription('Set stock amount')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('Item ID')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Stock amount (-1 for unlimited)')
            .setRequired(true)
            .setMinValue(-1)))
    .addSubcommand(subcommand =>
      subcommand.setName('fallback')
        .setDescription('Set default background for profiles')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Fallback type')
            .setRequired(true)
            .addChoices(
              { name: 'Image URL', value: 'url' },
              { name: 'Solid Color', value: 'color' },
              { name: 'Clear/Reset', value: 'clear' }
            ))
        .addStringOption(option =>
          option.setName('value')
            .setDescription('URL or hex color (e.g., #FF0000)')
            .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // Feature Management (Enable/Disable commands and features)
  new SlashCommandBuilder()
    .setName('feature')
    .setDescription('Enable or disable bot commands and features')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Select command/feature to manage')
        .setRequired(true)
        .addChoices(
          // Economy
          { name: '💰 Economy (balance, daily, shop, etc.)', value: 'economy' },
          { name: '🎰 Gambling (slots, blackjack, coinflip, etc.)', value: 'gambling' },
          { name: '📊 Leveling (level, xp, rank)', value: 'leveling' },
          // Fun
          { name: '🎮 Games (trivia, tictactoe)', value: 'games' },
          { name: '😂 Fun (meme, gif)', value: 'fun' },
          // Community
          { name: '🎂 Birthdays', value: 'birthdays' },
          { name: '🎉 Giveaways', value: 'giveaways' },
          { name: '📅 Events', value: 'events' },
          { name: '⭐ Starboard', value: 'starboard' },
          // Utility
          { name: '🎫 Tickets', value: 'tickets' },
          { name: '💤 AFK', value: 'afk' },
          { name: '⏰ Reminders', value: 'reminders' },
          // Moderation
          { name: '🛡️ AutoMod', value: 'automod' },
          { name: '👋 Welcome Messages', value: 'welcome' },
          // Single commands
          { name: '🔧 Custom Command (specify name)', value: 'custom' }
        ))
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Enable or disable')
        .setRequired(true)
        .addChoices(
          { name: '✅ Enable', value: 'enable' },
          { name: '❌ Disable', value: 'disable' },
          { name: '📋 View Status', value: 'status' }
        ))
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Command name (only for "Custom Command" type)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // Giveaway Command
  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create and manage giveaways')
    .addSubcommand(subcommand =>
      subcommand.setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Duration (e.g., 1h, 1d, 1w)')
            .setRequired(true)
            .addChoices(
              { name: '10 minutes', value: '10m' },
              { name: '30 minutes', value: '30m' },
              { name: '1 hour', value: '1h' },
              { name: '6 hours', value: '6h' },
              { name: '12 hours', value: '12h' },
              { name: '1 day', value: '1d' },
              { name: '3 days', value: '3d' },
              { name: '1 week', value: '1w' }
            ))
        .addIntegerOption(option =>
          option.setName('winners')
            .setDescription('Number of winners (1-20)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20))
        .addStringOption(option =>
          option.setName('prize')
            .setDescription('What is the prize?')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('required_role')
            .setDescription('Role required to enter (optional)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand.setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(option =>
          option.setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('reroll')
        .setDescription('Pick new winner(s) for an ended giveaway')
        .addStringOption(option =>
          option.setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('list')
        .setDescription('View all active giveaways'))
    .addSubcommand(subcommand =>
      subcommand.setName('delete')
        .setDescription('Cancel and delete a giveaway')
        .addStringOption(option =>
          option.setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // Award Command (XP, Coins, Rep)
  new SlashCommandBuilder()
    .setName('award')
    .setDescription('Award or deduct XP, coins, or reputation from a user')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('What to award')
        .setRequired(true)
        .addChoices(
          { name: '✨ XP (Experience)', value: 'xp' },
          { name: '💰 Coins (Currency)', value: 'coins' },
          { name: '⭐ Rep (Reputation)', value: 'rep' }
        ))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to award')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to add (positive) or remove (negative)')
        .setRequired(true)
        .setMinValue(-10000000)
        .setMaxValue(10000000))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the award (optional)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

export async function registerSlashCommands(client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('[RAPHAEL] Initiating slash command registration...');

    const commandData = slashCommands.map(cmd => cmd.toJSON());

    // Register globally
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandData }
    );

    console.log(`[RAPHAEL] Slash commands registered globally: ${commandData.length}`);

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

    console.log(`[RAPHAEL] Slash commands registered for guild ${guildId}`);
    return true;
  } catch (error) {
    console.error(`Error registering slash commands for guild ${guildId}:`, error);
    return false;
  }
}

// Clear guild-specific commands (use this to remove duplicates)
export async function clearGuildSlashCommands(client, guildId) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guildId),
      { body: [] }
    );

    console.log(`🧹 Cleared guild-specific slash commands for ${guildId}`);
    return true;
  } catch (error) {
    console.error(`Error clearing slash commands for guild ${guildId}:`, error);
    return false;
  }
}

export function getSlashCommands() {
  return slashCommands;
}

export default { registerSlashCommands, registerGuildSlashCommands, clearGuildSlashCommands, getSlashCommands };
