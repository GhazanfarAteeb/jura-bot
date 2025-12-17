import { EmbedBuilder } from 'discord.js';

const reactions = {
  // Positive reactions
  hug: {
    queries: ['hug anime', 'anime hug', 'wholesome hug'],
    titles: ['Warm Hugs Incoming! 🤗', 'Hug Attack! 💕', 'Spreading the Love! ❤️', 'Cuddle Mode: Activated! 🫂']
  },
  kiss: {
    queries: ['anime kiss', 'kiss anime', 'romantic kiss'],
    titles: ['Smooch Alert! 💋', 'Kiss Kiss! 😘', 'Love is in the Air! 💕', 'Mwah! 😚']
  },
  pat: {
    queries: ['head pat anime', 'anime pat', 'pat head'],
    titles: ['Good Job! *pat pat* 👋', 'Head Pats for Days! 😊', 'You Deserve This! *pat*', 'Pat Pat Time! 🥰']
  },
  cuddle: {
    queries: ['cuddle anime', 'anime cuddle', 'snuggle'],
    titles: ['Cuddle Puddle Time! 🥺', 'Maximum Comfy Mode! 💗', 'Snuggle Party! 🤗', 'Warm & Fuzzy! 💝']
  },
  highfive: {
    queries: ['high five anime', 'anime high five', 'hi5'],
    titles: ['Up Top! ✋', 'High Five Energy! 🙌', 'Slap Hands! 👏', 'Yeah! *high five*']
  },
  wave: {
    queries: ['wave anime', 'anime wave', 'hello wave'],
    titles: ['Hellooo! 👋', 'Wave Squad! 🌊', '*waves enthusiastically*', 'Greetings! 😄']
  },
  smile: {
    queries: ['smile anime', 'anime smile', 'happy smile'],
    titles: ['Smile Time! 😊', 'Happiness Overload! 😁', 'Grinning! ☺️', 'Wholesome Vibes! 😌']
  },
  blush: {
    queries: ['blush anime', 'anime blush', 'shy blush'],
    titles: ['So Flustered! 😳', 'Blushing Hard! >///<', 'Aww Shucks! 😊', 'Getting All Red! 😚']
  },
  love: {
    queries: ['anime love', 'hearts anime', 'love eyes'],
    titles: ['Love Struck! 😍', 'Heart Eyes! 💖', 'Falling Hard! 💘', 'Cupid Strikes! 💝']
  },
  headpat: {
    queries: ['head pat anime', 'anime headpat', 'pat head'],
    titles: ['*pat pat pat* 🥰', 'You\'re Doing Great! 👍', 'Good Human! *pats*', 'Headpat Combo! ✨']
  },

  // Fun reactions
  dance: {
    queries: ['anime dance', 'dance gif', 'dancing'],
    titles: ['Dance Party! 💃', 'Busting Moves! 🕺', 'Groove Time! 🎵', 'Dance Like Nobody\'s Watching! 🎶']
  },
  celebrate: {
    queries: ['celebrate anime', 'party anime', 'celebration'],
    titles: ['Party Time! 🎉', 'Let\'s Celebrate! 🥳', 'Woohoo! 🎊', 'Victory Dance! 🎈']
  },
  laugh: {
    queries: ['laugh anime', 'anime laugh', 'laughing'],
    titles: ['HAHAHA! 😂', 'Can\'t Stop Laughing! 🤣', 'Too Funny! 😆', 'LOL Moment! 😹']
  },
  cry: {
    queries: ['cry anime', 'anime cry', 'crying'],
    titles: ['The Tears! 😭', 'Waterworks! 💧', 'Big Sad Energy... 😢', 'Need Tissues! 🥺']
  },
  poke: {
    queries: ['poke anime', 'anime poke', 'poking'],
    titles: ['Poke! *boop* 👉', 'Poke Poke! 🫵', 'Gotcha! *pokes*', 'Boop the Snoot! 👆']
  },
  bonk: {
    queries: ['bonk meme', 'bonk anime', 'bonk head'],
    titles: ['BONK! 🔨', 'Go to Horny Jail! 😤', '*bonks* No! 🚫', 'Bonk Attack! 💥']
  },
  nom: {
    queries: ['nom anime', 'eating anime', 'nom nom'],
    titles: ['Nom Nom Nom! 😋', 'Munch Time! 🍔', 'Tasty! 🤤', 'Food Coma Incoming! 🍕']
  },
  wink: {
    queries: ['wink anime', 'anime wink', 'winking'],
    titles: ['*wink wink* 😉', 'Smooth! 😎', 'Wink Attack! ✨', 'You Know It! 😏']
  },
  thumbsup: {
    queries: ['thumbs up anime', 'anime thumbs up', 'good job'],
    titles: ['Nicely Done! 👍', 'Approved! ✅', 'You Got This! 💪', 'Great Work! 🌟']
  },
  salute: {
    queries: ['salute anime', 'anime salute', 'military salute'],
    titles: ['Yes Sir! o7', 'Salute! 🫡', 'Respect! 🎖️', 'Roger That! 🪖']
  },

  // Negative reactions
  slap: {
    queries: ['slap anime', 'anime slap', 'face slap'],
    titles: ['*SLAP!* 😠', 'Ouch! That Hurts! 🤚', 'Take That! 💢', 'Slap Delivered! ✋']
  },
  punch: {
    queries: ['punch anime', 'anime punch', 'fighting'],
    titles: ['POW! Right in the Kisser! 👊', 'Falcon PUNCH! 💥', 'Taste My Fist! 🥊', 'K.O.! 💪']
  },
  kick: {
    queries: ['kick anime', 'anime kick', 'kicking'],
    titles: ['YEET! 🦵', 'Kicked to the Curb! 👢', 'Sparta Kick! ⚔️', 'Boot to the Head! 🥾']
  },
  angry: {
    queries: ['angry anime', 'anime angry', 'mad'],
    titles: ['Big Mad! 😡', 'Rage Mode! 💢', 'Not Happy! 😤', 'Fuming! 🔥']
  },
  rage: {
    queries: ['rage anime', 'anime rage', 'furious'],
    titles: ['MAXIMUM RAGE! 🤬', 'Seeing Red! 💥', 'AAAARGH! 😡', 'Anger Levels: MAX! 🌋']
  },
  stab: {
    queries: ['stab anime', 'anime knife', 'yandere'],
    titles: ['Stabby Stabby! 🔪', 'Yandere Mode! 😈', 'Dangerous! ⚠️', 'Knife-kun Says Hi! 🗡️']
  },
  bite: {
    queries: ['bite anime', 'anime bite', 'nom bite'],
    titles: ['Chomp! 😬', 'Bite Attack! 🦷', 'Nom... Wait, OW! 😤', 'Vampire Mode! 🧛']
  },

  // Misc
  think: {
    queries: ['thinking anime', 'anime think', 'hmm'],
    titles: ['Hmm... 🤔', 'Big Brain Time! 🧠', 'Thinking Hard! 💭', 'Processing... ⚙️']
  },
  shrug: {
    queries: ['shrug anime', 'anime shrug', 'idk'],
    titles: ['¯\\_(ツ)_/¯', 'I Dunno! 🤷', 'Not My Problem! 😐', 'Whatever! 🙄']
  },
  sleep: {
    queries: ['sleep anime', 'anime sleep', 'sleeping'],
    titles: ['Zzz... 😴', 'Nap Time! 💤', 'Gone to Dreamland! 🌙', 'Sleep Mode: ON ⏰']
  },
  yawn: {
    queries: ['yawn anime', 'anime yawn', 'tired yawn'],
    titles: ['*yawns* So Tired... 🥱', 'Need Coffee! ☕', 'Sleepy Vibes! 😪', 'Big Yawn Energy! 💤']
  },
  confused: {
    queries: ['confused anime', 'anime confused', 'question marks'],
    titles: ['So Confused! 😵', 'What? 🤨', 'Brain.exe Stopped! ❓', 'Confused Screaming! 😖']
  },
  facepalm: {
    queries: ['facepalm anime', 'anime facepalm', 'picard facepalm'],
    titles: ['*facepalm* 🤦', 'Seriously? 😑', 'I Can\'t Even... 🫠', 'Done with This! 😩']
  },
  nervous: {
    queries: ['nervous anime', 'anime nervous', 'sweating'],
    titles: ['Nervous Sweating! 😅', 'Uh Oh... 😰', 'Anxious Vibes! 😬', 'Help! 😥']
  },
  excited: {
    queries: ['excited anime', 'anime excited', 'happy bounce'],
    titles: ['SO EXCITED! 🤩', 'Hype! 🎉', 'Can\'t Contain It! ✨', 'Bouncing Off Walls! 🌟']
  },
  shocked: {
    queries: ['shocked anime', 'anime shocked', 'surprised'],
    titles: ['WHAT?! 😱', 'Mind Blown! 🤯', 'No Way! 😲', 'Jaw Drop! 😦']
  },
  smug: {
    queries: ['smug anime', 'anime smug', 'smirk'],
    titles: ['Feeling Smug! 😏', 'I Told You So! 😎', 'Smugness Overload! 😼', 'Too Cool! 🕶️']
  },
  
  // More owo-style reactions
  lick: {
    queries: ['lick anime', 'anime lick', 'licking'],
    titles: ['*lick* 👅', 'Sloppy Kiss! 😛', 'Blep! 👅', 'Taste Test! 😋']
  },
  boop: {
    queries: ['boop anime', 'anime boop', 'nose boop'],
    titles: ['Boop! *boops nose* 👉', 'Boop the Snoot! 👃', 'Beep Boop! 🤖', '*boops* Gotcha! 😊']
  },
  greet: {
    queries: ['greet anime', 'anime hello', 'greeting'],
    titles: ['Hey There! 👋', 'Greetings Friend! 🙋', 'What\'s Up! 😄', 'Hello Hello! 🌟']
  },
  handholding: {
    queries: ['hand holding anime', 'holding hands anime', 'anime handhold'],
    titles: ['Hand Holding! 🤝', 'So Lewd! 😳', 'Holding Hands! 💕', 'Together! 👫']
  },
  tickle: {
    queries: ['tickle anime', 'anime tickle', 'tickling'],
    titles: ['Tickle Attack! ✋😆', 'Tickle Tickle! 🤣', 'Can\'t Stop Laughing! 😂', 'Tickle Monster! 👹']
  },
  kill: {
    queries: ['kill anime meme', 'omae wa mou', 'anime fight'],
    titles: ['Omae Wa Mou... 😈', 'Nothing Personal Kid! 😎', 'Fatality! 💀', 'You\'re Already Dead! ☠️']
  },
  hold: {
    queries: ['hold anime', 'anime hold', 'holding'],
    titles: ['Holding You! 🤗', 'Safe in My Arms! 💕', 'Got You! 🫂', 'Hold Tight! 💪']
  },
  pats: {
    queries: ['pat pat anime', 'multiple pats', 'anime pat pat'],
    titles: ['Pat Pat Pat! 👋👋👋', 'All the Pats! 🥰', 'Unlimited Pats! ✨', 'Pat Overload! 😊']
  },
  snuggle: {
    queries: ['snuggle anime', 'anime snuggle', 'cuddle close'],
    titles: ['Snuggle Time! 🥺', 'So Cozy! 🛋️', 'Snug as a Bug! 🐛', 'Maximum Snuggles! 💗']
  },
  bully: {
    queries: ['bully anime', 'anime bully', 'teasing'],
    titles: ['Bully Mode! 😈', 'Get Rekt! 😏', 'Gottem! 😂', 'Too Easy! 🎯']
  },
  stare: {
    queries: ['stare anime', 'anime stare', 'intense stare'],
    titles: ['Staring Intensely! 👁️👁️', '*stares*', 'The Stare Down! 😐', 'What You Looking At? 🤨']
  },
  pout: {
    queries: ['pout anime', 'anime pout', 'pouting'],
    titles: ['*pouts* 😤', 'Hmph! 💢', 'Not Fair! 😾', 'Pouting Face! 😠']
  },
  lewd: {
    queries: ['lewd anime meme', 'anime embarrassed', 'flustered anime'],
    titles: ['Too Lewd! 😳', 'How Scandalous! 😱', 'Inappropriate! >///<', 'NSFW Alert! 🔞']
  },
  triggered: {
    queries: ['triggered meme', 'triggered anime', 'rage anime'],
    titles: ['TRIGGERED! 😡', 'Activating Rage! 💢', 'Mad Mad Mad! 🤬', 'Triggering Intensifies! 🌋']
  },
  smirk: {
    queries: ['smirk anime', 'anime smirk', 'sly smile'],
    titles: ['*smirks* 😏', 'Sly Fox! 🦊', 'Clever Girl! 😎', 'Up to Something! 😼']
  },
  happy: {
    queries: ['happy anime', 'anime happy', 'joy'],
    titles: ['So Happy! 😊', 'Pure Joy! ✨', 'Happiness! 🌈', 'Feeling Great! 🎉']
  },
  thumbs: {
    queries: ['thumbs up anime', 'anime approve', 'good job anime'],
    titles: ['Thumbs Up! 👍👍', 'Double Approval! ✌️', 'You Rock! 🤘', 'Awesome! 🌟']
  },
  wag: {
    queries: ['wag tail anime', 'happy dog anime', 'tail wagging'],
    titles: ['*wags tail* 🐕', 'Happy Puppy! 🐶', 'Tail Wag! 🐾', 'So Excited! 🦴']
  },
  teehee: {
    queries: ['giggle anime', 'anime giggle', 'cute laugh'],
    titles: ['Teehee! 🤭', 'Giggling! ☺️', 'Hehe! 😊', 'Cute Laugh! 💕']
  },
  scoff: {
    queries: ['scoff anime', 'anime scoff', 'dismissive'],
    titles: ['*scoffs* 🙄', 'As If! 💅', 'Whatever! 😒', 'Pfft! 😤']
  },
  grin: {
    queries: ['grin anime', 'anime grin', 'wide smile'],
    titles: ['Big Grin! 😁', 'Grinning! 😄', 'Cheese! 📸', 'Smile Wide! 😃']
  },
  sleepy: {
    queries: ['sleepy anime', 'anime sleepy', 'tired'],
    titles: ['So Sleepy... 😪', 'Tired Mode! 🥱', 'Need Sleep! 💤', 'Energy Low! 🔋']
  },
  thonking: {
    queries: ['thinking hard', 'hmm anime', 'pondering'],
    titles: ['Thonking... 🤔', 'Hmmmm! 💭', 'Deep Thoughts! 🧐', 'Contemplating! 🤨']
  },
  triggered2: {
    queries: ['angry triggered', 'mad meme', 'rage face'],
    titles: ['REEEEE! 😡', 'Anger! 💥', 'Mad Lad! 🤬', 'Furious! 🌶️']
  },
  
  // Physical interactions
  push: {
    queries: ['push anime', 'anime push', 'shove anime'],
    titles: ['*PUSH!* 😈', 'YEET! Out the Way! 🫸', 'Outta My Way! 💥', 'Down You Go! 😂']
  },
  splash: {
    queries: ['water splash anime', 'anime splash', 'splash water'],
    titles: ['Splash Attack! 💦', 'Water Fight! 🌊', '*splashes water* 💧', 'Get Wet! 🏖️']
  },
  tackle: {
    queries: ['tackle anime', 'anime tackle', 'tackle hug'],
    titles: ['Tackle Hug! 🤗', 'INCOMING! 💥', 'Flying Tackle! 🦅', 'Gotcha! 🤸']
  },
  throw: {
    queries: ['throw anime', 'anime throw', 'yeet anime'],
    titles: ['YEET! 🎯', 'Going Flying! ✈️', 'Toss Time! 🤾', 'Launching! 🚀']
  },
  grab: {
    queries: ['grab anime', 'anime grab', 'grabbing'],
    titles: ['Got You! ✊', 'Grab! 🤲', 'Come Here! 💪', 'Gotcha! 🫴']
  },
  
  // Personality reactions (anime dere types)
  tsundere: {
    queries: ['tsundere anime', 'anime tsundere', 'baka'],
    titles: ['I-It\'s Not Like I Like You! 😤', 'B-Baka! >///<', 'Tsundere Mode! 💢', 'Hmph! Don\'t Get the Wrong Idea! 😾']
  },
  deredere: {
    queries: ['deredere anime', 'loving anime', 'affectionate anime'],
    titles: ['So Much Love! 💕💕💕', 'Lovey Dovey! 😍', 'Adorable! ✨', 'Pure Sweetness! 🍬']
  },
  yandere: {
    queries: ['yandere anime', 'anime yandere', 'crazy love'],
    titles: ['Mine Forever! 😈💕', 'Nobody Else! 🔪', 'Obsessed! 👁️👁️', 'You\'re Not Going Anywhere! ⛓️']
  },
  kuudere: {
    queries: ['kuudere anime', 'anime emotionless', 'cool anime'],
    titles: ['Cool & Collected... 😐', 'Emotionless Stare... 😑', 'Whatever... 😶', 'Not Interested... 🧊']
  },
  dandere: {
    queries: ['shy anime', 'anime shy', 'timid anime'],
    titles: ['S-So Shy... 🙈', 'Too Nervous! 😰', '*hides* 👉👈', 'Quiet Mode... 😶']
  },
  
  // More fun actions
  run: {
    queries: ['running anime', 'anime run', 'running away'],
    titles: ['Running Away! 🏃', 'Gotta Go Fast! 💨', 'Escape! 🏃‍♀️', 'Nope! *runs* 🚶💨']
  },
  chase: {
    queries: ['chase anime', 'anime chase', 'running after'],
    titles: ['Get Back Here! 🏃‍♂️💨', 'Chasing You! 🏃', 'Can\'t Escape! 👟', 'Pursuit! 🎯']
  },
  feed: {
    queries: ['feed anime', 'anime feeding', 'feeding mouth'],
    titles: ['Say Ahh! 😋', 'Feeding Time! 🍽️', 'Open Wide! 👄', 'Nom Time! 🥄']
  },
  piggyback: {
    queries: ['piggyback anime', 'anime piggyback', 'carry back'],
    titles: ['Piggyback Ride! 🐷', 'Hop On! 🎠', 'Carrying You! 💪', 'Up We Go! ⬆️']
  },
  nosebleed: {
    queries: ['nosebleed anime', 'anime nosebleed', 'perverted'],
    titles: ['NOSEBLEED! 🩸', 'Too Hot! 😳💦', 'Can\'t Handle It! 😵', 'Blood Fountain! ⛲']
  },
  faint: {
    queries: ['faint anime', 'anime faint', 'passed out'],
    titles: ['*faints* 😵', 'Passed Out! 💫', 'Too Much! 🌀', 'Gone! ✨']
  },
  nod: {
    queries: ['nod anime', 'anime nod', 'nodding'],
    titles: ['*nods* 🙂', 'Yep! 👍', 'Agreed! ✅', 'Understood! 📝']
  },
  peek: {
    queries: ['peek anime', 'anime peek', 'peeking'],
    titles: ['*peeks* 👀', 'Peekaboo! 🙈', 'Sneaky Look! 🕵️', 'What\'s This? 🔍']
  },
  spin: {
    queries: ['spin anime', 'anime spin', 'spinning'],
    titles: ['Spinning! 🌀', 'Round and Round! 🔄', 'Wheee! 🎡', 'Tornado Mode! 🌪️']
  },
  trip: {
    queries: ['trip anime', 'anime trip', 'fall anime'],
    titles: ['*trips* 😵', 'Whoops! 💫', 'Falling! 🤕', 'Clumsy! 😅']
  },
  headbutt: {
    queries: ['headbutt anime', 'anime headbutt', 'head bash'],
    titles: ['BONK! Head Clash! 💥', 'Headbutt! 🗿', 'Skull Bash! 💀', 'Ouch! 🤕']
  },
  lurk: {
    queries: ['lurk anime', 'anime lurking', 'hiding'],
    titles: ['Lurking... 👁️', 'In the Shadows... 🌑', 'Watching... 🕵️', 'Stalker Mode! 🔍']
  },
  spray: {
    queries: ['spray water anime', 'water spray', 'squirt water'],
    titles: ['Spray Bottle! 💦', 'Bad! *spray spray* 🚿', 'Squirt! 💧', 'Cooling Off! 🌊']
  },
  flirt: {
    queries: ['flirt anime', 'anime flirt', 'charming'],
    titles: ['Smooth Talker! 😏💕', 'Flirty! 😘', 'Charming! ✨', 'Hey There~ 😉']
  },
  nuzzle: {
    queries: ['nuzzle anime', 'anime nuzzle', 'nose nuzzle'],
    titles: ['*nuzzles* 🥰', 'Snuggle Snuggle! 😊', 'Cute! 💕', 'Rubbing Noses! 👃']
  },
  blep: {
    queries: ['blep anime', 'anime tongue out', 'tongue stick'],
    titles: ['Blep! 😛', 'Tongue Out! 👅', 'Derp! 🤪', 'Silly Face! 😜']
  },
  carry: {
    queries: ['carry anime', 'anime carry', 'princess carry'],
    titles: ['Princess Carry! 👸', 'In My Arms! 💪', 'Carrying You! 🤵', 'Bridal Style! 💑']
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
      // Create organized reaction categories
      const categories = {
        '💕 Affectionate': ['hug', 'kiss', 'pat', 'headpat', 'pats', 'cuddle', 'snuggle', 'nuzzle', 'love', 'hold', 'handholding', 'carry'],
        '😊 Positive': ['highfive', 'wave', 'greet', 'smile', 'blush', 'happy', 'wink', 'thumbsup', 'thumbs', 'salute', 'nod'],
        '🎉 Fun & Playful': ['dance', 'celebrate', 'laugh', 'excited', 'spin', 'wag', 'poke', 'boop', 'lick', 'blep', 'tickle', 'bonk', 'nom', 'feed', 'teehee', 'grin', 'flirt'],
        '😠 Aggressive': ['slap', 'punch', 'kick', 'push', 'throw', 'tackle', 'grab', 'headbutt', 'stab', 'bite', 'kill', 'angry', 'rage', 'triggered', 'bully'],
        '💦 Physical': ['splash', 'spray', 'run', 'chase', 'piggyback', 'trip', 'faint'],
        '😴 Sleepy': ['sleep', 'sleepy', 'yawn'],
        '😢 Emotional': ['cry', 'pout', 'nervous'],
        '🤔 Thinking': ['think', 'thonking', 'confused', 'shrug', 'facepalm', 'scoff'],
        '👁️ Observing': ['stare', 'peek', 'lurk'],
        '💕 Dere Types': ['tsundere', 'deredere', 'yandere', 'kuudere', 'dandere'],
        '😳 Special': ['lewd', 'nosebleed', 'shocked', 'smug', 'smirk']
      };

      let reactionList = '🎭 **Available Reactions** (90+ reactions!)\n\n';
      
      for (const [category, reacts] of Object.entries(categories)) {
        reactionList += `**${category}**\n\`${reacts.join('`, `')}\`\n\n`;
      }

      reactionList += `📖 **Usage:** \`!react <action> [@user]\`\n`;
      reactionList += `💡 **Examples:**\n`;
      reactionList += `• \`!react hug @user\` - Hug someone\n`;
      reactionList += `• \`!react dance\` - Dance by yourself\n`;
      reactionList += `• \`!react tsundere @user\` - B-Baka! >///<\n\n`;
      reactionList += `✨ Each reaction has 4 random funny titles!\n`;
      reactionList += `📋 Full list: Check REACTIONS_LIST.md`;

      return message.reply(reactionList);
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
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(randomQuery)}&key=${apiKey}&client_key=jura_bot&limit=30&media_filter=gif&contentfilter=medium`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reaction GIF');
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return message.reply(`❌ No reaction GIF found. Try again!`);
      }

      const randomGif = data.results[Math.floor(Math.random() * data.results.length)];
      const gifUrl = randomGif.media_formats.gif.url;

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
