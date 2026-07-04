import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// ─────────────────────────────────────────────────────────
// TECHNICAL ANALYSIS MODULE
// ─────────────────────────────────────────────────────────
const MODULE = {
  title: 'Technical Analysis & Chart Patterns',
  emoji: '🕯️',
  description: 'Learn to read crypto price charts like a trader — candlestick anatomy, bullish and bearish patterns, support and resistance, reversal and continuation patterns, and the key indicators every chart reader uses.',
  order_index: 13,
};

const LESSONS = [

  // ═══════════════════════════════════════════════════════
  // 1. READING CANDLESTICK CHARTS
  // ═══════════════════════════════════════════════════════
  {
    title: 'Reading Candlestick Charts',
    emoji: '🕯️',
    description: 'Every crypto chart is built from candlesticks. Learn what each candle tells you about price action — open, high, low, close — and how to read bullish vs. bearish candles at a glance.',
    order_index: 1,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🕯️ What Is a Candlestick?' } },
      { block_type: 'text', content: { text: 'A **candlestick** is a visual summary of price action over a specific time period — 1 minute, 1 hour, 1 day, etc. Each candle packs four data points into one shape:\n\n- **Open** — the price when the period started\n- **High** — the highest price reached during the period\n- **Low** — the lowest price reached during the period\n- **Close** — the price when the period ended\n\nThis is called **OHLC data** (Open, High, Low, Close).' } },

      { block_type: 'heading', content: { text: '📐 Anatomy of a Candlestick' } },
      { block_type: 'text', content: { text: '```\n     │      ← HIGH (upper wick / shadow)\n     │\n  ┌─────┐\n  │     │  ← BODY (between open and close)\n  │     │\n  └─────┘\n     │\n     │      ← LOW (lower wick / shadow)\n```\n\n**The BODY** (the thick rectangle) shows the range between open and close.\n\n**The WICKS** (thin lines above and below) show the high and low extremes reached during the period — price tried to go there but pulled back.\n\n**Body color tells you direction:**\n\n```\n  BULLISH CANDLE          BEARISH CANDLE\n  (Close > Open)          (Close < Open)\n\n       │                       │\n  ┌─────┐  ← CLOSE        ┌─────┐  ← OPEN\n  │ ▓▓▓ │                 │░░░░░│\n  │ ▓▓▓ │  Green/White    │░░░░░│  Red/Black\n  └─────┘  ← OPEN         └─────┘  ← CLOSE\n       │                       │\n```\n\n- **Green / White candle** = price went UP during this period (bullish)\n- **Red / Black candle** = price went DOWN during this period (bearish)' } },

      { block_type: 'heading', content: { text: '⏱️ Time Frames Matter' } },
      { block_type: 'text', content: { text: 'Each candle represents one complete time period. Traders use different time frames depending on their strategy:\n\n| Time Frame | Each Candle = | Used By |\n|---|---|---|\n| 1m, 5m | 1 or 5 minutes | Scalpers (very short trades) |\n| 15m, 1h | 15 min or 1 hour | Day traders |\n| 4h | 4 hours | Swing traders |\n| 1D | 1 day | Position traders |\n| 1W | 1 week | Long-term investors |\n\n**Key insight:** A 1-hour chart shows 24 candles per day. A daily chart shows one candle per day. The higher the time frame, the less "noise" and the more significant each candle becomes.\n\n**Zooming out always reveals the bigger picture.** A scary red candle on a 5-minute chart might be barely noticeable on the daily chart.' } },

      { block_type: 'heading', content: { text: '📊 Reading Candle Size & Wicks' } },
      { block_type: 'text', content: { text: '**Large body = strong conviction** — buyers or sellers were in full control during this period.\n\n**Small body = indecision** — neither buyers nor sellers won decisively.\n\n**Long upper wick** = price tried to go higher but sellers pushed it back down — bearish signal.\n\n**Long lower wick** = price tried to go lower but buyers stepped in and pushed it back up — bullish signal.\n\n```\n  Long upper wick:          Long lower wick:\n  (bearish pressure)        (bullish pressure)\n\n      │ │                      ┌───┐\n      │ │ ← rejected           │   │\n  ┌───┤ │                      │   │\n  │   │ │                      └───┘\n  └───┘                          │\n                                 │\n                                 │ ← rejected\n```\n\n**Rule of thumb:** Where the wick points is where price tried to go but FAILED. That failure tells you something about where price is likely NOT to go next.' } },

      { block_type: 'image', content: { url: '/images/ta/ta-01-candlestick-anatomy.svg', title: 'Candlestick Anatomy', description: 'The high, low, open, close, body, and wicks of a single candle — plus how bullish and bearish candles compare.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=IGcq8FiIpOk', title: 'Candlestick Charts Complete Beginner\'s Guide', description: 'A clear visual walkthrough of how to read candlestick charts — open, high, low, close, bullish and bearish candles, and what wicks tell you about price action.' } },
      { block_type: 'article', content: { url: 'https://www.investopedia.com/terms/c/candlestick.asp', title: 'Candlestick — Investopedia', description: 'Investopedia\'s complete guide to reading candlestick charts — anatomy, colors, time frames, and basic interpretation.' } },
    ],
    questions: [
      { question_text: 'What does OHLC stand for in candlestick charting?', explanation: 'OHLC stands for Open, High, Low, Close — the four data points packed into every single candlestick. These represent where price started, its highest and lowest point, and where it ended during that time period.', options: [{ option_text: 'Open, High, Low, Close', is_correct: true }, { option_text: 'Overall Hourly Line Chart', is_correct: false }, { option_text: 'Order, Hold, Liquidate, Cancel', is_correct: false }, { option_text: 'Oscillation, Height, Length, Cycle', is_correct: false }] },
      { question_text: 'On a candlestick chart, what does a GREEN (or white) candle body indicate?', explanation: 'A green (or white) candle means the closing price was HIGHER than the opening price during that period — price moved up. It\'s a bullish candle.', options: [{ option_text: 'The price closed higher than it opened — a bullish move', is_correct: true }, { option_text: 'Trading volume was above average', is_correct: false }, { option_text: 'The price was stable with no movement', is_correct: false }, { option_text: 'The asset is classified as a "green" (eco-friendly) coin', is_correct: false }] },
      { question_text: 'What does a LONG UPPER WICK on a candlestick signal?', explanation: 'A long upper wick means price attempted to go significantly higher during that period but sellers pushed it back down before the close. It\'s a bearish signal — buyers tried but failed to hold the high.', options: [{ option_text: 'Price tried to go higher but sellers pushed it back down — bearish pressure', is_correct: true }, { option_text: 'Price will definitely continue rising next candle', is_correct: false }, { option_text: 'The coin reached an all-time high during the period', is_correct: false }, { option_text: 'There was very high trading volume at the top', is_correct: false }] },
      { question_text: 'A trader watching a 4-hour chart: what does each candle represent?', explanation: 'On a 4-hour chart, each candlestick represents exactly 4 hours of price action — the open, high, low, and close over that 4-hour window. There are 6 candles per day on a 4h chart.', options: [{ option_text: '4 hours of price action — open, high, low, close over that period', is_correct: true }, { option_text: '4 days of price action', is_correct: false }, { option_text: '4 trades executed in sequence', is_correct: false }, { option_text: '4 minutes of rapid price movement', is_correct: false }] },
      { question_text: 'What does a SMALL candlestick BODY (relative to its wicks) typically indicate?', explanation: 'A small body relative to its wicks means the price opened and closed close together — buyers and sellers were roughly equal. This shows indecision or a potential turning point in the trend.', options: [{ option_text: 'Indecision — neither buyers nor sellers won decisively', is_correct: true }, { option_text: 'Extremely low trading volume', is_correct: false }, { option_text: 'A guaranteed reversal coming next candle', is_correct: false }, { option_text: 'The exchange had technical problems during that period', is_correct: false }] },
      { question_text: 'Why do long-term investors typically prefer to analyze DAILY or WEEKLY charts over 1-minute charts?', explanation: 'Higher time frame charts have less "noise" — random short-term fluctuations that don\'t matter. Each candle on a weekly chart represents a full week of conviction, making patterns more significant and reliable.', options: [{ option_text: 'Higher time frames reduce noise — each candle represents more significant price conviction', is_correct: true }, { option_text: '1-minute charts are only available to professional traders', is_correct: false }, { option_text: 'Daily charts are easier to read because they have fewer candles per year', is_correct: false }, { option_text: 'Long-term investors aren\'t allowed to trade on lower time frames', is_correct: false }] },
      { question_text: 'On a candlestick, the WICKS represent what?', explanation: 'The wicks (also called shadows) show the extreme prices reached during the candle\'s period — the highest and lowest points. If there\'s a long lower wick, price went very low but buyers pushed it back up before the close.', options: [{ option_text: 'The extreme high and low prices reached during the period before price pulled back', is_correct: true }, { option_text: 'The average price over the entire period', is_correct: false }, { option_text: 'Gaps in trading where no transactions occurred', is_correct: false }, { option_text: 'The price targets set by analysts', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 2. BULLISH CANDLESTICK PATTERNS
  // ═══════════════════════════════════════════════════════
  {
    title: 'Bullish Candlestick Patterns',
    emoji: '🐂',
    description: 'Five high-probability bullish reversal signals — the Hammer, Bullish Engulfing, Morning Star, Three White Soldiers, and Piercing Line. Learn to spot them on a chart and understand what buyer behavior creates each pattern.',
    order_index: 2,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🔨 Pattern 1: The Hammer' } },
      { block_type: 'text', content: { text: '**The Hammer** forms at the bottom of a downtrend. It has a small body at the top and a long lower wick — at least 2x the body length.\n\n```\n  HAMMER\n\n  ┌───┐\n  │   │  ← Small body (green or red)\n  └───┘\n    │\n    │   ← Long lower wick (2× body minimum)\n    │\n    │\n```\n\n**What it means:** Price dropped sharply during the candle, but buyers stepped in hard and pushed it all the way back up. The sellers tried to take control but failed. Buyers are starting to win.\n\n**Confirmation required:** Wait for the NEXT candle to close green before acting. One candle alone is not a trade signal.\n\n**Inverted Hammer** — same concept but upside down (small body at bottom, long upper wick). Also bullish when appearing after a downtrend.' } },

      { block_type: 'heading', content: { text: '🤝 Pattern 2: Bullish Engulfing' } },
      { block_type: 'text', content: { text: '**Bullish Engulfing** is a TWO-candle pattern. A small red candle is completely "engulfed" by a larger green candle that opens lower and closes higher.\n\n```\n  BULLISH ENGULFING\n\n  Day 1:   Day 2:\n\n  ┌───┐    │\n  │░░░│  ┌─────┐\n  │░░░│  │ ▓▓▓ │  ← Green candle covers entire\n  └───┘  │ ▓▓▓ │    previous red candle body\n         └─────┘\n           │\n```\n\n**What it means:** After a downtrend, sellers pushed price down on Day 1. On Day 2, buyers came in SO strongly they not only reversed the loss but pushed price above where Day 1 opened. A powerful shift in momentum.\n\n**Strength:** The larger the engulfing candle relative to the previous one, the stronger the reversal signal.' } },

      { block_type: 'heading', content: { text: '⭐ Pattern 3: Morning Star' } },
      { block_type: 'text', content: { text: '**Morning Star** is a THREE-candle reversal pattern that appears at the bottom of a downtrend.\n\n```\n  MORNING STAR\n\n  Day 1:   Day 2:   Day 3:\n\n  ┌───┐             │\n  │░░░│    ┌─┐    ┌─────┐\n  │░░░│    │ │    │ ▓▓▓ │\n  │░░░│    └─┘    │ ▓▓▓ │\n  └───┘            └─────┘\n    │                │\n\n  (Red)   (Small)  (Large Green)\n         (Star/Doji)\n```\n\n- **Day 1:** Large red candle — sellers in control\n- **Day 2:** Small body (the "star") — neither side won, indecision at the bottom\n- **Day 3:** Large green candle that closes above Day 1\'s midpoint — buyers take over\n\n**The "star" day is the turning point.** The market ran out of selling momentum and buyers stepped in on Day 3 with conviction.' } },

      { block_type: 'heading', content: { text: '💪 Pattern 4: Three White Soldiers' } },
      { block_type: 'text', content: { text: '**Three White Soldiers** — three consecutive large green candles, each opening within the previous candle\'s body and closing higher.\n\n```\n  THREE WHITE SOLDIERS\n\n             ┌───┐\n          ┌──┤▓▓▓│\n       ┌──┤▓▓│▓▓▓│\n  ┌────┤▓▓│▓▓│▓▓▓│\n  │▓▓▓▓│▓▓│▓▓│▓▓▓│\n  └────┘▓▓│▓▓│▓▓▓│\n        └──┘▓▓│▓▓▓│\n            └──┘▓▓▓│\n                └───┘\n  Day 1   Day 2   Day 3\n```\n\n**What it means:** Three days of sustained buying pressure with no significant pullbacks. This is not a spike — it\'s a systematic takeover by buyers. One of the strongest bullish signals.\n\n**Watch out:** If the candles get progressively smaller on Day 3, it may signal the rally is running out of steam.' } },

      { block_type: 'image', content: { url: '/images/ta/ta-02-bullish-patterns.svg', title: 'Bullish Candlestick Patterns', description: 'Hammer, Bullish Engulfing, Morning Star, and Three White Soldiers side by side.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=zyqo7ylkJpM', title: 'Bullish Candlestick Patterns (That Work)', description: 'Visual walkthrough of the most reliable bullish reversal candlestick patterns — Hammer, Engulfing, Morning Star, and Three White Soldiers.' } },
      { block_type: 'article', content: { url: 'https://www.investopedia.com/articles/active-trading/092315/5-most-powerful-candlestick-patterns.asp', title: '5 Most Powerful Candlestick Patterns — Investopedia', description: 'Investopedia\'s breakdown of the highest-probability candlestick patterns for predicting price reversals.' } },
    ],
    questions: [
      { question_text: 'What is the key feature that defines a HAMMER candlestick?', explanation: 'A Hammer has a small body at the TOP of the candle with a long lower wick (at least 2x the body). It appears after a downtrend and signals buyers pushing back after sellers tried to drive price lower.', options: [{ option_text: 'Small body at the top with a long lower wick at least 2x the body length', is_correct: true }, { option_text: 'A large red body with no wicks — pure selling pressure', is_correct: false }, { option_text: 'Three consecutive green candles of increasing size', is_correct: false }, { option_text: 'Two candles where the second completely covers the first', is_correct: false }] },
      { question_text: 'In a Bullish Engulfing pattern, what must the second (green) candle do?', explanation: 'The second candle must completely "engulf" the body of the first (red) candle — opening below the first candle\'s close and closing above the first candle\'s open. This shows buyers completely overwhelmed sellers.', options: [{ option_text: 'Open below the first candle\'s close AND close above the first candle\'s open', is_correct: true }, { option_text: 'Close at exactly the same level as the first candle opened', is_correct: false }, { option_text: 'Be the same size as the first candle but green instead of red', is_correct: false }, { option_text: 'Have no wicks — pure body only', is_correct: false }] },
      { question_text: 'What does the MIDDLE candle (the "star") in a Morning Star pattern represent?', explanation: 'The star candle shows indecision — neither buyers nor sellers won that day. It forms at the very bottom of the downtrend, signaling that selling momentum has exhausted and a reversal may be starting.', options: [{ option_text: 'Indecision — selling momentum exhausted at the bottom, a turning point', is_correct: true }, { option_text: 'The strongest sell signal in the entire pattern', is_correct: false }, { option_text: 'A gap where no trading occurred', is_correct: false }, { option_text: 'The highest volume candle in the sequence', is_correct: false }] },
      { question_text: 'How many candles make up a Morning Star pattern?', explanation: 'The Morning Star is a three-candle pattern: Day 1 is a large red candle, Day 2 is a small body (the "star"), and Day 3 is a large green candle that closes above the midpoint of Day 1.', options: [{ option_text: 'Three candles', is_correct: true }, { option_text: 'One candle', is_correct: false }, { option_text: 'Two candles', is_correct: false }, { option_text: 'Five candles', is_correct: false }] },
      { question_text: 'Where do bullish candlestick reversal patterns carry the most significance?', explanation: 'Bullish reversal patterns are most meaningful when they appear at the BOTTOM of a downtrend — they signal that sellers have exhausted their momentum and buyers are taking control. The same pattern mid-uptrend carries much less meaning.', options: [{ option_text: 'At the bottom of a downtrend, where they signal a potential reversal', is_correct: true }, { option_text: 'At all-time highs, where volume is highest', is_correct: false }, { option_text: 'During sideways consolidation — they signal a breakout', is_correct: false }, { option_text: 'In the middle of an existing uptrend to confirm it continues', is_correct: false }] },
      { question_text: 'Why should you ALWAYS wait for confirmation before acting on a bullish candlestick pattern?', explanation: 'One candle alone — even a perfect Hammer — is not a trade. The NEXT candle closing green confirms that buyers followed through. Without confirmation, many bullish-looking candles fail and price continues lower.', options: [{ option_text: 'The next candle closing green confirms buyers followed through — one candle can still fail', is_correct: true }, { option_text: 'You must get a news report confirming the pattern before trading', is_correct: false }, { option_text: 'Candlestick patterns always need exactly 3 days to complete', is_correct: false }, { option_text: 'Confirmation means waiting for price to return to the pattern\'s high', is_correct: false }] },
      { question_text: 'What does Three White Soldiers signal about market momentum?', explanation: 'Three consecutive large green candles show three days of sustained buying — a systematic takeover by buyers. Unlike a single spike, this is methodical accumulation and is one of the strongest bullish signals in technical analysis.', options: [{ option_text: 'Three days of sustained buying pressure — one of the strongest bullish signals', is_correct: true }, { option_text: 'A warning that the market is overbought and will reverse', is_correct: false }, { option_text: 'Sellers are about to push price down sharply', is_correct: false }, { option_text: 'The market is about to enter a long sideways consolidation', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 3. BEARISH CANDLESTICK PATTERNS
  // ═══════════════════════════════════════════════════════
  {
    title: 'Bearish Candlestick Patterns',
    emoji: '🐻',
    description: 'Spot the warning signs before a price drop — the Shooting Star, Bearish Engulfing, Evening Star, Hanging Man, and Three Black Crows. These patterns signal that buyers are losing control.',
    order_index: 3,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🌠 Pattern 1: Shooting Star' } },
      { block_type: 'text', content: { text: '**The Shooting Star** is the bearish mirror image of the Hammer. It appears at the TOP of an uptrend with a small body at the bottom and a long upper wick.\n\n```\n  SHOOTING STAR\n\n    │\n    │   ← Long upper wick (2× body minimum)\n    │\n    │\n  ┌───┐\n  │   │  ← Small body (green or red)\n  └───┘\n```\n\n**What it means:** Price shot up sharply during the candle (the long wick), but sellers crushed it back down before the close. Buyers tried to push higher — they failed. Sellers are taking control.\n\n**Hanging Man** — identical shape to the Hammer (small body, long lower wick) but appears at the TOP of an uptrend — that makes it BEARISH. Context is everything.\n\n```\n  HAMMER              HANGING MAN\n  (after downtrend)   (after uptrend)\n\n  ┌───┐               ┌───┐\n  │   │ = BULLISH     │   │ = BEARISH\n  └───┘               └───┘\n    │                   │\n    │ long wick          │ long wick\n    │                   │\n```' } },

      { block_type: 'heading', content: { text: '⚫ Pattern 2: Bearish Engulfing' } },
      { block_type: 'text', content: { text: '**Bearish Engulfing** — a large red candle completely swallows the body of the previous green candle. Appears at the top of an uptrend.\n\n```\n  BEARISH ENGULFING\n\n  Day 1:    Day 2:\n\n    │\n  ┌─────┐      │\n  │ ▓▓▓ │   ┌───┐\n  │ ▓▓▓ │   │░░░│  ← Red candle engulfs entire\n  └─────┘   │░░░│    previous green body\n    │        │░░░│\n             └───┘\n               │\n```\n\n**What it means:** After an uptrend, buyers pushed price up on Day 1. On Day 2, sellers came in so hard they erased ALL of Day 1\'s gains plus more. A strong signal that the uptrend may be over.\n\n**The psychology:** If sellers can completely reverse the previous day\'s optimism in a single candle, something has fundamentally shifted.' } },

      { block_type: 'heading', content: { text: '🌆 Pattern 3: Evening Star' } },
      { block_type: 'text', content: { text: '**Evening Star** is the bearish opposite of the Morning Star. Three candles at the TOP of an uptrend.\n\n```\n  EVENING STAR\n\n  Day 1:   Day 2:   Day 3:\n\n    │                ┌───┐\n  ┌─────┐    ┌─┐    │░░░│\n  │ ▓▓▓ │    │ │    │░░░│\n  │ ▓▓▓ │    └─┘    │░░░│\n  └─────┘            └───┘\n    │                  │\n\n  (Green)  (Small)   (Large Red)\n           (Star/Doji)\n```\n\n- **Day 1:** Large green candle — buyers in full control\n- **Day 2:** Small body (the "star") near the top — buying momentum stalls\n- **Day 3:** Large red candle closing below Day 1\'s midpoint — sellers take over\n\n**"As goes the morning, so goes the evening" — but in reverse.** The Evening Star is one of the most reliable three-candle reversal patterns.' } },

      { block_type: 'heading', content: { text: '🪖 Pattern 4: Three Black Crows' } },
      { block_type: 'text', content: { text: '**Three Black Crows** — three consecutive large red candles, each opening within the previous candle\'s body and closing lower. The bearish mirror of Three White Soldiers.\n\n```\n  THREE BLACK CROWS\n\n  ┌────┐\n  │░░░░│\n  └────┘\n    │  ┌────┐\n       │░░░░│\n       └────┘\n         │  ┌────┐\n             │░░░░│\n             └────┘\n               │\n  Day 1   Day 2   Day 3\n```\n\n**What it means:** Three days of systematic selling with no real bounce. This is not panic — it\'s organized distribution. Sellers are in complete control.\n\n**Dark Cloud Cover** — a two-candle pattern where a large red candle opens above the previous green candle\'s close but closes below its midpoint — a bearish warning sign.' } },

      { block_type: 'heading', content: { text: '⚠️ Context Is Everything' } },
      { block_type: 'text', content: { text: '**The same candle shape means different things in different contexts:**\n\n| Pattern | After Uptrend = | After Downtrend = |\n|---|---|---|\n| Small body + long lower wick | Hanging Man (BEARISH) | Hammer (BULLISH) |\n| Small body + long upper wick | Shooting Star (BEARISH) | Inverted Hammer (BULLISH) |\n\n**Never read a candle in isolation.** Always ask:\n1. Where is this candle appearing — after a rise or a fall?\n2. What did the previous candles look like?\n3. Is there confirmation from the NEXT candle?\n4. Is this at a meaningful price level (support/resistance)?\n\nPatterns at key price levels carry far more weight than patterns that appear in the middle of nowhere.' } },

      { block_type: 'image', content: { url: '/images/ta/ta-03-bearish-patterns.svg', title: 'Bearish Candlestick Patterns', description: 'Shooting Star, Bearish Engulfing, Evening Star, and Three Black Crows side by side.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=lEk4cSA7cqc', title: 'Master Candlestick Patterns (Full Free Course)', description: 'A complete candlestick course covering Shooting Stars, Bearish Engulfing patterns, Evening Stars, Three Black Crows, and how each signals price direction.' } },
      { block_type: 'article', content: { url: 'https://www.investopedia.com/articles/active-trading/062315/using-bullish-candlestick-patterns-buy-stocks.asp', title: 'Candlestick Pattern Guide — Investopedia', description: 'A comprehensive guide to bullish and bearish candlestick patterns with visual examples and trading strategies.' } },
    ],
    questions: [
      { question_text: 'What makes a Shooting Star pattern BEARISH?', explanation: 'A Shooting Star appears at the TOP of an uptrend with a long upper wick — price tried to go higher but sellers drove it back down before the close. It signals the buying momentum has failed and sellers may take over.', options: [{ option_text: 'It appears at the top of an uptrend with a long upper wick showing buyers failed', is_correct: true }, { option_text: 'It always appears during a downtrend as a continuation signal', is_correct: false }, { option_text: 'It has a long lower wick showing sellers pushed price down', is_correct: false }, { option_text: 'It requires three candles to form — the star is the middle one', is_correct: false }] },
      { question_text: 'A Hammer and a Hanging Man look identical — what determines which is bullish and which is bearish?', explanation: 'Context determines meaning. A Hammer (small body, long lower wick) after a DOWNtrend is bullish — buyers stepped in. The exact same shape after an UPtrend is a Hanging Man — a bearish warning that selling pressure is building.', options: [{ option_text: 'Where it appears — after a downtrend it\'s a bullish Hammer; after an uptrend it\'s a bearish Hanging Man', is_correct: true }, { option_text: 'The color — green Hammer is bullish, red Hanging Man is bearish', is_correct: false }, { option_text: 'The length of the wick — longer wick means bullish, shorter means bearish', is_correct: false }, { option_text: 'The volume — high volume makes it a Hammer, low volume a Hanging Man', is_correct: false }] },
      { question_text: 'In a Bearish Engulfing pattern, what must the second (red) candle do?', explanation: 'The red candle must completely engulf the body of the previous green candle — opening ABOVE the green candle\'s close and closing BELOW the green candle\'s open. Sellers completely overwhelmed buyers.', options: [{ option_text: 'Open above the green candle\'s close and close below the green candle\'s open', is_correct: true }, { option_text: 'Close at the same level where the green candle opened', is_correct: false }, { option_text: 'Be exactly the same size as the green candle', is_correct: false }, { option_text: 'Have no upper wick — pure body only', is_correct: false }] },
      { question_text: 'In an Evening Star pattern, what does the STAR (middle) candle represent?', explanation: 'The star candle shows that the uptrend\'s buying momentum has STALLED — neither buyers nor sellers won that period. It forms at the peak, signaling a potential reversal before sellers take over on Day 3.', options: [{ option_text: 'Buying momentum has stalled at the top — a potential turning point', is_correct: true }, { option_text: 'The strongest buy signal in the pattern', is_correct: false }, { option_text: 'A gap where no trading occurred', is_correct: false }, { option_text: 'Confirmation that the uptrend will continue', is_correct: false }] },
      { question_text: 'What does Three Black Crows signal about seller behavior?', explanation: 'Three consecutive large red candles show three days of organized, systematic selling with no real bounces. Unlike panic selling (one big red candle), Three Black Crows indicates sellers are in methodical control.', options: [{ option_text: 'Three days of organized, systematic selling with sellers in full control', is_correct: true }, { option_text: 'A bullish signal — three red candles means the market is oversold', is_correct: false }, { option_text: 'Panic selling that will quickly reverse', is_correct: false }, { option_text: 'The market is about to enter a long sideways consolidation', is_correct: false }] },
      { question_text: 'Why is it important to look at MULTIPLE candles rather than just one?', explanation: 'A single candle\'s meaning depends entirely on what came before it (the trend) and what comes after (confirmation). Without context, even the most "perfect" pattern candle can easily be a false signal.', options: [{ option_text: 'A candle\'s meaning depends on the prior trend and requires confirmation from the next candle', is_correct: true }, { option_text: 'A single candle contains all the information needed for a trade', is_correct: false }, { option_text: 'Looking at more candles always guarantees a profitable trade', is_correct: false }, { option_text: 'Individual candles are random — only 50+ candles reveal real patterns', is_correct: false }] },
      { question_text: 'Where do bearish candlestick reversal patterns carry the most significance?', explanation: 'Bearish reversal patterns are most meaningful at the TOP of an uptrend — they signal that buying momentum has exhausted and sellers are taking over. The same pattern in a downtrend is less meaningful.', options: [{ option_text: 'At the top of an uptrend, where they signal the buying momentum may be ending', is_correct: true }, { option_text: 'At all-time lows, where they confirm the downtrend will continue forever', is_correct: false }, { option_text: 'In the middle of a sideways market — they signal a breakout', is_correct: false }, { option_text: 'At the bottom of a downtrend to confirm continued selling', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 4. SUPPORT, RESISTANCE & TREND LINES
  // ═══════════════════════════════════════════════════════
  {
    title: 'Support, Resistance & Trend Lines',
    emoji: '📏',
    description: 'The most fundamental concept in technical analysis — where price stops falling (support) and where it stops rising (resistance). Learn to draw trend lines and channels that reveal the market\'s path.',
    order_index: 4,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🛡️ Support: The Price Floor' } },
      { block_type: 'text', content: { text: '**Support** is a price level where buying interest is strong enough to stop a price decline. Think of it as a floor — every time price falls to this level, buyers step in and push it back up.\n\n```\n  SUPPORT LEVEL\n\n  Price\n   ↑\n   │  /\\      /\\      /\\\n   │ /  \\    /  \\    /  \\\n   │/    \\  /    \\  /\n   │      \\/      \\/\n   │ ─────────────────── ← SUPPORT LEVEL\n   │\n   └──────────────────── Time →\n\n     Bounce  Bounce  Bounce\n```\n\n**Why does support form?** When price dropped to $30,000 before and then recovered, traders remember that level. The next time Bitcoin falls toward $30,000, buyers who missed the last bounce rush in — creating the same floor again.\n\n**Psychological levels** (round numbers like $50,000, $100,000) are especially strong support/resistance because many traders set orders at them.' } },

      { block_type: 'heading', content: { text: '🚧 Resistance: The Price Ceiling' } },
      { block_type: 'text', content: { text: '**Resistance** is a price level where selling pressure is strong enough to stop a price rise. Think of it as a ceiling — every time price rises to this level, sellers unload their holdings and push it back down.\n\n```\n  RESISTANCE LEVEL\n\n  Price\n   ↑\n   │ ─────────────────── ← RESISTANCE LEVEL\n   │      /\\      /\\\n   │     /  \\    /  \\    /\n   │    /    \\  /    \\  /\n   │   /      \\/      \\/\n   │\n   └──────────────────── Time →\n\n       Reject  Reject  Reject\n```\n\n**The role reversal:** When price BREAKS THROUGH resistance and closes above it, that old resistance often becomes the new SUPPORT. Traders who were selling at resistance now buy the dip when price comes back to test it.\n\n```\n  ROLE REVERSAL\n\n  Price\n   ↑         BREAKOUT →\n   │       ╱───────────\n   │ ──────╱  ← Old resistance becomes new support\n   │     / \\  (retested from above)\n   │    /   \\\n   └──────────── Time →\n```' } },

      { block_type: 'heading', content: { text: '📐 Drawing Trend Lines' } },
      { block_type: 'text', content: { text: '**Trend lines** connect a series of highs or lows to show the market\'s directional path.\n\n**UPTREND LINE** — connect two or more HIGHER LOWS:\n```\n  UPTREND\n\n  Price\n   ↑                     *\n   │                  *\n   │         *     *\n   │       *  \\   /\n   │    *    \\  */\n   │  * \\   */\n   │     \\ */   ← Higher Lows along trend line\n   └──────────────────── Time →\n         ╱ Uptrend line\n```\n\n**DOWNTREND LINE** — connect two or more LOWER HIGHS:\n```\n  DOWNTREND\n\n  Price\n   ↑  *\n   │   \\  * ← Lower Highs along trend line\n   │    \\ │  *\n   │     \\│   \\\n   │      *    *\n   │           \\\n   └──────────────────── Time →\n      \\ Downtrend line\n```\n\n**Rules for valid trend lines:**\n- Need at least TWO points to draw the line\n- THREE touches makes it much more reliable\n- The more times price respects a trend line, the stronger it is\n- A break of the trend line is a significant signal' } },

      { block_type: 'heading', content: { text: '📦 Price Channels' } },
      { block_type: 'text', content: { text: '**A channel** is formed by drawing a trend line AND a parallel line above/below it, creating a corridor price moves within.\n\n```\n  ASCENDING CHANNEL (Bullish)\n\n  Price\n   ↑   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← Upper channel line\n   │  /\\  /\\  /\\  /\\  /\\\n   │ /  \\/  \\/  \\/  \\/  \\\n   │/                     \\\n   ────────────────────────  ← Lower channel line (trend line)\n   └──────────────────── Time →\n\n  DESCENDING CHANNEL (Bearish)\n\n  Price\n   ↑ ─────────────────────── ← Upper channel line\n   │  /\\  /\\  /\\  /\\  /\n   │ /  \\/  \\/  \\/  \\/\n   │/\n   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← Lower channel line (trend line)\n   └──────────────────── Time →\n```\n\n**Trading a channel:** Buy near the bottom of the channel (support), sell near the top (resistance). A break out of the channel — especially to the upside from a descending channel — is a powerful signal.' } },

      { block_type: 'image', content: { url: '/images/ta/ta-04-support-resistance.svg', title: 'Support, Resistance & Trend Lines', description: 'Support bounces, resistance role reversal, uptrend/downtrend lines, and an ascending price channel.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=Fsuzsz7WkHk', title: 'Support & Resistance + Trendlines (How to Draw Them Like a Pro)', description: 'How to identify key support and resistance levels, draw trend lines, and trade price channels — the foundation of all technical analysis.' } },
      { block_type: 'article', content: { url: 'https://www.investopedia.com/trading/support-and-resistance-basics/', title: 'Support and Resistance Basics — Investopedia', description: 'Investopedia\'s explanation of support and resistance, how to identify key levels, and the role reversal concept.' } },
    ],
    questions: [
      { question_text: 'What is a SUPPORT level in technical analysis?', explanation: 'Support is a price level where buying interest is consistently strong enough to stop a price decline and push it back up. It acts as a floor — the more times price bounces off it, the stronger the support.', options: [{ option_text: 'A price level where buying repeatedly stops a decline — acts as a floor', is_correct: true }, { option_text: 'A price level where selling repeatedly stops a rise — acts as a ceiling', is_correct: false }, { option_text: 'The average price over the past 50 days', is_correct: false }, { option_text: 'A government-set minimum price for a cryptocurrency', is_correct: false }] },
      { question_text: 'What happens when price BREAKS THROUGH a resistance level and closes above it?', explanation: 'When price breaks through resistance and holds above it, role reversal occurs — the old resistance becomes the new support. Traders who were selling at that level now buy dips back to it.', options: [{ option_text: 'Role reversal — the old resistance becomes the new support level', is_correct: true }, { option_text: 'Price will immediately reverse and fall back below', is_correct: false }, { option_text: 'The resistance level disappears and has no further significance', is_correct: false }, { option_text: 'It signals the start of a bear market', is_correct: false }] },
      { question_text: 'To draw a valid UPTREND LINE, you connect which points?', explanation: 'An uptrend line is drawn by connecting two or more HIGHER LOWS — the series of rising bottoms that define an uptrend. At least two points are needed; three or more touches make it much more reliable.', options: [{ option_text: 'Two or more higher lows — the rising series of bottoms', is_correct: true }, { option_text: 'Two or more higher highs — the rising series of peaks', is_correct: false }, { option_text: 'The open and close of the first and last candle in the trend', is_correct: false }, { option_text: 'All the candles\' midpoints during the uptrend', is_correct: false }] },
      { question_text: 'Why are ROUND NUMBER price levels (like $50,000 or $100,000) often strong support/resistance?', explanation: 'Round numbers are psychologically significant — many traders set limit orders, stop losses, and price targets at these levels. This concentration of orders creates self-fulfilling support and resistance at round numbers.', options: [{ option_text: 'Many traders set orders at round numbers, concentrating buying/selling there', is_correct: true }, { option_text: 'Exchanges set official price floors and ceilings at round numbers', is_correct: false }, { option_text: 'Round numbers are where Bitcoin mining becomes unprofitable', is_correct: false }, { option_text: 'Algorithms are programmed to trade exclusively at round numbers', is_correct: false }] },
      { question_text: 'What makes a trend line MORE RELIABLE?', explanation: 'The more times price touches and respects a trend line (bounces off it without breaking through), the more significant that trend line becomes. Three or more touches is the general threshold for a "confirmed" trend line.', options: [{ option_text: 'More price touches — three or more bounces confirms the trend line is significant', is_correct: true }, { option_text: 'Fewer touches — a line that price never touches is the most important', is_correct: false }, { option_text: 'Being drawn on lower time frames like 1-minute charts', is_correct: false }, { option_text: 'Being perfectly horizontal — diagonal lines are less reliable', is_correct: false }] },
      { question_text: 'In a PRICE CHANNEL, where is typically the best place to BUY?', explanation: 'Within an established price channel, the lower channel line (support) is where buyers repeatedly step in. Trading near support gives you a well-defined entry with a clear stop loss just below the channel boundary.', options: [{ option_text: 'Near the lower channel line (support) — where buyers consistently step in', is_correct: true }, { option_text: 'At the upper channel line (resistance) — where price is strongest', is_correct: false }, { option_text: 'In the middle of the channel — where price spends the most time', is_correct: false }, { option_text: 'After price breaks below the channel — for the best price', is_correct: false }] },
      { question_text: 'What signals might indicate an UPTREND is ending?', explanation: 'An uptrend is defined by higher highs AND higher lows. When price breaks below the uptrend line (fails to make a higher low), or fails to make a new higher high, it signals the trend structure is breaking down.', options: [{ option_text: 'Price breaks below the uptrend line or fails to make a new higher low', is_correct: true }, { option_text: 'Price makes an even higher high than normal — the rally is too strong', is_correct: false }, { option_text: 'Volume decreases during the uptrend', is_correct: false }, { option_text: 'A news headline declares the uptrend is over', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 5. REVERSAL CHART PATTERNS
  // ═══════════════════════════════════════════════════════
  {
    title: 'Reversal Chart Patterns',
    emoji: '🔄',
    description: 'Head & Shoulders, Double Top, Double Bottom, and Triple Top — the major chart patterns that signal a trend is about to reverse direction. Learn to identify them before the move happens.',
    order_index: 5,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '👤 Head & Shoulders (Bearish Reversal)' } },
      { block_type: 'text', content: { text: '**Head & Shoulders** is one of the most reliable reversal patterns in technical analysis. It forms at the top of an uptrend and signals a coming downtrend.\n\n```\n  HEAD & SHOULDERS\n\n  Price\n   ↑                  HEAD\n   │              /\\   ↑\n   │             /  \\\n   │     /\\     /    \\     /\\\n   │    /  \\   /      \\   /  \\\n   │   / LS \\ /        \\ / RS \\\n   │  /      X          X      \\\n   │─────────────────────────────← NECKLINE\n   │\n   └──────────────────────────── Time →\n\n  LS = Left Shoulder  RS = Right Shoulder\n```\n\n**The three parts:**\n- **Left Shoulder:** Price rises to a peak, then pulls back to the neckline\n- **Head:** Price rises to a HIGHER peak (the head), then pulls back to the neckline again\n- **Right Shoulder:** Price rises to a LOWER peak (similar height to left shoulder), then falls\n\n**The signal:** When price breaks BELOW the neckline after the right shoulder, the pattern is confirmed. The measured target is the distance from the head to the neckline, projected downward.' } },

      { block_type: 'heading', content: { text: '🙃 Inverse Head & Shoulders (Bullish Reversal)' } },
      { block_type: 'text', content: { text: '**Inverse Head & Shoulders** is the upside-down version — forms at the BOTTOM of a downtrend and signals a bullish reversal.\n\n```\n  INVERSE HEAD & SHOULDERS\n\n  Price\n   ↑\n   │─────────────────────────────← NECKLINE\n   │  \\      X          X      /\n   │   \\ LS / \\        / \\ RS /\n   │    \\  /   \\      /   \\  /\n   │     \\/     \\    /     \\/\n   │              \\  /\n   │               \\/   ↓ HEAD\n   │\n   └──────────────────────────── Time →\n```\n\n**The signal:** When price BREAKS ABOVE the neckline after the right shoulder, the pattern is confirmed. This is a strong buy signal after a sustained downtrend.' } },

      { block_type: 'heading', content: { text: '🏔️ Double Top (Bearish Reversal)' } },
      { block_type: 'text', content: { text: '**Double Top** forms when price makes TWO roughly equal peaks with a valley (the "neckline") between them. It signals that price has twice tried and failed to break higher.\n\n```\n  DOUBLE TOP  (M-shape)\n\n  Price\n   ↑\n   │     /\\          /\\\n   │    /  \\        /  \\\n   │   /    \\      /    \\\n   │  /      \\    /      \\\n   │─────────\\──/────────── ← NECKLINE (valley low)\n   │          \\/\n   │\n   └────────────────────── Time →\n                  ↓ Break below neckline = confirmed\n```\n\n**The signal:** Confirmed when price breaks below the neckline (the valley between the two peaks). Many traders wait for this break and a retest of the neckline before entering a short position.\n\n**Key:** The two peaks should be at approximately the same price level. A significantly higher second peak is just a new high — not a Double Top.' } },

      { block_type: 'heading', content: { text: '📉 Double Bottom (Bullish Reversal)' } },
      { block_type: 'text', content: { text: '**Double Bottom** is the mirror of the Double Top — two roughly equal lows with a peak between them. Forms at the end of a downtrend. Also called a "W" pattern.\n\n```\n  DOUBLE BOTTOM  (W-shape)\n\n  Price\n   ↑          /\\\n   │         /  \\\n   │─────────────── ← NECKLINE (peak high)\n   │  \\      /  \\\n   │   \\    /    \\\n   │    \\  /      \\\n   │     \\/        \\/\n   │\n   └──────────────────── Time →\n\n   ↑ Break above neckline = confirmed BULLISH\n```\n\n**The signal:** Confirmed when price breaks ABOVE the neckline. This is a strong buy signal indicating the downtrend has ended and buyers have successfully defended the low twice.\n\n**Triple Top / Triple Bottom** — Same concept but price tests the level THREE times before reversing. Three tests make the reversal even more significant.' } },

      { block_type: 'image', content: { url: '/images/ta/ta-05-reversal-patterns.svg', title: 'Reversal Chart Patterns', description: 'Head & Shoulders, Inverse Head & Shoulders, Double Top, and Double Bottom.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=g0LDtYP-SdY', title: 'Head and Shoulder and Double Top Chart Patterns Explained', description: 'How to identify and trade the most reliable reversal chart patterns — Head and Shoulders, Inverse H&S, Double Top, and Double Bottom.' } },
      { block_type: 'article', content: { url: 'https://www.investopedia.com/terms/h/head-shoulders.asp', title: 'Head and Shoulders Pattern — Investopedia', description: 'Investopedia\'s complete guide to the Head and Shoulders pattern — how to identify it, calculate price targets, and trade it.' } },
    ],
    questions: [
      { question_text: 'In a Head & Shoulders pattern, which part forms the HIGHEST peak?', explanation: 'The HEAD is the highest peak — it sits between two lower peaks called the Left Shoulder and Right Shoulder. The pattern resembles a person\'s head and two shoulders when viewed on a chart.', options: [{ option_text: 'The Head — the middle peak, higher than both shoulders', is_correct: true }, { option_text: 'The Left Shoulder — it forms first and sets the high', is_correct: false }, { option_text: 'The Right Shoulder — it forms with the most momentum', is_correct: false }, { option_text: 'The Neckline — it\'s the highest level price must reach', is_correct: false }] },
      { question_text: 'What event CONFIRMS a Head & Shoulders pattern as a sell signal?', explanation: 'The pattern is only confirmed — and the sell signal triggered — when price breaks BELOW the neckline after forming the right shoulder. Until then, it\'s just a potential pattern, not a confirmed trade.', options: [{ option_text: 'Price breaks below the neckline after the right shoulder forms', is_correct: true }, { option_text: 'The right shoulder is lower than the left shoulder', is_correct: false }, { option_text: 'The head reaches a new all-time high', is_correct: false }, { option_text: 'Three consecutive red candles appear during the right shoulder', is_correct: false }] },
      { question_text: 'A Double Top pattern resembles which letter of the alphabet?', explanation: 'A Double Top looks like the letter "M" — two roughly equal peaks with a valley (the neckline) between them. The pattern confirms bearish when price breaks below the valley/neckline level.', options: [{ option_text: 'M — two equal peaks with a valley between them', is_correct: true }, { option_text: 'W — two equal lows with a peak between them', is_correct: false }, { option_text: 'V — a sharp bottom reversal', is_correct: false }, { option_text: 'H — a flat top with a vertical move', is_correct: false }] },
      { question_text: 'A Double Bottom pattern resembles which letter of the alphabet?', explanation: 'A Double Bottom looks like the letter "W" — two roughly equal lows with a peak (the neckline) between them. It\'s a bullish reversal pattern confirmed when price breaks above the peak between the two lows.', options: [{ option_text: 'W — two equal lows with a peak (neckline) between them', is_correct: true }, { option_text: 'M — two equal peaks with a valley between them', is_correct: false }, { option_text: 'U — a gradual bottom reversal', is_correct: false }, { option_text: 'N — a sharp rally followed by a partial retracement', is_correct: false }] },
      { question_text: 'What does an Inverse Head & Shoulders pattern signal?', explanation: 'The Inverse Head & Shoulders (upside-down H&S) forms at the BOTTOM of a downtrend and signals a bullish reversal. It\'s confirmed when price breaks above the neckline after the right shoulder.', options: [{ option_text: 'A bullish reversal at the bottom of a downtrend', is_correct: true }, { option_text: 'A continuation of the downtrend after a brief pause', is_correct: false }, { option_text: 'A bearish reversal at the top of an uptrend', is_correct: false }, { option_text: 'The market will move sideways for an extended period', is_correct: false }] },
      { question_text: 'How does a Triple Top differ from a Double Top?', explanation: 'A Triple Top has THREE roughly equal peaks (instead of two) before the neckline breaks. Three failed attempts to break through resistance is actually a stronger sell signal than two — more resistance means more sellers defending that level.', options: [{ option_text: 'Three equal peaks instead of two — making the failed resistance even more significant', is_correct: true }, { option_text: 'The Triple Top is bullish while the Double Top is bearish', is_correct: false }, { option_text: 'A Triple Top forms faster — within a single trading day', is_correct: false }, { option_text: 'Triple Tops only form in bear markets; Double Tops only in bull markets', is_correct: false }] },
      { question_text: 'How is the PRICE TARGET calculated after a Head & Shoulders breakout?', explanation: 'The measured price target equals the distance from the head to the neckline, then projected downward from the neckline breakout point. Example: Head at $60K, neckline at $50K = $10K drop projected, giving a target of $40K.', options: [{ option_text: 'The distance from head to neckline, projected downward from the neckline break', is_correct: true }, { option_text: 'The distance between the two shoulders projected upward', is_correct: false }, { option_text: 'Double the height of the left shoulder', is_correct: false }, { option_text: 'Price always drops back to the previous major low', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 6. CONTINUATION CHART PATTERNS
  // ═══════════════════════════════════════════════════════
  {
    title: 'Continuation Chart Patterns',
    emoji: '🚀',
    description: 'Flags, pennants, triangles, and the Cup & Handle — patterns that form DURING a trend as the market pauses to rest before continuing in the same direction.',
    order_index: 6,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🚩 Bull Flag & Bear Flag' } },
      { block_type: 'text', content: { text: '**Flags** are short-term consolidation patterns that form after a sharp price move (the "flagpole"). They signal the trend will continue after the brief pause.\n\n**BULL FLAG:**\n```\n  BULL FLAG\n\n  Price\n   ↑\n   │                /← Breakout continues uptrend\n   │             ╱\n   │ FLAG:    ─/──\\ ← Slight downward drift\n   │        /─/    \\\n   │       /       ─\n   │ POLE /\n   │    /\n   │   /\n   └──────────────── Time →\n\n  Pole = sharp move up\n  Flag = brief downward drift\n  Breakout = uptrend resumes\n```\n\n**BEAR FLAG:**\n```\n  BEAR FLAG\n\n  Price\n   ↑\n   │   \\  Pole: sharp drop\n   │    \\\n   │     \\ FLAG: brief upward drift\n   │      ─╲──/─\n   │          \\──\n   │              ╲← Breakdown continues downtrend\n   └──────────────── Time →\n```\n\n**Trading flags:** Enter on the breakout from the flag. The price target is typically equal to the length of the flagpole added to the breakout point.' } },

      { block_type: 'heading', content: { text: '📐 Triangles' } },
      { block_type: 'text', content: { text: 'Triangles form when price makes lower highs AND higher lows — converging toward a point. The squeeze signals a big move is coming.\n\n**ASCENDING TRIANGLE (Bullish):**\n```\n  ASCENDING TRIANGLE\n\n  Price\n   ↑ ─────────────────── ← Flat resistance (same level)\n   │   /\\  /\\  /\\\n   │  /  \\/  \\/  \\\n   │ /               \\  /← Breakout\n   │╱  Higher lows ─────\n   └──────────────────── Time →\n\n  Flat top + rising lows = buyers gaining strength\n  → Bullish breakout expected\n```\n\n**DESCENDING TRIANGLE (Bearish):**\n```\n  DESCENDING TRIANGLE\n\n  Price\n   ↑  Lower highs ─────╲\n   │ \\  /\\  /\\  /\\     \\\n   │  \\/  \\/  \\/  \\   ╲← Breakdown\n   │ ─────────────────── ← Flat support (same level)\n   └──────────────────── Time →\n\n  Flat bottom + falling highs = sellers gaining strength\n  → Bearish breakdown expected\n```\n\n**SYMMETRICAL TRIANGLE:**\n```\n  SYMMETRICAL TRIANGLE\n\n  Price\n   ↑  ╲      ╱  = Lower highs\n   │   ╲    ╱\n   │    ╲  ╱\n   │     \\/  ← Apex: breakout coming\n   │    ╱  ╲\n   │   ╱    ╲ = Higher lows\n   └──────────── Time →\n\n  Neutral — breakout can go either direction\n  → Trade the direction of the breakout\n```' } },

      { block_type: 'heading', content: { text: '☕ Cup & Handle' } },
      { block_type: 'text', content: { text: '**Cup & Handle** is a longer-term bullish continuation pattern. The "cup" is a rounded U-shaped bottom followed by a small "handle" — a brief downward drift — before a breakout to new highs.\n\n```\n  CUP & HANDLE\n\n  Price\n   ↑  *                          *← BREAKOUT!\n   │   \\                        /\n   │    \\     CUP (U-shape)    / HANDLE\n   │     \\                    /  (small drift down)\n   │      \\    /────────────/──\\\n   │       \\  /                 \\\n   │        \\/                   \\← Handle\n   │         Rounded bottom\n   └───────────────────────────── Time →\n\n  * The cup = rounded bottom (takes weeks to months)\n  * The handle = brief pullback (a few days to weeks)\n  * Breakout above the cup rim = strong buy signal\n```\n\n**What it means:** Price took a major dip but gradually recovered back to its previous high (forming the cup). The small handle is the last shakeout before a breakout.\n\n**Famous example:** Many major Bitcoin bull runs have included a cup & handle formation over weeks or months.' } },

      { block_type: 'image', content: { url: '/images/ta/ta-06-continuation-patterns.svg', title: 'Continuation Chart Patterns', description: 'Bull flag, bear flag, the three triangle types, and cup & handle.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=4QmgRrowIiQ', title: 'Chart Patterns: Cup and Handle, Triangles & More', description: 'How to identify and trade continuation patterns — bull/bear flags, ascending/descending/symmetrical triangles, and the cup and handle.' } },
      { block_type: 'article', content: { url: 'https://www.investopedia.com/terms/c/cupandhandle.asp', title: 'Cup and Handle Pattern — Investopedia', description: 'Investopedia\'s guide to the cup and handle formation — how to identify it, when it appears, and how to trade the breakout.' } },
    ],
    questions: [
      { question_text: 'What are the two components of a Bull Flag pattern?', explanation: 'A Bull Flag has a "flagpole" (a sharp upward price move) followed by a "flag" (a brief, slight downward drift consolidation). The flag breakout signals the uptrend continues — the price target equals the length of the flagpole.', options: [{ option_text: 'A flagpole (sharp upward move) followed by a flag (brief downward drift)', is_correct: true }, { option_text: 'Two equal highs with a valley between them', is_correct: false }, { option_text: 'A downward move followed by an upward recovery', is_correct: false }, { option_text: 'Three weeks of sideways price action', is_correct: false }] },
      { question_text: 'In an ASCENDING TRIANGLE, which of the following is true?', explanation: 'An ascending triangle has a FLAT top resistance (price keeps hitting the same high) and a RISING bottom (higher lows). Buyers are consistently pushing the floor higher while sellers defend the same ceiling — until buyers eventually break through.', options: [{ option_text: 'Flat resistance at the top + rising lows at the bottom — bullish', is_correct: true }, { option_text: 'Rising highs at the top + flat support at the bottom — bearish', is_correct: false }, { option_text: 'Falling highs and falling lows — strong downtrend', is_correct: false }, { option_text: 'Equal highs and equal lows — perfectly sideways market', is_correct: false }] },
      { question_text: 'What direction does a DESCENDING TRIANGLE typically break?', explanation: 'A descending triangle has a flat support level (buyers defending the same low) and falling highs (sellers gaining strength). Sellers are progressively driving price lower on each bounce — eventually breaking below the flat support for a bearish breakdown.', options: [{ option_text: 'Downward — sellers progressively lower highs until they break flat support', is_correct: true }, { option_text: 'Upward — buyers defend the flat support and eventually break out', is_correct: false }, { option_text: 'Sideways — price stays flat at the support level', is_correct: false }, { option_text: 'Descending triangles are neutral — direction is random', is_correct: false }] },
      { question_text: 'What does the "handle" in a Cup & Handle pattern represent?', explanation: 'The handle is a brief, slight downward drift after the cup has fully formed. It\'s the last shakeout before the breakout — weaker holders sell during the handle, leaving only committed buyers who then push price to new highs.', options: [{ option_text: 'A brief downward drift — the final shakeout before the breakout', is_correct: true }, { option_text: 'The sharpest drop in the entire pattern', is_correct: false }, { option_text: 'The rounded bottom section of the pattern', is_correct: false }, { option_text: 'A second cup formation that confirms the first', is_correct: false }] },
      { question_text: 'Which continuation pattern is NEUTRAL — the breakout can go in either direction?', explanation: 'The Symmetrical Triangle has converging trend lines — lower highs AND higher lows meeting at a point. Unlike ascending (bullish) or descending (bearish) triangles, the symmetrical version is neutral and traders wait to see which direction the breakout goes.', options: [{ option_text: 'Symmetrical Triangle — converging lines with no directional bias', is_correct: true }, { option_text: 'Ascending Triangle — always bullish, never neutral', is_correct: false }, { option_text: 'Bull Flag — flag always resolves to the upside', is_correct: false }, { option_text: 'Cup & Handle — the handle can break either direction', is_correct: false }] },
      { question_text: 'How is the PRICE TARGET calculated after a Flag pattern breakout?', explanation: 'The price target after a flag breakout equals the length of the flagpole (the sharp initial move) added to the breakout point. Example: Bitcoin rallied $10K (the pole), then formed a flag. After the breakout, the target is another $10K move.', options: [{ option_text: 'The length of the flagpole added to the breakout point', is_correct: true }, { option_text: 'The width of the flag multiplied by two', is_correct: false }, { option_text: 'Price always reaches the previous all-time high', is_correct: false }, { option_text: 'The target equals the flag\'s highest point', is_correct: false }] },
      { question_text: 'What is the key DIFFERENCE between a Reversal pattern and a Continuation pattern?', explanation: 'Reversal patterns (Head & Shoulders, Double Top/Bottom) signal the current trend is ENDING and price will reverse direction. Continuation patterns (flags, triangles) signal the current trend is PAUSING briefly before resuming in the same direction.', options: [{ option_text: 'Reversal patterns signal the trend is ending; continuation patterns signal it\'s pausing before resuming', is_correct: true }, { option_text: 'Reversal patterns are bullish; continuation patterns are bearish', is_correct: false }, { option_text: 'Continuation patterns take longer to form than reversal patterns', is_correct: false }, { option_text: 'Reversal patterns only appear on daily charts; continuation patterns on hourly charts', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 7. TECHNICAL INDICATORS
  // ═══════════════════════════════════════════════════════
  {
    title: 'Technical Indicators: RSI, MACD & Moving Averages',
    emoji: '📊',
    description: 'The math behind the most-used trading indicators — Moving Averages, RSI, MACD, and Bollinger Bands. Learn what each measures, how to read it, and when it gives false signals.',
    order_index: 7,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '〰️ Moving Averages (MA & EMA)' } },
      { block_type: 'text', content: { text: '**A Moving Average** smooths out price data by calculating the average price over a set number of periods, updating with each new candle.\n\n**Simple Moving Average (SMA):**\n- 50-day SMA = the average closing price of the last 50 days\n- 200-day SMA = the average closing price of the last 200 days\n- Slower to react but very stable\n\n**Exponential Moving Average (EMA):**\n- Same concept but gives MORE weight to recent candles\n- Reacts faster to price changes than SMA\n\n**The Golden Cross (Bullish):**\n```\n  GOLDEN CROSS\n\n  Price\n   ↑     50 MA\n   │    ╱────────────────── (50 crosses above 200)\n   │   ╱\n   │  X  ← Golden Cross\n   │   ╲\n   │    ────────────────── 200 MA\n   └─────────────────── Time →\n\n  50-day MA crosses ABOVE 200-day MA = Bull signal\n```\n\n**The Death Cross (Bearish):**\n```\n  DEATH CROSS\n\n  Price\n   ↑\n   │ ────────────────── 200 MA\n   │    ╲\n   │     X  ← Death Cross\n   │    ╱\n   │   ╱────────────────── (50 drops below 200)\n   └─────────────────── Time →\n\n  50-day MA crosses BELOW 200-day MA = Bear signal\n```' } },

      { block_type: 'heading', content: { text: '💪 RSI — Relative Strength Index' } },
      { block_type: 'text', content: { text: '**RSI** measures how fast and how much price has moved recently — it runs on a scale from 0 to 100.\n\n```\n  RSI SCALE\n\n   100 ──────────────────────────\n    70 ─────── OVERBOUGHT ───────  ← Above 70 = overbought\n    │\n    │          NEUTRAL ZONE\n    │\n    30 ──────── OVERSOLD ─────────  ← Below 30 = oversold\n     0 ──────────────────────────\n```\n\n**RSI above 70 (Overbought):** Price has risen very fast — buyers may be exhausted, a pullback is possible. Not a guaranteed sell, but a caution zone.\n\n**RSI below 30 (Oversold):** Price has fallen very fast — sellers may be exhausted, a bounce is possible. Not a guaranteed buy, but a watch zone.\n\n**RSI Divergence (powerful signal):**\n```\n  BEARISH DIVERGENCE\n\n  Price: making HIGHER HIGHS       →  ↑\n  RSI:   making LOWER HIGHS        →  ↓\n  = Price is going up but momentum is fading = coming reversal\n\n  BULLISH DIVERGENCE\n\n  Price: making LOWER LOWS         →  ↓\n  RSI:   making HIGHER LOWS        →  ↑\n  = Price falling but momentum strengthening = potential reversal up\n```' } },

      { block_type: 'heading', content: { text: '📈 MACD — Moving Average Convergence Divergence' } },
      { block_type: 'text', content: { text: '**MACD** tracks the relationship between two EMAs (typically 12 and 26 period). It consists of three parts:\n\n1. **MACD Line** = 12 EMA minus 26 EMA\n2. **Signal Line** = 9-period EMA of the MACD line\n3. **Histogram** = MACD Line minus Signal Line (bars above/below zero)\n\n```\n  MACD CHART\n\n   ↑  │ MACD Line  / ╲\n   │  │           /   ╲\n   │  │          / Bull ╲\n   │  │─────────/─Cross──╲─────── 0 line\n   │  │        X           ╲  Bear\n   │  │                     Cross\n   │  │         Signal Line\n   │  └───────────────────── Time →\n\n  Histogram bars: positive (above 0) = MACD > Signal (bullish)\n                  negative (below 0) = MACD < Signal (bearish)\n```\n\n**MACD Crossover:**\n- **Bullish:** MACD Line crosses ABOVE the Signal Line\n- **Bearish:** MACD Line crosses BELOW the Signal Line\n\n**Histogram shrinking:** The bars getting smaller toward zero indicates the crossover is approaching — momentum is shifting.' } },

      { block_type: 'heading', content: { text: '🎸 Bollinger Bands' } },
      { block_type: 'text', content: { text: '**Bollinger Bands** consist of three lines — a middle SMA and two bands 2 standard deviations above and below it.\n\n```\n  BOLLINGER BANDS\n\n  Price\n   ↑  ────────────────────── ← Upper Band (+2 std dev)\n   │   ~~~~~~~~~~~~~~~~~~~~  ← Middle Band (20 SMA)\n   │  ────────────────────── ← Lower Band (-2 std dev)\n   │\n   │  When bands SQUEEZE together:\n   │  ──╲  /── Upper\n   │     \\/\n   │     /\\   ← SQUEEZE = volatility low = BIG MOVE COMING\n   │  ──/  ╲── Lower\n   └──────────── Time →\n```\n\n**Key readings:**\n- **Price touches upper band:** Potentially overbought — price is 2 standard deviations above average\n- **Price touches lower band:** Potentially oversold — price is 2 standard deviations below average\n- **Band Squeeze:** Bands narrow when volatility is low — a squeeze often precedes a major move (direction unknown)\n- **Band Expansion:** Bands widen during high volatility / strong trends' } },

      { block_type: 'image', content: { url: '/images/ta/ta-07-indicators.svg', title: 'Technical Indicators', description: 'Golden/death cross moving averages, the RSI scale, MACD, and Bollinger Bands.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=fFmcONKy3bA', title: 'Top 5 Technical Analysis Indicators: Moving Average, RSI, Bollinger Bands, MACD', description: 'A clear breakdown of the most-used technical indicators — what they measure, how to read them, and when they give false signals.' } },
      { block_type: 'article', content: { url: 'https://www.investopedia.com/terms/r/rsi.asp', title: 'Relative Strength Index (RSI) — Investopedia', description: 'Investopedia\'s complete guide to the RSI indicator — formula, overbought/oversold levels, divergence signals, and limitations.' } },
    ],
    questions: [
      { question_text: 'What does a 200-day Simple Moving Average (SMA) represent?', explanation: 'The 200-day SMA is the average closing price of the past 200 days, updated each day. It\'s one of the most-watched indicators — price above it is generally considered a bull market, price below it a bear market.', options: [{ option_text: 'The average closing price over the last 200 days, updated daily', is_correct: true }, { option_text: 'The total trading volume over 200 days divided by price', is_correct: false }, { option_text: 'The highest price reached in the past 200 days', is_correct: false }, { option_text: 'A prediction of where price will be in 200 days', is_correct: false }] },
      { question_text: 'What is a GOLDEN CROSS in moving average analysis?', explanation: 'A Golden Cross occurs when the 50-day MA crosses ABOVE the 200-day MA. It\'s considered a major bullish signal — short-term momentum (50-day) is now stronger than long-term trend (200-day).', options: [{ option_text: 'The 50-day MA crosses ABOVE the 200-day MA — a bullish signal', is_correct: true }, { option_text: 'The 200-day MA crosses ABOVE the 50-day MA — a bearish signal', is_correct: false }, { option_text: 'Price crosses above the 50-day MA for the first time', is_correct: false }, { option_text: 'Both MAs cross the zero line at the same time', is_correct: false }] },
      { question_text: 'On the RSI scale, what does a reading ABOVE 70 typically indicate?', explanation: 'RSI above 70 means the asset is in "overbought" territory — price has risen very quickly and buyers may be exhausted. It\'s a caution zone suggesting a pullback is possible, but NOT a guaranteed sell signal (price can stay overbought during strong uptrends).', options: [{ option_text: 'Overbought territory — buyers may be exhausted, pullback possible', is_correct: true }, { option_text: 'Strong buy signal — maximum momentum to the upside', is_correct: false }, { option_text: 'Oversold territory — sellers are exhausted', is_correct: false }, { option_text: 'The RSI is broken and showing an error reading', is_correct: false }] },
      { question_text: 'What is RSI DIVERGENCE and why is it significant?', explanation: 'RSI divergence occurs when price and RSI move in opposite directions — e.g., price makes new highs but RSI makes lower highs (bearish divergence). This shows price is rising but momentum is fading, which often precedes a reversal.', options: [{ option_text: 'Price and RSI moving in opposite directions — signals fading momentum and potential reversal', is_correct: true }, { option_text: 'When RSI stays at 50 while price moves significantly', is_correct: false }, { option_text: 'When two different RSI settings give different readings', is_correct: false }, { option_text: 'RSI crossing the 50 level from below — a bullish signal', is_correct: false }] },
      { question_text: 'What does a MACD bullish crossover look like?', explanation: 'A MACD bullish crossover occurs when the MACD Line crosses ABOVE the Signal Line. This shows that short-term momentum is accelerating faster than the smoothed average — a buy signal.', options: [{ option_text: 'The MACD Line crosses ABOVE the Signal Line', is_correct: true }, { option_text: 'The MACD Line crosses above the zero line', is_correct: false }, { option_text: 'The histogram bars become negative', is_correct: false }, { option_text: 'The Signal Line crosses above the MACD Line', is_correct: false }] },
      { question_text: 'What does a Bollinger Band SQUEEZE signal?', explanation: 'When Bollinger Bands squeeze together (narrow), it means volatility has been very low. Low volatility typically precedes a major price move — but the bands don\'t tell you which direction. Traders watch for the breakout to determine direction.', options: [{ option_text: 'Volatility is very low — a major price move is likely coming soon', is_correct: true }, { option_text: 'Price is perfectly stable and will stay flat', is_correct: false }, { option_text: 'A bearish reversal is confirmed', is_correct: false }, { option_text: 'The indicator has failed and should be reset', is_correct: false }] },
      { question_text: 'Why can RSI being "overbought" (above 70) be a MISLEADING sell signal in a strong uptrend?', explanation: 'During a strong uptrend, RSI can stay above 70 for an extended period as buyers remain dominant. Selling every time RSI hits 70 in a bull market means selling the strongest performers. RSI works best combined with other indicators and price action.', options: [{ option_text: 'In strong uptrends, RSI can stay overbought for a long time — selling early misses the biggest gains', is_correct: true }, { option_text: 'RSI above 70 actually means the asset is undervalued', is_correct: false }, { option_text: 'RSI is only reliable in downtrends, never uptrends', is_correct: false }, { option_text: 'The 70 level has been removed from modern RSI calculations', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 8. PUTTING IT ALL TOGETHER
  // ═══════════════════════════════════════════════════════
  {
    title: 'Building a Trading Plan',
    emoji: '🎯',
    description: 'Technical analysis is only useful if you can turn it into a structured trade plan. Learn entries, stop losses, take profit targets, risk/reward ratios, and position sizing — the discipline that separates traders from gamblers.',
    order_index: 8,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🎯 The Three Parts of Every Trade' } },
      { block_type: 'text', content: { text: 'Every well-structured trade has exactly three price levels defined BEFORE you enter:\n\n```\n  TRADE STRUCTURE\n\n  Price\n   ↑\n   │  ─────────────────  ← TAKE PROFIT (TP): where you exit with profit\n   │\n   │  ─────────────────  ← ENTRY: where you buy\n   │\n   │  ─────────────────  ← STOP LOSS (SL): where you exit with a small loss\n   │\n   └──────────────────── Time →\n```\n\n**Entry:** The price level where your analysis says buyers are taking control. Often at a support level, after a pattern confirmation, or on an indicator signal.\n\n**Stop Loss:** Your safety net. If price goes against you to this level, you exit automatically — protecting your capital. Should be placed BELOW the key level your trade is based on.\n\n**Take Profit:** Where you lock in your gains. Usually set at the next resistance level, the pattern\'s measured target, or a fixed multiple of your risk.\n\n**The rule:** NEVER enter a trade without knowing your stop loss and take profit FIRST.' } },

      { block_type: 'heading', content: { text: '⚖️ Risk/Reward Ratio' } },
      { block_type: 'text', content: { text: '**Risk/Reward ratio** (R:R) compares how much you stand to gain vs. how much you stand to lose.\n\n```\n  RISK/REWARD EXAMPLE\n\n  Entry:       $100\n  Stop Loss:   $95   → Risk = $5 per coin\n  Take Profit: $115  → Reward = $15 per coin\n\n  Risk/Reward Ratio = Reward ÷ Risk = $15 ÷ $5 = 3:1\n```\n\n**Why 3:1 (or better) is the standard:**\n- Even if you\'re only RIGHT 40% of the time, you still make money\n- 4 trades: 1 win ($15) + 3 losses ($5 each = $15) = Break even at 25% win rate\n- At 40% win rate with 3:1 R:R: 4 wins × $15 = $60, 6 losses × $5 = $30 → Net profit: $30\n\n**The math protects you:**\n- 1:1 R:R → you need to be right >50% of the time to profit\n- 2:1 R:R → you need to be right >33% to profit\n- 3:1 R:R → you need to be right >25% to profit' } },

      { block_type: 'heading', content: { text: '💰 Position Sizing' } },
      { block_type: 'text', content: { text: '**Position sizing** is how much of your portfolio you put into a single trade. The golden rule:\n\n**Risk no more than 1–2% of your total portfolio on any single trade.**\n\n```\n  POSITION SIZING FORMULA\n\n  Portfolio = $10,000\n  Risk per trade = 1% = $100\n\n  Entry = $1,000  Stop = $950  → Risk = $50 per coin\n\n  Position Size = Risk Amount ÷ Risk Per Coin\n                = $100 ÷ $50\n                = 2 coins\n\n  You buy 2 coins. If SL hits, you lose $100 (1% of portfolio).\n  If TP hits (3:1), you gain $300 (3% of portfolio).\n```\n\n**Why this matters:** With 1% risk per trade, you could lose 10 trades in a row and still have 90% of your portfolio. You can survive a losing streak. Without position sizing, a few bad trades can wipe you out entirely.' } },

      { block_type: 'heading', content: { text: '🔍 Confluence: Stacking Your Evidence' } },
      { block_type: 'text', content: { text: '**Confluence** means multiple independent signals pointing to the same trade at the same time.\n\n**Example of a HIGH-confluence trade:**\n```\n  ✅ Price is at a strong SUPPORT LEVEL (bounced 3× before)\n  ✅ A HAMMER CANDLE formed at that support\n  ✅ RSI is showing OVERSOLD conditions (below 30)\n  ✅ MACD is showing a bullish CROSSOVER\n  ✅ The pattern is a confirmed INVERSE HEAD & SHOULDERS\n\n  → 5 signals all agree → HIGH-probability trade\n```\n\n**Example of a LOW-confluence trade:**\n```\n  ❌ Price is in the middle of nowhere\n  ❌ RSI is at 50 (neutral)\n  ❌ No recognizable pattern\n  ❌ Only reason to buy: "it looks like it might go up"\n\n  → No evidence → LOW-probability trade (gambling)\n```\n\n**The more signals that agree, the higher the probability.** Never act on a single indicator alone.' } },

      { block_type: 'image', content: { url: '/images/ta/ta-08-trade-plan.svg', title: 'Trade Structure & Risk/Reward', description: 'Entry, stop loss, and take profit levels, plus a 3:1 risk/reward example.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=gM65dEuNsMw', title: 'Risk Management & Position Sizing Strategy for Trading', description: 'How to set entry points, stop losses, take profit targets, calculate risk/reward ratio, and size positions correctly — the complete framework for structured trading.' } },
      { block_type: 'article', content: { url: 'https://www.investopedia.com/terms/r/riskrewardratio.asp', title: 'Risk/Reward Ratio Explained — Investopedia', description: 'Investopedia\'s guide to the risk/reward ratio — why it matters, how to calculate it, and how to use it to evaluate trades before entering.' } },
    ],
    questions: [
      { question_text: 'What are the THREE price levels you must define before entering any trade?', explanation: 'Every trade needs an Entry (where you buy), a Stop Loss (where you exit if wrong — your maximum loss), and a Take Profit (where you exit with profit). Defining all three BEFORE entering is the foundation of disciplined trading.', options: [{ option_text: 'Entry, Stop Loss, and Take Profit', is_correct: true }, { option_text: 'Open, High, and Low', is_correct: false }, { option_text: 'Buy, Hold, and Average Down', is_correct: false }, { option_text: 'Support, Resistance, and Moving Average', is_correct: false }] },
      { question_text: 'If your Entry is $1,000, Stop Loss is $950, and Take Profit is $1,150, what is your Risk/Reward ratio?', explanation: 'Risk = $1,000 - $950 = $50. Reward = $1,150 - $1,000 = $150. R:R = $150 ÷ $50 = 3:1. You risk $50 to potentially make $150.', options: [{ option_text: '3:1 — you risk $50 to potentially gain $150', is_correct: true }, { option_text: '1:3 — you risk $150 to potentially gain $50', is_correct: false }, { option_text: '2:1 — you risk $50 to potentially gain $100', is_correct: false }, { option_text: '1:1 — risk and reward are equal', is_correct: false }] },
      { question_text: 'Why do most experienced traders aim for a MINIMUM 2:1 Risk/Reward ratio?', explanation: 'With 2:1 R:R, you only need to be right on 34% of your trades to break even. With 3:1 R:R, you only need to win 25% of trades. This means you can be wrong more often than you\'re right and still be profitable.', options: [{ option_text: 'You can lose more trades than you win and still profit — math works in your favor', is_correct: true }, { option_text: 'Exchanges require a minimum 2:1 ratio for all trades', is_correct: false }, { option_text: 'Lower ratios cause price to move against you faster', is_correct: false }, { option_text: 'Technical analysis is only accurate at 2:1 or better setups', is_correct: false }] },
      { question_text: 'If your portfolio is $5,000 and you risk 1% per trade, what is the maximum dollar loss on a single trade?', explanation: '1% of $5,000 = $50. This is your maximum risk per trade. Your position size should be calculated so that if your stop loss is hit, you lose exactly $50 — protecting 99% of your portfolio.', options: [{ option_text: '$50 maximum loss per trade', is_correct: true }, { option_text: '$500 maximum loss per trade', is_correct: false }, { option_text: '$5 maximum loss per trade', is_correct: false }, { option_text: '$1,000 maximum loss per trade', is_correct: false }] },
      { question_text: 'What is CONFLUENCE in technical analysis?', explanation: 'Confluence means multiple independent signals (support level, candlestick pattern, RSI, MACD, chart pattern) all pointing to the same trade. The more signals that agree, the higher the probability of success.', options: [{ option_text: 'Multiple independent signals all pointing to the same trade setup', is_correct: true }, { option_text: 'Copying another trader\'s position exactly', is_correct: false }, { option_text: 'When two moving averages cross at the same time as a pattern forms', is_correct: false }, { option_text: 'Combining multiple exchanges\' price data into one chart', is_correct: false }] },
      { question_text: 'Where should a STOP LOSS be placed for a long (buy) trade at support?', explanation: 'For a buy trade at a support level, the stop loss should be placed BELOW the support level — if price breaks through support and your stop triggers, you exit before the loss compounds. The support level is what made the trade valid; if it breaks, the trade thesis is wrong.', options: [{ option_text: 'Below the support level — if support breaks, the trade thesis is invalidated', is_correct: true }, { option_text: 'Above the entry price to lock in profits early', is_correct: false }, { option_text: 'At the same price as the entry — zero loss allowed', is_correct: false }, { option_text: 'At the previous all-time low regardless of current price', is_correct: false }] },
      { question_text: 'With a 3:1 Risk/Reward ratio, what is the MINIMUM win rate needed to be profitable?', explanation: 'With 3:1 R:R, for every loss you can win ⅓ of the time and break even. Mathematically: 1 win × 3 = 3, minus 3 losses × 1 = 3. Break-even is at 25% win rate. Any win rate above 25% is profitable with 3:1 R:R.', options: [{ option_text: '25% — win 1 in 4 trades and you break even; above that is profit', is_correct: true }, { option_text: '50% — you must win more than you lose to profit', is_correct: false }, { option_text: '75% — high R:R ratios require higher accuracy', is_correct: false }, { option_text: '10% — a 3:1 ratio means you only need to win rarely', is_correct: false }] },
    ],
  },

];

// ─────────────────────────────────────────────────────────
// SEED HANDLER
// ─────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase()) {
      return Response.json({ error: 'Teacher only' }, { status: 403 });
    }

    await db.rpc('run_sql', { query: "ALTER TABLE learn_lessons ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📚'" }).catch(() => {});

    const { classId } = await request.json().catch(() => ({}));

    let moduleId;
    const { data: existingMod } = await db.from('learn_modules')
      .select('id').eq('title', MODULE.title).limit(1).single();

    if (existingMod) {
      moduleId = existingMod.id;
    } else {
      const { data: newMod, error: modErr } = await db.from('learn_modules').insert({
        title: MODULE.title,
        emoji: MODULE.emoji,
        description: MODULE.description,
        order_index: MODULE.order_index,
        class_id: classId || null,
        is_published: true,
      }).select('id').single();
      if (modErr) return Response.json({ error: `Module create failed: ${modErr.message}` }, { status: 500 });
      moduleId = newMod.id;
    }

    const results = [];

    for (const lesson of LESSONS) {
      const { data: existingLesson } = await db.from('learn_lessons')
        .select('id').eq('module_id', moduleId).eq('title', lesson.title).limit(1).single();

      let lessonId;
      let wasUpdate = false;
      if (existingLesson) {
        lessonId = existingLesson.id;
        wasUpdate = true;
        await db.from('learn_lessons').update({
          emoji: lesson.emoji,
          description: lesson.description,
          order_index: lesson.order_index,
          tokens_reward: lesson.tokens_reward,
          pass_threshold: lesson.pass_threshold,
        }).eq('id', lessonId);
        await db.from('learn_blocks').delete().eq('lesson_id', lessonId);
        const { data: oldQs } = await db.from('learn_questions').select('id').eq('lesson_id', lessonId);
        const oldQIds = (oldQs || []).map(q => q.id);
        if (oldQIds.length) await db.from('learn_options').delete().in('question_id', oldQIds);
        await db.from('learn_questions').delete().eq('lesson_id', lessonId);
      } else {
        const { data: newLesson, error: lessonErr } = await db.from('learn_lessons').insert({
          module_id: moduleId,
          title: lesson.title,
          emoji: lesson.emoji,
          description: lesson.description,
          order_index: lesson.order_index,
          tokens_reward: lesson.tokens_reward,
          pass_threshold: lesson.pass_threshold,
          questions_to_show: 5,
          is_published: true,
          ai_tutor_enabled: true,
        }).select('id').single();

        if (lessonErr) {
          results.push({ lesson: lesson.title, status: 'error', error: lessonErr.message });
          continue;
        }
        lessonId = newLesson.id;
      }

      const blockInserts = lesson.blocks.map((b, i) => ({
        lesson_id: lessonId,
        block_type: b.block_type,
        content: b.content,
        order_index: i + 1,
      }));
      await db.from('learn_blocks').insert(blockInserts);

      for (let qi = 0; qi < lesson.questions.length; qi++) {
        const q = lesson.questions[qi];
        const { data: newQ, error: qErr } = await db.from('learn_questions').insert({
          lesson_id: lessonId,
          question_text: q.question_text,
          explanation: q.explanation,
          order_index: qi + 1,
        }).select('id').single();
        if (qErr || !newQ) continue;
        await db.from('learn_options').insert(
          q.options.map((o, oi) => ({ question_id: newQ.id, option_text: o.option_text, is_correct: o.is_correct, order_index: oi + 1 }))
        );
      }

      results.push({ lesson: lesson.title, status: wasUpdate ? 'updated' : 'created', id: lessonId });
    }

    return Response.json({
      success: true,
      moduleId,
      moduleName: MODULE.title,
      results,
      created: results.filter(r => r.status === 'created').length,
      updated: results.filter(r => r.status === 'updated').length,
      errors: results.filter(r => r.status === 'error').length,
    });

  } catch (err) {
    return Response.json({ error: `Unexpected error: ${err.message}` }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    info: 'POST to seed the Technical Analysis & Chart Patterns module.',
    lessons: LESSONS.map(l => `${l.emoji} ${l.title}`),
  });
}
