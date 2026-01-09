import Guild from '../models/Guild.js';
import { PermissionFlagsBits } from 'discord.js';

// Get guild prefix
export async function getPrefix(guildId) {
  const guild = await Guild.getGuild(guildId);
  return guild?.prefix || process.env.DEFAULT_PREFIX || '!';
}

// Check if user has permission
export function hasPermission(member, permission) {
  return member.permissions.has(permission);
}

// Check if user has any of the specified roles
export function hasRole(member, roleIds) {
  if (!roleIds || roleIds.length === 0) return false;
  return roleIds.some(roleId => member.roles.cache.has(roleId));
}

// Check if user has admin permissions (Administrator or admin role)
export function hasAdminPerms(member, guildConfig) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (guildConfig?.roles?.adminRoles) {
    return hasRole(member, guildConfig.roles.adminRoles);
  }
  return false;
}

// Check if user has moderator permissions (ManageGuild, admin role, or mod/staff role)
export function hasModPerms(member, guildConfig) {
  // Admins always have mod perms
  if (hasAdminPerms(member, guildConfig)) return true;

  // Check ManageGuild permission
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;

  // Check moderator roles
  if (guildConfig?.roles?.moderatorRoles) {
    if (hasRole(member, guildConfig.roles.moderatorRoles)) return true;
  }

  // Check staff roles
  if (guildConfig?.roles?.staffRoles) {
    if (hasRole(member, guildConfig.roles.staffRoles)) return true;
  }

  return false;
}

// Check if user is staff
export async function isStaff(member, guildId) {
  const guild = await Guild.getGuild(guildId);

  // Check if user has admin/moderator permissions
  if (hasPermission(member, 'Administrator') ||
    hasPermission(member, 'ModerateMembers') ||
    hasPermission(member, 'KickMembers') ||
    hasPermission(member, 'BanMembers')) {
    return true;
  }

  // Check if user has staff role
  if (guild?.roles?.staffRoles) {
    return hasRole(member, guild.roles.staffRoles);
  }

  return false;
}

// Format duration from milliseconds
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Parse duration string (e.g., "1d", "2h", "30m")
export function parseDuration(str) {
  const regex = /(\d+)([smhd])/g;
  let total = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': total += value * 1000; break;
      case 'm': total += value * 60 * 1000; break;
      case 'h': total += value * 60 * 60 * 1000; break;
      case 'd': total += value * 24 * 60 * 60 * 1000; break;
    }
  }

  return total;
}

// Extract invite code from URL or message
export function extractInviteCode(text) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discordapp\.com\/invite)\/([a-zA-Z0-9-]+)/gi;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

// Check if message contains invite link
export function hasInviteLink(text) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/gi;
  return regex.test(text);
}

// Get time since timestamp in hours
export function getHoursSince(timestamp) {
  return (Date.now() - timestamp) / (1000 * 60 * 60);
}

// Truncate text
export function truncate(text, length = 1024) {
  if (text.length <= length) return text;
  return text.substring(0, length - 3) + '...';
}

// Escape markdown
export function escapeMarkdown(text) {
  return text.replace(/[*_`~|]/g, '\\$&');
}

// Parse mention to ID
export function parseMention(mention) {
  const match = mention.match(/^<@!?(\d+)>$/);
  return match ? match[1] : null;
}

// Sleep function
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get random element from array
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Chunk array
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Format number with commas
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Calculate percentage
export function percentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
