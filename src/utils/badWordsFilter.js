/**
 * Bad Words Filter Utility
 * Custom implementation for comprehensive profanity filtering
 * Supports custom words from database and leetspeak detection
 */

// Comprehensive built-in bad words list
const DEFAULT_BAD_WORDS = [
  // Common profanity
  'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'motherfucker', 'motherfucking',
  'shit', 'shitting', 'shitted', 'shits', 'bullshit',
  'ass', 'asses', 'asshole', 'assholes',
  'bitch', 'bitches', 'bitching',
  'damn', 'dammit', 'damned', 'goddamn',
  'crap', 'crappy',
  'piss', 'pissed', 'pissing',
  'dick', 'dicks', 'dickhead',
  'cock', 'cocks', 'cocksucker',
  'pussy', 'pussies',
  'cunt', 'cunts',
  'bastard', 'bastards',
  'whore', 'whores',
  'slut', 'sluts',
  'hoe', 'hoes',
  'twat', 'twats',
  'wanker', 'wankers',
  'bollocks',
  'arse', 'arsehole',

  // Slurs and hate speech
  'nigger', 'nigga', 'niggers', 'niggas',
  'faggot', 'fag', 'fags', 'faggots',
  'retard', 'retarded', 'retards',
  'homo', 'homos',
  'tranny', 'trannies',
  'spic', 'spics',
  'chink', 'chinks',
  'kike', 'kikes',
  'beaner', 'beaners',
  'wetback', 'wetbacks',
  'coon', 'coons',
  'towelhead', 'towelheads',
  'raghead', 'ragheads',
  'sandnigger', 'sandniggers',
  'gook', 'gooks',
  'jap', 'japs',
  'cracker', 'crackers',

  // Sexual content
  'porn', 'porno', 'pornography',
  'sex', 'sexual', 'sexy',
  'nude', 'nudes', 'nudity',
  'naked',
  'boobs', 'boob', 'boobies',
  'tits', 'titties', 'titty',
  'penis', 'penises',
  'vagina', 'vaginas',
  'cum', 'cumming', 'cummed', 'cumshot',
  'jizz', 'jizzed',
  'dildo', 'dildos',
  'vibrator',
  'masturbate', 'masturbating', 'masturbation',
  'orgasm', 'orgasms',
  'erection', 'erect',
  'blowjob', 'blowjobs',
  'handjob', 'handjobs',
  'anal',
  'rape', 'raped', 'raping', 'rapist',
  'molest', 'molested', 'molesting',
  'incest',
  'bestiality',
  'pedophile', 'pedophilia',

  // Violence
  'kill', 'killed', 'killing', 'killer',
  'murder', 'murdered', 'murdering', 'murderer',
  'suicide', 'suicidal',
  'kys', // "kill yourself"

  // Drugs
  'cocaine',
  'heroin',
  'meth', 'methamphetamine',
  'crack',

  // Misc offensive
  'stfu',
  'gtfo',
  'lmfao',

  // Leetspeak/bypass variations
  'fck', 'fuk', 'fuq', 'phuck', 'phuk',
  'sh1t', 'sht',
  'b1tch', 'biatch',
  'a$$', 'd1ck', 'c0ck', 'cvnt',
  'wh0re', 'h0e', 'h03',
  'n1gger', 'n1gga', 'nigg3r', 'n!gger',
  'f4g', 'f4ggot',
  'r3tard', 'r3t4rd',
  'tr4nny',
  'sp1c', 'ch1nk', 'k1ke',
  'p0rn', 'pr0n',
  's3x',
  'b00bs', 'b00bies',
  't1ts',
  'pen1s',
  'vag1na',
  'j1zz',
  'd1ldo', 'dild0',
  'bl0wjob'
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
 * Check if text contains any bad words
 * @param {string} text - Text to check
 * @param {string[]} wordList - List of bad words to check against
 * @returns {string|null} - The bad word found, or null
 */
function findBadWord(text, wordList) {
  const lowerText = text.toLowerCase();
  
  for (const badWord of wordList) {
    // Escape special regex characters in the bad word
    const escapedWord = badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Create regex with word boundaries
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
    
    if (regex.test(lowerText)) {
      return badWord;
    }
  }
  
  return null;
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
    // Combine word lists
    const builtInWords = useBuiltIn ? DEFAULT_BAD_WORDS : [];
    const allWords = [...builtInWords, ...customWords.map(w => w.toLowerCase())]
      .filter(word => !ignoredWords.map(w => w.toLowerCase()).includes(word.toLowerCase()));

    // Check original message
    const foundWord = findBadWord(message, allWords);
    if (foundWord) {
      return {
        found: true,
        word: foundWord,
        type: customWords.map(w => w.toLowerCase()).includes(foundWord.toLowerCase()) ? 'custom' : 'builtin'
      };
    }

    // Check normalized (leetspeak converted) message
    const normalizedMessage = normalizeLeetspeak(message);
    const foundNormalized = findBadWord(normalizedMessage, allWords);
    if (foundNormalized) {
      return {
        found: true,
        word: foundNormalized,
        type: customWords.map(w => w.toLowerCase()).includes(foundNormalized.toLowerCase()) ? 'custom' : 'builtin'
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
 * This catches attempts to bypass the filter with spaces, symbols, etc.
 * @param {string} message - The message to check
 * @param {string[]} customWords - Additional custom words
 * @returns {{ found: boolean, word: string | null }}
 */
function checkBadWordsAdvanced(message, customWords = []) {
  try {
    const allWords = [...DEFAULT_BAD_WORDS, ...customWords.map(w => w.toLowerCase())];

    // Remove spaces and special characters for bypass detection
    const stripped = message.toLowerCase().replace(/[\s\W_]/g, '');
    const normalized = normalizeLeetspeak(stripped);

    // Check if any bad word appears in the stripped text
    for (const badWord of allWords) {
      const cleanBadWord = badWord.replace(/[\s\W_]/g, '');
      if (stripped.includes(cleanBadWord) || normalized.includes(cleanBadWord)) {
        return { found: true, word: badWord };
      }
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
 * Censor/clean a message by replacing bad words with asterisks
 * @param {string} text - Original text
 * @param {string[]} customWords - Custom words to also censor
 * @param {string[]} ignoredWords - Words to not censor
 * @returns {string} - Censored text
 */
function censorMessage(text, customWords = [], ignoredWords = []) {
  try {
    let result = text;
    const allWords = [...DEFAULT_BAD_WORDS, ...customWords.map(w => w.toLowerCase())]
      .filter(word => !ignoredWords.map(w => w.toLowerCase()).includes(word.toLowerCase()));

    for (const badWord of allWords) {
      const escapedWord = badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      result = result.replace(regex, (match) => {
        if (match.length <= 2) return '*'.repeat(match.length);
        return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
      });
    }

    return result;
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
  return [...DEFAULT_BAD_WORDS];
}

/**
 * Get count of built-in words
 * @returns {number} - Count of built-in words
 */
function getBuiltInWordCount() {
  return DEFAULT_BAD_WORDS.length;
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
  getBuiltInWords,
  getBuiltInWordCount,
  testFilter,
  DEFAULT_BAD_WORDS
};
