/**
 * Bad Words Filter Utility
 * Using bad-words-next package for comprehensive profanity filtering
 * Supports multiple languages and leetspeak detection
 */

import BadWordsNext from 'bad-words-next';
import en from 'bad-words-next/lib/en';
import es from 'bad-words-next/lib/es';
import fr from 'bad-words-next/lib/fr';
import de from 'bad-words-next/lib/de';
import ru from 'bad-words-next/lib/ru';

// Initialize bad words filter with multiple language dictionaries
let badWordsFilter = null;

/**
 * Initialize or get the bad words filter instance
 * @param {string[]} exclusions - Words to exclude from filtering
 * @returns {BadWordsNext}
 */
function getFilter(exclusions = []) {
  if (!badWordsFilter || exclusions.length > 0) {
    badWordsFilter = new BadWordsNext({
      data: en,
      exclusions: exclusions,
      placeholder: '***',
      placeholderMode: 'replace'
    });
    // Add additional language dictionaries
    badWordsFilter.add(es);
    badWordsFilter.add(fr);
    badWordsFilter.add(de);
    badWordsFilter.add(ru);
  }
  return badWordsFilter;
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
    if (!useBuiltIn && customWords.length === 0) {
      return { found: false, word: null, type: null };
    }

    // Create filter instance with exclusions
    const filter = new BadWordsNext({
      data: en,
      exclusions: ignoredWords,
      placeholder: '***'
    });

    // Add other language dictionaries if using built-in
    if (useBuiltIn) {
      filter.add(es);
      filter.add(fr);
      filter.add(de);
      filter.add(ru);
    }

    // Add custom words if provided
    if (customWords.length > 0) {
      const customData = {
        id: 'custom',
        words: customWords.map(w => w.toLowerCase()),
        lookalike: {
          '0': 'o',
          '1': 'i',
          '3': 'e',
          '4': 'a',
          '5': 's',
          '7': 't',
          '8': 'b',
          '@': 'a',
          '$': 's',
          '!': 'i'
        }
      };
      filter.add(customData);
    }

    // Check if message contains bad words
    let detectedWord = null;
    const hasFilter = filter.check(message);

    if (hasFilter) {
      // Try to extract the actual bad word using filter callback
      filter.filter(message, (badword) => {
        if (!detectedWord) {
          detectedWord = badword;
        }
      });

      // Determine if it's a custom word or built-in
      const isCustom = customWords.some(w =>
        detectedWord?.toLowerCase().includes(w.toLowerCase()) ||
        w.toLowerCase().includes(detectedWord?.toLowerCase())
      );

      return {
        found: true,
        word: detectedWord || 'profanity',
        type: isCustom ? 'custom' : 'builtin'
      };
    }

    return { found: false, word: null, type: null };
  } catch (error) {
    console.error('Error in checkBadWords:', error);
    return { found: false, word: null, type: null };
  }
}

/**
 * Check if message contains variations of bad words using advanced detection
 * This is now handled by bad-words-next's built-in lookalike detection
 * @param {string} message - The message to check
 * @param {string[]} customWords - Additional custom words
 * @param {string[]} ignoredWords - Words to ignore/whitelist
 * @returns {{ found: boolean, word: string | null }}
 */
function checkBadWordsAdvanced(message, customWords = [], ignoredWords = []) {
  // bad-words-next already handles leetspeak and lookalikes,
  // so we just call the regular check
  const result = checkBadWords(message, customWords, ignoredWords, true);
  return { found: result.found, word: result.word };
}

/**
 * Get the severity level of a bad word
 * @param {string} word - The word to check
 * @returns {'low' | 'medium' | 'high' | 'extreme'}
 */
function getWordSeverity(word) {
  if (!word) return 'low';
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
 * Censor/clean a message by replacing bad words with asterisks
 * @param {string} text - Original text
 * @param {string[]} customWords - Custom words to also censor
 * @param {string[]} ignoredWords - Words to not censor
 * @returns {string} - Censored text
 */
function censorMessage(text, customWords = [], ignoredWords = []) {
  try {
    const filter = new BadWordsNext({
      data: en,
      exclusions: ignoredWords,
      placeholder: '***',
      placeholderMode: 'replace'
    });

    filter.add(es);
    filter.add(fr);
    filter.add(de);
    filter.add(ru);

    // Add custom words if provided
    if (customWords.length > 0) {
      const customData = {
        id: 'custom',
        words: customWords.map(w => w.toLowerCase()),
        lookalike: {
          '0': 'o',
          '1': 'i',
          '3': 'e',
          '4': 'a',
          '5': 's',
          '7': 't',
          '8': 'b',
          '@': 'a',
          '$': 's',
          '!': 'i'
        }
      };
      filter.add(customData);
    }

    return filter.filter(text);
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
 * Normalize text by converting leetspeak to regular characters
 * @param {string} text - The text to normalize
 * @returns {string} - Normalized text
 */
function normalizeLeetspeak(text) {
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

  let normalized = text.toLowerCase();

  for (const [leet, normal] of Object.entries(LEETSPEAK_MAP)) {
    normalized = normalized.split(leet).join(normal);
  }

  // Remove repeated characters (e.g., "fuuuuck" -> "fuck")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

  return normalized;
}

/**
 * Get count of built-in words (approximate since we use external library)
 * @returns {number} - Approximate count of built-in words
 */
function getBuiltInWordCount() {
  // bad-words-next has comprehensive dictionaries
  // This is an approximate count across all loaded languages
  return 500;
}

/**
 * Check if the filter is working
 * @returns {boolean}
 */
function testFilter() {
  try {
    const result = checkBadWords('fuck');
    return result.found === true;
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
  getBuiltInWordCount,
  testFilter
};
