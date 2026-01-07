import { EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import {
  containsBlockedContent,
  isNoise,
  getQuickResponse,
  getBlockedResponse,
  buildSystemPrompt
} from '../../config/raphael-personality.js';

// Rate limiting
const cooldowns = new Map();
const COOLDOWN_MS = 3000; // 3 seconds between messages per user

// Conversation history (limited memory per channel)
const conversationHistory = new Map();
const MAX_HISTORY = 10;

// Track repeated messages per user (anti-loop)
const messageTracker = new Map();

async function getAIResponse(messages, maxTokens = 500, retries = 3) {
  // Models to try in order
  const models = ['openai'];

  for (let attempt = 0; attempt <= retries; attempt++) {
    const modelToUse = models[attempt % models.length];

    try {
      // Use Pollinations AI API with OpenAI-compatible endpoint
      const apiKey = process.env.POLLINATIONS_API_KEY;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.98 // Higher for more personality and chaos
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error');
        console.error(`Pollinations API error (attempt ${attempt + 1}, model: ${modelToUse}):`, response.status, response.statusText);
        console.error('Error details:', errorText);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1500 + (attempt * 500))); // Increasing delay: 1.5s, 2s, 2.5s
          continue;
        }
        return null;
      }

      const data = await response.json();

      // Extract the response content
      let cleanedResponse = data.choices?.[0]?.message?.content?.trim();

      if (!cleanedResponse) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return null;
      }

      // Remove any "Raphael:" prefix if present
      if (cleanedResponse.startsWith('Raphael:')) {
        cleanedResponse = cleanedResponse.slice(8).trim();
      }

      // Truncate if too long
      if (cleanedResponse.length > 1900) {
        cleanedResponse = cleanedResponse.slice(0, 1900) + '...';
      }

      return cleanedResponse;
    } catch (error) {
      console.error(`AI Chat error (attempt ${attempt + 1}, model: ${modelToUse}):`, error.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1500 + (attempt * 500)));
        continue;
      }
      return null;
    }
  }
  return null;
}

function getConversationKey(guildId, channelId) {
  return `${guildId}_${channelId}`;
}

function addToHistory(key, role, content) {
  if (!conversationHistory.has(key)) {
    conversationHistory.set(key, []);
  }

  const history = conversationHistory.get(key);
  history.push({ role, content });

  // Keep only last N messages
  while (history.length > MAX_HISTORY) {
    history.shift();
  }
}

function getHistory(key) {
  return conversationHistory.get(key) || [];
}

export default {
  name: 'messageCreate',

  async execute(message, client) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    // Check if bot was mentioned or replied to
    const botMentioned = message.mentions.has(client.user);
    const isReplyToBot = message.reference?.messageId &&
      (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author?.id === client.user.id;

    if (!botMentioned && !isReplyToBot) return;

    try {
      // Get guild config
      const guildConfig = await Guild.getGuild(message.guild.id);

      // Check if AI chat is enabled
      if (!guildConfig.features?.aiChat?.enabled) return;

      // Check channel restrictions
      const aiConfig = guildConfig.features.aiChat;

      // Check if channel is ignored
      if (aiConfig.ignoredChannels?.includes(message.channel.id)) return;

      // Check if specific channels are set and this isn't one of them
      if (aiConfig.allowedChannels?.length > 0 && !aiConfig.allowedChannels.includes(message.channel.id)) return;

      // Rate limit check
      const cooldownKey = `${message.guild.id}_${message.author.id}`;
      const lastMessage = cooldowns.get(cooldownKey);

      if (lastMessage && Date.now() - lastMessage < COOLDOWN_MS) {
        return; // Silently ignore rate limited messages
      }

      cooldowns.set(cooldownKey, Date.now());

      // Clean up the message content (remove bot mention)
      let userMessage = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();

      // === NOISE FILTER (THE GATEKEEPER) ===
      // Check if message is noise/spam - ignore silently
      if (isNoise(userMessage)) {
        return; // Raphael does not respond to noise
      }

      // === ANTI-LOOP DETECTION ===
      const trackerKey = `${message.guild.id}_${message.author.id}`;
      const tracker = messageTracker.get(trackerKey) || { lastMsg: '', count: 0 };

      if (userMessage.toLowerCase() === tracker.lastMsg.toLowerCase()) {
        tracker.count++;
        if (tracker.count >= 2) {
          // User is repeating - ignore after 2nd repeat
          return;
        }
      } else {
        tracker.lastMsg = userMessage;
        tracker.count = 0;
      }
      messageTracker.set(trackerKey, tracker);

      // === BLOCKED CONTENT CHECK ===
      if (containsBlockedContent(userMessage)) {
        await message.reply({
          content: getBlockedResponse(),
          allowedMentions: { repliedUser: false }
        }).catch(() => { });
        return;
      }

      // === QUICK RESPONSE CHECK ===
      // Handle simple patterns without API call
      const quickResponse = getQuickResponse(userMessage, aiConfig.trollMode || false);
      if (quickResponse) {
        await message.reply({
          content: quickResponse,
          allowedMentions: { repliedUser: false }
        }).catch(() => { });
        return;
      }

      // === FULL AI RESPONSE ===
      // Show typing indicator
      await message.channel.sendTyping().catch(() => { });

      // Build conversation context
      const conversationKey = getConversationKey(message.guild.id, message.channel.id);
      const history = getHistory(conversationKey);

      // Build system prompt with context
      const systemPrompt = buildSystemPrompt({
        userName: message.author.displayName || message.author.username,
        serverName: message.guild.name,
        conversationHistory: history,
        trollMode: aiConfig.trollMode || false
      });

      // Build messages array for API
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        {
          role: 'user',
          content: userMessage // Don't prefix with username, it's in the system prompt
        }
      ];

      // Get AI response
      const response = await getAIResponse(messages, aiConfig.maxTokens || 1000);

      if (!response) {
        const errorResponses = [
          "Connection error. Try again.",
          "Failed to process. Retry?",
          "Something went wrong. Try again.",
          "Processing failed. One more time?"
        ];
        await message.reply({
          content: errorResponses[Math.floor(Math.random() * errorResponses.length)],
          allowedMentions: { repliedUser: false }
        }).catch(() => { });
        return;
      }

      // Check response for blocked content (safety)
      if (containsBlockedContent(response)) {
        await message.reply({
          content: 'Query rejected. Processing error encountered.',
          allowedMentions: { repliedUser: false }
        }).catch(() => { });
        return;
      }

      // Add to conversation history
      addToHistory(conversationKey, 'user', userMessage);
      addToHistory(conversationKey, 'assistant', response);

      // Send response
      // Split if too long
      if (response.length > 2000) {
        const chunks = response.match(/.{1,1990}/gs) || [response];
        for (const chunk of chunks) {
          await message.reply({ content: chunk, allowedMentions: { repliedUser: false } }).catch(() => { });
        }
      } else {
        await message.reply({ content: response, allowedMentions: { repliedUser: false } }).catch(() => { });
      }

    } catch (error) {
      console.error('AI Chat handler error:', error);
    }
  }
};

// Cleanup old conversation history periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  // Clear old cooldowns
  for (const [key, time] of cooldowns.entries()) {
    if (now - time > maxAge) {
      cooldowns.delete(key);
    }
  }

  // Clear message tracker
  messageTracker.clear();

  // Clear old conversations (simple approach - just clear all after interval)
  if (conversationHistory.size > 1000) {
    conversationHistory.clear();
  }
}, 60 * 60 * 1000);
