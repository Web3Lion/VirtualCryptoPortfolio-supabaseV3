import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// ─────────────────────────────────────────────────────────
// DEFI MODULE DATA
// ─────────────────────────────────────────────────────────
const MODULE = {
  title: 'DeFi Deep Dive',
  emoji: '🏦',
  description: 'Decentralized Finance explained — from swapping tokens on a DEX to earning yield, borrowing without a bank, and understanding how real-world assets are moving on-chain.',
  order_index: 11,
};

const LESSONS = [

  // ═══════════════════════════════════════════════════════
  // 1. WHAT IS DEFI?
  // ═══════════════════════════════════════════════════════
  {
    title: 'What Is DeFi?',
    emoji: '🏦',
    description: 'The big picture — what decentralized finance is, how it differs from traditional banking, and why it matters.',
    order_index: 1,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🏦 What Is Decentralized Finance?' } },
      { block_type: 'text', content: { text: 'Imagine a bank with no employees, no CEO, no building — and no one who can deny you an account, freeze your funds, or take a cut of your transactions. That\'s the vision behind **DeFi**, or Decentralized Finance.\n\nDeFi is a collection of financial services — banking, lending, trading, insurance, savings — rebuilt using **smart contracts** on blockchains like Ethereum, Solana, and Avalanche. Instead of trusting a company to handle your money, you trust open-source code that runs automatically and is auditable by anyone.\n\n**Key difference from traditional finance:**\n- **Traditional Finance (TradFi):** You trust a bank (a company) to hold your money, process your transactions, and give you a loan if they approve you.\n- **DeFi:** You interact directly with smart contracts. No approval needed. No bank hours. No minimum balance. Open to anyone with a crypto wallet.' } },

      { block_type: 'heading', content: { text: '📜 A Brief History' } },
      { block_type: 'text', content: { text: '- **2015** — Ethereum launches, making programmable smart contracts possible\n- **2017** — MakerDAO launches DAI, the first decentralized stablecoin\n- **2018** — Compound and Uniswap launch, pioneering DeFi lending and decentralized trading\n- **2020** — "**DeFi Summer**": total value locked (TVL) in DeFi explodes from $1B to $15B in months; yield farming craze begins\n- **2021** — DeFi TVL peaks above **$250 billion**; protocols like Aave, Curve, and MakerDAO become major financial infrastructure\n- **2022** — Luna/UST collapse and crypto bear market; DeFi TVL drops significantly; focus shifts to security and sustainability\n- **2023–2024** — Institutional adoption grows; BlackRock launches tokenized money market fund on Ethereum; real-world assets start moving on-chain' } },

      { block_type: 'heading', content: { text: '🔑 Core Principles of DeFi' } },
      { block_type: 'text', content: { text: '**1. Permissionless:** Anyone with an internet connection and a crypto wallet can use DeFi. No credit check, no ID, no bank account required.\n\n**2. Trustless:** You don\'t need to trust the people running the protocol — the code enforces the rules automatically. "Don\'t trust, verify."\n\n**3. Transparent:** All transactions and smart contract code are publicly visible on the blockchain. Anyone can audit what a protocol actually does.\n\n**4. Non-Custodial:** You keep control of your private keys (and therefore your money) at all times. Unlike a bank or exchange, a DeFi protocol can\'t freeze your funds.\n\n**5. Composable:** DeFi protocols are like financial Lego bricks — they can be stacked and combined. A yield farming strategy might deposit into Aave (lending), which feeds into Curve (stablecoin trading), which generates returns in Convex (yield optimizer). This is called the "money Lego" property.' } },

      { block_type: 'heading', content: { text: '🏗️ The DeFi Ecosystem' } },
      { block_type: 'text', content: { text: 'DeFi covers a wide range of financial services:\n\n| Category | What It Does | Examples |\n|---|---|---|\n| **DEX** | Trade tokens without a middleman | Uniswap, Jupiter |\n| **Lending** | Borrow/lend using crypto collateral | Aave, Compound |\n| **Stablecoins** | Crypto pegged to $1 | USDC, DAI, USDT |\n| **Yield Farming** | Earn rewards by providing liquidity | Yearn, Convex |\n| **Derivatives** | Trade futures and options on-chain | dYdX, GMX |\n| **Insurance** | Cover smart contract risks | Nexus Mutual |\n| **Bridges** | Move assets between blockchains | Stargate, LayerZero |\n| **RWAs** | Bring real-world assets on-chain | BlackRock BUIDL, Ondo |\n\n**Ethereum** hosts the largest DeFi ecosystem, but Solana, Avalanche, and other chains are fast-growing alternatives.' } },

      { block_type: 'heading', content: { text: '⚠️ DeFi Risks' } },
      { block_type: 'text', content: { text: 'DeFi is powerful but not without risk:\n- **Smart Contract Risk:** Bugs in code can be exploited. Billions have been lost to hacks.\n- **Liquidation Risk:** If collateral value drops, loans can be automatically liquidated.\n- **Rug Pulls:** Unscrupulous developers drain liquidity pools and disappear.\n- **Impermanent Loss:** Providing liquidity can result in holding less than if you\'d just held the tokens.\n- **Regulatory Risk:** Governments are still figuring out how to regulate DeFi.\n\nDespite risks, DeFi has processed trillions of dollars in transactions and continues to grow.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=17QRFlml4pA', title: 'What is DeFi? (Decentralized Finance Animated) — Whiteboard Crypto', description: 'A visual introduction covering DeFi vs. traditional finance, smart contracts, dApps, the major DeFi categories (DEXs, lending, yield farming), and the key risks every user should know.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/business/2023/12/05/defi-market-rebounds-to-50b-as-speculators-hunt-for-yield', title: 'DeFi Market Rebounds to $50B as Speculators Hunt for Yield — CoinDesk', description: 'DeFi\'s total value locked surged back to $50 billion in late 2023, documenting the sector\'s comeback as a real, actively-used financial system.' } },
      { block_type: 'article', content: { url: 'https://defillama.com', title: 'DeFi Llama — Live DeFi Stats', description: 'Track total value locked (TVL) across all DeFi protocols in real time.' } },
    ],
    questions: [
      { question_text: 'What does "DeFi" stand for?', explanation: 'DeFi stands for Decentralized Finance — financial services rebuilt on blockchains using smart contracts instead of banks and intermediaries.', options: [{ option_text: 'Decentralized Finance', is_correct: true }, { option_text: 'Digital Financial Institution', is_correct: false }, { option_text: 'Defined Fiat Index', is_correct: false }, { option_text: 'Distributed Fee Infrastructure', is_correct: false }] },
      { question_text: 'What does "non-custodial" mean in DeFi?', explanation: 'Non-custodial means you keep control of your private keys at all times. No company can freeze or seize your funds because you — not a third party — control them.', options: [{ option_text: 'You keep control of your private keys — no company can freeze your funds', is_correct: true }, { option_text: 'A bank holds your crypto for safety', is_correct: false }, { option_text: 'Your tokens are locked for a fixed period', is_correct: false }, { option_text: 'A government agency insures your deposits', is_correct: false }] },
      { question_text: 'Which year is known as "DeFi Summer" when TVL exploded from $1B to $15B?', explanation: 'DeFi Summer occurred in 2020, when yield farming incentives caused an explosion in DeFi usage and the total value locked grew rapidly.', options: [{ option_text: '2020', is_correct: true }, { option_text: '2017', is_correct: false }, { option_text: '2021', is_correct: false }, { option_text: '2022', is_correct: false }] },
      { question_text: 'What does "composable" mean in the context of DeFi?', explanation: 'Composability means DeFi protocols can be stacked and combined like Lego bricks — often called "money Legos" — where one protocol\'s output becomes another\'s input.', options: [{ option_text: 'DeFi protocols can be stacked and combined like financial Lego bricks', is_correct: true }, { option_text: 'DeFi apps can only run on Ethereum', is_correct: false }, { option_text: 'All DeFi code is written by the same team', is_correct: false }, { option_text: 'Smart contracts automatically compose music', is_correct: false }] },
      { question_text: 'What is Total Value Locked (TVL)?', explanation: 'TVL measures the total amount of crypto assets deposited and working inside DeFi protocols — it\'s the main metric for measuring DeFi\'s overall size.', options: [{ option_text: 'The total crypto deposited and working inside DeFi protocols', is_correct: true }, { option_text: 'The number of DeFi users worldwide', is_correct: false }, { option_text: 'The combined market cap of all DeFi tokens', is_correct: false }, { option_text: 'The amount of money lost to DeFi hacks', is_correct: false }] },
      { question_text: 'How does DeFi differ from traditional finance in terms of access?', explanation: 'DeFi is permissionless — anyone with a crypto wallet can use it. No credit check, no ID verification, no bank approval required.', options: [{ option_text: 'DeFi is permissionless — anyone with a wallet can use it, no approval needed', is_correct: true }, { option_text: 'DeFi requires a government-issued ID to sign up', is_correct: false }, { option_text: 'DeFi is only available to institutional investors', is_correct: false }, { option_text: 'DeFi requires a minimum credit score of 700', is_correct: false }] },
      { question_text: 'Which was the first decentralized stablecoin, launched in 2017?', explanation: 'DAI, launched by MakerDAO in 2017, was the first decentralized stablecoin — maintained at $1 through crypto collateral and smart contracts rather than a company holding dollars.', options: [{ option_text: 'DAI by MakerDAO', is_correct: true }, { option_text: 'USDC by Circle', is_correct: false }, { option_text: 'USDT by Tether', is_correct: false }, { option_text: 'BUSD by Binance', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 2. DEXs & AMMs
  // ═══════════════════════════════════════════════════════
  {
    title: 'DEXs & Automated Market Makers',
    emoji: '🔄',
    description: 'How decentralized exchanges work — and the clever math behind liquidity pools that replaced the traditional order book.',
    order_index: 2,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🔄 What Is a DEX?' } },
      { block_type: 'text', content: { text: 'A **DEX (Decentralized Exchange)** lets you trade one cryptocurrency for another directly from your wallet — no account, no sign-up, no company in the middle holding your funds.\n\nOn a traditional centralized exchange (CEX) like Coinbase or Binance:\n1. You deposit your crypto to the exchange\n2. The exchange matches your buy with someone else\'s sell (order book)\n3. You trust them to hold your funds safely\n\nOn a DEX like **Uniswap**:\n1. You keep your crypto in your own wallet\n2. A smart contract handles the trade automatically\n3. You receive the new token directly in your wallet\n4. No intermediary ever touches your funds\n\n**Popular DEXs:** Uniswap (Ethereum), Jupiter (Solana), Trader Joe (Avalanche), PancakeSwap (BNB Chain), Curve (stablecoins)' } },

      { block_type: 'heading', content: { text: '📐 Automated Market Makers (AMMs)' } },
      { block_type: 'text', content: { text: 'Most DEXs don\'t use a traditional order book. Instead, they use an **Automated Market Maker (AMM)** — a smart contract that uses a mathematical formula to set prices.\n\n**The x * y = k Formula:**\nUniswap\'s AMM keeps a liquidity pool of two tokens (e.g., ETH and USDC). The product of the two quantities always equals a constant (k):\n```\nETH quantity × USDC quantity = k (always)\n```\nWhen you buy ETH, you add USDC and remove ETH. The pool adjusts the ratio and price automatically based on supply and demand — no human market maker needed.\n\n**Example:** A pool has 10 ETH and 20,000 USDC (k = 200,000). You want to buy 1 ETH:\n- After your trade: 9 ETH must × new USDC = 200,000\n- So new USDC = 200,000 ÷ 9 = 22,222\n- You paid 22,222 - 20,000 = **2,222 USDC** for 1 ETH\n- Price moved because the pool is now more skewed toward USDC' } },

      { block_type: 'heading', content: { text: '💧 Liquidity Pools & Liquidity Providers' } },
      { block_type: 'text', content: { text: 'For an AMM to work, someone needs to supply the tokens in the pool. These people are **Liquidity Providers (LPs)**.\n\n**How it works:**\n1. An LP deposits equal values of two tokens into a pool (e.g., $5,000 of ETH + $5,000 of USDC)\n2. They receive **LP tokens** representing their share of the pool\n3. Every trade in the pool charges a small fee (typically 0.05%–1%)\n4. These fees are distributed proportionally to all LPs\n5. When LPs withdraw, they burn their LP tokens and receive their share of the pool plus earned fees\n\n**Real numbers:** Uniswap processes billions of dollars in trades daily, earning LPs millions in fees.' } },

      { block_type: 'heading', content: { text: '📉 Impermanent Loss' } },
      { block_type: 'text', content: { text: '**Impermanent Loss (IL)** is the biggest risk for liquidity providers. It happens when the price of your deposited tokens changes relative to each other.\n\n**Example:**\n- You deposit 1 ETH ($2,000) + 2,000 USDC into a pool (total: $4,000)\n- ETH price doubles to $4,000\n- Arbitrage traders buy ETH from the pool until the price reflects $4,000\n- You now have 0.707 ETH + 2,828 USDC = $5,656\n- BUT if you\'d just held: 1 ETH ($4,000) + 2,000 USDC = $6,000\n- **Impermanent loss = $6,000 - $5,656 = $344**\n\nThe loss is "impermanent" because if prices return to the original ratio, it disappears. But if you withdraw while prices are skewed, the loss becomes permanent.\n\n**Rule of thumb:** IL is worst when two assets have very different price movements. Pairs of similar assets (e.g., USDC/USDT or ETH/stETH) have minimal IL.' } },

      { block_type: 'heading', content: { text: '🚀 DEX Aggregators' } },
      { block_type: 'text', content: { text: 'A **DEX aggregator** searches multiple DEXs and liquidity pools simultaneously to find the best price for your trade, often splitting orders across multiple protocols.\n\n**Examples:**\n- **1inch** (Ethereum ecosystem)\n- **Jupiter** (Solana — handles 60%+ of all Solana DEX volume)\n- **Paraswap**\n\nAggregators often get better prices than going directly to a single DEX, especially for large trades.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=DLu35sIqVTM', title: 'What is Uniswap? (Animated) — Whiteboard Crypto', description: 'Whiteboard Crypto explains how Uniswap works without an order book, how liquidity pools of paired tokens enable permissionless trading, the constant product AMM formula, and the UNI governance token.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/markets/2023/05/11/decentralized-exchange-uniswap-trading-volume-outpaces-coinbase-for-4th-consecutive-month', title: 'Uniswap Trading Volume Outpaces Coinbase for 4th Consecutive Month — CoinDesk', description: 'Uniswap surpassed Coinbase in monthly spot trading volume for the fourth month in a row in April 2023 — proving a fully automated, code-run DEX can rival the world\'s largest centralized exchanges.' } },
      { block_type: 'article', content: { url: 'https://app.uniswap.org', title: 'Try Uniswap — The Largest DEX', description: 'The world\'s largest decentralized exchange — see live pools, fees, and trade volume.' } },
    ],
    questions: [
      { question_text: 'What is the key difference between a CEX and a DEX?', explanation: 'On a CEX you deposit funds to the exchange which holds them. On a DEX smart contracts handle trades and you keep your funds in your own wallet the entire time.', options: [{ option_text: 'On a DEX, smart contracts handle trades and you keep funds in your own wallet', is_correct: true }, { option_text: 'A DEX charges higher fees than a CEX', is_correct: false }, { option_text: 'A DEX requires ID verification while a CEX does not', is_correct: false }, { option_text: 'CEXs are faster than DEXs', is_correct: false }] },
      { question_text: 'What formula does Uniswap\'s AMM use to price trades?', explanation: 'Uniswap uses x * y = k, where x and y are the quantities of two tokens in a pool and k is a constant. Buying one token reduces its supply and raises its price automatically.', options: [{ option_text: 'x * y = k (product of token quantities stays constant)', is_correct: true }, { option_text: 'x + y = k (sum of token quantities stays constant)', is_correct: false }, { option_text: 'x / y = k (ratio of tokens stays constant)', is_correct: false }, { option_text: 'Price is set by a committee of validators', is_correct: false }] },
      { question_text: 'What do Liquidity Providers (LPs) receive in exchange for depositing tokens into a pool?', explanation: 'LPs receive LP tokens representing their proportional share of the pool. These tokens entitle them to their share of trading fees and can be burned to withdraw their liquidity.', options: [{ option_text: 'LP tokens representing their share of the pool and entitling them to trading fees', is_correct: true }, { option_text: 'A fixed interest rate paid in stablecoins', is_correct: false }, { option_text: 'Governance voting rights over the DEX', is_correct: false }, { option_text: 'A guaranteed profit equal to 10% per year', is_correct: false }] },
      { question_text: 'What is impermanent loss?', explanation: 'Impermanent loss occurs when the price ratio of your deposited tokens changes — you end up with less value than if you\'d simply held the tokens outside the pool.', options: [{ option_text: 'The value difference between holding tokens vs. providing them as liquidity when prices diverge', is_correct: true }, { option_text: 'A fee charged when you remove liquidity from a pool', is_correct: false }, { option_text: 'The loss from buying a token that later drops in price', is_correct: false }, { option_text: 'A penalty for withdrawing liquidity too early', is_correct: false }] },
      { question_text: 'What does a DEX aggregator do?', explanation: 'A DEX aggregator searches multiple DEXs and liquidity pools simultaneously, often splitting orders to find the best overall price for a trade.', options: [{ option_text: 'Searches multiple DEXs simultaneously to find the best price for your trade', is_correct: true }, { option_text: 'Combines multiple tokens into a single portfolio token', is_correct: false }, { option_text: 'Aggregates user votes to approve new token listings', is_correct: false }, { option_text: 'Connects your bank account to a DEX', is_correct: false }] },
      { question_text: 'Why is impermanent loss minimal when providing liquidity for two similar assets (like USDC/USDT)?', explanation: 'Impermanent loss is caused by price divergence between the two assets. Stablecoins like USDC and USDT both track $1, so their ratio rarely changes significantly — minimizing IL.', options: [{ option_text: 'Similar assets rarely diverge in price, so the pool ratio stays nearly constant', is_correct: true }, { option_text: 'Stablecoin pools charge zero trading fees', is_correct: false }, { option_text: 'The DEX manually compensates for impermanent loss on stable pairs', is_correct: false }, { option_text: 'Stablecoin pools are not subject to the x*y=k formula', is_correct: false }] },
      { question_text: 'How does an AMM set prices without a traditional order book?', explanation: 'An AMM uses a mathematical formula (like x*y=k) and the ratio of tokens in the liquidity pool to automatically determine price. When supply of one token drops, its price rises automatically.', options: [{ option_text: 'A mathematical formula based on the ratio of tokens in the liquidity pool', is_correct: true }, { option_text: 'A team of market makers manually quotes buy and sell prices', is_correct: false }, { option_text: 'Prices are imported from Coinbase every minute', is_correct: false }, { option_text: 'Token holders vote on prices each hour', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 3. LENDING & BORROWING
  // ═══════════════════════════════════════════════════════
  {
    title: 'DeFi Lending & Borrowing',
    emoji: '🏛️',
    description: 'Borrow without a bank and earn interest without a savings account — how protocols like Aave and Compound work.',
    order_index: 3,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🏛️ Borrowing Without a Bank' } },
      { block_type: 'text', content: { text: 'In traditional finance, getting a loan requires:\n- A credit check\n- Proof of income\n- Collateral (like a house or car)\n- Days or weeks of approval time\n- A bank deciding if you "deserve" the money\n\nIn DeFi lending, you can borrow within **seconds** by depositing crypto collateral. No credit check. No income verification. No bank. Just smart contracts.\n\n**Popular DeFi Lending Protocols:**\n- **Aave** — the largest DeFi lending protocol; supports 30+ assets across multiple chains\n- **Compound** — one of the original DeFi lenders; pioneered algorithmic interest rates\n- **MakerDAO** — borrow DAI (a stablecoin) against ETH and other collateral\n- **Spark Protocol** — MakerDAO\'s official lending front-end\n- **Morpho** — optimizes lending rates between Aave and Compound' } },

      { block_type: 'heading', content: { text: '⚙️ How DeFi Lending Works' } },
      { block_type: 'text', content: { text: '**Supplying (Lending):**\n1. You deposit tokens (e.g., USDC) into Aave\'s smart contract\n2. You receive **aTokens** (e.g., aUSDC) representing your deposit + accruing interest\n3. Interest accumulates every block (~12 seconds on Ethereum)\n4. Anyone can borrow your deposited tokens\n5. When you withdraw, you burn your aTokens and receive your USDC plus all earned interest\n\n**Borrowing:**\n1. First deposit collateral (e.g., $10,000 of ETH)\n2. Borrow up to a percentage of your collateral value (the **LTV — Loan-to-Value ratio**)\n3. Aave might allow 80% LTV on ETH, meaning you can borrow up to $8,000\n4. Pay interest on your borrowed amount\n5. Your collateral stays locked until you repay the loan\n\n**Interest rates** adjust automatically based on utilization (how much of the pool is borrowed). High demand = high rates to attract more lenders.' } },

      { block_type: 'heading', content: { text: '⚡ Flash Loans — Borrowing Without Collateral' } },
      { block_type: 'text', content: { text: '**Flash loans** are one of DeFi\'s most innovative (and complex) inventions. They allow you to borrow any amount of money with **zero collateral** — as long as you repay it within the same transaction block.\n\nIf you don\'t repay within the same transaction, the entire loan is automatically reversed as if it never happened.\n\n**Why are flash loans useful?**\n- **Arbitrage:** Borrow $1M, use it to exploit a price difference between two DEXs, repay $1M + fee, keep the profit — all in one transaction.\n- **Collateral swaps:** Swap your collateral type without needing extra capital.\n- **Self-liquidation:** Pay off your loan to avoid liquidation without needing extra funds.\n\n**Flash loan attacks:** The same mechanism can be abused. Attackers borrow massive amounts to manipulate prices within one transaction, stealing from vulnerable protocols. This has caused hundreds of millions in DeFi losses.' } },

      { block_type: 'heading', content: { text: '🔴 Liquidation Risk' } },
      { block_type: 'text', content: { text: 'In DeFi lending, your loan is **overcollateralized** — you must lock up more value than you borrow. This protects lenders if the borrower can\'t pay.\n\n**What is liquidation?**\nIf your collateral value drops too much (approaching your loan value), your position becomes at risk. Automated **liquidators** (bots or users) repay part of your loan in exchange for your collateral at a discount.\n\n**Example:**\n- You deposit 10 ETH ($20,000) and borrow $12,000 USDC (60% LTV)\n- ETH price crashes 40% — your collateral is now worth $12,000\n- Your health factor drops to the danger zone\n- A liquidator repays $6,000 of your USDC debt and takes 6.5 ETH (~$7,800) as reward\n- You keep the remaining 3.5 ETH but lost $1,800 to the liquidation penalty\n\n**Protection strategies:** Keep LTV low, monitor positions, use Aave\'s e-mode for correlated assets (like stETH/ETH).' } },

      { block_type: 'heading', content: { text: '🏦 Real-World Use' } },
      { block_type: 'text', content: { text: 'DeFi lending is used by:\n- **Crypto investors:** Borrow stablecoins against ETH/BTC to access cash without selling (and without a taxable event)\n- **Traders:** Get leverage for trading without going to a centralized margin exchange\n- **Yield farmers:** Borrow one asset to provide liquidity elsewhere and earn higher returns\n- **Institutions:** Some hedge funds use Aave for short-term liquidity\n\n**Aave by the numbers:** Over $20 billion in total value locked at its peak; has facilitated hundreds of billions in loans across Ethereum, Polygon, Avalanche, and other chains.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=dTCwssZ116A', title: 'What is AAVE? (Animated) — Whiteboard Crypto', description: 'Whiteboard Crypto explains how DeFi lending works, why loans are overcollateralized and how liquidation triggers fire, flash loans (uncollateralized same-block borrowing), and the AAVE governance token.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/tech/2020/08/24/no-collateral-required-how-aave-brought-unsecured-borrowing-to-defi', title: 'No Collateral Required: How Aave Brought Unsecured Borrowing to DeFi — CoinDesk', description: 'How Aave\'s credit delegation feature created the first mechanism for truly unsecured DeFi borrowing — a milestone in DeFi\'s evolution beyond simple collateralized loans.' } },
      { block_type: 'article', content: { url: 'https://app.aave.com', title: 'Aave Protocol — app.aave.com', description: 'Explore live lending rates, borrow capacity, and liquidity pools on Aave.' } },
    ],
    questions: [
      { question_text: 'Why does DeFi lending NOT require a credit check?', explanation: 'DeFi loans are overcollateralized — you must lock up more value than you borrow. The smart contract automatically liquidates your collateral if you can\'t repay, so there\'s no need to evaluate your creditworthiness.', options: [{ option_text: 'Loans are overcollateralized — your locked crypto guarantees repayment automatically', is_correct: true }, { option_text: 'DeFi protocols are exempt from financial regulations', is_correct: false }, { option_text: 'All DeFi users are pre-approved by their wallet provider', is_correct: false }, { option_text: 'DeFi loans are unsecured and rely on social reputation', is_correct: false }] },
      { question_text: 'What is a "Loan-to-Value (LTV) ratio" in DeFi lending?', explanation: 'LTV is the percentage of your collateral value that you are allowed to borrow. An 80% LTV on $10,000 of ETH means you can borrow up to $8,000.', options: [{ option_text: 'The percentage of your collateral value you are allowed to borrow', is_correct: true }, { option_text: 'The interest rate charged on your loan', is_correct: false }, { option_text: 'The ratio of lenders to borrowers in a pool', is_correct: false }, { option_text: 'The fee paid to liquidators', is_correct: false }] },
      { question_text: 'What is a flash loan?', explanation: 'A flash loan allows borrowing any amount with zero collateral, as long as it is repaid within the same transaction block. If not repaid, the entire transaction is reversed automatically.', options: [{ option_text: 'A zero-collateral loan that must be borrowed and repaid in the same transaction', is_correct: true }, { option_text: 'A very fast loan that is approved in under 1 second', is_correct: false }, { option_text: 'A loan using Lightning Network Bitcoin as collateral', is_correct: false }, { option_text: 'A short-term loan charged at 0% interest', is_correct: false }] },
      { question_text: 'What happens when a DeFi borrower\'s position is "liquidated"?', explanation: 'When collateral value falls too close to the loan value, automated liquidators repay part of the debt in exchange for the borrower\'s collateral at a discount — protecting lenders from losses.', options: [{ option_text: 'Liquidators repay part of the debt and take the borrower\'s collateral at a discount', is_correct: true }, { option_text: 'The loan is forgiven and the borrower keeps their collateral', is_correct: false }, { option_text: 'The protocol freezes all activity until the market recovers', is_correct: false }, { option_text: 'The borrower is banned from the protocol permanently', is_correct: false }] },
      { question_text: 'When you supply tokens to Aave, what do you receive in return?', explanation: 'Aave gives you aTokens (e.g., aUSDC for supplying USDC) that represent your deposit plus continuously accruing interest. Burning them returns your principal plus earnings.', options: [{ option_text: 'aTokens representing your deposit plus accruing interest', is_correct: true }, { option_text: 'A fixed APY certificate paid annually', is_correct: false }, { option_text: 'AAVE governance tokens as a reward', is_correct: false }, { option_text: 'Nothing — interest accumulates in your wallet automatically', is_correct: false }] },
      { question_text: 'Why do DeFi interest rates adjust automatically?', explanation: 'Rates are algorithmic — when a high percentage of the pool is borrowed (high utilization), rates rise to attract more lenders. When utilization is low, rates fall to incentivize borrowing.', options: [{ option_text: 'They adjust based on utilization — high demand raises rates to attract more lenders', is_correct: true }, { option_text: 'A central bank sets the rates weekly', is_correct: false }, { option_text: 'Token holders vote on rates monthly', is_correct: false }, { option_text: 'Rates are fixed forever when the protocol launches', is_correct: false }] },
      { question_text: 'What is a common legitimate use case for flash loans?', explanation: 'Arbitrage is a key use case — borrow a large amount, exploit a price difference between two DEXs in the same transaction, repay the loan plus fee, and keep the profit — all atomically.', options: [{ option_text: 'Arbitrage — exploiting price differences between DEXs in a single transaction', is_correct: true }, { option_text: 'Buying large amounts of a token to pump its price', is_correct: false }, { option_text: 'Avoiding taxes on crypto profits', is_correct: false }, { option_text: 'Converting crypto to cash at an ATM', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 4. STABLECOINS
  // ═══════════════════════════════════════════════════════
  {
    title: 'Stablecoins',
    emoji: '💵',
    description: 'The dollar of the crypto world — how stablecoins maintain their $1 peg, the different types, and why they\'re DeFi\'s most important tool.',
    order_index: 4,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '💵 What Is a Stablecoin?' } },
      { block_type: 'text', content: { text: 'Cryptocurrencies like Bitcoin and Ethereum are volatile — they can gain or lose 20% in a day. This makes them impractical for everyday payments or saving.\n\n**Stablecoins** solve this by pegging their value to a stable asset — usually the **US dollar**. 1 USDC always equals $1. 1 USDT always equals $1. This stability makes stablecoins the backbone of DeFi — used for trading, lending, payments, and yield farming.\n\n**Total stablecoin market cap:** Over $170 billion (2024) — they\'ve become critical infrastructure for both crypto and global payments.\n\n**The three types of stablecoins:**\n1. Fiat-backed (USDC, USDT)\n2. Crypto-backed (DAI)\n3. Algorithmic (Terra\'s UST — which failed catastrophically)' } },

      { block_type: 'heading', content: { text: '🏦 Type 1: Fiat-Backed Stablecoins' } },
      { block_type: 'text', content: { text: '**How they work:** A company holds $1 in a bank account for every 1 stablecoin in circulation.\n\n**Examples:**\n- **USDC (USD Coin)** — issued by Circle, backed 1:1 by US dollars and short-term Treasury bills. Monthly audited by accounting firms. Runs on Ethereum, Solana, Avalanche, and more.\n- **USDT (Tether)** — the oldest and largest stablecoin by volume. Issued by Tether Ltd. Has faced scrutiny over its reserve composition.\n- **PYUSD** — PayPal\'s stablecoin, launched 2023\n- **FDUSD** — issued by First Digital, popular on Binance\n\n**Pros:** Simple, reliable peg, widely accepted\n**Cons:** Centralized — the issuing company can freeze your tokens (blacklist your address). Requires trust in the company actually holding the reserves.' } },

      { block_type: 'heading', content: { text: '🔐 Type 2: Crypto-Backed Stablecoins' } },
      { block_type: 'text', content: { text: '**How they work:** Instead of a company holding dollars, a smart contract holds crypto collateral (overcollateralized) to back the stablecoin.\n\n**DAI (by MakerDAO):**\n- You lock ETH (or other approved collateral) in a MakerDAO vault\n- You mint DAI against it (e.g., lock $15,000 of ETH, mint $10,000 DAI — 150% collateralization)\n- The overcollateralization protects against price drops\n- If your collateral drops below the minimum ratio, it\'s automatically liquidated\n- DAI maintains its $1 peg through supply/demand mechanics and stability fees\n\n**Pros:** Decentralized — no single company can freeze it. Transparent — all collateral is on-chain.\n**Cons:** Capital inefficient (must lock more than you borrow). Vulnerable to extreme market crashes (black swan events).' } },

      { block_type: 'heading', content: { text: '⚠️ Type 3: Algorithmic Stablecoins & the Terra/UST Collapse' } },
      { block_type: 'text', content: { text: '**How they worked:** Instead of holding collateral, algorithmic stablecoins used code and incentives to maintain the peg.\n\n**Terra\'s UST (2022 — $60B collapse):**\n- UST was meant to stay at $1 through an algorithmic relationship with LUNA (Terra\'s native token)\n- If UST went below $1, users could burn UST to mint LUNA, reducing UST supply and pushing price back to $1\n- If UST went above $1, users could burn LUNA to mint UST\n- This worked during normal times, but in May 2022:\n  1. Large UST sell pressure began (possibly coordinated)\n  2. People panicked and sold both UST and LUNA\n  3. LUNA was minted so fast its price crashed toward zero\n  4. UST lost its peg completely\n  5. **$60 billion in value evaporated in days**\n  6. Thousands of investors lost their life savings\n\n**Lesson:** Algorithmic stablecoins without real collateral backing are extremely fragile. Most have since failed or been abandoned.' } },

      { block_type: 'heading', content: { text: '🌍 Real-World Stablecoin Use' } },
      { block_type: 'text', content: { text: '**Payments:**\n- **Visa** processes billions in USDC settlements on Ethereum and Solana\n- **Stripe** re-launched crypto payouts using USDC in 2023\n- **PayPal** launched its own PYUSD stablecoin in 2023\n- Businesses in countries with unstable currencies (Argentina, Nigeria, Turkey) use USDC to protect against hyperinflation\n\n**DeFi:**\n- Stablecoins are the most-used assets in DeFi lending, trading, and yield farming\n- Most trading pairs on DEXs include a stablecoin\n- Stablecoin yields in DeFi often exceed traditional bank savings rates\n\n**Remittances:** Sending $500 in USDC from the US to Mexico costs fractions of a cent and arrives in seconds — vs. Western Union charging $15+ and taking days.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=zgxmhLVizbk', title: 'What is a Stablecoin? | Tether (USDT), USD Coin (USDC), DAI MakerDAO — Whiteboard Crypto', description: 'Whiteboard Crypto\'s updated 2024 guide covers all three stablecoin types — fiat-backed (USDT, USDC), crypto-backed (DAI), and algorithmic — explaining how each maintains its $1 peg and why algorithmic stablecoins tend to be fragile.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/business/2023/09/05/visa-taps-solana-and-usdc-stablecoin-to-boost-cross-border-payments', title: 'Visa Taps Solana and USDC Stablecoin to Boost Cross-Border Payments — CoinDesk', description: 'Visa expanded its stablecoin settlement pilot by routing USDC over the Solana blockchain — becoming one of the first global payments networks to settle real card transactions in a stablecoin.' } },
      { block_type: 'article', content: { url: 'https://defillama.com/stablecoins', title: 'Stablecoin Rankings — DeFi Llama', description: 'Track all stablecoins by market cap, chain, and supply in real time.' } },
    ],
    questions: [
      { question_text: 'Why are stablecoins important in DeFi?', explanation: 'Stablecoins maintain a $1 value, making them stable enough for trading, lending, payments, and savings within the volatile crypto ecosystem.', options: [{ option_text: 'They maintain a stable $1 value, making them usable for trading, lending, and payments', is_correct: true }, { option_text: 'They generate the highest returns in DeFi', is_correct: false }, { option_text: 'They are backed by gold rather than dollars', is_correct: false }, { option_text: 'They are the only tokens accepted on DEXs', is_correct: false }] },
      { question_text: 'How does USDC (a fiat-backed stablecoin) maintain its $1 peg?', explanation: 'Circle holds $1 in cash or short-term US Treasury bills for every USDC in circulation, and users can always redeem USDC for $1. This direct backing keeps the peg stable.', options: [{ option_text: 'Circle holds $1 in reserves for every USDC — users can always redeem 1:1', is_correct: true }, { option_text: 'An algorithm automatically mints and burns USDC to maintain the price', is_correct: false }, { option_text: 'USDC is backed by Bitcoin held in a cold wallet', is_correct: false }, { option_text: 'The U.S. government guarantees the price', is_correct: false }] },
      { question_text: 'What makes DAI different from USDC as a stablecoin?', explanation: 'DAI is decentralized — backed by crypto collateral locked in smart contracts rather than by a company holding dollars. No one can freeze your DAI because there is no central issuer.', options: [{ option_text: 'DAI is decentralized — backed by crypto collateral in smart contracts, not a company', is_correct: true }, { option_text: 'DAI is backed by gold instead of dollars', is_correct: false }, { option_text: 'DAI is issued by the U.S. Federal Reserve', is_correct: false }, { option_text: 'DAI has no peg and floats freely in price', is_correct: false }] },
      { question_text: 'Why did Terra\'s UST stablecoin collapse in 2022?', explanation: 'UST had no real collateral backing. It relied purely on an algorithm and LUNA token mechanics. When confidence broke, a death spiral began where both UST and LUNA went to near zero.', options: [{ option_text: 'It had no real collateral — a death spiral caused both UST and LUNA to collapse to near zero', is_correct: true }, { option_text: 'The U.S. government banned it and forced it to shut down', is_correct: false }, { option_text: 'A hack drained all the reserve funds', is_correct: false }, { option_text: 'The company behind it went bankrupt due to bad investments', is_correct: false }] },
      { question_text: 'What does "overcollateralized" mean for crypto-backed stablecoins like DAI?', explanation: 'You must lock up more crypto value than the stablecoins you receive. E.g., lock $15,000 of ETH to mint $10,000 of DAI. The extra buffer protects the system if ETH\'s price drops.', options: [{ option_text: 'You must lock up more crypto value than the stablecoins you mint as a safety buffer', is_correct: true }, { option_text: 'The stablecoin is worth more than $1', is_correct: false }, { option_text: 'Multiple companies must all approve the collateral', is_correct: false }, { option_text: 'Extra DAI is minted as insurance for future losses', is_correct: false }] },
      { question_text: 'Which of the following is a real-world use of USDC stablecoins?', explanation: 'Visa uses USDC on Ethereum and Solana to settle payments between financial institutions — a major real-world adoption of stablecoin technology.', options: [{ option_text: 'Visa uses USDC to settle payments between financial institutions', is_correct: true }, { option_text: 'The Federal Reserve uses USDC to print US dollars', is_correct: false }, { option_text: 'USDC is used exclusively within the Ethereum network for gas fees', is_correct: false }, { option_text: 'Governments use USDC as foreign exchange reserves', is_correct: false }] },
      { question_text: 'What is a key risk of fiat-backed stablecoins like USDC that crypto-backed DAI does not have?', explanation: 'Fiat-backed stablecoins are centralized — the issuing company (Circle for USDC) can blacklist addresses and freeze tokens. DAI is fully decentralized and cannot be frozen by any single entity.', options: [{ option_text: 'The issuing company can freeze or blacklist your tokens — centralization risk', is_correct: true }, { option_text: 'Fiat-backed stablecoins can lose their peg more easily than crypto-backed ones', is_correct: false }, { option_text: 'USDC charges higher fees than DAI for every transaction', is_correct: false }, { option_text: 'Fiat-backed stablecoins cannot be used in DeFi protocols', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 5. YIELD FARMING
  // ═══════════════════════════════════════════════════════
  {
    title: 'Yield Farming & Liquidity Mining',
    emoji: '🌾',
    description: 'How DeFi users earn returns by putting their crypto to work — and the risks that come with chasing high APYs.',
    order_index: 5,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🌾 What Is Yield Farming?' } },
      { block_type: 'text', content: { text: '**Yield farming** is the practice of putting your crypto assets to work across DeFi protocols to earn returns — called **yield**. Instead of letting tokens sit idle in a wallet, yield farmers actively deploy them to earn interest, trading fees, and token rewards.\n\n**The basic idea:** Earn returns on your crypto the way a savings account earns interest — but usually at much higher rates (and much higher risk).\n\n**Where does yield come from?**\n1. **Lending interest** — borrowers pay interest to lenders on Aave/Compound\n2. **Trading fees** — DEX LPs earn a share of every swap through their pool\n3. **Protocol token rewards** — protocols give out their own governance tokens as incentives to attract users\n4. **Staking rewards** — proof-of-stake networks reward validators and delegators\n\nDuring DeFi Summer 2020, some protocols offered **1,000%+ APY** in token rewards — drawing in billions of dollars in just weeks.' } },

      { block_type: 'heading', content: { text: '⛏️ What Is Liquidity Mining?' } },
      { block_type: 'text', content: { text: '**Liquidity mining** is a specific type of yield farming where a protocol rewards users with its **native governance token** for providing liquidity.\n\n**Example — Compound\'s COMP distribution (2020):**\n- Compound launched the COMP token\n- Users who supplied or borrowed on Compound earned COMP tokens as a bonus\n- COMP had significant market value\n- This meant some users were being PAID to borrow (the COMP rewards exceeded the interest they owed)\n- This sparked DeFi Summer as users flooded in\n\n**Why do protocols do this?**\nToken rewards bootstrap liquidity — attract users and capital to a new protocol before it has organic revenue. Once established, protocols reduce token emissions as organic fees take over.\n\n**Risk:** If the protocol token loses value, those rewards become worthless. Many 1,000% APY yields from 2020-2021 collapsed when token prices crashed.' } },

      { block_type: 'heading', content: { text: '🔄 Yield Aggregators' } },
      { block_type: 'text', content: { text: '**Yield aggregators** automatically move your funds between protocols to maximize returns — saving you time and gas fees.\n\n**Yearn Finance:**\n- Deposit a token (e.g., USDC)\n- Yearn\'s "Vaults" automatically deploy it to the highest-yielding strategy\n- Strategies might involve Aave, Curve, Convex, and other protocols\n- Profits are automatically reinvested (auto-compounding)\n- You just hold yUSDC and watch your balance grow\n\n**Convex Finance:**\n- Built on top of Curve Finance\n- Lets users boost their Curve LP rewards without locking up CRV tokens themselves\n- Has become a dominant force in the "Curve Wars" — protocols competing for Curve emissions\n\n**Auto-compounding** is powerful: 20% APY compounded daily grows to 22.1% effective annual yield. Yield aggregators compound for you automatically.' } },

      { block_type: 'heading', content: { text: '⚠️ Risks of Yield Farming' } },
      { block_type: 'text', content: { text: '**1. Smart Contract Risk:** If the protocol has a bug, hackers can drain the entire pool. Higher yields often mean newer, less-audited code.\n\n**2. Impermanent Loss:** Providing liquidity to a volatile pair means IL can wipe out your fee earnings.\n\n**3. Token Price Risk:** If you\'re farming a governance token as reward, its price could crash. Many 2021 farm tokens lost 90-99% of value.\n\n**4. Rug Pulls:** Anonymous developers create a pool, attract millions, then drain the liquidity pool and disappear. Always check if a protocol is audited and doxxed.\n\n**5. Gas Fees:** On Ethereum, moving funds between protocols can cost $50-200+ per transaction. High-yield strategies only make sense for large amounts.\n\n**6. Liquidation Cascades:** Leveraged yield farming (borrowing to farm more) can trigger cascading liquidations in a downturn.\n\n**Rule of thumb:** If the APY seems too good to be true — it usually is. 5-15% on stablecoins is sustainable. 500% on a new token is almost certainly unsustainable.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=LaeI5D6NDvw', title: 'What is Yield Farming in Crypto? (Animated + 4 Examples) — Whiteboard Crypto', description: 'Whiteboard Crypto explains what yield farming is, the 4 main methods (LP fees, lending rewards, staking, redistribution), how liquidity mining distributes governance tokens, and the key risks: impermanent loss and rug pulls.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/business/2020/10/20/with-comp-below-100-a-look-back-at-the-defi-summer-it-sparked', title: 'With COMP Below $100, a Look Back at the DeFi Summer It Sparked — CoinDesk', description: 'A retrospective on how Compound\'s June 2020 COMP token distribution ignited the yield farming craze that locked billions in DeFi and created the template every subsequent protocol copied.' } },
      { block_type: 'article', content: { url: 'https://yearn.fi', title: 'Yearn Finance — yearn.fi', description: 'The original DeFi yield aggregator — explore current vault strategies and yields.' } },
    ],
    questions: [
      { question_text: 'What is yield farming in DeFi?', explanation: 'Yield farming is actively deploying crypto assets across DeFi protocols to earn returns from interest, trading fees, and token rewards.', options: [{ option_text: 'Deploying crypto assets across DeFi protocols to earn interest, fees, and token rewards', is_correct: true }, { option_text: 'Mining new cryptocurrencies using farming equipment', is_correct: false }, { option_text: 'Investing in agricultural companies that use blockchain', is_correct: false }, { option_text: 'Staking tokens on Proof of Work blockchains', is_correct: false }] },
      { question_text: 'What is "liquidity mining"?', explanation: 'Liquidity mining is when a protocol rewards users with its native governance token for providing liquidity — used to bootstrap adoption and attract capital to new protocols.', options: [{ option_text: 'Earning a protocol\'s governance tokens as a reward for providing liquidity', is_correct: true }, { option_text: 'Mining Bitcoin using liquid-cooled hardware', is_correct: false }, { option_text: 'Converting illiquid NFTs into liquid stablecoins', is_correct: false }, { option_text: 'Staking tokens in a proof-of-stake network', is_correct: false }] },
      { question_text: 'What is a yield aggregator like Yearn Finance?', explanation: 'Yield aggregators automatically move funds between protocols to maximize returns, often auto-compounding profits so users don\'t have to manually manage strategies.', options: [{ option_text: 'A protocol that automatically moves funds to maximize returns and auto-compounds profits', is_correct: true }, { option_text: 'A bank that aggregates user savings for mutual fund investments', is_correct: false }, { option_text: 'A DEX that aggregates prices from multiple exchanges', is_correct: false }, { option_text: 'A platform for aggregating NFT collections', is_correct: false }] },
      { question_text: 'Why can 1,000% APY yield farms be unsustainable?', explanation: 'Most extremely high APYs come from governance token emissions. When those token prices crash (which they often do as inflation dilutes supply), the real APY drops to near zero.', options: [{ option_text: 'The rewards are governance tokens that usually crash in price, making the real yield near zero', is_correct: true }, { option_text: 'DeFi protocols are legally prohibited from paying more than 100% APY', is_correct: false }, { option_text: 'The blockchain runs out of space to record all the transactions', is_correct: false }, { option_text: 'High APY protocols always get hacked within 30 days', is_correct: false }] },
      { question_text: 'What is "auto-compounding" in yield farming?', explanation: 'Auto-compounding means the protocol automatically reinvests your earned rewards back into the same strategy, earning yield on your yield. Over time, this significantly increases total returns.', options: [{ option_text: 'Automatically reinvesting earned rewards to earn yield on your yield', is_correct: true }, { option_text: 'Automatically switching between different cryptocurrencies', is_correct: false }, { option_text: 'Compressing blockchain data to save gas fees', is_correct: false }, { option_text: 'A Compound protocol feature that doubles your deposit', is_correct: false }] },
      { question_text: 'What sparked "DeFi Summer" in 2020?', explanation: 'Compound launched the COMP governance token and distributed it to users who supplied or borrowed — creating a frenzy as users flooded in to earn token rewards, sparking the broader DeFi yield farming boom.', options: [{ option_text: 'Compound launched COMP token rewards for lenders and borrowers, sparking a yield farming frenzy', is_correct: true }, { option_text: 'Bitcoin\'s halving caused miners to switch to DeFi', is_correct: false }, { option_text: 'The U.S. government announced DeFi was legal', is_correct: false }, { option_text: 'Ethereum launched proof-of-stake, making yields possible', is_correct: false }] },
      { question_text: 'What is a "rug pull" in yield farming?', explanation: 'A rug pull is when anonymous developers create a pool or protocol, attract user funds, then drain all the liquidity and disappear with the money — leaving investors with worthless tokens.', options: [{ option_text: 'Developers drain the liquidity pool and disappear with user funds', is_correct: true }, { option_text: 'Smart contract bugs that accidentally refund all fees', is_correct: false }, { option_text: 'When a token\'s liquidity dries up naturally due to low trading volume', is_correct: false }, { option_text: 'A protocol permanently locks user funds as a penalty for leaving early', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 6. BRIDGES & CROSS-CHAIN
  // ═══════════════════════════════════════════════════════
  {
    title: 'Bridges & Cross-Chain DeFi',
    emoji: '🌉',
    description: 'How assets move between blockchains — and why bridges have become the most-hacked targets in all of crypto.',
    order_index: 6,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🌉 The Multi-Chain Problem' } },
      { block_type: 'text', content: { text: 'Blockchains are like **islands** — Ethereum, Solana, Avalanche, and Bitcoin each exist independently. By default, an ETH on Ethereum cannot be used on Solana, and a SOL token cannot interact with an Ethereum smart contract.\n\nThis is a major limitation: DeFi users want to access the best yields and apps across all chains, not just one. **Bridges** solve this problem by connecting blockchains and allowing assets to flow between them.\n\n**Why does cross-chain matter?**\n- A great yield farm might exist on Avalanche but your funds are on Ethereum\n- A gaming NFT might live on Polygon but you want to trade it on Ethereum\n- A stablecoin protocol might offer better rates on Solana than Ethereum\n\nCross-chain DeFi lets users access opportunities anywhere in the ecosystem.' } },

      { block_type: 'heading', content: { text: '⚙️ How Bridges Work' } },
      { block_type: 'text', content: { text: 'Most bridges work through a **lock-and-mint** mechanism:\n\n1. You deposit Token A on Chain 1 (e.g., ETH on Ethereum)\n2. The bridge locks your ETH in a smart contract on Ethereum\n3. The bridge mints a "wrapped" version (e.g., **WETH** on Avalanche) on Chain 2\n4. You use WETH on Avalanche as if it were ETH\n5. When done, burn the WETH on Avalanche\n6. The bridge unlocks and returns your real ETH on Ethereum\n\n**The security problem:** The smart contract holding your locked ETH becomes a massive target. If a hacker can exploit that contract, they can drain all locked funds while the wrapped tokens on the other chain become worthless.' } },

      { block_type: 'heading', content: { text: '💥 Major Bridge Hacks' } },
      { block_type: 'text', content: { text: 'Bridges have suffered some of the largest hacks in crypto history:\n\n**Ronin Bridge — $625 million (March 2022)**\n- The bridge connecting Ethereum to Axie Infinity\'s blockchain\n- Hackers (later identified as North Korea\'s Lazarus Group) gained control of 5 of 9 validator private keys\n- Drained 173,600 ETH and $25.5M USDC\n- The hack wasn\'t discovered for **6 days**\n\n**Wormhole Bridge — $320 million (February 2022)**\n- Connecting Ethereum and Solana\n- A bug in the smart contract allowed minting 120,000 wETH on Solana without locking any ETH on Ethereum\n- Jump Crypto (Wormhole\'s backer) covered the losses\n\n**Nomad Bridge — $190 million (August 2022)**\n- A bug made it trivial to drain funds — hundreds of copycats joined in a chaotic "free-for-all"\n\n**Total bridge losses 2021-2023:** Over **$2 billion** across dozens of hacks.' } },

      { block_type: 'heading', content: { text: '🔮 Safer Cross-Chain Solutions' } },
      { block_type: 'text', content: { text: '**Native bridges** (e.g., Polygon\'s official bridge, Optimism bridge) are considered more secure because they inherit the security of the parent chain.\n\n**LayerZero** — a messaging protocol that allows blockchains to communicate without wrapping tokens. Instead of locking/minting, it sends messages between chains and lets the destination chain handle the logic.\n\n**Chainlink CCIP (Cross-Chain Interoperability Protocol)** — designed for enterprise use, with multiple layers of security and auditing. Used by Swift (banking) and major financial institutions.\n\n**Atomic swaps** — trustless peer-to-peer exchanges between chains using cryptographic techniques, without any bridge contract.\n\n**The security trade-off:** Faster, more feature-rich bridges tend to have more complex code and more attack surface. Simpler bridges are safer but slower.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=nT26cIz8HjI', title: 'What is a Crypto Bridge? (Examples + Purpose for Blockchains) — Whiteboard Crypto', description: 'Whiteboard Crypto explains what a blockchain bridge is, why bridges are needed, how centralized pool and lock-and-mint models work, and why bridges have become the biggest hack targets in DeFi history.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/tech/2022/03/29/axie-infinitys-ronin-network-suffers-625m-exploit', title: 'Axie Infinity\'s Ronin Network Suffers $625M Exploit — CoinDesk', description: 'The largest bridge hack in history — an attacker compromised five of Ronin\'s nine validator nodes and drained 173,600 ETH and $25.5M USDC, totaling $625M (later attributed to North Korea\'s Lazarus Group).' } },
      { block_type: 'article', content: { url: 'https://bridge.jumper.exchange', title: 'Cross-Chain Bridge Aggregator — Jumper', description: 'Compare bridge options across chains for speed, cost, and security.' } },
    ],
    questions: [
      { question_text: 'Why do blockchain bridges exist?', explanation: 'Different blockchains are isolated by default. Bridges allow assets and data to move between them, so users can access DeFi opportunities across multiple chains.', options: [{ option_text: 'Blockchains are isolated by default — bridges let assets move between them', is_correct: true }, { option_text: 'Bridges allow blockchains to share the same validators', is_correct: false }, { option_text: 'Bridges convert crypto to traditional bank money', is_correct: false }, { option_text: 'Bridges combine multiple blockchains into a single chain', is_correct: false }] },
      { question_text: 'How does the "lock-and-mint" bridge mechanism work?', explanation: 'The bridge locks your original tokens in a smart contract on Chain 1, then mints an equivalent "wrapped" token on Chain 2. When you return, the wrapped token is burned and original tokens unlocked.', options: [{ option_text: 'Lock tokens on Chain 1, mint wrapped tokens on Chain 2; burn wrapped tokens to unlock originals', is_correct: true }, { option_text: 'Tokens are deleted from Chain 1 and recreated on Chain 2', is_correct: false }, { option_text: 'Tokens travel through a shared blockchain in the middle', is_correct: false }, { option_text: 'A company manually holds your tokens during the transfer', is_correct: false }] },
      { question_text: 'Why are bridges a major hack target in DeFi?', explanation: 'Bridge contracts lock up billions in crypto from multiple chains. A single vulnerability in the contract can allow hackers to drain all locked funds while the wrapped tokens on the other side become worthless.', options: [{ option_text: 'They lock up massive amounts of crypto in a single smart contract — a huge target', is_correct: true }, { option_text: 'Bridges are always built by anonymous developers with no accountability', is_correct: false }, { option_text: 'Bridges don\'t use encryption, making them easy to hack', is_correct: false }, { option_text: 'Regulators intentionally leave bridge security gaps to track criminals', is_correct: false }] },
      { question_text: 'How much was stolen in the Ronin Bridge hack in 2022?', explanation: 'The Ronin Bridge hack (connected to Axie Infinity) resulted in $625 million being stolen — later attributed to North Korea\'s Lazarus Group. It wasn\'t even discovered for 6 days.', options: [{ option_text: '$625 million', is_correct: true }, { option_text: '$320 million', is_correct: false }, { option_text: '$50 million', is_correct: false }, { option_text: '$1 billion', is_correct: false }] },
      { question_text: 'What is Chainlink CCIP designed for?', explanation: 'Chainlink\'s CCIP (Cross-Chain Interoperability Protocol) is designed for secure enterprise cross-chain communication, with multiple security layers. It\'s used by institutions like Swift.', options: [{ option_text: 'Secure enterprise cross-chain messaging with multiple security layers', is_correct: true }, { option_text: 'A decentralized exchange that works across all chains', is_correct: false }, { option_text: 'A system for converting stablecoins between different pegs', is_correct: false }, { option_text: 'A replacement for the Ethereum blockchain', is_correct: false }] },
      { question_text: 'What does "wrapped" mean in the context of bridged tokens (e.g., WETH)?', explanation: 'Wrapped tokens represent locked original tokens on another chain. WETH on Solana represents ETH that is locked in a bridge contract on Ethereum — it\'s a "receipt" you can use until you bridge back.', options: [{ option_text: 'A representation of locked tokens on another chain — a receipt redeemable for the originals', is_correct: true }, { option_text: 'Tokens that have been encrypted for privacy', is_correct: false }, { option_text: 'Tokens that are automatically staked and earning yield', is_correct: false }, { option_text: 'Tokens that can only be used for purchases, not trading', is_correct: false }] },
      { question_text: 'What is an "atomic swap"?', explanation: 'An atomic swap is a trustless peer-to-peer exchange between two blockchains using cryptography. Either both sides of the swap happen, or neither does — eliminating the need for a bridge contract.', options: [{ option_text: 'A trustless peer-to-peer cross-chain exchange — either both sides happen or neither does', is_correct: true }, { option_text: 'The fastest type of centralized exchange trade', is_correct: false }, { option_text: 'Swapping atomic units (satoshis) of Bitcoin', is_correct: false }, { option_text: 'An exchange that automatically finds the best price', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 7. DEFI RISKS & HACKS
  // ═══════════════════════════════════════════════════════
  {
    title: 'DeFi Risks & Famous Hacks',
    emoji: '🛡️',
    description: 'The dark side of DeFi — understanding smart contract exploits, rug pulls, flash loan attacks, and how to protect yourself.',
    order_index: 7,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🛡️ DeFi Is Powerful — and Dangerous' } },
      { block_type: 'text', content: { text: 'DeFi\'s greatest strength — open, permissionless code that no one controls — is also its greatest weakness. Because smart contracts are public and immutable, any bug in the code can be exploited by anyone, anywhere, at any time.\n\n**By the numbers:** Over **$6 billion** has been stolen from DeFi protocols through hacks, exploits, and rug pulls. Yet the space continues to grow because the underlying technology is genuinely transformative.\n\n**Understanding the risks is essential** — not to avoid DeFi entirely, but to make informed decisions about where to put your money and how much to risk.' } },

      { block_type: 'heading', content: { text: '🐛 Smart Contract Exploits' } },
      { block_type: 'text', content: { text: 'Smart contracts are code. Code has bugs. In DeFi, bugs are potentially worth billions.\n\n**The DAO Hack (2016) — $60M:**\n- One of the earliest and most significant DeFi hacks\n- A "reentrancy" bug allowed an attacker to repeatedly drain funds before the balance was updated\n- Led to the controversial Ethereum hard fork (splitting Ethereum and Ethereum Classic)\n\n**Poly Network Hack (2021) — $611M:**\n- The largest DeFi hack at the time\n- An attacker exploited a flaw in cross-chain contract permissions\n- Surprisingly, the hacker returned almost all funds after being publicly identified\n\n**Euler Finance (2023) — $197M:**\n- A flash loan attack exploited a flaw in Euler\'s donation logic\n- Hacker later returned most funds after negotiations\n\n**How to reduce smart contract risk:** Use only audited protocols with years of battle-tested security, never put all funds in a single protocol, and check DeFi risk dashboards like DeFiSafety.' } },

      { block_type: 'heading', content: { text: '💥 Flash Loan Attacks' } },
      { block_type: 'text', content: { text: 'Flash loans (borrow millions with no collateral, repay in the same transaction) have been weaponized to attack protocols.\n\n**How a flash loan attack works:**\n1. Borrow $100M with no collateral via flash loan\n2. Use that $100M to manipulate the price on a small DEX\n3. The victim protocol reads this manipulated price as the "real" price\n4. Exploit the price difference to drain the victim protocol\n5. Repay the flash loan, keeping the profit\n\n**bZx Attacks (2020):** The first major flash loan attacks — attackers extracted $1M+ by manipulating oracle prices.\n\n**Mango Markets (2022) — $114M:** An attacker used their own capital (not a flash loan) to manipulate the price of MNGO token, then borrowed all available funds against their inflated position.' } },

      { block_type: 'heading', content: { text: '🪤 Rug Pulls & Exit Scams' } },
      { block_type: 'text', content: { text: '**Rug pulls** are when developers of a DeFi project drain the liquidity pool or treasury and disappear.\n\n**Common rug pull patterns:**\n- **Liquidity rug:** Developers control the liquidity pool and suddenly remove all liquidity, crashing the token price to zero\n- **Mint exploit:** Developer code includes hidden ability to mint unlimited tokens, which they sell\n- **Upgrade exploit:** A "proxy" contract has a backdoor allowing the developer to upgrade the logic and steal funds\n\n**AnubisDAO (2021) — $60M in 20 hours:**\n- A new project raised $60M in ETH\n- Less than 20 hours after launch, all funds were moved out of the liquidity pool\n- The developer disappeared; project was never explained\n\n**Warning signs of rug pulls:**\n- Anonymous team with no track record\n- No audit or very new/brief audit\n- Locked liquidity only for a short period\n- Promises of extremely high APY with no clear mechanism\n- Rushed launch with heavy influencer promotion' } },

      { block_type: 'heading', content: { text: '📉 The Luna/UST Collapse (2022)' } },
      { block_type: 'text', content: { text: 'The **Terra Luna/UST collapse** in May 2022 was the largest single wealth destruction event in crypto history.\n\n**What happened:**\n- Terra\'s UST stablecoin promised 20% APY through its Anchor Protocol — drawing in billions of retail deposits\n- UST\'s peg to $1 relied on an algorithm: burn UST → mint LUNA, burn LUNA → mint UST\n- In May 2022, large coordinated sell pressure hit UST\n- As UST de-pegged, LUNA was minted rapidly to restore the peg\n- But LUNA\'s price crashed as supply exploded, making the mechanism worthless\n- A "death spiral" began — UST went from $1 to near zero, LUNA went from $80 to near zero\n- **$60 billion in value evaporated in ~72 hours**\n- Thousands of retail investors lost life savings; regulators globally cited this in calls for crypto oversight\n\n**The lesson:** Promises of guaranteed high yield in DeFi should always raise red flags.' } },

      { block_type: 'heading', content: { text: '🔒 How to Stay Safe in DeFi' } },
      { block_type: 'text', content: { text: '**Basic safety checklist:**\n- ✅ Only use audited protocols (check Certik, Trail of Bits, or OpenZeppelin audits)\n- ✅ Start small — test new protocols with amounts you can afford to lose\n- ✅ Never keep all funds in a single protocol\n- ✅ Use a hardware wallet for large amounts\n- ✅ Check DeFi Llama for TVL history — protocols with consistent TVL over years are lower risk\n- ✅ Research the team — anonymous teams are higher risk\n- ✅ Be skeptical of APYs above 20% on stablecoins or 50%+ on other assets\n- ✅ Never click DeFi links in DMs or emails — always type URLs directly\n- ❌ Never share your seed phrase or private key with anyone or any website' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=YFaqng3YESE', title: 'What is a Rug Pull in Crypto? (Meaning + 3 Examples) — Whiteboard Crypto', description: 'Whiteboard Crypto explains what a rug pull is, the 3 main methods developers use to steal funds (liquidity yank, token dump, coded sell restrictions), red flags to watch for, and why accountability is nearly impossible.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/layer2/2022/05/11/the-luna-and-ust-crash-explained-in-5-charts', title: 'The LUNA and UST Crash Explained in 5 Charts — CoinDesk', description: 'Five data visualizations showing how massive Anchor Protocol withdrawals, exhausted Bitcoin reserves, and the algorithmic mint-and-burn feedback loop wiped out $60 billion in value in less than a week.' } },
      { block_type: 'article', content: { url: 'https://defillama.com/hacks', title: 'DeFi Hacks Tracker — DeFi Llama', description: 'A running database of every major DeFi hack, exploit, and rug pull with amounts and dates.' } },
    ],
    questions: [
      { question_text: 'What makes smart contract exploits so dangerous in DeFi?', explanation: 'Smart contracts are public and immutable — bugs cannot be fixed instantly. Anyone can find and exploit a bug at any time, and the protocol can\'t stop the attack once it starts.', options: [{ option_text: 'Bugs are public and can be exploited by anyone — contracts can\'t be instantly patched', is_correct: true }, { option_text: 'DeFi smart contracts are not covered by cybersecurity laws', is_correct: false }, { option_text: 'Hackers are paid by the government to test DeFi security', is_correct: false }, { option_text: 'Smart contracts delete all funds automatically when a bug is found', is_correct: false }] },
      { question_text: 'What is a rug pull?', explanation: 'A rug pull is when DeFi project developers drain liquidity or funds and disappear, leaving investors holding worthless tokens.', options: [{ option_text: 'Developers drain the liquidity pool or treasury and disappear with the money', is_correct: true }, { option_text: 'A token\'s price gradually drops to zero due to low demand', is_correct: false }, { option_text: 'A hacker steals private keys from a DEX', is_correct: false }, { option_text: 'A validator pulls blocks off the chain to censor transactions', is_correct: false }] },
      { question_text: 'How do flash loan attacks work?', explanation: 'Flash loan attacks borrow millions with no collateral to temporarily manipulate prices or exploit protocol logic within a single transaction, then repay the loan — keeping the stolen funds.', options: [{ option_text: 'Borrow millions no-collateral, manipulate prices to exploit a protocol, repay loan in one transaction', is_correct: true }, { option_text: 'Hack into the lending protocol\'s servers to steal private keys', is_correct: false }, { option_text: 'Slowly drain a protocol over many small transactions to avoid detection', is_correct: false }, { option_text: 'Bribe validators to include fraudulent transactions in a block', is_correct: false }] },
      { question_text: 'What was the core problem with Terra\'s UST that led to its collapse?', explanation: 'UST had no real collateral — it relied on an algorithm and LUNA token incentives that worked in normal conditions but created a death spiral when confidence broke.', options: [{ option_text: 'No real collateral — the algorithm created a death spiral when confidence broke', is_correct: true }, { option_text: 'The company holding reserves was hacked and lost the backing', is_correct: false }, { option_text: 'A government seized Terra\'s bank accounts', is_correct: false }, { option_text: 'Too many users tried to withdraw at once, like a bank run', is_correct: false }] },
      { question_text: 'What was the "reentrancy" bug exploited in the famous 2016 DAO hack?', explanation: 'The reentrancy bug allowed an attacker to call the withdrawal function repeatedly before the balance was updated — like an ATM that dispenses cash without recording the withdrawal each time.', options: [{ option_text: 'Repeatedly call a withdrawal function before the balance updates — like a repeating ATM glitch', is_correct: true }, { option_text: 'Re-entering user data into the contract to steal identity', is_correct: false }, { option_text: 'Entering the same transaction twice to double-spend tokens', is_correct: false }, { option_text: 'A bug that allowed miners to revert blocks containing DAO transactions', is_correct: false }] },
      { question_text: 'Which of the following is a red flag that a DeFi project might be a rug pull?', explanation: 'Anonymous teams with no track record, unaudited code, very short liquidity lock periods, and promises of extremely high APY are all warning signs of potential rug pulls.', options: [{ option_text: 'Anonymous team, no audit, short liquidity lock, and 10,000% APY promises', is_correct: true }, { option_text: 'The team is based in the United States', is_correct: false }, { option_text: 'The protocol has been running for three years with consistent TVL', is_correct: false }, { option_text: 'The protocol charges a 0.3% trading fee', is_correct: false }] },
      { question_text: 'What is the safest way to evaluate a DeFi protocol before depositing funds?', explanation: 'Checking for security audits from reputable firms, reviewing years of consistent TVL on DeFi Llama, and researching the doxxed (identified) team are the strongest safety indicators.', options: [{ option_text: 'Check for reputable security audits, years of consistent TVL, and a known team', is_correct: true }, { option_text: 'Only use protocols with APY over 100% to justify the risk', is_correct: false }, { option_text: 'Follow influencer recommendations on social media', is_correct: false }, { option_text: 'Wait for a government agency to approve the protocol', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 8. REAL-WORLD DEFI & RWAS
  // ═══════════════════════════════════════════════════════
  {
    title: 'Real-World DeFi & Tokenized Assets',
    emoji: '🌐',
    description: 'DeFi goes mainstream — how banks, governments, and global companies are bringing real-world assets on-chain.',
    order_index: 8,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🌐 DeFi Meets the Real World' } },
      { block_type: 'text', content: { text: 'For most of DeFi\'s history, the assets in DeFi were purely crypto — ETH, USDC, BTC, and tokens. In 2023-2024, a major shift began: **real-world assets (RWAs)** started moving onto blockchains.\n\nRWAs are tokenized versions of traditional financial assets:\n- US Treasury bills (T-bills)\n- Corporate bonds\n- Real estate\n- Private credit\n- Commodities (gold, oil)\n- Stocks\n\nThe vision: eventually, any asset in the world — your house, a share of Apple, a government bond — could be represented as a token on a blockchain, tradeable 24/7 with instant settlement.\n\n**Why does this matter?** The global financial market is estimated at **$900 trillion**. Even 1% tokenized would be $9 trillion — dwarfing current DeFi\'s $100B TVL.' } },

      { block_type: 'heading', content: { text: '🏦 BlackRock BUIDL: Wall Street Enters DeFi' } },
      { block_type: 'text', content: { text: 'In March 2024, **BlackRock** — the world\'s largest asset manager with $10 trillion+ in assets — launched the **BlackRock USD Institutional Digital Liquidity Fund (BUIDL)** on the Ethereum blockchain.\n\n**What is BUIDL?**\n- A tokenized money market fund\n- Invests in US Treasury bills, cash, and repurchase agreements\n- Each BUIDL token = $1 and earns daily yield (T-bill rate)\n- Runs on Ethereum as an ERC-20 token\n- Settles instantly on-chain vs. T+1 or T+2 for traditional funds\n\n**Why this matters:**\n- BlackRock chose Ethereum — validating the network as institutional-grade infrastructure\n- By mid-2024, BUIDL surpassed $500M in assets\n- Directly competes with Tether and Circle for stablecoin-like use cases but with yield\n- Opens the door for other major asset managers to follow' } },

      { block_type: 'heading', content: { text: '💳 Stablecoin Payments at Scale' } },
      { block_type: 'text', content: { text: '**Visa:**\n- Processes USDC settlements between financial institutions on Ethereum and Solana\n- Partner acquirers (Worldpay, Nuvei) can now settle in USDC instead of traditional fiat wires\n- Faster, cheaper, 24/7 vs. traditional banking hours\n\n**Stripe:**\n- Re-launched crypto payouts in 2023 using USDC on Ethereum, Solana, and Polygon\n- Allows businesses to pay international contractors in USDC instead of wire transfers\n- Fees are a fraction of traditional international wire costs\n\n**PayPal:**\n- Launched PYUSD (PayPal USD) stablecoin in 2023\n- Available to PayPal\'s 435 million users\n- Integrated with Venmo\n- Runs on Ethereum and Solana\n\n**Remittances:**\n- Circle and other providers enable instant USDC transfers internationally\n- El Salvador uses Bitcoin/stablecoins for remittances from the US\n- Countries with high inflation (Argentina, Nigeria) see high stablecoin adoption' } },

      { block_type: 'heading', content: { text: '🏢 JPMorgan, Goldman Sachs & Tokenized Bonds' } },
      { block_type: 'text', content: { text: '**JPMorgan Onyx:**\n- JPMorgan\'s blockchain division processes over **$1 billion per day** in tokenized repo transactions\n- Uses a private Ethereum-based blockchain for institutional settlements\n- Partnered with BlackRock and Barclays\n\n**Project Guardian (Singapore):**\n- Singapore\'s central bank (MAS) partnered with JPMorgan, DBS Bank, and SBI to test tokenized bonds and deposits\n- Executed live trades of tokenized government bonds using DeFi protocols\n\n**Goldman Sachs:**\n- Issued tokenized bonds on a private blockchain\n- Exploring tokenization for traditional securities\n\n**The European Investment Bank:**\n- Issued €100 million in digital bonds on the Ethereum blockchain in 2021 — one of the first sovereign/institutional tokenized bond issuances' } },

      { block_type: 'heading', content: { text: '🏠 Tokenized Real Estate & Private Credit' } },
      { block_type: 'text', content: { text: '**Real Estate Tokenization:**\n- Physical properties are divided into tokens — fractional ownership\n- Example: A $1M apartment building becomes 1,000,000 tokens at $1 each\n- Token holders receive rental income and can sell their fraction anytime\n- **Platforms:** RealT, Propy, Lofty.ai\n- Opens real estate investment to people who couldn\'t afford whole properties\n\n**Private Credit on DeFi:**\n- **Centrifuge** — connects real-world borrowers (invoice factoring, real estate) to DeFi lenders\n- **Goldfinch** — provides uncollateralized loans to businesses in emerging markets using DeFi capital\n- MakerDAO has approved real-world assets (including US Treasuries) as collateral for minting DAI\n- As of 2024, a significant portion of DAI\'s backing comes from real-world assets\n\n**The goal:** Bring DeFi\'s efficiency (24/7 markets, instant settlement, no middlemen) to the $900 trillion traditional finance system.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=HCFCHwt7R9I', title: 'Huge Potential! RWA Cryptos Will Go Higher Than You Think! — Coin Bureau', description: 'Coin Bureau covers what real-world assets are, the evolution from stablecoins to tokenized T-bills to private credit, the major RWA protocols (Centrifuge, Goldfinch, Maple, Ondo), and why institutions are moving assets on-chain.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/business/2024/11/13/blackrock-expands-tokenized-fund-buidl-beyond-ethereum-to-five-new-blockchains', title: 'BlackRock Expands Tokenized Fund BUIDL Beyond Ethereum to 5 New Blockchains — CoinDesk', description: 'BlackRock extended its BUIDL tokenized US Treasury fund from Ethereum to Aptos, Arbitrum, Avalanche, Optimism, and Polygon — $2.85 billion of real-world assets committed to on-chain infrastructure by the world\'s largest asset manager.' } },
      { block_type: 'article', content: { url: 'https://defillama.com/protocols/RWA', title: 'Real-World Asset Protocols — DeFi Llama', description: 'Track live TVL and activity across all RWA (Real-World Asset) DeFi protocols.' } },
    ],
    questions: [
      { question_text: 'What are "Real World Assets" (RWAs) in DeFi?', explanation: 'RWAs are tokenized versions of traditional financial assets — like Treasury bonds, real estate, stocks, or commodities — that are put on blockchains so they can be traded and used in DeFi.', options: [{ option_text: 'Traditional financial assets like bonds and real estate tokenized on blockchains', is_correct: true }, { option_text: 'Physical computers that run DeFi nodes in the real world', is_correct: false }, { option_text: 'Cryptocurrency backed by physical gold stored in a vault', is_correct: false }, { option_text: 'DeFi protocols that operate in real-world countries with regulations', is_correct: false }] },
      { question_text: 'What is BlackRock BUIDL and why is it significant?', explanation: 'BUIDL is BlackRock\'s tokenized money market fund on Ethereum — investing in T-bills and paying daily yield as an ERC-20 token. It\'s significant because it validates Ethereum as institutional-grade financial infrastructure.', options: [{ option_text: 'A tokenized US Treasury fund on Ethereum by the world\'s largest asset manager', is_correct: true }, { option_text: 'BlackRock\'s cryptocurrency trading platform', is_correct: false }, { option_text: 'A BlackRock-issued NFT collection for institutional investors', is_correct: false }, { option_text: 'A DeFi lending pool managed by BlackRock employees', is_correct: false }] },
      { question_text: 'How does tokenized real estate work?', explanation: 'A property is divided into tokens representing fractional ownership. Token holders receive proportional rental income and can sell their tokens anytime — making real estate investment accessible to smaller investors.', options: [{ option_text: 'A property is divided into tokens — holders get fractional ownership, rental income, and can sell anytime', is_correct: true }, { option_text: 'The blockchain is used to store property deeds but ownership remains the same', is_correct: false }, { option_text: 'The government converts all real estate to digital land in the metaverse', is_correct: false }, { option_text: 'Real estate developers raise money through meme coins instead of mortgages', is_correct: false }] },
      { question_text: 'Which payments giant uses USDC on Solana to settle transactions between financial institutions?', explanation: 'Visa uses USDC on Ethereum and Solana for settlement between acquiring partners like Worldpay and Nuvei — making crypto settlement part of mainstream payment infrastructure.', options: [{ option_text: 'Visa', is_correct: true }, { option_text: 'Mastercard', is_correct: false }, { option_text: 'American Express', is_correct: false }, { option_text: 'Western Union', is_correct: false }] },
      { question_text: 'What advantage does tokenized bond settlement have over traditional bond settlement?', explanation: 'Tokenized bonds settle instantly on-chain (T+0) compared to T+1 or T+2 for traditional bonds. They also trade 24/7, have lower administrative costs, and enable fractional ownership.', options: [{ option_text: 'Instant settlement (T+0), 24/7 trading, lower costs, and fractional ownership', is_correct: true }, { option_text: 'Tokenized bonds have higher returns than traditional bonds', is_correct: false }, { option_text: 'They are insured by the FDIC, unlike traditional bonds', is_correct: false }, { option_text: 'They cannot be taxed because they exist on a decentralized network', is_correct: false }] },
      { question_text: 'What does JPMorgan\'s Onyx blockchain division primarily use blockchain technology for?', explanation: 'JPMorgan Onyx processes over $1 billion per day in tokenized repo transactions (short-term collateralized lending between institutions) on a private Ethereum-based network.', options: [{ option_text: 'Processing tokenized repo transactions — over $1 billion per day', is_correct: true }, { option_text: 'Issuing JPMorgan\'s own cryptocurrency for retail customers', is_correct: false }, { option_text: 'Mining Bitcoin on behalf of institutional clients', is_correct: false }, { option_text: 'Running a public DeFi protocol competing with Aave', is_correct: false }] },
      { question_text: 'Why might a country with high inflation (like Argentina) see widespread stablecoin adoption?', explanation: 'If a country\'s currency loses value rapidly (hyperinflation), citizens can convert to USDC or other dollar-pegged stablecoins to preserve purchasing power — accessible to anyone with a smartphone.', options: [{ option_text: 'Stablecoins let citizens hold dollar-pegged value to protect against currency devaluation', is_correct: true }, { option_text: 'Stablecoins always earn 20% interest, helping citizens build wealth', is_correct: false }, { option_text: 'The government gives free stablecoins to citizens as a welfare program', is_correct: false }, { option_text: 'Stablecoins are cheaper to produce than paper money', is_correct: false }] },
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

    await db.rpc('run_sql', { query: "ALTER TABLE learn_lessons ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📚'" }).then(() => {}, () => {});

    const { classId } = await request.json().catch(() => ({}));

    // 1. Create or find module
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

        const optInserts = q.options.map((o, oi) => ({
          question_id: newQ.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: oi + 1,
        }));
        await db.from('learn_options').insert(optInserts);
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
    info: 'POST to this endpoint to seed the DeFi Deep Dive module.',
    lessons: LESSONS.map(l => `${l.emoji} ${l.title}`),
  });
}
