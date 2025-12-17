import { EmbedBuilder } from 'discord.js';

const reactions = {
  // ===== POSITIVE =====
  hug: {
    queries: ['anime hug gif', 'anime hug', 'hug anime', 'anime cuddle hug'],
    titles: ['Come Here! 🤗', 'Warm Hug 💕', '*hugs* 🫂', 'Comfort Time 💖']
  },
  kiss: {
    queries: ['anime kiss gif', 'anime kiss', 'kiss anime', 'anime couple kiss'],
    titles: ['Mwah! 💋', 'Sweet Kiss 😘', 'Smooch 💕', 'Romantic Moment 💖']
  },
  pat: {
    queries: ['anime headpat gif', 'anime head pat', 'headpat anime', 'anime pat'],
    titles: ['*pat pat* 🥰', 'Good Job ⭐', 'Gentle Pats 💕', 'You Did Well 👋']
  },
  cuddle: {
    queries: ['anime cuddle gif', 'anime cuddling', 'cuddle anime', 'anime snuggle'],
    titles: ['So Cozy 🥺', 'Snuggle Time 🤗', 'Warm & Comfy 💗', 'Cuddle Mode 🫂']
  },
  highfive: {
    queries: ['anime high five gif', 'anime high five', 'high five anime'],
    titles: ['Up Top ✋', 'Nice One 🙌', 'High Five! 🎉', 'Perfect Sync 👌']
  },
  wave: {
    queries: ['anime wave gif', 'anime waving', 'wave anime'],
    titles: ['Hello! 👋', 'Hey There 😊', '*waves*', 'Friendly Hi ✨']
  },
  smile: {
    queries: ['anime smile gif', 'anime smiling', 'smile anime'],
    titles: ['Smile 😊', 'So Happy ✨', 'Beaming 😄', 'Wholesome Vibes 💛']
  },
  blush: {
    queries: ['anime blush gif', 'anime blushing', 'blush anime'],
    titles: ['Flustered 😳', 'So Red >///<', 'Embarrassed 😊', 'Blush Mode 💗']
  },
  love: {
    queries: ['anime love gif', 'anime heart eyes', 'love anime'],
    titles: ['In Love 😍', 'Heart Eyes 💖', 'Smitten 💕', 'Love Overload 💘']
  },
  headpat: {
    queries: ['anime headpat gif', 'headpat anime', 'anime pat head'],
    titles: ['Infinite Headpats 🌟', 'Good Human 🥰', '*pats* ✨', 'Headpat Heaven ☁️']
  },

  // ===== FUN =====
  dance: {
    queries: ['anime dance gif', 'anime dancing', 'dance anime'],
    titles: ['Dance Time 💃', 'Grooving 🕺', 'Party Moves 🎵', 'Let’s Boogie 🪩']
  },
  celebrate: {
    queries: ['anime celebrate gif', 'anime celebration', 'celebrate anime'],
    titles: ['Party! 🎉', 'Woohoo 🥳', 'Victory 🎊', 'Let’s Go 🎈']
  },
  laugh: {
    queries: ['anime laugh gif', 'anime laughing', 'laugh anime'],
    titles: ['HAHA 😂', 'Too Funny 🤣', 'LOL 😆', 'Cracking Up 💀']
  },
  cry: {
    queries: ['anime cry gif', 'anime crying', 'cry anime'],
    titles: ['So Sad 😭', 'Tears 😢', 'Big Sad 💔', 'Need Hugs 🥺']
  },
  poke: {
    queries: ['anime poke gif', 'anime poking', 'poke anime'],
    titles: ['Poke 👉', 'Boop 👆', 'Gotcha 😝', 'Poke Poke ✨']
  },
  bonk: {
    queries: ['anime bonk gif', 'anime bonk', 'bonk anime'],
    titles: ['BONK 🔨', 'No 😤', 'Go to Jail 🚫', 'Bonked 💥']
  },
  nom: {
    queries: ['anime eating gif', 'anime nom', 'nom anime'],
    titles: ['Nom Nom 😋', 'So Tasty 🤤', 'Eating Time 🍜', 'Yum 🍰']
  },
  wink: {
    queries: ['anime wink gif', 'anime winking', 'wink anime'],
    titles: ['*wink* 😉', 'Smooth 😎', 'Gotcha 😏', 'Charming ✨']
  },
  thumbsup: {
    queries: ['anime thumbs up gif', 'thumbs up anime', 'anime approval'],
    titles: ['Nice 👍', 'Approved ✅', 'Good Job 💪', 'Well Done 🌟']
  },
  salute: {
    queries: ['anime salute gif', 'anime saluting', 'salute anime'],
    titles: ['o7 🫡', 'Respect 🎖️', 'Roger 🪖', 'Yes Sir ⚔️']
  },

  // ===== NEGATIVE =====
  slap: {
    queries: ['anime slap gif', 'anime slap', 'slap anime'],
    titles: ['*SLAP* ✋', 'Deserved 😠', 'Wake Up 💢', 'Ouch 🤚']
  },
  punch: {
    queries: ['anime punch gif', 'anime punching', 'punch anime'],
    titles: ['POW 👊', 'Critical Hit 💥', 'KO ⚡', 'Fist of Fury 🥊']
  },
  kick: {
    queries: ['anime kick gif', 'anime kicking', 'kick anime'],
    titles: ['YEET 🦵', 'Flying Kick 💥', 'Roundhouse 🌪️', 'Booted 👢']
  },
  angry: {
    queries: ['anime angry gif', 'anime mad', 'angry anime'],
    titles: ['Angry 😡', 'Mad 💢', 'Not Happy 😤', 'Grrr 🔥']
  },
  rage: {
    queries: ['anime rage gif', 'anime furious', 'rage anime'],
    titles: ['MAX RAGE 🤬', 'Losing It 💥', 'Furious 😡', 'Seeing Red 🌋']
  },
  bite: {
    queries: ['anime bite gif', 'anime biting', 'bite anime'],
    titles: ['Chomp 😬', 'Bite! 🦷', 'Nom—OW 😤', 'Biting 😼']
  },

  // ===== MISC =====
  think: {
    queries: ['anime thinking gif', 'anime thinking', 'think anime'],
    titles: ['Hmm 🤔', 'Thinking 💭', 'Big Brain 🧠', 'Processing ⚙️']
  },
  shrug: {
    queries: ['anime shrug gif', 'anime shrugging', 'shrug anime'],
    titles: ['¯\\_(ツ)_/¯', 'Idk 🤷', 'Meh 😐', 'Whatever 🙄']
  },
  sleep: {
    queries: ['anime sleep gif', 'anime sleeping', 'sleep anime'],
    titles: ['Zzz 😴', 'Nap Time 💤', 'Sleepy 🌙', 'Out Cold ⏰']
  },
  yawn: {
    queries: ['anime yawn gif', 'anime yawning', 'yawn anime'],
    titles: ['*yawn* 🥱', 'So Tired 😪', 'Need Coffee ☕', 'Sleepy 💤']
  },
  confused: {
    queries: ['anime confused gif', 'anime confusion', 'confused anime'],
    titles: ['Confused 😵', 'Huh? 🤨', 'What ❓', 'Brain Melt 😖']
  },
  facepalm: {
    queries: ['anime facepalm gif', 'anime face palm', 'facepalm anime'],
    titles: ['*facepalm* 🤦', 'Seriously 😑', 'Why 🫠', 'Done 😩']
  },
  nervous: {
    queries: ['anime nervous gif', 'anime anxious', 'nervous anime'],
    titles: ['Nervous 😅', 'Uh Oh 😰', 'Anxious 😬', 'Help 😥']
  },
  excited: {
    queries: ['anime excited gif', 'anime excitement', 'excited anime'],
    titles: ['So Excited 🤩', 'Hype 🎉', 'Let’s Go ✨', 'Can’t Wait 🌟']
  },
  shocked: {
    queries: ['anime shocked gif', 'anime surprised', 'shocked anime'],
    titles: ['WHAT 😱', 'No Way 🤯', 'Surprised 😲', 'Jaw Drop 😦']
  },
  smug: {
    queries: ['anime smug gif', 'anime smirk', 'smug anime'],
    titles: ['Smug 😏', 'Heh 😎', 'Told You 😼', 'Too Cool 🕶️']
  },

  // ===== OW OWO STYLE =====
  boop: {
    queries: ['anime boop gif', 'anime nose boop', 'boop anime'],
    titles: ['Boop 👉', 'Beep 🤖', 'Gotcha 😊', 'Boop Snoot 👃']
  },
  handholding: {
    queries: ['anime holding hands gif', 'anime hand holding', 'handholding anime'],
    titles: ['Holding Hands 🤝', 'Together 💕', 'So Lewd 😳', 'Close 👫']
  },
  tickle: {
    queries: ['anime tickle gif', 'anime tickling', 'tickle anime'],
    titles: ['Tickle 😆', 'Stop 😂', 'Hehe 🤣', 'Tickle Fight ✋']
  },
  pout: {
    queries: ['anime pout gif', 'anime pouting', 'pout anime'],
    titles: ['*pout* 😤', 'Hmph 💢', 'Not Fair 😾', 'Grumpy 😠']
  },
  stare: {
    queries: ['anime stare gif', 'anime staring', 'stare anime'],
    titles: ['*stare* 👁️', 'Intense 😐', 'Watching 👀', 'Hmm 🤨']
  },
  happy: {
    queries: ['anime happy gif', 'anime joyful', 'happy anime'],
    titles: ['Happy 😊', 'Joy ✨', 'So Good 🌈', 'Yay 🎉']
  },
  sleepy: {
    queries: ['anime sleepy gif', 'anime tired', 'sleepy anime'],
    titles: ['Sleepy 😪', 'Low Energy 🔋', 'Need Bed 💤', 'Yawwwn 🥱']
  }
};

export default {
  name: 'react',
  description: 'Send anime reaction GIFs',
  usage: 'react <action> [@user]',
  aliases: ['reaction', 'anime'],
  category: 'utility',
  cooldown: 3,

  execute: async (message, args) => {
    if (!args.length) {
      // Create organized reaction categories with descriptions
      const categories = {
        '💕 Affectionate': {
          subtitle: 'Show your love and care',
          reactions: ['hug', 'kiss', 'pat', 'headpat', 'pats', 'cuddle', 'snuggle', 'nuzzle', 'love', 'hold', 'handholding', 'carry']
        },
        '😊 Positive Vibes': {
          subtitle: 'Spread positivity and encouragement',
          reactions: ['highfive', 'wave', 'greet', 'smile', 'blush', 'happy', 'wink', 'thumbsup', 'thumbs', 'salute', 'nod']
        },
        '🎉 Fun & Playful': {
          subtitle: 'Have fun and mess around',
          reactions: ['dance', 'celebrate', 'laugh', 'excited', 'spin', 'wag', 'poke', 'boop', 'lick', 'blep', 'tickle', 'bonk', 'nom', 'feed', 'teehee', 'grin', 'flirt']
        },
        '😠 Aggressive': {
          subtitle: 'Express your anger (playfully!)',
          reactions: ['slap', 'punch', 'kick', 'push', 'throw', 'tackle', 'grab', 'headbutt', 'stab', 'bite', 'kill', 'angry', 'rage', 'triggered', 'bully']
        },
        '💦 Physical Actions': {
          subtitle: 'Get physical with these moves',
          reactions: ['splash', 'spray', 'run', 'chase', 'piggyback', 'trip', 'faint']
        },
        '😴 Sleepy Time': {
          subtitle: 'When you\'re feeling tired',
          reactions: ['sleep', 'sleepy', 'yawn']
        },
        '😢 Emotional': {
          subtitle: 'Express your feelings',
          reactions: ['cry', 'pout', 'nervous']
        },
        '🤔 Thoughtful': {
          subtitle: 'When you need to think or react',
          reactions: ['think', 'thonking', 'confused', 'shrug', 'facepalm', 'scoff']
        },
        '👁️ Observing': {
          subtitle: 'Watch from the shadows',
          reactions: ['stare', 'peek', 'lurk']
        },
        '💖 Anime Dere Types': {
          subtitle: 'Show your personality type',
          reactions: ['tsundere', 'deredere', 'yandere', 'kuudere', 'dandere']
        },
        '😳 Special Reactions': {
          subtitle: 'Unique and special moments',
          reactions: ['lewd', 'nosebleed', 'shocked', 'smug', 'smirk']
        }
      };

      // Create embed with organized layout
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🎭 Reaction Commands')
        .setDescription('Here is the list of available reactions!\nFor more info on a specific reaction, use `react <action> [@user]`')
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      // Add each category as a field
      for (const [category, data] of Object.entries(categories)) {
        embed.addFields({
          name: category,
          value: `*${data.subtitle}*\n${data.reactions.map(r => `\`${r}\``).join(', ')}`,
          inline: false
        });
      }

      // Add usage examples
      embed.addFields({
        name: '📖 Usage',
        value: '`react <action> [@user]`',
        inline: false
      });

      embed.addFields({
        name: '💡 Examples',
        value: '• `react hug @user` - Hug someone\n• `react dance` - Dance by yourself\n• `react tsundere @user` - B-Baka! >///<',
        inline: false
      });

      return message.reply({ embeds: [embed] });
    }

    const action = args[0].toLowerCase();
    const targetUser = message.mentions.users.first();

    if (!reactions[action]) {
      return message.reply(
        `❌ Unknown reaction: **${action}**\n\n💡 **Tip:** Use \`!react\` without arguments to see all available reactions!`
      );
    }

    const apiKey = process.env.TENOR_API_KEY || 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
    const reactionData = reactions[action];
    const randomQuery = reactionData.queries[Math.floor(Math.random() * reactionData.queries.length)];
    const randomTitle = reactionData.titles[Math.floor(Math.random() * reactionData.titles.length)];

    try {
      // Improved search with better parameters for quality GIFs
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(randomQuery)}&key=${apiKey}&client_key=jura_bot&limit=50&media_filter=gif&contentfilter=medium&ar_range=standard&locale=en_US`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reaction GIF');
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return message.reply(`❌ No reaction GIF found. Try again!`);
      }

      // Filter out low-quality GIFs and prioritize higher quality ones
      const qualityGifs = data.results.filter(gif => {
        const gifFormat = gif.media_formats?.gif;
        if (!gifFormat) return false;
        
        // Filter: Dimensions should be reasonable (not too small, not too huge)
        const width = gifFormat.dims?.[0] || 0;
        const height = gifFormat.dims?.[1] || 0;
        const size = gifFormat.size || 0;
        
        return width >= 200 && width <= 600 && 
               height >= 200 && height <= 600 && 
               size < 10000000; // Less than 10MB
      });

      // Use filtered list if available, otherwise fall back to all results
      const gifPool = qualityGifs.length > 0 ? qualityGifs : data.results;
      
      // Pick from top results for better quality (first 20 are usually more relevant)
      const topResults = gifPool.slice(0, Math.min(20, gifPool.length));
      const randomGif = topResults[Math.floor(Math.random() * topResults.length)];
      
      // Prefer tinygif format for faster loading, fallback to gif
      const gifUrl = randomGif.media_formats.tinygif?.url || randomGif.media_formats.gif.url;

      // Create action text
      let actionText = '';
      if (targetUser) {
        if (targetUser.id === message.author.id) {
          actionText = `**${message.author.username}** ${action}s themselves!`;
        } else {
          actionText = `**${message.author.username}** ${action}s **${targetUser.username}**!`;
        }
      } else {
        actionText = `**${message.author.username}** ${action}s!`;
      }

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle(randomTitle)
        .setDescription(actionText)
        .setImage(gifUrl)
        .setFooter({
          text: `Powered by Tenor • Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('React command error:', error);
      return message.reply('❌ Failed to fetch reaction GIF. Please try again later!');
    }
  }
};
