// Load environment variables from parent directory
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

module.exports = {
  client_id: process.env.CLIENT_ID || "1431263119682048032",
  client_token: process.env.DISCORD_TOKEN || "MTQzMTI2MzExOTY4MjA0ODAzMg.GrQa49.5BQAsKR2G5yHWdr1Ync5Z1aWs4vGQzjy_ZId0o",
  client_prefix: process.env.PREFIX || "f!",
  mongodb_url: process.env.MONGODB_URI || "", //optional
  developers: (process.env.BOT_OWNER_ID || "786504767358238720").split(','),
  sharding: false, // Disabled when integrated with main bot
  database: false, // Main bot handles database
  nodes: JSON.parse(process.env.LAVALINK_NODES || '[{"host":"ec2-3-109-121-14.ap-south-1.compute.amazonaws.com","port":2333,"password":"youshallnotpass","secure":false}]')
}

/**
 * Get discord bot token from here https://discord.com/developers/applications
 * Get mongodb url from https://www.mongodb.com/
 */

/**
 * Get discord bot token from here https://discord.com/developers/applications
 * Get mongodb url from https://www.mongodb.com/
 */