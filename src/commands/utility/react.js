import { EmbedBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

const reactions = {
  // Positive reactions
  hug: {
    queries: ['hug'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Warm Hugs Incoming! 🤗', 'Hug Attack! 💕', 'Spreading the Love! ❤️', 'Cuddle Mode: Activated! 🫂', 'Virtual Hugs! 🥰', 'Bear Hug Time! 🐻', 'Group Hug Energy! 👥', 'Sending Warm Vibes! ✨']
  },
  kiss: {
    queries: ['kiss', 'airkiss'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Smooch Alert! 💋', 'Kiss Kiss! 😘', 'Love is in the Air! 💕', 'Mwah! 😚', 'Kissing Spree! 💏', 'Sweet Kiss! 😗', 'Blown Kisses! 😙', 'Romantic Moment! 💖']
  },
  pat: {
    queries: ['pat'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Good Job! *pat pat* 👋', 'Head Pats for Days! 😊', 'You Deserve This! *pat*', 'Pat Pat Time! 🥰', 'Gentle Pats! 🌸', 'Encouraging Pats! ⭐', '*pats gently* 💫', 'Proud of You! *pats* 🎊']
  },
  cuddle: {
    queries: ['cuddle'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Cuddle Puddle Time! 🥺', 'Maximum Comfy Mode! 💗', 'Snuggle Party! 🤗', 'Warm & Fuzzy! 💝', 'Cozy Cuddles! 🛋️', 'Comfort Zone Activated! 🌟', 'Snug Life! 😌', 'Ultimate Cuddle Session! 💞']
  },
  highfive: {
    queries: ['brofist', 'clap'],
    endpoints: ['otaku'],
    titles: ['Up Top! ✋', 'High Five Energy! 🙌', 'Slap Hands! 👏', 'Yeah! *high five*', 'Epic High Five! 🌟', 'Hand Slap Success! ✨', 'Celebration High Five! 🎉', 'Perfect Sync! 👌']
  },
  wave: {
    queries: ['wave'],
    endpoints: ['otaku'],
    titles: ['Hellooo! 👋', 'Wave Squad! 🌊', '*waves enthusiastically*', 'Greetings! 😄', 'Friendly Wave! 🙋', 'Hey There! 👋✨', 'Big Wave Energy! 🌊', 'Waving Back! 😊']
  },
  smile: {
    queries: ['smile'],
    endpoints: ['otaku'],
    titles: ['Smile Time! 😊', 'Happiness Overload! 😁', 'Grinning! ☺️', 'Wholesome Vibes! 😌', 'Beaming with Joy! ✨', 'Radiant Smile! 🌟', 'Smiling Ear to Ear! 😄', 'Pure Happiness! 💛']
  },
  blush: {
    queries: ['blush'],
    endpoints: ['otaku'],
    titles: ['So Flustered! 😳', 'Blushing Hard! >///<', 'Aww Shucks! 😊', 'Getting All Red! 😚', 'Shy Mode Activated! 🙈', 'Blushing Intensifies! 💗', 'Face Red Alert! 🔴', 'Embarrassed Cuteness! 💝']
  },
  love: {
    queries: ['love'],
    endpoints: ['otaku'],
    titles: ['Love Struck! 😍', 'Heart Eyes! 💖', 'Falling Hard! 💘', 'Cupid Strikes! 💝', 'Love Overload! 💕', 'Smitten! 😻', 'Hearts Everywhere! 💗💗', 'Love at First Sight! ✨']
  },
  headpat: {
    queries: ['pat'],
    endpoints: ['otaku', 'rndm'],
    titles: ['*pat pat pat* 🥰', 'You\'re Doing Great! 👍', 'Good Human! *pats*', 'Headpat Combo! ✨', 'Infinite Headpats! 🌟', 'Supreme Headpat! 👑', 'Legendary Pats! ⚡', 'Headpat Heaven! ☁️']
  },

  // Fun reactions
  dance: {
    queries: ['dance'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Dance Party! 💃', 'Busting Moves! 🕺', 'Groove Time! 🎵', 'Dance Like Nobody\'s Watching! 🎶', 'Dancing Queen! 👑', 'Rhythm Master! 🎼', 'Dance Floor Domination! ⚡', 'Let\'s Boogie! 🪩']
  },
  celebrate: {
    queries: ['celebrate', 'yay'],
    endpoints: ['otaku'],
    titles: ['Party Time! 🎉', 'Let\'s Celebrate! 🥳', 'Woohoo! 🎊', 'Victory Dance! 🎈', 'Celebration Mode! 🎆', 'Time to Party! 🥂', 'Winner Winner! 🏆', 'Festive Vibes! 🎪']
  },
  laugh: {
    queries: ['laugh'],
    endpoints: ['otaku', 'rndm'],
    titles: ['HAHAHA! 😂', 'Can\'t Stop Laughing! 🤣', 'Too Funny! 😆', 'LOL Moment! 😹', 'Dying of Laughter! 💀', 'Cracking Up! 🤪', 'Giggle Fest! 😄', 'Comedy Gold! 🥇']
  },
  cry: {
    queries: ['cry', 'sad'],
    endpoints: ['otaku'],
    titles: ['The Tears! 😭', 'Waterworks! 💧', 'Big Sad Energy... 😢', 'Need Tissues! 🥺', 'Crying Rivers! 🌊', 'Emotional Breakdown! 💔', 'Tear Fountain! ⛲', 'Sad Hours... 😿']
  },
  poke: {
    queries: ['poke'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Poke! *boop* 👉', 'Poke Poke! 🫵', 'Gotcha! *pokes*', 'Boop the Snoot! 👆', 'Poke War! ☝️', 'Annoying Pokes! 😝', 'Poke Combo! 👇', 'Surprise Poke! ✨']
  },
  bonk: {
    queries: ['smack', 'punch'],
    endpoints: ['otaku'],
    titles: ['BONK! 🔨', 'Go to Horny Jail! 😤', '*bonks* No! 🚫', 'Bonk Attack! 💥', 'Critical Bonk! ⚠️', 'Bonk Incoming! 🪃', 'Mega Bonk! 🔨💢', 'Bonked to Oblivion! 💫']
  },
  nom: {
    queries: ['nom', 'bite'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Nom Nom Nom! 😋', 'Munch Time! 🍔', 'Tasty! 🤤', 'Food Coma Incoming! 🍕', 'Delicious! 🍰', 'Eating Everything! 🍱', 'Foodie Mode! 🍜', 'Can\'t Stop Eating! 🌮']
  },
  bread: {
    queries: ['bread'],
    endpoints: ['rndm'],
    titles: ['Bread Time! 🍞', 'Nom Nom Bread! 🥖', 'Carb Loading! 🥐', 'Fresh Baked! 🥯', 'Bread Love! 🍞', 'Gluten Heaven! 🥪', 'Bread Obsessed! 🥙', 'Loaf Life! 🥨']
  },
  chocolate: {
    queries: ['chocolate'],
    endpoints: ['rndm'],
    titles: ['Chocolate Time! 🍫', 'Sweet Tooth! 🍬', 'Choco Addict! 🍫', 'Cocoa Heaven! ☕', 'Chocolate Bliss! 🍩', 'Sugar Rush! 🍰', 'Chocoholic! 🧁', 'Dessert Mode! 🎂']
  },
  cookie: {
    queries: ['cookie'],
    endpoints: ['rndm'],
    titles: ['Cookie Time! 🍪', 'Om Nom Cookies! 🍪', 'Cookie Monster! 🍪', 'Sweet Treat! 🥠', 'Cookie Heaven! 🍪', 'Baked Goods! 🧇', 'Cookie Jar Raid! 🍪', 'Crumbs Everywhere! 🍪']
  },
  wink: {
    queries: ['wink'],
    endpoints: ['otaku'],
    titles: ['*wink wink* 😉', 'Smooth! 😎', 'Wink Attack! ✨', 'You Know It! 😏', 'Sly Wink! 🦊', 'Charming Wink! 💫', 'Sneaky Wink! 👀', 'Flirty Wink! 😘']
  },
  thumbsup: {
    queries: ['thumbsup'],
    endpoints: ['otaku'],
    titles: ['Nicely Done! 👍', 'Approved! ✅', 'You Got This! 💪', 'Great Work! 🌟', 'Excellent! 🎯', 'Perfect Score! 💯', 'Amazing Job! 🏅', 'You\'re the Best! 👏']
  },
  salute: {
    queries: ['yes'],
    endpoints: ['otaku'],
    titles: ['Yes Sir! o7', 'Salute! 🫡', 'Respect! 🎖️', 'Roger That! 🪖', 'At Your Service! 🎗️', 'Honored! 🪬', 'Reporting for Duty! ⚔️', 'Soldier On! 🛡️']
  },

  // Negative reactions
  slap: {
    queries: ['slap'],
    endpoints: ['otaku', 'rndm'],
    titles: ['*SLAP!* 😠', 'Ouch! That Hurts! 🤚', 'Take That! 💢', 'Slap Delivered! ✋', 'Face Slap! 👋💥', 'Reality Check! 😤', 'Slap of Justice! ⚖️', 'Wake Up Call! 🔔']
  },
  punch: {
    queries: ['punch'],
    endpoints: ['otaku', 'rndm'],
    titles: ['POW! Right in the Kisser! 👊', 'Falcon PUNCH! 💥', 'Taste My Fist! 🥊', 'K.O.! 💪', 'One Punch! 🔥', 'Critical Hit! 💫', 'Knockout Blow! ⚡', 'Fist of Fury! 👊💢']
  },
  kick: {
    queries: ['kick'],
    endpoints: ['rndm'],
    titles: ['YEET! 🦵', 'Kicked to the Curb! 👢', 'Sparta Kick! ⚔️', 'Boot to the Head! 🥾', 'Flying Kick! 🦅', 'Roundhouse! 🌪️', 'Kick Attack! 💥', 'Sent Flying! 🚀']
  },
  angry: {
    queries: ['angry'],
    endpoints: ['rndm'],
    titles: ['Big Mad! 😡', 'Rage Mode! 💢', 'Not Happy! 😤', 'Fuming! 🔥', 'Angry Face! 😠', 'Grumpy! 😑', 'Irritated! 😣', 'Furious! 🤬']
  },
  rage: {
    queries: ['mad', 'shout'],
    endpoints: ['otaku'],
    titles: ['MAXIMUM RAGE! 🤬', 'Seeing Red! 💥', 'AAAARGH! 😡', 'Anger Levels: MAX! 🌋']
  },
  stab: {
    queries: ['punch', 'smack'],
    endpoints: ['otaku'],
    titles: ['Stabby Stabby! 🔪', 'Yandere Mode! 😈', 'Dangerous! ⚠️', 'Knife-kun Says Hi! 🗡️']
  },
  spank: {
    queries: ['spank'],
    endpoints: ['rndm'],
    titles: ['*SPANK!* 🍑', 'Naughty! 😈', 'Spanking Time! 👋', 'Bad Behavior! 😤', 'Punishment! 💥', 'Spank Attack! ✋', 'Discipline! 😠', 'Booty Slap! 🍑']
  },
  spit: {
    queries: ['spit'],
    endpoints: ['rndm'],
    titles: ['*SPIT!* 💦', 'Gross! 🤢', 'Spitting Mad! 😤', 'Disgusted! 🤮', 'Ptooey! 💧', 'Disrespect! 😠', 'Spit Take! 😲', 'Rejection! 🚫']
  },
  steal: {
    queries: ['steal'],
    endpoints: ['rndm'],
    titles: ['Yoink! 🤏', 'Stealing! 😈', 'Mine Now! 😏', 'Thief Mode! 🦝', 'Sneaky Steal! 🥷', 'Got Your Stuff! 😼', 'Kleptomaniac! 💰', 'Stolen! 🏃💨']
  },
  bite: {
    queries: ['bite', 'nom'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Chomp! 😬', 'Bite Attack! 🦷', 'Nom... Wait, OW! 😤', 'Vampire Mode! 🧛']
  },

  // Misc
  think: {
    queries: ['confused', 'huh'],
    endpoints: ["otaku"],
    titles: ['Hmm... 🤔', 'Big Brain Time! 🧠', 'Thinking Hard! 💭', 'Processing... ⚙️']
  },
  bored: {
    queries: ['bored'],
    endpoints: ['rndm'],
    titles: ['So Bored... 😑', 'Nothing to Do! 🥱', 'Boredom Strikes! 😐', 'Ugh, Boring! 😒', 'Yawn Fest! 💤', 'Need Entertainment! 📺', 'Tedious! 😶', 'Dullsville! 🙄']
  },
  drunk: {
    queries: ['drunk'],
    endpoints: ['rndm'],
    titles: ['Drunk Mode! 🍺', 'Too Much Sake! 🍶', 'Tipsy! 🥴', 'Wasted! 🤪', 'Intoxicated! 🍷', 'Had Too Many! 🍻', 'Drunk Vibes! 🥂', 'Party Too Hard! 🍾']
  },
  shrug: {
    queries: ['shrug'],
    endpoints: ["otaku"],
    titles: ['¯\\_(ツ)_/¯', 'I Dunno! 🤷', 'Not My Problem! 😐', 'Whatever! 🙄']
  },
  sleep: {
    queries: ['sleep'],
    endpoints: ["otaku", "rndm"],
    titles: ['Zzz... 😴', 'Nap Time! 💤', 'Gone to Dreamland! 🌙', 'Sleep Mode: ON ⏰']
  },
  yawn: {
    queries: ['yawn', 'tired'],
    endpoints: ["otaku"],
    titles: ['*yawns* So Tired... 🥱', 'Need Coffee! ☕', 'Sleepy Vibes! 😪', 'Big Yawn Energy! 💤']
  },
  confused: {
    queries: ['confused'],
    endpoints: ["otaku"],
    titles: ['So Confused! 😵', 'What? 🤨', 'Brain.exe Stopped! ❓', 'Confused Screaming! 😖']
  },
  facepalm: {
    queries: ['facepalm'],
    endpoints: ["otaku"],
    titles: ['*facepalm* 🤦', 'Seriously? 😑', 'I Can\'t Even... 🫠', 'Done with This! 😩']
  },
  nervous: {
    queries: ['nervous', 'sweat'],
    endpoints: ["otaku"],
    titles: ['Nervous Sweating! 😅', 'Uh Oh... 😰', 'Anxious Vibes! 😬', 'Help! 😥']
  },
  excited: {
    queries: ['happy', 'yay'],
    endpoints: ["otaku"],
    titles: ['SO EXCITED! 🤩', 'Hype! 🎉', 'Can\'t Contain It! ✨', 'Bouncing Off Walls! 🌟']
  },
  shocked: {
    queries: ['surprised', 'woah'],
    endpoints: ["otaku"],
    titles: ['WHAT?! 😱', 'Mind Blown! 🤯', 'No Way! 😲', 'Jaw Drop! 😦']
  },
  smug: {
    queries: ['smug'],
    endpoints: ["otaku"],
    titles: ['Feeling Smug! 😏', 'I Told You So! 😎', 'Smugness Overload! 😼', 'Too Cool! 🕶️']
  },

  // More owo-style reactions
  lick: {
    queries: ['lick'],
    endpoints: ["otaku", "rndm"],
    titles: ['*lick* 👅', 'Sloppy Kiss! 😛', 'bleh! 👅', 'Taste Test! 😋']
  },
  boop: {
    queries: ['poke'],
    endpoints: ["otaku", "rndm"],
    titles: ['Boop! *boops nose* 👉', 'Boop the Snoot! 👃', 'Beep Boop! 🤖', '*boops* Gotcha! 😊']
  },
  greet: {
    queries: ['wave'],
    endpoints: ["otaku"],
    titles: ['Hey There! 👋', 'Greetings Friend! 🙋', 'What\'s Up! 😄', 'Hello Hello! 🌟']
  },
  handholding: {
    queries: ['handhold'],
    endpoints: ["otaku"],
    titles: ['Hand Holding! 🤝', 'So Lewd! 😳', 'Holding Hands! 💕', 'Together! 👫']
  },
  tickle: {
    queries: ['tickle'],
    endpoints: ['otaku', 'rndm'],
    titles: ['Tickle Attack! ✋😆', 'Tickle Tickle! 🤣', 'Can\'t Stop Laughing! 😂', 'Tickle Monster! 👹']
  },
  kill: {
    queries: ['kill'],
    endpoints: ['rndm'],
    titles: ['Omae Wa Mou... 😈', 'Nothing Personal Kid! 😎', 'Fatality! 💀', 'You\'re Already Dead! ☠️']
  },
  lonely: {
    queries: ['lonely'],
    endpoints: ['rndm'],
    titles: ['So Lonely... 🥺', 'Forever Alone... 😢', 'Need Company! 💔', 'Feeling Isolated... 😞', 'Lonely Vibes... 🌧️', 'All By Myself... 🎵', 'Missing You... 💙', 'Solitude Mode... 🌙']
  },
  hold: {
    queries: ['hug', 'cuddle'],
    endpoints: ["otaku", "rndm"],
    titles: ['Holding You! 🤗', 'Safe in My Arms! 💕', 'Got You! 🫂', 'Hold Tight! 💪']
  },
  pats: {
    queries: ['pat'],
    endpoints: ["otaku", "rndm"],
    titles: ['Pat Pat Pat! 👋👋👋', 'All the Pats! 🥰', 'Unlimited Pats! ✨', 'Pat Overload! 😊']
  },
  snuggle: {
    queries: ['cuddle', 'hug'],
    endpoints: ["otaku", "rndm"],
    titles: ['Snuggle Time! 🥺', 'So Cozy! 🛋️', 'Snug as a Bug! 🐛', 'Maximum Snuggles! 💗']
  },
  bully: {
    queries: ['punch', 'smack', 'slap'],
    endpoints: ["otaku"],
    titles: ['Bully Mode! 😈', 'Get Rekt! 😏', 'Gottem! 😂', 'Too Easy! 🎯']
  },
  stare: {
    queries: ['stare'],
    endpoints: ["otaku"],
    titles: ['Staring Intensely! 👁️👁️', '*stares*', 'The Stare Down! 😐', 'What You Looking At? 🤨']
  },
  pout: {
    queries: ['pout'],
    endpoints: ["otaku"],
    titles: ['*pouts* 😤', 'Hmph! 💢', 'Not Fair! 😾', 'Pouting Face! 😠']
  },
  lewd: {
    queries: ['lick', 'nosebleed', 'blush'],
    endpoints: ["otaku"],
    titles: ['Too Lewd! 😳', 'How Scandalous! 😱', 'Inappropriate! >///<', 'NSFW Alert! 🔞']
  },
  triggered: {
    queries: ['mad', 'pout', 'shout'],
    endpoints: ["otaku"],
    titles: ['TRIGGERED! 😡', 'Activating Rage! 💢', 'Mad Mad Mad! 🤬', 'Triggering Intensifies! 🌋']
  },
  smirk: {
    queries: ['smug'],
    endpoints: ["otaku"],
    titles: ['*smirks* 😏', 'Sly Fox! 🦊', 'Clever Girl! 😎', 'Up to Something! 😼']
  },
  happy: {
    queries: ['happy'],
    endpoints: ["otaku", "rndm"],
    titles: ['So Happy! 😊', 'Pure Joy! ✨', 'Happiness! 🌈', 'Feeling Great! 🎉']
  },
  thumbs: {
    queries: ['thumbsup'],
    endpoints: ["otaku"],
    titles: ['Thumbs Up! 👍👍', 'Double Approval! ✌️', 'You Rock! 🤘', 'Awesome! 🌟']
  },
  wag: {
    queries: ['happy', 'dance'],
    endpoints: ["otaku", "rndm"],
    titles: ['*wags tail* 🐕', 'Happy Puppy! 🐶', 'Tail Wag! 🐾', 'So Excited! 🦴']
  },
  teehee: {
    queries: ['laugh', 'smile'],
    endpoints: ["otaku"],
    titles: ['Teehee! 🤭', 'Giggling! ☺️', 'Hehe! 😊', 'Cute Laugh! 💕']
  },
  scoff: {
    queries: ['shrug', 'smug'],
    endpoints: ["otaku"],
    titles: ['*scoffs* 🙄', 'As If! 💅', 'Whatever! 😒', 'Pfft! 😤']
  },
  grin: {
    queries: ['smile', 'smug'],
    endpoints: ["otaku"],
    titles: ['Big Grin! 😁', 'Grinning! 😄', 'Cheese! 📸', 'Smile Wide! 😃']
  },
  sleepy: {
    queries: ['tired', 'yawn', 'sleep'],
    endpoints: ["otaku"],
    titles: ['So Sleepy... 😪', 'Tired Mode! 🥱', 'Need Sleep! 💤', 'Energy Low! 🔋']
  },
  thonking: {
    queries: ['confused', 'huh'],
    endpoints: ["otaku"],
    titles: ['Thonking... 🤔', 'Hmmmm! 💭', 'Deep Thoughts! 🧐', 'Contemplating! 🤨']
  },
  triggered2: {
    queries: ['mad', 'shout', 'pout'],
    endpoints: ["otaku"],
    titles: ['REEEEE! 😡', 'Anger! 💥', 'Mad Lad! 🤬', 'Furious! 🌶️']
  },

  // Physical interactions
  push: {
    queries: ['punch', 'smack'],
    endpoints: ["otaku"],
    titles: ['*PUSH!* 😈', 'YEET! Out the Way! 🫸', 'Outta My Way! 💥', 'Down You Go! 😂']
  },
  splash: {
    queries: ['smack'],
    endpoints: ["otaku"],
    titles: ['Splash Attack! 💦', 'Water Fight! 🌊', '*splashes water* 💧', 'Get Wet! 🏖️']
  },
  tackle: {
    queries: ['hug'],
    endpoints: ["otaku", "rndm"],
    titles: ['Tackle Hug! 🤗', 'INCOMING! 💥', 'Flying Tackle! 🦅', 'Gotcha! 🤸']
  },
  throw: {
    queries: ['punch', 'smack'],
    endpoints: ["otaku", "rndm"],
    titles: ['YEET! 🎯', 'Going Flying! ✈️', 'Toss Time! 🤾', 'Launching! 🚀']
  },
  grab: {
    queries: ['hug'],
    endpoints: ["otaku", "rndm"],
    titles: ['Got You! ✊', 'Grab! 🤲', 'Come Here! 💪', 'Gotcha! 🫴']
  },

  // Personality reactions (anime dere types)
  tsundere: {
    queries: ['pout', 'blush'],
    endpoints: ["otaku"],
    titles: ['I-It\'s Not Like I Like You! 😤', 'B-Baka! >///<', 'Tsundere Mode! 💢', 'Hmph! Don\'t Get the Wrong Idea! 😾']
  },
  deredere: {
    queries: ['love', 'happy'],
    endpoints: ["otaku"],
    titles: ['So Much Love! 💕💕💕', 'Lovey Dovey! 😍', 'Adorable! ✨', 'Pure Sweetness! 🍬']
  },
  yandere: {
    queries: ['stare', 'love'],
    endpoints: ["otaku"],
    titles: ['Mine Forever! 😈💕', 'Nobody Else! 🔪', 'Obsessed! 👁️👁️', 'You\'re Not Going Anywhere! ⛓️']
  },
  kuudere: {
    queries: ['stare', 'cool'],
    endpoints: ["otaku"],
    titles: ['Cool & Collected... 😐', 'Emotionless Stare... 😑', 'Whatever... 😶', 'Not Interested... 🧊']
  },
  dandere: {
    queries: ['shy', 'blush'],
    endpoints: ["otaku"],
    titles: ['S-So Shy... 🙈', 'Too Nervous! 😰', '*hides* 👉👈', 'Quiet Mode... 😶']
  },

  // More fun actions
  run: {
    queries: ['run'],
    endpoints: ["otaku", "rndm"],
    titles: ['Running Away! 🏃', 'Gotta Go Fast! 💨', 'Escape! 🏃‍♀️', 'Nope! *runs* 🚶💨']
  },
  chase: {
    queries: ['run'],
    endpoints: ["otaku", "rndm"],
    titles: ['Get Back Here! 🏃‍♂️💨', 'Chasing You! 🏃', 'Can\'t Escape! 👟', 'Pursuit! 🎯']
  },
  feed: {
    queries: ['nom'],
    endpoints: ["otaku", "rndm"],
    titles: ['Say Ahh! 😋', 'Feeding Time! 🍽️', 'Open Wide! 👄', 'Nom Time! 🥄']
  },
  piggyback: {
    queries: ['hug'],
    endpoints: ["otaku", "rndm"],
    titles: ['Piggyback Ride! 🐷', 'Hop On! 🎠', 'Carrying You! 💪', 'Up We Go! ⬆️']
  },
  nosebleed: {
    queries: ['nosebleed'],
    endpoints: ["otaku"],
    titles: ['NOSEBLEED! 🩸', 'Too Hot! 😳💦', 'Can\'t Handle It! 😵', 'Blood Fountain! ⛲']
  },
  faint: {
    queries: ['tired', 'sleep'],
    endpoints: ["otaku"],
    titles: ['*faints* 😵', 'Passed Out! 💫', 'Too Much! 🌀', 'Gone! ✨']
  },
  nod: {
    queries: ['yes'],
    endpoints: ["otaku"],
    titles: ['*nods* 🙂', 'Yep! 👍', 'Agreed! ✅', 'Understood! 📝']
  },
  peek: {
    queries: ['peek'],
    endpoints: ["otaku"],
    titles: ['*peeks* 👀', 'Peekaboo! 🙈', 'Sneaky Look! 🕵️', 'What\'s This? 🔍']
  },
  spin: {
    queries: ['roll', 'dance'],
    endpoints: ["otaku"],
    titles: ['Spinning! 🌀', 'Round and Round! 🔄', 'Wheee! 🎡', 'Tornado Mode! 🌪️']
  },
  trip: {
    queries: ['surprised', 'woah'],
    endpoints: ["otaku"],
    titles: ['*trips* 😵', 'Whoops! 💫', 'Falling! 🤕', 'Clumsy! 😅']
  },
  headbutt: {
    queries: ['smack', 'punch'],
    endpoints: ["otaku"],
    titles: ['BONK! Head Clash! 💥', 'Headbutt! 🗿', 'Skull Bash! 💀', 'Ouch! 🤕']
  },
  lurk: {
    queries: ['peek', 'stare'],
    endpoints: ["otaku"],
    titles: ['Lurking... 👁️', 'In the Shadows... 🌑', 'Watching... 🕵️', 'Stalker Mode! 🔍']
  },
  spray: {
    queries: ['smack'],
    endpoints: ["otaku"],
    titles: ['Spray Bottle! 💦', 'Bad! *spray spray* 🚿', 'Squirt! 💧', 'Cooling Off! 🌊']
  },
  flirt: {
    queries: ['wink', 'kiss'],
    endpoints: ["otaku"],
    titles: ['Smooth Talker! 😏💕', 'Flirty! 😘', 'Charming! ✨', 'Hey There~ 😉']
  },
  nuzzle: {
    queries: ['nuzzle'],
    endpoints: ["otaku"],
    titles: ['*nuzzles* 🥰', 'Snuggle Snuggle! 😊', 'Cute! 💕', 'Rubbing Noses! 👃']
  },
  bleh: {
    queries: ['bleh'],
    endpoints: ["otaku"],
    titles: ['bleh! 😛', 'Tongue Out! 👅', 'Derp! 🤪', 'Silly Face! 😜']
  },
  carry: {
    queries: ['hug'],
    endpoints: ["otaku", "rndm"],
    titles: ['Princess Carry! 👸', 'In My Arms! 💪', 'Carrying You! 🤵', 'Bridal Style! 💑']
  },

  // Additional API reactions
  airkiss: {
    queries: ['airkiss', 'kiss'],
    endpoints: ["otaku"],
    titles: ['Sending Air Kisses! 💋', 'Smooch from Afar! 😘', 'Blown Kisses! 💕']
  },
  angrystare: {
    queries: ['angrystare', 'stare', 'mad'],
    endpoints: ["otaku"],
    titles: ['Staring Angrily! 😠', 'The Death Stare! 👁️👁️', 'Angry Eyes! 💢']
  },
  brofist: {
    queries: ['brofist'],
    endpoints: ["otaku"],
    titles: ['Brofist! 🤜🤛', 'Pound It! 💪', 'Fist Bump! 👊', 'Epic Brofist! ✨']
  },
  cheers: {
    queries: ['cheers'],
    endpoints: ["otaku"],
    titles: ['Cheers! 🍻', 'To Good Times! 🥂', 'Bottoms Up! 🍺', 'Kanpai! 🍶']
  },
  clap: {
    queries: ['clap'],
    endpoints: ["otaku"],
    titles: ['Clapping! 👏', 'Round of Applause! 👏👏', 'Well Done! 🎉', 'Bravo! 👏✨']
  },
  cool: {
    queries: ['cool'],
    endpoints: ["otaku"],
    titles: ['So Cool! 😎', 'Cool Vibes! 🕶️', 'Too Smooth! 💯', 'Ice Cold! 🧊']
  },
  drool: {
    queries: ['drool'],
    endpoints: ["otaku"],
    titles: ['Drooling! 🤤', 'So Delicious! 😋', 'Can\'t Help It! 💦', 'Mouth Watering! 💧']
  },
  evillaugh: {
    queries: ['evillaugh'],
    endpoints: ["otaku"],
    titles: ['MUHAHA! 😈', 'Evil Laugh! 😏', 'Villainous! 👿', 'Sinister! 🦹']
  },
  handhold: {
    queries: ['handhold'],
    endpoints: ["otaku", "rndm"],
    titles: ['Hand Holding! 🤝', 'So Lewd! 😳', 'Holding Hands! 💕', 'Together! 👫']
  },
  headbang: {
    queries: ['headbang'],
    endpoints: ["otaku"],
    titles: ['Headbanging! 🤘', 'Rock On! 🎸', 'Metal Mode! 🎵', 'Headbang Time! 💥']
  },
  huh: {
    queries: ['huh'],
    endpoints: ["otaku"],
    titles: ['Huh? 🤔', 'What Was That? 🧐', 'Say Again? 👂', 'Confused! ❓']
  },
  no: {
    queries: ['no'],
    endpoints: ["otaku"],
    titles: ['Nope! 🙅', 'No Way! ❌', 'Denied! 🚫', 'Absolutely Not! 🙅‍♂️']
  },
  nyah: {
    queries: ['nyah'],
    endpoints: ["otaku"],
    titles: ['Nyah! 😜', 'Teasing! 😝', 'Mischievous! 😈', 'Gotcha! 😏']
  },
  pinch: {
    queries: ['pinch'],
    endpoints: ["otaku"],
    titles: ['*pinch* 🤏', 'Pinching Cheeks! 😊', 'Gotcha! ✋', 'Cheeky Pinch! 😏']
  },
  roll: {
    queries: ['roll'],
    endpoints: ["otaku"],
    titles: ['Rolling Around! 🌀', '*rolls* 🔄', 'Barrel Roll! ✨', 'Tumbling! 🤸']
  },
  sad: {
    queries: ['sad', 'cry'],
    endpoints: ["otaku"],
    titles: ['So Sad... 😢', 'Big Sad! 😞', 'Feeling Down... 💔', 'Sadness... 🥺']
  },
  scared: {
    queries: ['scared'],
    endpoints: ["otaku"],
    titles: ['Scared! 😱', 'So Frightened! 😨', 'Help! 😰', 'Terrified! 🫣']
  },
  shout: {
    queries: ['shout'],
    endpoints: ["otaku"],
    titles: ['AAAHHH! 📢', 'Shouting! 😤', 'Yelling! 🗣️', 'Loud Noises! 📣']
  },
  shy: {
    queries: ['shy'],
    endpoints: ["otaku"],
    titles: ['So Shy... 🙈', 'Feeling Bashful! 😳', '*hides* 👉👈', 'Too Embarrassed! 😶']
  },
  sigh: {
    queries: ['sigh'],
    endpoints: ["otaku"],
    titles: ['*sigh* 😮‍💨', 'Tired Sigh... 😔', 'Deep Breath... 💨', 'Exhale... 😌']
  },
  sing: {
    queries: ['sing'],
    endpoints: ["otaku"],
    titles: ['Singing! 🎤', 'La La La! 🎵', 'Music Time! 🎶', 'Vocal Performance! 🎼']
  },
  sip: {
    queries: ['sip'],
    endpoints: ["otaku"],
    titles: ['*sip* ☕', 'Tea Time! 🍵', 'Sipping! 🥤', 'Refreshing! 🧃']
  },
  slowclap: {
    queries: ['slowclap'],
    endpoints: ["otaku"],
    titles: ['Slow Clap... 👏', 'Sarcastic Applause... 😒', '*claps slowly*', 'Very Impressive... 🙄']
  },
  smack: {
    queries: ['smack'],
    endpoints: ["otaku"],
    titles: ['*SMACK!* 💥', 'Bonk! 🔨', 'Whack! 💢', 'Hit! 👋']
  },
  sneeze: {
    queries: ['sneeze'],
    endpoints: ["otaku"],
    titles: ['Achoo! 🤧', 'Sneezing! 🤧', 'Bless You! 😷', '*sneeze* 💨']
  },
  sorry: {
    queries: ['sorry'],
    endpoints: ["otaku"],
    titles: ['So Sorry! 😔', 'My Apologies! 🙏', 'Forgive Me! 😢', 'Sorry! 😞']
  },
  stop: {
    queries: ['stop'],
    endpoints: ["otaku"],
    titles: ['Stop! ✋', 'Halt! 🛑', 'No More! 🚫', 'Cease! 🙅']
  },
  surprised: {
    queries: ['surprised'],
    endpoints: ["otaku"],
    titles: ['WHAT?! 😱', 'So Shocked! 😲', 'Surprise! 😮', 'Didn\'t Expect That! 😳']
  },
  sweat: {
    queries: ['sweat'],
    endpoints: ["otaku"],
    titles: ['Sweating! 😅', 'Nervous Sweat! 💦', 'Breaking a Sweat! 😓', 'So Hot! 🥵']
  },
  woah: {
    queries: ['woah'],
    endpoints: ["otaku"],
    titles: ['Woah! 😮', 'Whoa There! 🤯', 'Amazing! 😲', 'Mind Blown! 💥']
  },
  yay: {
    queries: ['yay'],
    endpoints: ["otaku"],
    titles: ['Yay! 🎉', 'Woohoo! 😄', 'Excited! 🥳', 'Celebration! 🎊']
  },
  yes: {
    queries: ['yes'],
    endpoints: ["otaku"],
    titles: ['Yes! ✅', 'Affirmative! 👍', 'Absolutely! 💯', 'You Bet! ☑️']
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
          reactions: ['hug', 'kiss', 'airkiss', 'pat', 'headpat', 'pats', 'cuddle', 'snuggle', 'nuzzle', 'love', 'hold', 'handhold', 'handholding', 'carry']
        },
        '😊 Positive Vibes': {
          subtitle: 'Spread positivity and encouragement',
          reactions: ['highfive', 'brofist', 'wave', 'greet', 'smile', 'blush', 'happy', 'wink', 'thumbsup', 'thumbs', 'salute', 'nod', 'yes', 'yay', 'cheers', 'clap', 'slowclap']
        },
        '🎉 Fun & Playful': {
          subtitle: 'Have fun and mess around',
          reactions: ['dance', 'celebrate', 'laugh', 'excited', 'spin', 'wag', 'poke', 'boop', 'lick', 'bleh', 'tickle', 'bonk', 'nom', 'feed', 'bread', 'chocolate', 'cookie', 'drunk', 'teehee', 'grin', 'flirt', 'nyah', 'pinch', 'headbang', 'sing', 'sip', 'drool']
        },
        '😠 Aggressive': {
          subtitle: 'Express your anger (playfully!)',
          reactions: ['slap', 'punch', 'kick', 'push', 'throw', 'tackle', 'grab', 'headbutt', 'stab', 'bite', 'kill', 'spank', 'spit', 'steal', 'angry', 'angrystare', 'rage', 'triggered', 'bully', 'smack']
        },
        '💦 Physical Actions': {
          subtitle: 'Get physical with these moves',
          reactions: ['splash', 'spray', 'run', 'chase', 'piggyback', 'trip', 'faint', 'roll']
        },
        '😴 Sleepy Time': {
          subtitle: 'When you\'re feeling tired',
          reactions: ['sleep', 'sleepy', 'yawn', 'sigh']
        },
        '😢 Emotional': {
          subtitle: 'Express your feelings',
          reactions: ['cry', 'sad', 'lonely', 'pout', 'nervous', 'sweat', 'scared', 'sorry', 'shy']
        },
        '🤔 Thoughtful': {
          subtitle: 'When you need to think or react',
          reactions: ['think', 'thonking', 'confused', 'huh', 'shrug', 'facepalm', 'scoff', 'bored']
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
          reactions: ['lewd', 'nosebleed', 'shocked', 'surprised', 'woah', 'smug', 'smirk', 'cool']
        },
        '🗣️ Communication': {
          subtitle: 'Express yourself verbally',
          reactions: ['shout', 'sneeze', 'stop', 'no', 'evillaugh']
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

    const reactionData = reactions[action];
    const randomQuery = reactionData.queries[Math.floor(Math.random() * reactionData.queries.length)];
    const randomTitle = reactionData.titles[Math.floor(Math.random() * reactionData.titles.length)];

    // Get endpoints (default to otaku if not specified for backwards compatibility)
    const endpoints = reactionData.endpoints || ['otaku'];

    try {
      let gifUrl = null;
      let usedEndpoint = null;

      // Try each endpoint until we get a result
      for (const endpoint of endpoints) {
        logger.info(`React command: Trying endpoint ${endpoint} for action ${action}`);

        try {
          let response;

          if (endpoint === 'otaku') {
            logger.info(`React command: Fetching from OtakuGifs for action ${action} with query ${randomQuery}`);
            response = await fetch(
              `https://api.otakugifs.xyz/gif?reaction=${randomQuery}&format=gif`
            );
          } else if (endpoint === 'rndm') {
            logger.info(`React command: Fetching from RndmServ for action ${action} with query ${randomQuery}`);
            response = await fetch(
              `https://gifs.rndmserv.de/api/api/endpoint/${randomQuery}`
            );
          }

          if (response.status === 200) {
            logger.info(`React command: Fetched from ${endpoint} for action ${action}`);
            const data = await response.json();
            logger.info(`React command: ${endpoint} API response: ${JSON.stringify(data)}`);
            // console.log('React command API response:', data);
            if (endpoint === 'otaku' && data && data.url) {
              logger.info(`React command: Received data from OtakuGifs: ${JSON.stringify(data)}`);
              gifUrl = data.url;
              usedEndpoint = 'OtakuGifs';
              break;
            } else if (endpoint === 'rndm' && data && data.url) {
              logger.info(`React command: Received data from RndmServ: ${JSON.stringify(data)}`);
              gifUrl = data.url;
              usedEndpoint = 'RndmServ';
              break;
            }
          }
        } catch (err) {
          // Try next endpoint
          continue;
        }
      }

      if (!gifUrl) {
        return message.reply(`❌ No reaction GIF found. Try again!`);
      }

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
          text: `Powered by ${usedEndpoint} • Requested by ${message.author.tag}`,
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
