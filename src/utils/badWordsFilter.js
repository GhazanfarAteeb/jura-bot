/**
 * Bad Words Filter Utility
 * Uses the 'bad-words' npm package for comprehensive profanity filtering
 * Supports custom words from database and leetspeak detection
 */

import { createRequire } from 'module';
const required = createRequire(import.meta.url);
const Filter = required('bad-words');

// Create the base filter instance with the built-in word list
const baseFilter = new Filter();

// Additional words to add to the filter (slurs and variations not in default list)
const ADDITIONAL_BAD_WORDS = [
  // Slurs and hate speech variations
  'nigga', 'n1gger', 'n1gga', 'nigg3r', 'n!gger',
  'f4g', 'f4ggot', 'f@g', 'f@ggot',
  'r3tard', 'r3t4rd',
  'tr4nny', 'tr@nny',
  'sp1c', 'ch1nk', 'k1ke',
  'towelhead', 'raghead', 'sandnigger',

  // Leetspeak/bypass variations
  'fck', 'f*ck', 'fuk', 'fuq', 'phuck', 'phuk',
  'sh1t', 'sh!t', 'sht', 's#it',
  'b1tch', 'b!tch', 'b*tch',
  'a$$', 'a**', '@ss', '@sshole',
  'd1ck', 'd!ck',
  'c0ck', 'c*ck',
  'p*ssy', 'pu$$y',
  'c*nt', 'cvnt',
  'wh0re', 'wh*re',
  'sl*t', 'slvt',

  // Sexual content variations
  'p0rn', 'pr0n', 'p*rn',
  's3x', 's*x',
  'b00bs', 'b00bies',
  't1ts', 't!ts',
  'pen1s', 'pen!s',
  'vag1na', 'vag!na',
  'j1zz', 'j!zz',
  'd1ldo', 'dild0',
  'bl0wjob', 'bl*wjob',

  // Self-harm related
  'kys', // "kill yourself"

  // Common abbreviations
  'stfu', 'gtfo'
];

// Add additional words to the base filter
baseFilter.addWords(...ADDITIONAL_BAD_WORDS);

// Leetspeak/bypass character mappings
const LEETSPEAK_MAP = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '*': '',
  '_': '',
  '-': '',
  '.': '',
};

/**
 * Normalize text by converting leetspeak to regular characters
 * @param {string} text - The text to normalize
 * @returns {string} - Normalized text
 */
function normalizeLeetspeak(text) {
  let normalized = text.toLowerCase();

  for (const [leet, normal] of Object.entries(LEETSPEAK_MAP)) {
    normalized = normalized.split(leet).join(normal);
  }

  // Remove repeated characters (e.g., "fuuuuck" -> "fuck")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

  return normalized;
}

/**
 * Create a custom filter with guild-specific words
 * @param {string[]} customWords - Additional words to add
 * @param {string[]} ignoredWords - Words to remove/whitelist
 * @returns {Filter} - Configured filter instance
 */
function createCustomFilter(customWords = [], ignoredWords = []) {
  const filter = new Filter();

  // Add additional words
  filter.addWords(...ADDITIONAL_BAD_WORDS);

  // Add custom words from database
  if (customWords.length > 0) {
    filter.addWords(...customWords);
  }

  // Remove whitelisted words
  if (ignoredWords.length > 0) {
    filter.removeWords(...ignoredWords);
  }

  return filter;
}

/**
 * Check if a message contains bad words
 * @param {string} message - The message to check
 * @param {string[]} customWords - Additional custom words to check (from database)
 * @param {string[]} ignoredWords - Words to ignore/whitelist
 * @param {boolean} useBuiltIn - Whether to use the built-in word list
 * @returns {{ found: boolean, word: string | null, type: 'builtin' | 'custom' | null }}
 */
function checkBadWords(message, customWords = [], ignoredWords = [], useBuiltIn = true) {
  try {
    // Create filter based on settings
    let filter;
    if (useBuiltIn) {
      filter = createCustomFilter(customWords, ignoredWords);
    } else {
      // Only use custom words
      filter = new Filter({ emptyList: true });
      if (customWords.length > 0) {
        filter.addWords(...customWords);
      }
    }

    // Check original message
    if (filter.isProfane(message)) {
      // Find which word triggered it
      const words = message.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (filter.isProfane(word)) {
          return {
            found: true,
            word: word,
            type: customWords.map(w => w.toLowerCase()).includes(word.toLowerCase()) ? 'custom' : 'builtin'
          };
        }
      }
      return { found: true, word: 'detected', type: 'builtin' };
    }

    // Check normalized (leetspeak converted) message
    const normalizedMessage = normalizeLeetspeak(message);
    if (filter.isProfane(normalizedMessage)) {
      const words = normalizedMessage.split(/\s+/);
      for (const word of words) {
        if (filter.isProfane(word)) {
          return {
            found: true,
            word: word,
            type: customWords.map(w => w.toLowerCase()).includes(word.toLowerCase()) ? 'custom' : 'builtin'
          };
        }
      }
      return { found: true, word: 'detected (leetspeak)', type: 'builtin' };
    }

    return { found: false, word: null, type: null };
  } catch (error) {
    console.error('Error in checkBadWords:', error);
    return { found: false, word: null, type: null };
  }
}

/**
 * Check if message contains variations of bad words using advanced detection
 * This catches attempts to bypass the filter with spaces, symbols, etc.
 * @param {string} message - The message to check
 * @param {string[]} customWords - Additional custom words
 * @returns {{ found: boolean, word: string | null }}
 */
function checkBadWordsAdvanced(message, customWords = []) {
  try {
    const filter = createCustomFilter(customWords, []);

    // Remove spaces and special characters for bypass detection
    const stripped = message.toLowerCase().replace(/[\s\W_]/g, '');
    const normalized = normalizeLeetspeak(stripped);

    // Check stripped message
    if (filter.isProfane(stripped)) {
      return { found: true, word: 'bypass attempt detected' };
    }

    // Check normalized stripped message
    if (filter.isProfane(normalized)) {
      return { found: true, word: 'bypass attempt detected (leetspeak)' };
    }

    // Check for spaced out words like "f u c k"
    const spacedOut = message.toLowerCase().replace(/\s+/g, '');
    if (filter.isProfane(spacedOut)) {
      return { found: true, word: 'spaced bypass detected' };
    }

    return { found: false, word: null };
  } catch (error) {
    console.error('Error in checkBadWordsAdvanced:', error);
    return { found: false, word: null };
  }
}

/**
 * Get the severity level of a bad word
 * @param {string} word - The word to check
 * @returns {'low' | 'medium' | 'high' | 'extreme'}
 */
function getWordSeverity(word) {
  const lowerWord = word.toLowerCase();

  // Extreme - slurs and hate speech
  const extremeWords = ['nigger', 'nigga', 'faggot', 'retard', 'kike', 'spic', 'chink', 'coon', 'tranny'];
  if (extremeWords.some(w => lowerWord.includes(w))) return 'extreme';

  // High - strong profanity and sexual content
  const highWords = ['fuck', 'cunt', 'pussy', 'cock', 'dick', 'rape', 'porn', 'kys'];
  if (highWords.some(w => lowerWord.includes(w))) return 'high';

  // Medium - moderate profanity
  const mediumWords = ['shit', 'ass', 'bitch', 'bastard', 'whore', 'slut'];
  if (mediumWords.some(w => lowerWord.includes(w))) return 'medium';

  // Low - mild profanity
  return 'low';
}

/**
 * Censor/clean a message
 * @param {string} text - Original text
 * @param {string[]} customWords - Custom words to also censor
 * @param {string[]} ignoredWords - Words to not censor
 * @returns {string} - Censored text
 */
function censorMessage(text, customWords = [], ignoredWords = []) {
  try {
    const filter = createCustomFilter(customWords, ignoredWords);
    return filter.clean(text);
  } catch (error) {
    console.error('Error censoring message:', error);
    return text;
  }
}

/**
 * Censor a specific bad word in text (legacy support)
 * @param {string} text - Original text
 * @param {string} badWord - Word to censor
 * @returns {string} - Censored text
 */
function censorWord(text, badWord) {
  const regex = new RegExp(badWord, 'gi');
  const censored = badWord[0] + '*'.repeat(Math.max(0, badWord.length - 2)) + (badWord.length > 1 ? badWord[badWord.length - 1] : '');
  return text.replace(regex, censored);
}

/**
 * Get the built-in bad words list
 * @returns {string[]}
 */
function getBuiltInWords() {
  return [...baseFilter.list, ...ADDITIONAL_BAD_WORDS];
}

/**
 * Get safe version of the word list (for display)
 * @returns {number} - Count of built-in words
 */
function getBuiltInWordCount() {
  return baseFilter.list.length + ADDITIONAL_BAD_WORDS.length;
}

/**
 * Check if the filter is working
 * @returns {boolean}
 */
function testFilter() {
  try {
    const filter = new Filter();
    return filter.isProfane('fuck'); // Should return true
  } catch {
    return false;
  }
}

export {
  checkBadWords,
  checkBadWordsAdvanced,
  getWordSeverity,
  censorWord,
  censorMessage,
  normalizeLeetspeak,
  getBuiltInWords,
  getBuiltInWordCount,
  createCustomFilter,
  testFilter,
  ADDITIONAL_BAD_WORDS
};
