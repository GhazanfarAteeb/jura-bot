import { EmbedBuilder } from 'discord.js';

const reactions = {
  // Positive reactions
  hug: {
    queries: ['anime hug gif', 'anime hugging someone', 'wholesome anime hug'],
    titles: ['Warm Hugs Incoming! 🤗', 'Hug Attack! 💕', 'Spreading the Love! ❤️', 'Cuddle Mode: Activated! 🫂', 'Virtual Hugs! 🥰', 'Bear Hug Time! 🐻', 'Group Hug Energy! 👥', 'Sending Warm Vibes! ✨']
  },
  kiss: {
    queries: ['anime kiss gif', 'anime kissing', 'romantic anime kiss'],
    titles: ['Smooch Alert! 💋', 'Kiss Kiss! 😘', 'Love is in the Air! 💕', 'Mwah! 😚', 'Kissing Spree! 💏', 'Sweet Kiss! 😗', 'Blown Kisses! 😙', 'Romantic Moment! 💖']
  },
  pat: {
    queries: ['anime head pat gif', 'anime pat head', 'anime patting head'],
    titles: ['Good Job! *pat pat* 👋', 'Head Pats for Days! 😊', 'You Deserve This! *pat*', 'Pat Pat Time! 🥰', 'Gentle Pats! 🌸', 'Encouraging Pats! ⭐', '*pats gently* 💫', 'Proud of You! *pats* 🎊']
  },
  cuddle: {
    queries: ['anime cuddle gif', 'anime cuddling', 'anime snuggle'],
    titles: ['Cuddle Puddle Time! 🥺', 'Maximum Comfy Mode! 💗', 'Snuggle Party! 🤗', 'Warm & Fuzzy! 💝', 'Cozy Cuddles! 🛋️', 'Comfort Zone Activated! 🌟', 'Snug Life! 😌', 'Ultimate Cuddle Session! 💞']
  },
  highfive: {
    queries: ['anime high five gif', 'anime high five', 'anime hand slap'],
    titles: ['Up Top! ✋', 'High Five Energy! 🙌', 'Slap Hands! 👏', 'Yeah! *high five*', 'Epic High Five! 🌟', 'Hand Slap Success! ✨', 'Celebration High Five! 🎉', 'Perfect Sync! 👌']
  },
  wave: {
    queries: ['anime wave gif', 'anime waving hello', 'anime hello wave'],
    titles: ['Hellooo! 👋', 'Wave Squad! 🌊', '*waves enthusiastically*', 'Greetings! 😄', 'Friendly Wave! 🙋', 'Hey There! 👋✨', 'Big Wave Energy! 🌊', 'Waving Back! 😊']
  },
  smile: {
    queries: ['anime smile gif', 'anime happy smile', 'anime smiling'],
    titles: ['Smile Time! 😊', 'Happiness Overload! 😁', 'Grinning! ☺️', 'Wholesome Vibes! 😌', 'Beaming with Joy! ✨', 'Radiant Smile! 🌟', 'Smiling Ear to Ear! 😄', 'Pure Happiness! 💛']
  },
  blush: {
    queries: ['anime blush gif', 'anime blushing', 'anime shy blush'],
    titles: ['So Flustered! 😳', 'Blushing Hard! >///<', 'Aww Shucks! 😊', 'Getting All Red! 😚', 'Shy Mode Activated! 🙈', 'Blushing Intensifies! 💗', 'Face Red Alert! 🔴', 'Embarrassed Cuteness! 💝']
  },
  love: {
    queries: ['anime love gif', 'anime heart eyes', 'anime love struck'],
    titles: ['Love Struck! 😍', 'Heart Eyes! 💖', 'Falling Hard! 💘', 'Cupid Strikes! 💝', 'Love Overload! 💕', 'Smitten! 😻', 'Hearts Everywhere! 💗💗', 'Love at First Sight! ✨']
  },
  headpat: {
    queries: ['anime headpat gif', 'anime head pat', 'anime patting head'],
    titles: ['*pat pat pat* 🥰', 'You\'re Doing Great! 👍', 'Good Human! *pats*', 'Headpat Combo! ✨', 'Infinite Headpats! 🌟', 'Supreme Headpat! 👑', 'Legendary Pats! ⚡', 'Headpat Heaven! ☁️']
  },

  // Fun reactions
  dance: {
    queries: ['anime dance gif', 'anime dancing', 'anime dance party'],
    titles: ['Dance Party! 💃', 'Busting Moves! 🕺', 'Groove Time! 🎵', 'Dance Like Nobody\'s Watching! 🎶', 'Dancing Queen! 👑', 'Rhythm Master! 🎼', 'Dance Floor Domination! ⚡', 'Let\'s Boogie! 🪩']
  },
  celebrate: {
    queries: ['anime celebrate gif', 'anime party celebration', 'anime celebrating'],
    titles: ['Party Time! 🎉', 'Let\'s Celebrate! 🥳', 'Woohoo! 🎊', 'Victory Dance! 🎈', 'Celebration Mode! 🎆', 'Time to Party! 🥂', 'Winner Winner! 🏆', 'Festive Vibes! 🎪']
  },
  laugh: {
    queries: ['anime laugh gif', 'anime laughing', 'anime laughter'],
    titles: ['HAHAHA! 😂', 'Can\'t Stop Laughing! 🤣', 'Too Funny! 😆', 'LOL Moment! 😹', 'Dying of Laughter! 💀', 'Cracking Up! 🤪', 'Giggle Fest! 😄', 'Comedy Gold! 🥇']
  },
  cry: {
    queries: ['anime cry gif', 'anime crying', 'anime tears'],
    titles: ['The Tears! 😭', 'Waterworks! 💧', 'Big Sad Energy... 😢', 'Need Tissues! 🥺', 'Crying Rivers! 🌊', 'Emotional Breakdown! 💔', 'Tear Fountain! ⛲', 'Sad Hours... 😿']
  },
  poke: {
    queries: ['anime poke gif', 'anime poking someone', 'anime poke face'],
    titles: ['Poke! *boop* 👉', 'Poke Poke! 🫵', 'Gotcha! *pokes*', 'Boop the Snoot! 👆', 'Poke War! ☝️', 'Annoying Pokes! 😝', 'Poke Combo! 👇', 'Surprise Poke! ✨']
  },
  bonk: {
    queries: ['anime bonk gif', 'bonk horny jail', 'anime bonk head'],
    titles: ['BONK! 🔨', 'Go to Horny Jail! 😤', '*bonks* No! 🚫', 'Bonk Attack! 💥', 'Critical Bonk! ⚠️', 'Bonk Incoming! 🪃', 'Mega Bonk! 🔨💢', 'Bonked to Oblivion! 💫']
  },
  nom: {
    queries: ['anime nom gif', 'anime eating', 'anime nom nom'],
    titles: ['Nom Nom Nom! 😋', 'Munch Time! 🍔', 'Tasty! 🤤', 'Food Coma Incoming! 🍕', 'Delicious! 🍰', 'Eating Everything! 🍱', 'Foodie Mode! 🍜', 'Can\'t Stop Eating! 🌮']
  },
  wink: {
    queries: ['anime wink gif', 'anime winking', 'anime cute wink'],
    titles: ['*wink wink* 😉', 'Smooth! 😎', 'Wink Attack! ✨', 'You Know It! 😏', 'Sly Wink! 🦊', 'Charming Wink! 💫', 'Sneaky Wink! 👀', 'Flirty Wink! 😘']
  },
  thumbsup: {
    queries: ['anime thumbs up gif', 'anime approval', 'anime good job'],
    titles: ['Nicely Done! 👍', 'Approved! ✅', 'You Got This! 💪', 'Great Work! 🌟', 'Excellent! 🎯', 'Perfect Score! 💯', 'Amazing Job! 🏅', 'You\'re the Best! 👏']
  },
  salute: {
    queries: ['anime salute gif', 'anime military salute', 'anime saluting'],
    titles: ['Yes Sir! o7', 'Salute! 🫡', 'Respect! 🎖️', 'Roger That! 🪖', 'At Your Service! 🎗️', 'Honored! 🪬', 'Reporting for Duty! ⚔️', 'Soldier On! 🛡️']
  },

  // Negative reactions
  slap: {
    queries: ['anime slap gif', 'anime slapping face', 'anime face slap'],
    titles: ['*SLAP!* 😠', 'Ouch! That Hurts! 🤚', 'Take That! 💢', 'Slap Delivered! ✋', 'Face Slap! 👋💥', 'Reality Check! 😤', 'Slap of Justice! ⚖️', 'Wake Up Call! 🔔']
  },
  punch: {
    queries: ['anime punch gif', 'anime punching', 'anime fight punch'],
    titles: ['POW! Right in the Kisser! 👊', 'Falcon PUNCH! 💥', 'Taste My Fist! 🥊', 'K.O.! 💪', 'One Punch! 🔥', 'Critical Hit! 💫', 'Knockout Blow! ⚡', 'Fist of Fury! 👊💢']
  },
  kick: {
    queries: ['anime kick gif', 'anime kicking', 'anime kick attack'],
    titles: ['YEET! 🦵', 'Kicked to the Curb! 👢', 'Sparta Kick! ⚔️', 'Boot to the Head! 🥾', 'Flying Kick! 🦅', 'Roundhouse! 🌪️', 'Kick Attack! 💥', 'Sent Flying! 🚀']
  },
  angry: {
    queries: ['anime angry gif', 'anime mad face', 'anime anger'],
    titles: ['Big Mad! 😡', 'Rage Mode! 💢', 'Not Happy! 😤', 'Fuming! 🔥']
  },
  rage: {
    queries: ['anime rage gif', 'anime furious', 'anime extreme anger'],
    titles: ['MAXIMUM RAGE! 🤬', 'Seeing Red! 💥', 'AAAARGH! 😡', 'Anger Levels: MAX! 🌋']
  },
  stab: {
    queries: ['anime yandere knife gif', 'anime knife stab', 'yandere anime'],
    titles: ['Stabby Stabby! 🔪', 'Yandere Mode! 😈', 'Dangerous! ⚠️', 'Knife-kun Says Hi! 🗡️']
  },
  bite: {
    queries: ['anime bite gif', 'anime biting', 'anime vampire bite'],
    titles: ['Chomp! 😬', 'Bite Attack! 🦷', 'Nom... Wait, OW! 😤', 'Vampire Mode! 🧛']
  },

  // Misc
  think: {
    queries: ['anime thinking gif', 'anime think hmm', 'anime pondering'],
    titles: ['Hmm... 🤔', 'Big Brain Time! 🧠', 'Thinking Hard! 💭', 'Processing... ⚙️']
  },
  shrug: {
    queries: ['anime shrug gif', 'anime shrugging', 'anime idk shrug'],
    titles: ['¯\\_(ツ)_/¯', 'I Dunno! 🤷', 'Not My Problem! 😐', 'Whatever! 🙄']
  },
  sleep: {
    queries: ['anime sleep gif', 'anime sleeping', 'anime asleep'],
    titles: ['Zzz... 😴', 'Nap Time! 💤', 'Gone to Dreamland! 🌙', 'Sleep Mode: ON ⏰']
  },
  yawn: {
    queries: ['anime yawn gif', 'anime yawning', 'anime tired yawn'],
    titles: ['*yawns* So Tired... 🥱', 'Need Coffee! ☕', 'Sleepy Vibes! 😪', 'Big Yawn Energy! 💤']
  },
  confused: {
    queries: ['anime confused gif', 'anime confusion', 'anime question marks'],
    titles: ['So Confused! 😵', 'What? 🤨', 'Brain.exe Stopped! ❓', 'Confused Screaming! 😖']
  },
  facepalm: {
    queries: ['anime facepalm gif', 'anime face palm', 'anime disappointed'],
    titles: ['*facepalm* 🤦', 'Seriously? 😑', 'I Can\'t Even... 🫠', 'Done with This! 😩']
  },
  nervous: {
    queries: ['anime nervous gif', 'anime sweating nervous', 'anime anxious'],
    titles: ['Nervous Sweating! 😅', 'Uh Oh... 😰', 'Anxious Vibes! 😬', 'Help! 😥']
  },
  excited: {
    queries: ['anime excited gif', 'anime excitement', 'anime happy bounce'],
    titles: ['SO EXCITED! 🤩', 'Hype! 🎉', 'Can\'t Contain It! ✨', 'Bouncing Off Walls! 🌟']
  },
  shocked: {
    queries: ['anime shocked gif', 'anime shock surprised', 'anime jaw drop'],
    titles: ['WHAT?! 😱', 'Mind Blown! 🤯', 'No Way! 😲', 'Jaw Drop! 😦']
  },
  smug: {
    queries: ['anime smug gif', 'anime smug face', 'anime smirk'],
    titles: ['Feeling Smug! 😏', 'I Told You So! 😎', 'Smugness Overload! 😼', 'Too Cool! 🕶️']
  },
  
  // More owo-style reactions
  lick: {
    queries: ['anime lick gif', 'anime licking', 'anime tongue lick'],
    titles: ['*lick* 👅', 'Sloppy Kiss! 😛', 'Blep! 👅', 'Taste Test! 😋']
  },
  boop: {
    queries: ['anime boop gif', 'anime nose boop', 'anime booping nose'],
    titles: ['Boop! *boops nose* 👉', 'Boop the Snoot! 👃', 'Beep Boop! 🤖', '*boops* Gotcha! 😊']
  },
  greet: {
    queries: ['anime greet gif', 'anime hello greeting', 'anime waving hello'],
    titles: ['Hey There! 👋', 'Greetings Friend! 🙋', 'What\'s Up! 😄', 'Hello Hello! 🌟']
  },
  handholding: {
    queries: ['anime hand holding gif', 'anime holding hands', 'anime handhold'],
    titles: ['Hand Holding! 🤝', 'So Lewd! 😳', 'Holding Hands! 💕', 'Together! 👫']
  },
  tickle: {
    queries: ['anime tickle gif', 'anime tickling someone', 'anime tickle fight'],
    titles: ['Tickle Attack! ✋😆', 'Tickle Tickle! 🤣', 'Can\'t Stop Laughing! 😂', 'Tickle Monster! 👹']
  },
  kill: {
    queries: ['omae wa mou shindeiru', 'anime you are already dead', 'anime kill gif'],
    titles: ['Omae Wa Mou... 😈', 'Nothing Personal Kid! 😎', 'Fatality! 💀', 'You\'re Already Dead! ☠️']
  },
  hold: {
    queries: ['anime hold gif', 'anime holding someone', 'anime embrace hold'],
    titles: ['Holding You! 🤗', 'Safe in My Arms! 💕', 'Got You! 🫂', 'Hold Tight! 💪']
  },
  pats: {
    queries: ['anime pat pat gif', 'anime multiple pats', 'anime patting'],
    titles: ['Pat Pat Pat! 👋👋👋', 'All the Pats! 🥰', 'Unlimited Pats! ✨', 'Pat Overload! 😊']
  },
  snuggle: {
    queries: ['anime snuggle gif', 'anime snuggling', 'anime cuddle close'],
    titles: ['Snuggle Time! 🥺', 'So Cozy! 🛋️', 'Snug as a Bug! 🐛', 'Maximum Snuggles! 💗']
  },
  bully: {
    queries: ['anime bully teasing', 'anime mean teasing gif', 'anime teasing bullying'],
    titles: ['Bully Mode! 😈', 'Get Rekt! 😏', 'Gottem! 😂', 'Too Easy! 🎯']
  },
  stare: {
    queries: ['anime stare gif', 'anime intense stare', 'anime staring eyes'],
    titles: ['Staring Intensely! 👁️👁️', '*stares*', 'The Stare Down! 😐', 'What You Looking At? 🤨']
  },
  pout: {
    queries: ['anime pout gif', 'anime pouting', 'anime angry pout'],
    titles: ['*pouts* 😤', 'Hmph! 💢', 'Not Fair! 😾', 'Pouting Face! 😠']
  },
  lewd: {
    queries: ['lewd anime gif', 'anime embarrassed flustered', 'anime scandalous'],
    titles: ['Too Lewd! 😳', 'How Scandalous! 😱', 'Inappropriate! >///<', 'NSFW Alert! 🔞']
  },
  triggered: {
    queries: ['triggered anime gif', 'anime triggered rage', 'anime angry triggered'],
    titles: ['TRIGGERED! 😡', 'Activating Rage! 💢', 'Mad Mad Mad! 🤬', 'Triggering Intensifies! 🌋']
  },
  smirk: {
    queries: ['anime smirk gif', 'anime smirking', 'anime sly smile'],
    titles: ['*smirks* 😏', 'Sly Fox! 🦊', 'Clever Girl! 😎', 'Up to Something! 😼']
  },
  happy: {
    queries: ['anime happy gif', 'anime joy', 'anime cheerful'],
    titles: ['So Happy! 😊', 'Pure Joy! ✨', 'Happiness! 🌈', 'Feeling Great! 🎉']
  },
  thumbs: {
    queries: ['anime thumbs up gif', 'anime double thumbs', 'anime approval'],
    titles: ['Thumbs Up! 👍👍', 'Double Approval! ✌️', 'You Rock! 🤘', 'Awesome! 🌟']
  },
  wag: {
    queries: ['anime tail wag gif', 'anime wagging tail', 'anime happy tail'],
    titles: ['*wags tail* 🐕', 'Happy Puppy! 🐶', 'Tail Wag! 🐾', 'So Excited! 🦴']
  },
  teehee: {
    queries: ['anime giggle gif', 'anime teehee', 'anime cute laugh'],
    titles: ['Teehee! 🤭', 'Giggling! ☺️', 'Hehe! 😊', 'Cute Laugh! 💕']
  },
  scoff: {
    queries: ['anime scoff gif', 'anime scoffing', 'anime dismissive'],
    titles: ['*scoffs* 🙄', 'As If! 💅', 'Whatever! 😒', 'Pfft! 😤']
  },
  grin: {
    queries: ['anime grin gif', 'anime grinning', 'anime wide smile'],
    titles: ['Big Grin! 😁', 'Grinning! 😄', 'Cheese! 📸', 'Smile Wide! 😃']
  },
  sleepy: {
    queries: ['anime sleepy gif', 'anime tired', 'anime yawning sleepy'],
    titles: ['So Sleepy... 😪', 'Tired Mode! 🥱', 'Need Sleep! 💤', 'Energy Low! 🔋']
  },
  thonking: {
    queries: ['anime thinking hard gif', 'anime pondering', 'anime hmm thinking'],
    titles: ['Thonking... 🤔', 'Hmmmm! 💭', 'Deep Thoughts! 🧐', 'Contemplating! 🤨']
  },
  triggered2: {
    queries: ['anime angry triggered gif', 'anime rage triggered', 'anime mad angry'],
    titles: ['REEEEE! 😡', 'Anger! 💥', 'Mad Lad! 🤬', 'Furious! 🌶️']
  },
  
  // Physical interactions
  push: {
    queries: ['anime push shove gif', 'anime pushing someone', 'anime shove push'],
    titles: ['*PUSH!* 😈', 'YEET! Out the Way! 🫸', 'Outta My Way! 💥', 'Down You Go! 😂']
  },
  splash: {
    queries: ['anime water splash gif', 'anime splash water', 'anime splashing'],
    titles: ['Splash Attack! 💦', 'Water Fight! 🌊', '*splashes water* 💧', 'Get Wet! 🏖️']
  },
  tackle: {
    queries: ['anime tackle hug gif', 'anime jumping tackle', 'anime tackle someone'],
    titles: ['Tackle Hug! 🤗', 'INCOMING! 💥', 'Flying Tackle! 🦅', 'Gotcha! 🤸']
  },
  throw: {
    queries: ['anime throw person', 'anime yeet throw', 'anime throwing someone'],
    titles: ['YEET! 🎯', 'Going Flying! ✈️', 'Toss Time! 🤾', 'Launching! 🚀']
  },
  grab: {
    queries: ['anime grab person', 'anime grabbing someone', 'anime catch grab'],
    titles: ['Got You! ✊', 'Grab! 🤲', 'Come Here! 💪', 'Gotcha! 🫴']
  },
  
  // Personality reactions (anime dere types)
  tsundere: {
    queries: ['tsundere anime gif', 'anime tsundere', 'anime baka tsundere'],
    titles: ['I-It\'s Not Like I Like You! 😤', 'B-Baka! >///<', 'Tsundere Mode! 💢', 'Hmph! Don\'t Get the Wrong Idea! 😾']
  },
  deredere: {
    queries: ['deredere anime gif', 'anime loving affectionate', 'anime deredere'],
    titles: ['So Much Love! 💕💕💕', 'Lovey Dovey! 😍', 'Adorable! ✨', 'Pure Sweetness! 🍬']
  },
  yandere: {
    queries: ['yandere anime gif', 'anime yandere', 'anime crazy love'],
    titles: ['Mine Forever! 😈💕', 'Nobody Else! 🔪', 'Obsessed! 👁️👁️', 'You\'re Not Going Anywhere! ⛓️']
  },
  kuudere: {
    queries: ['kuudere anime gif', 'anime emotionless cool', 'anime kuudere'],
    titles: ['Cool & Collected... 😐', 'Emotionless Stare... 😑', 'Whatever... 😶', 'Not Interested... 🧊']
  },
  dandere: {
    queries: ['anime shy gif', 'anime dandere shy', 'anime timid nervous'],
    titles: ['S-So Shy... 🙈', 'Too Nervous! 😰', '*hides* 👉👈', 'Quiet Mode... 😶']
  },
  
  // More fun actions
  run: {
    queries: ['anime running gif', 'anime run away', 'anime running fast'],
    titles: ['Running Away! 🏃', 'Gotta Go Fast! 💨', 'Escape! 🏃‍♀️', 'Nope! *runs* 🚶💨']
  },
  chase: {
    queries: ['anime chase gif', 'anime chasing', 'anime running after'],
    titles: ['Get Back Here! 🏃‍♂️💨', 'Chasing You! 🏃', 'Can\'t Escape! 👟', 'Pursuit! 🎯']
  },
  feed: {
    queries: ['anime feed gif', 'anime feeding', 'anime feed mouth'],
    titles: ['Say Ahh! 😋', 'Feeding Time! 🍽️', 'Open Wide! 👄', 'Nom Time! 🥄']
  },
  piggyback: {
    queries: ['anime piggyback gif', 'anime piggyback ride', 'anime carry back'],
    titles: ['Piggyback Ride! 🐷', 'Hop On! 🎠', 'Carrying You! 💪', 'Up We Go! ⬆️']
  },
  nosebleed: {
    queries: ['anime nosebleed gif', 'anime nosebleed perverted', 'anime blood nose'],
    titles: ['NOSEBLEED! 🩸', 'Too Hot! 😳💦', 'Can\'t Handle It! 😵', 'Blood Fountain! ⛲']
  },
  faint: {
    queries: ['anime faint gif', 'anime fainting', 'anime passed out'],
    titles: ['*faints* 😵', 'Passed Out! 💫', 'Too Much! 🌀', 'Gone! ✨']
  },
  nod: {
    queries: ['anime nod gif', 'anime nodding', 'anime yes nod'],
    titles: ['*nods* 🙂', 'Yep! 👍', 'Agreed! ✅', 'Understood! 📝']
  },
  peek: {
    queries: ['anime peek gif', 'anime peeking', 'anime sneaky peek'],
    titles: ['*peeks* 👀', 'Peekaboo! 🙈', 'Sneaky Look! 🕵️', 'What\'s This? 🔍']
  },
  spin: {
    queries: ['anime spin gif', 'anime spinning', 'anime twirl spin'],
    titles: ['Spinning! 🌀', 'Round and Round! 🔄', 'Wheee! 🎡', 'Tornado Mode! 🌪️']
  },
  trip: {
    queries: ['anime trip gif', 'anime tripping', 'anime fall trip'],
    titles: ['*trips* 😵', 'Whoops! 💫', 'Falling! 🤕', 'Clumsy! 😅']
  },
  headbutt: {
    queries: ['anime headbutt gif', 'anime head clash', 'anime headbutt bash'],
    titles: ['BONK! Head Clash! 💥', 'Headbutt! 🗿', 'Skull Bash! 💀', 'Ouch! 🤕']
  },
  lurk: {
    queries: ['anime lurk gif', 'anime lurking hiding', 'anime stalker'],
    titles: ['Lurking... 👁️', 'In the Shadows... 🌑', 'Watching... 🕵️', 'Stalker Mode! 🔍']
  },
  spray: {
    queries: ['anime spray water gif', 'anime water spray bottle', 'anime squirt water'],
    titles: ['Spray Bottle! 💦', 'Bad! *spray spray* 🚿', 'Squirt! 💧', 'Cooling Off! 🌊']
  },
  flirt: {
    queries: ['anime flirt gif', 'anime flirting', 'anime charming'],
    titles: ['Smooth Talker! 😏💕', 'Flirty! 😘', 'Charming! ✨', 'Hey There~ 😉']
  },
  nuzzle: {
    queries: ['anime nuzzle gif', 'anime nuzzling', 'anime nose nuzzle'],
    titles: ['*nuzzles* 🥰', 'Snuggle Snuggle! 😊', 'Cute! 💕', 'Rubbing Noses! 👃']
  },
  blep: {
    queries: ['anime blep gif', 'anime tongue out', 'anime tongue stick'],
    titles: ['Blep! 😛', 'Tongue Out! 👅', 'Derp! 🤪', 'Silly Face! 😜']
  },
  carry: {
    queries: ['anime carry gif', 'anime princess carry', 'anime bridal carry'],
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
