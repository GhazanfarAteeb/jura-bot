/**
 * Bad Words Filter Utility
 * Contains a comprehensive list of inappropriate words and provides filtering functions
 * Words are checked with word boundary detection to avoid false positives
 */

// Built-in list of inappropriate words (censored versions for code readability)
// This list can be extended by admins through the database
const DEFAULT_BAD_WORDS = [
  // Common profanity
  'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'fck', 'f*ck', 'fuk', 'fuq',
  'shit', 'shitting', 'shitted', 'shits', 'sh1t', 'sh!t', 'sht',
  'ass', 'asses', 'asshole', 'assholes', 'a$$', 'a**',
  'bitch', 'bitches', 'bitching', 'b1tch', 'b!tch',
  'damn', 'dammit', 'damned',
  'crap', 'crappy',
  'piss', 'pissed', 'pissing',
  'dick', 'dicks', 'd1ck',
  'cock', 'cocks', 'c0ck',
  'pussy', 'pussies', 'p*ssy',
  'cunt', 'cunts', 'c*nt',
  'bastard', 'bastards',
  'whore', 'whores', 'wh0re',
  'slut', 'sluts', 'sl*t',
  'hoe', 'hoes',

  // Slurs and hate speech
  'nigger', 'nigga', 'n1gger', 'n1gga', 'nigg3r',
  'faggot', 'fag', 'fags', 'f4g', 'f4ggot',
  'retard', 'retarded', 'r3tard',
  'gay', // Only when used as insult, context-dependent
  'homo', 'homos',
  'tranny', 'tr4nny',
  'spic', 'sp1c',
  'chink', 'ch1nk',
  'kike', 'k1ke',
  'beaner',
  'wetback',
  'coon',
  'towelhead',
  'raghead',
  'sandnigger',

  // Sexual content
  'porn', 'p0rn', 'pr0n',
  'sex', 's3x', // May want to remove for some servers
  'nude', 'nudes',
  'naked',
  'boobs', 'boob', 'b00bs',
  'tits', 'titties', 't1ts',
  'penis', 'pen1s',
  'vagina', 'vag1na',
  'cum', 'cumming', 'cummed',
  'jizz', 'j1zz',
  'dildo', 'd1ldo',
  'masturbate', 'masturbating', 'masterbate',
  'orgasm',
  'erection',
  'blowjob', 'bl0wjob',
  'handjob',
  'anal',
  'rape', 'raped', 'raping', 'r4pe',

  // Violence
  'kill', 'killing', 'killed', // Context-dependent
  'murder', 'murdered',
  'suicide', 'suicidal', // Important for safety
  'die', 'dying', // Context-dependent
  'kys', // "kill yourself"
  'neck', // When used as "neck yourself"

  // Drugs
  'cocaine', 'c0caine',
  'heroin', 'her0in',
  'meth', 'm3th',
  'weed', // May want to remove for some servers
  'marijuana',
  'crack',

  // Misc offensive
  'stfu',
  'gtfo',
  'wtf',
  'lmfao',
  'af', // as fuck
];

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
 * Check if a message contains bad words
 * @param {string} message - The message to check
 * @param {string[]} customWords - Additional custom words to check (from database)
 * @param {string[]} ignoredWords - Words to ignore/whitelist
 * @param {boolean} useBuiltIn - Whether to use the built-in word list
 * @returns {{ found: boolean, word: string | null, type: 'builtin' | 'custom' | null }}
 */
function checkBadWords(message, customWords = [], ignoredWords = [], useBuiltIn = true) {
  const normalizedMessage = normalizeLeetspeak(message);
  const originalLower = message.toLowerCase();

  // Combine word lists
  const wordsToCheck = [
    ...(useBuiltIn ? DEFAULT_BAD_WORDS : []),
    ...customWords.map(w => w.toLowerCase())
  ].filter(word => !ignoredWords.map(w => w.toLowerCase()).includes(word.toLowerCase()));

  // Check each word with word boundary detection
  for (const badWord of wordsToCheck) {
    // Escape special regex characters in the bad word
    const escapedWord = badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create regex with word boundaries
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');

    // Check both original and normalized versions
    if (regex.test(originalLower) || regex.test(normalizedMessage)) {
      return {
        found: true,
        word: badWord,
        type: DEFAULT_BAD_WORDS.includes(badWord.toLowerCase()) ? 'builtin' : 'custom'
      };
    }
  }

  return { found: false, word: null, type: null };
}

/**
 * Check if message contains variations of bad words using advanced detection
 * This catches attempts to bypass the filter with spaces, symbols, etc.
 * @param {string} message - The message to check
 * @param {string[]} customWords - Additional custom words
 * @returns {{ found: boolean, word: string | null }}
 */
function checkBadWordsAdvanced(message, customWords = []) {
  // Remove spaces and special characters for bypass detection
  const stripped = message.toLowerCase().replace(/[\s\W_]/g, '');
  const normalized = normalizeLeetspeak(stripped);

  const allWords = [...DEFAULT_BAD_WORDS, ...customWords.map(w => w.toLowerCase())];

  for (const badWord of allWords) {
    const cleanBadWord = badWord.replace(/[\s\W_]/g, '');
    if (normalized.includes(cleanBadWord) || stripped.includes(cleanBadWord)) {
      return { found: true, word: badWord };
    }
  }

  return { found: false, word: null };
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
 * Censor a bad word in text
 * @param {string} text - Original text
 * @param {string} badWord - Word to censor
 * @returns {string} - Censored text
 */
function censorWord(text, badWord) {
  const regex = new RegExp(badWord, 'gi');
  const censored = badWord[0] + '*'.repeat(badWord.length - 2) + badWord[badWord.length - 1];
  return text.replace(regex, censored);
}

/**
 * Get the built-in bad words list
 * @returns {string[]}
 */
function getBuiltInWords() {
  return [...DEFAULT_BAD_WORDS];
}

/**
 * Get safe version of the word list (for display)
 * @returns {number} - Count of built-in words
 */
function getBuiltInWordCount() {
  return DEFAULT_BAD_WORDS.length;
}

export {
  checkBadWords,
  checkBadWordsAdvanced,
  getWordSeverity,
  censorWord,
  normalizeLeetspeak,
  getBuiltInWords,
  getBuiltInWordCount,
  DEFAULT_BAD_WORDS
};
