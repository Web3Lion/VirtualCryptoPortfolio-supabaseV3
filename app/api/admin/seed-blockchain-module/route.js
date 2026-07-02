import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// ─────────────────────────────────────────────────────────
// BLOCKCHAIN LESSON DATA
// ─────────────────────────────────────────────────────────
const MODULE = {
  title: 'Blockchain Deep Dives',
  emoji: '⛓',
  description: 'An in-depth look at the world\'s leading blockchains — how they work, what makes each unique, and the real-world problems they solve.',
  order_index: 10,
};

const LESSONS = [

  // ═══════════════════════════════════════════════════════
  // 1. BITCOIN
  // ═══════════════════════════════════════════════════════
  {
    title: 'Bitcoin (BTC)',
    emoji: '₿',
    description: 'The original cryptocurrency — digital gold, decentralized money, and the blockchain that started it all.',
    order_index: 1,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '₿ What Is Bitcoin?' } },
      { block_type: 'text', content: { text: 'Bitcoin was created in 2008 by a mysterious person (or group) known as **Satoshi Nakamoto**, who published a 9-page whitepaper titled "Bitcoin: A Peer-to-Peer Electronic Cash System." The first block — called the **Genesis Block** — was mined on January 3, 2009.\n\nBitcoin is the world\'s first decentralized digital currency. Unlike dollars or euros, no government or bank controls it. Instead, thousands of computers around the world run the Bitcoin software and keep a shared record of every transaction ever made.\n\nBitcoin has a fixed supply cap of **21 million coins** — no more will ever exist. This makes it deflationary by design, similar to gold. Many people call it "**digital gold**" because of its scarcity and its role as a store of value.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **Store of Value:** Many investors hold Bitcoin as a hedge against inflation, similar to gold.\n- **Peer-to-Peer Payments:** Send money to anyone in the world in minutes without a bank.\n- **Remittances:** Immigrants sending money home pay far lower fees using Bitcoin.\n- **El Salvador:** Became the first country to make Bitcoin legal tender in 2021 — citizens can pay taxes and buy groceries with BTC.\n- **Institutional Reserve Asset:** Companies like MicroStrategy hold Bitcoin on their balance sheets instead of cash.' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **BTC** is used to:\n- Pay transaction fees to miners\n- Transfer value between users\n- Act as a reserve/savings asset\n\n**Lightning Network** is a Layer 2 built on top of Bitcoin that enables instant, near-zero-fee microtransactions — like buying a coffee with BTC.\n\n**Ordinals (2023):** A new protocol that lets users inscribe data (images, text) directly onto individual satoshis (the smallest unit of BTC), creating Bitcoin-native NFTs called **inscriptions**.' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Yes — but Bitcoin was not originally designed for NFTs. In 2023, the **Ordinals protocol** launched and made it possible to inscribe unique digital content onto individual satoshis. These are called **Bitcoin Inscriptions** and function as NFTs. BRC-20 tokens (fungible tokens on Bitcoin) also emerged from this technology. The Bitcoin NFT ecosystem is still early but growing fast.' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2008** — Satoshi Nakamoto publishes the Bitcoin whitepaper\n- **2009** — Genesis Block mined; first Bitcoin transaction\n- **2010** — First real-world purchase: 10,000 BTC for 2 pizzas (now called "Bitcoin Pizza Day," May 22)\n- **2017** — SegWit upgrade; Bitcoin hits $20,000 for the first time\n- **2021** — El Salvador adopts Bitcoin as legal tender; Bitcoin hits $69,000 all-time high\n- **2024** — U.S. SEC approves spot Bitcoin ETFs from BlackRock, Fidelity, and others — a historic milestone for institutional adoption\n- **2024** — Bitcoin\'s 4th halving reduces block reward from 6.25 to 3.125 BTC' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'Bitcoin\'s protocol itself has never been hacked. However, exchanges and wallets have been compromised:\n\n- **Mt. Gox (2014):** The largest Bitcoin exchange at the time lost approximately 850,000 BTC (~$450 million). The exchange went bankrupt.\n- **Bitfinex (2016):** ~120,000 BTC were stolen from the exchange. In 2022, U.S. authorities recovered most of it — worth ~$3.6 billion at time of recovery.\n\nThese events were exchange failures, not flaws in Bitcoin\'s underlying code.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**Apps:** Lightning Network wallets (Strike, Muun, Breez), Cash App, River Financial, Swan Bitcoin, BitcoinOS\n\n**Companies & Institutions Using Bitcoin:**\n- **MicroStrategy** — holds over 170,000 BTC as a treasury reserve\n- **BlackRock & Fidelity** — offer Bitcoin ETFs\n- **El Salvador** — holds BTC as national reserve\n- **Block (formerly Square)** — Jack Dorsey\'s company actively develops Bitcoin infrastructure' } },

      { block_type: 'heading', content: { text: '⚙️ Consensus: Proof of Work' } },
      { block_type: 'text', content: { text: '**Proof of Work (PoW)** is Bitcoin\'s consensus mechanism. Miners compete to solve a complex mathematical puzzle. The first to solve it gets to add the next block of transactions and earns newly created Bitcoin as a reward.\n\n**Everyday Analogy:** Proof of Work is like a **global math competition**. Thousands of computers race to solve the same incredibly hard puzzle. The winner gets a prize (new Bitcoin) and gets to write the next page in the shared history book. If someone wants to cheat and rewrite history, they\'d have to redo all that work — which is practically impossible.\n\n**Developer Language:** Bitcoin uses **Bitcoin Script**, a simple stack-based language for transactions.' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Speed:** ~7 transactions per second (TPS) on the base layer (~420 per minute). The **Lightning Network** can theoretically process millions of TPS off-chain.\n\n**Scalability:** Bitcoin\'s base layer intentionally stays simple and secure. The Lightning Network handles fast/cheap transactions as a Layer 2 solution.\n\n**Energy:** Bitcoin uses significant energy — roughly comparable to a small country annually. However, an increasing share (estimated 50%+) comes from renewable sources, and miners often use otherwise-wasted energy (flared gas, excess hydro power).' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=5bdaV-_FcQ0', title: 'What Is Bitcoin? — Whiteboard Crypto', description: 'A visual explainer covering the double-spending problem, how blockchain works, Proof of Work mining, the 21 million cap, and why Bitcoin is called digital gold.' } },
      { block_type: 'article', content: { url: 'https://www.coindesk.com/policy/2021/06/23/why-bitcoin-could-be-good-for-el-salvador', title: 'Why Bitcoin Could Be Good for El Salvador — CoinDesk', description: 'How Bitcoin adoption could slash fees for the 70% of El Salvadorans without bank accounts — a real-world example of Bitcoin as a financial tool.' } },
      { block_type: 'article', content: { url: 'https://mempool.space', title: 'Bitcoin Block Explorer — mempool.space', description: 'Watch Bitcoin transactions happen in real time on the blockchain.' } },
    ],
    questions: [
      { question_text: 'Who created Bitcoin?', explanation: 'Bitcoin was created by the pseudonymous Satoshi Nakamoto, whose true identity remains unknown.', options: [{ option_text: 'Satoshi Nakamoto', is_correct: true }, { option_text: 'Vitalik Buterin', is_correct: false }, { option_text: 'Elon Musk', is_correct: false }, { option_text: 'Jeff Bezos', is_correct: false }] },
      { question_text: 'What is the maximum number of Bitcoin that will ever exist?', explanation: 'Bitcoin has a hard cap of 21 million coins, making it scarce like gold.', options: [{ option_text: '21 million', is_correct: true }, { option_text: '100 million', is_correct: false }, { option_text: '1 billion', is_correct: false }, { option_text: 'Unlimited', is_correct: false }] },
      { question_text: 'What consensus mechanism does Bitcoin use?', explanation: 'Bitcoin uses Proof of Work, where miners compete to solve mathematical puzzles to add new blocks.', options: [{ option_text: 'Proof of Work', is_correct: true }, { option_text: 'Proof of Stake', is_correct: false }, { option_text: 'Proof of History', is_correct: false }, { option_text: 'Hashgraph', is_correct: false }] },
      { question_text: 'What is the Lightning Network?', explanation: 'The Lightning Network is a Layer 2 solution built on Bitcoin that enables fast, cheap micropayments.', options: [{ option_text: 'A Layer 2 that enables fast, near-zero-fee Bitcoin payments', is_correct: true }, { option_text: 'A competitor to Bitcoin', is_correct: false }, { option_text: 'A type of Bitcoin wallet', is_correct: false }, { option_text: 'A country that uses Bitcoin', is_correct: false }] },
      { question_text: 'Which country became the first to make Bitcoin legal tender?', explanation: 'El Salvador made Bitcoin legal tender in 2021, allowing citizens to pay taxes and make purchases with BTC.', options: [{ option_text: 'El Salvador', is_correct: true }, { option_text: 'Panama', is_correct: false }, { option_text: 'United States', is_correct: false }, { option_text: 'Japan', is_correct: false }] },
      { question_text: 'According to the Whiteboard Crypto video, what problem did Bitcoin solve that earlier digital money could not?', explanation: 'The double-spending problem — digital money could be copied and spent twice. Bitcoin\'s blockchain prevents this by giving everyone a shared, tamper-proof record.', options: [{ option_text: 'The double-spending problem — digital money could be copied and spent twice', is_correct: true }, { option_text: 'Inflation — governments kept printing too much money', is_correct: false }, { option_text: 'The anonymity problem — online purchases exposed personal data', is_correct: false }, { option_text: 'The mining problem — gold was running out', is_correct: false }] },
      { question_text: 'In the Whiteboard Crypto video, what do miners receive when they successfully add a new block to the Bitcoin blockchain?', explanation: 'Miners earn a block reward of newly created Bitcoin plus transaction fees from the included transactions. This reward halves roughly every 4 years.', options: [{ option_text: 'A block reward of newly created Bitcoin plus transaction fees', is_correct: true }, { option_text: 'A salary paid in US dollars by Satoshi Nakamoto', is_correct: false }, { option_text: 'A share of every future Bitcoin transaction forever', is_correct: false }, { option_text: 'Nothing — mining is purely voluntary', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 2. ETHEREUM
  // ═══════════════════════════════════════════════════════
  {
    title: 'Ethereum (ETH)',
    emoji: 'Ξ',
    description: 'The programmable blockchain — home of DeFi, NFTs, and smart contracts that power the decentralized web.',
    order_index: 2,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: 'Ξ What Is Ethereum?' } },
      { block_type: 'text', content: { text: 'Ethereum was proposed in 2013 by **Vitalik Buterin**, a 19-year-old Russian-Canadian programmer who felt Bitcoin was too limited. He wanted a blockchain that could run any program — not just transfer money. Ethereum launched in 2015.\n\nEthereum is often called the **"world computer"** because it runs **smart contracts** — self-executing programs stored on the blockchain that automatically carry out agreements when conditions are met. No lawyer or bank needed.\n\nEthereum is the birthplace of **DeFi** (Decentralized Finance) and **NFTs**, and has the largest developer ecosystem of any blockchain.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **DeFi (Decentralized Finance):** Borrow, lend, and trade crypto without a bank using protocols like Aave and Uniswap\n- **NFTs:** Digital ownership of art, music, game items, and more\n- **DAOs (Decentralized Autonomous Organizations):** Companies governed by code and token votes\n- **Identity & Credentials:** Store verified credentials on-chain\n- **Enterprise:** JPMorgan and Visa use Ethereum-based systems for settlement\n- **Stablecoins:** USDC and USDT run primarily on Ethereum' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **ETH** is used to:\n- Pay **gas fees** (transaction fees) for every operation on the network\n- Stake to become a validator and earn rewards\n- Use as collateral in DeFi protocols\n\n**Smart Contracts** are written in **Solidity** (most common) or **Vyper**.\n\n**Token Standards:**\n- **ERC-20** — fungible tokens (like USDC, LINK, UNI)\n- **ERC-721** — NFTs (unique, non-fungible tokens)\n- **ERC-1155** — multi-token standard (gaming items)' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Yes — Ethereum **invented the modern NFT**. The ERC-721 standard was created in 2018, and Ethereum remains the dominant NFT blockchain. Famous collections like Bored Ape Yacht Club, CryptoPunks, and most major art NFTs were launched on Ethereum. OpenSea, the world\'s largest NFT marketplace, was built on Ethereum.' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2015** — Ethereum mainnet launches\n- **2016** — "The DAO" smart contract hack leads to controversial hard fork, creating Ethereum (ETH) and Ethereum Classic (ETC)\n- **2020** — "DeFi Summer": billions flood into decentralized finance protocols\n- **2021** — NFT boom; Bored Apes and CryptoPunks sell for millions\n- **2022** — **"The Merge"**: Ethereum switches from Proof of Work to Proof of Stake, reducing energy usage by ~99.95%\n- **2024** — **Dencun upgrade** dramatically reduces Layer 2 transaction fees via "blobs"' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'Ethereum\'s base protocol is secure, but applications built on top can have vulnerabilities:\n\n- **The DAO Hack (2016):** A smart contract bug allowed an attacker to drain ~$60 million in ETH. The community controversially rolled back the chain (hard fork) to return funds.\n- **Ronin Bridge (2022):** $625 million stolen from the bridge connecting Ethereum to the Axie Infinity game — one of the largest crypto hacks ever.\n- **Wormhole Bridge (2022):** $320 million stolen from a cross-chain bridge.\n\nThese were application-level vulnerabilities, not flaws in Ethereum itself.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**Top DApps:** Uniswap (DEX), Aave (lending), MakerDAO (DAI stablecoin), OpenSea (NFTs), MetaMask (wallet), Chainlink (oracles), Lido (staking)\n\n**Layer 2 Networks:** Arbitrum, Optimism, Base (Coinbase), Polygon zkEVM — these make Ethereum faster and cheaper\n\n**Companies Using Ethereum:**\n- **JPMorgan** — Onyx blockchain built on Ethereum technology\n- **Visa** — Settlement of USDC on Ethereum\n- **Microsoft** — Azure blockchain services\n- **EY (Ernst & Young)** — Nightfall protocol for private enterprise transactions' } },

      { block_type: 'heading', content: { text: '⚙️ Consensus: Proof of Stake' } },
      { block_type: 'text', content: { text: 'Since The Merge in 2022, Ethereum uses **Proof of Stake (PoS)**. Validators lock up ("stake") at least 32 ETH as collateral. The network randomly selects validators to propose and verify new blocks. Dishonest validators risk losing their staked ETH ("slashing").\n\n**Everyday Analogy:** Proof of Stake is like **owning shares in a company**. The more ETH you stake, the more chances you get to be chosen to validate transactions — and earn rewards. If you try to cheat, you lose your shares. It rewards good behavior and punishes cheating financially.\n\n**Developer Language:** Solidity (primary), Vyper' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Speed:** ~15–30 TPS on the Ethereum base layer. Layer 2 networks like Arbitrum and Base can handle 10,000–40,000+ TPS.\n\n**Scalability:** Ethereum\'s roadmap focuses on Layer 2 rollups (off-chain processing that posts proofs back to Ethereum) and future sharding to increase capacity.\n\n**Energy:** After The Merge, Ethereum uses **~99.95% less energy** than it did under Proof of Work — roughly equivalent to a small town rather than a country.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=sTOcqS4msoU', title: 'What is the Ethereum Virtual Machine (EVM)? — Whiteboard Crypto', description: 'Whiteboard Crypto explains how the Ethereum Virtual Machine executes smart contracts, what gas fees pay for, and why the EVM is the foundation of decentralized applications.' } },
      { block_type: 'article', content: { url: 'https://decrypt.co/36990/large-companies-building-on-ethereum', title: 'Large Companies Building on Ethereum — Decrypt', description: 'How major companies like Ubisoft, ING Bank, and TD Ameritrade are building real applications on the Ethereum blockchain.' } },
      { block_type: 'article', content: { url: 'https://etherscan.io', title: 'Ethereum Block Explorer — Etherscan', description: 'Explore Ethereum transactions, smart contracts, and tokens in real time.' } },
    ],
    questions: [
      { question_text: 'Who created Ethereum?', explanation: 'Vitalik Buterin proposed Ethereum in 2013 at age 19 and launched it in 2015.', options: [{ option_text: 'Vitalik Buterin', is_correct: true }, { option_text: 'Satoshi Nakamoto', is_correct: false }, { option_text: 'Anatoly Yakovenko', is_correct: false }, { option_text: 'Charles Hoskinson', is_correct: false }] },
      { question_text: 'What are smart contracts?', explanation: 'Smart contracts are self-executing programs stored on the blockchain that automatically carry out agreements when conditions are met.', options: [{ option_text: 'Self-executing programs that run on the blockchain automatically', is_correct: true }, { option_text: 'Legal documents signed digitally', is_correct: false }, { option_text: 'A type of cryptocurrency', is_correct: false }, { option_text: 'A method of mining Ethereum', is_correct: false }] },
      { question_text: 'What major change happened in "The Merge" in 2022?', explanation: 'The Merge switched Ethereum from energy-intensive Proof of Work to Proof of Stake, reducing energy use by ~99.95%.', options: [{ option_text: 'Ethereum switched from Proof of Work to Proof of Stake', is_correct: true }, { option_text: 'Ethereum increased its supply cap', is_correct: false }, { option_text: 'Ethereum merged with Bitcoin', is_correct: false }, { option_text: 'Ethereum reduced its transaction fees to zero', is_correct: false }] },
      { question_text: 'Which ERC standard is used for NFTs on Ethereum?', explanation: 'ERC-721 is the NFT standard on Ethereum, representing unique non-fungible tokens.', options: [{ option_text: 'ERC-721', is_correct: true }, { option_text: 'ERC-20', is_correct: false }, { option_text: 'ERC-1155', is_correct: false }, { option_text: 'ERC-404', is_correct: false }] },
      { question_text: 'What is the primary programming language for Ethereum smart contracts?', explanation: 'Solidity is the most popular language for writing Ethereum smart contracts.', options: [{ option_text: 'Solidity', is_correct: true }, { option_text: 'Python', is_correct: false }, { option_text: 'Rust', is_correct: false }, { option_text: 'JavaScript', is_correct: false }] },
      { question_text: 'According to the Whiteboard Crypto EVM video, what do gas fees actually pay for on Ethereum?', explanation: 'Gas fees compensate the network for the computational work required to execute a smart contract or transaction — the more complex the operation, the more gas it costs.', options: [{ option_text: 'The computational work required to execute a transaction or smart contract', is_correct: true }, { option_text: 'A subscription fee paid to Vitalik Buterin', is_correct: false }, { option_text: 'The cost of storing data permanently on the internet', is_correct: false }, { option_text: 'A tip paid to the person you are sending ETH to', is_correct: false }] },
      { question_text: 'The Whiteboard Crypto video explains the EVM as a "world computer." What does this mean?', explanation: 'The EVM is a single virtual machine running across thousands of nodes worldwide — anyone can deploy code (smart contracts) to it and it executes identically on every node, making it decentralized and unstoppable.', options: [{ option_text: 'A decentralized computer that runs code identically across thousands of nodes worldwide', is_correct: true }, { option_text: 'A supercomputer owned by the Ethereum Foundation', is_correct: false }, { option_text: 'A computer that mines Ethereum using solar energy', is_correct: false }, { option_text: 'A cloud service similar to Amazon Web Services', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 3. XRP (RIPPLE)
  // ═══════════════════════════════════════════════════════
  {
    title: 'XRP & the XRP Ledger',
    emoji: '💧',
    description: 'Built for speed — the blockchain designed to move money across borders in seconds for banks and payment providers worldwide.',
    order_index: 3,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '💧 What Is XRP?' } },
      { block_type: 'text', content: { text: 'The **XRP Ledger (XRPL)** was created in 2011-2012 by **Jed McCaleb, Arthur Britto, and David Schwartz**, who then co-founded **Ripple Labs** to build payment solutions on top of it. XRP is the native digital asset of the XRP Ledger.\n\nXRP\'s primary purpose is to act as a **bridge currency** — a neutral, fast, and cheap intermediary that enables financial institutions to exchange different currencies across borders without needing pre-funded accounts in every country.\n\nUnlike Bitcoin, XRP\'s total supply was **pre-mined**: all 100 billion XRP tokens were created at launch, with Ripple Labs holding a large portion in escrow.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **Cross-Border Payments:** Banks and payment providers use RippleNet to send money internationally in seconds at a fraction of traditional costs (SWIFT can take 3-5 business days)\n- **On-Demand Liquidity (ODL):** XRP serves as a bridge to instantly convert one currency to another without pre-funding accounts in every country\n- **Currency Exchange:** Real-time conversion between any two currencies using XRP as the middle step\n- **Micropayments:** Fees as low as fractions of a cent make XRP suitable for very small transactions\n- **CBDCs:** Ripple is working with multiple central banks to explore using the XRPL for digital currencies' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **XRP** is used to:\n- Pay tiny transaction fees (destroyed/burned after each transaction, reducing supply over time)\n- Serve as a bridge currency between two different fiat currencies\n- Act as collateral and liquidity in ODL corridors\n\n**XRPL Features:**\n- Built-in decentralized exchange (DEX)\n- Escrow functionality\n- Payment channels\n- The XLS-20 standard enables NFTs on the XRP Ledger\n\nXRPL does not support traditional Solidity smart contracts, though **XRPL Hooks** are in development to add lightweight smart contract functionality.' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Yes. The **XLS-20 NFT standard** was added to the XRP Ledger in 2022, allowing users to mint, trade, and burn NFTs directly on the XRPL. XRP NFTs benefit from the ledger\'s speed (3-5 second finality) and extremely low fees. Marketplaces like XRP.cafe and Sologenic offer XRPL-native NFT trading.' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2012** — XRP Ledger launches; Ripple Labs founded\n- **2014–2018** — Major bank and payment provider partnerships (Santander, American Express, SBI Holdings)\n- **2020** — U.S. SEC files lawsuit against Ripple Labs, alleging XRP is an unregistered security\n- **2022** — XLS-20 NFT standard added to XRPL\n- **2023** — Landmark partial court ruling: XRP sold on exchanges to retail investors is **not** a security (major win for crypto industry)\n- **2024** — SEC drops lawsuit against Ripple; XRP ETF applications filed by multiple asset managers' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'The XRP Ledger protocol itself has not suffered major hacks. Notable concerns have been:\n\n- **Centralization debate:** Ripple Labs holds a significant portion of XRP in escrow (releasing ~1 billion per month), which critics argue gives the company too much influence over the market.\n- **SEC Lawsuit (2020-2024):** The U.S. SEC sued Ripple Labs, claiming XRP was sold as an unregistered security. The case concluded with Ripple paying a $125 million settlement — far less than the billions the SEC sought — and XRP being declared not a security in retail sales.\n\nThese were legal and business challenges, not technical vulnerabilities.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**Payment Apps & Services:** Bitso (Mexico/LatAm), SBI Remit (Japan), Coins.ph (Philippines), XUMM wallet, Ripple Payments\n\n**Financial Institutions Using XRP/RippleNet:**\n- **Santander** — One Touch cross-border payments app\n- **SBI Holdings** — Japan\'s largest online brokerage; major Ripple partner\n- **American Express** — Connected to RippleNet for FX International Payments\n- **MoneyGram** — Used ODL (On-Demand Liquidity) with XRP for remittance corridors' } },

      { block_type: 'heading', content: { text: '⚙️ Consensus: Ripple Protocol Consensus Algorithm' } },
      { block_type: 'text', content: { text: 'The XRPL uses the **Ripple Protocol Consensus Algorithm (RPCA)**, also called the **XRP Ledger Consensus Protocol**. A network of trusted **validators** (run by universities, exchanges, and companies) vote on which transactions to include. When 80%+ of validators agree, the ledger closes and a new one begins.\n\n**Everyday Analogy:** RPCA is like a **jury deciding a court case**. Instead of one judge (centralized), a group of trusted, independent jurors (validators) must reach a supermajority agreement before the verdict (ledger close) is final. No mining, no lottery — just organized agreement.\n\n**There is no mining on the XRP Ledger**, making it extremely energy efficient.' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Speed:** ~1,500 TPS (90,000 transactions per minute) with **3–5 second finality** — once confirmed, transactions cannot be reversed.\n\n**Scalability:** XRP was designed from day one for high-volume financial use. No current scalability bottleneck for its intended payment use case.\n\n**Energy:** Extremely energy efficient. No mining means XRP\'s carbon footprint is minimal. XRP is one of the most energy-efficient major blockchains — roughly 0.0079 kWh per transaction vs. Bitcoin\'s ~700 kWh.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=dlxYUQIMzqo', title: 'What is Ripple? XRP Explained with Animations — Whiteboard Crypto', description: 'Covers the Ripple Labs vs. XRP distinction, why international bank transfers are slow and expensive, how XRP bridges currencies in under 5 seconds, and the Unique Node List consensus mechanism.' } },
      { block_type: 'article', content: { url: 'https://ripple.com/insights/how-ripple-utilizes-xrp-for-cross-border-payments/', title: 'How Ripple Uses XRP for Cross-Border Payments — Ripple', description: 'Official Ripple explainer on how XRP settles international payments in 3–5 seconds at fractions of a penny, compared to SWIFT\'s 1–5 business days.' } },
      { block_type: 'article', content: { url: 'https://livenet.xrpl.org', title: 'XRP Ledger Explorer — XRPL.org', description: 'Watch XRP transactions settle in real time on the live network.' } },
    ],
    questions: [
      { question_text: 'What is XRP primarily designed for?', explanation: 'XRP was built as a bridge currency to enable fast, low-cost cross-border payments between financial institutions.', options: [{ option_text: 'Fast cross-border payments and currency exchange', is_correct: true }, { option_text: 'Running smart contracts and decentralized apps', is_correct: false }, { option_text: 'Mining new cryptocurrency', is_correct: false }, { option_text: 'Storing NFTs', is_correct: false }] },
      { question_text: 'How long does an XRP transaction take to finalize?', explanation: 'XRP transactions settle in 3–5 seconds, compared to minutes for Bitcoin or days for traditional bank wires.', options: [{ option_text: '3–5 seconds', is_correct: true }, { option_text: '10 minutes', is_correct: false }, { option_text: '1–3 business days', is_correct: false }, { option_text: '30 seconds', is_correct: false }] },
      { question_text: 'How does the XRP Ledger reach consensus?', explanation: 'The XRP Ledger uses the Ripple Protocol Consensus Algorithm where trusted validators vote and must reach 80%+ agreement.', options: [{ option_text: 'Trusted validators vote and must reach 80% agreement', is_correct: true }, { option_text: 'Miners compete to solve math puzzles', is_correct: false }, { option_text: 'Token holders vote with staked coins', is_correct: false }, { option_text: 'A single company controls the ledger', is_correct: false }] },
      { question_text: 'What is "On-Demand Liquidity" (ODL)?', explanation: 'ODL uses XRP as a bridge currency to instantly convert one fiat currency to another without pre-funding accounts overseas.', options: [{ option_text: 'Using XRP as a bridge to instantly convert between currencies', is_correct: true }, { option_text: 'A savings account that pays interest in XRP', is_correct: false }, { option_text: 'A type of XRP mining pool', is_correct: false }, { option_text: 'A loan product from Ripple Labs', is_correct: false }] },
      { question_text: 'How many XRP tokens exist in total?', explanation: 'All 100 billion XRP were pre-mined at launch. No new XRP can be created, but small amounts are permanently destroyed as transaction fees.', options: [{ option_text: '100 billion (all pre-mined at launch)', is_correct: true }, { option_text: '21 million', is_correct: false }, { option_text: 'Unlimited — new XRP is created continuously', is_correct: false }, { option_text: '1 trillion', is_correct: false }] },
      { question_text: 'In the Whiteboard Crypto video, what analogy is used to explain the difference between Ripple Labs (the company) and XRP (the cryptocurrency)?', explanation: 'The video uses Apple (company) vs. iPhone (product) — Ripple Labs built and uses XRP, but XRP is the token, not the company.', options: [{ option_text: 'Apple (the company) vs. iPhone (the product)', is_correct: true }, { option_text: 'The U.S. government vs. the U.S. dollar', is_correct: false }, { option_text: 'Google vs. its search engine', is_correct: false }, { option_text: 'A bank vs. a credit card', is_correct: false }] },
      { question_text: 'According to the Whiteboard Crypto XRP video, what makes the XRP Ledger\'s consensus different from Bitcoin\'s Proof of Work?', explanation: 'XRP uses a Unique Node List (UNL) of trusted validators who vote to agree on transactions — there is no mining or mathematical puzzle competition.', options: [{ option_text: 'Trusted validators on a Unique Node List vote to agree — no mining required', is_correct: true }, { option_text: 'XRP miners solve harder puzzles than Bitcoin miners', is_correct: false }, { option_text: 'XRP uses Proof of Stake with token holders voting', is_correct: false }, { option_text: 'A single trusted bank approves all XRP transactions', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 4. SOLANA
  // ═══════════════════════════════════════════════════════
  {
    title: 'Solana (SOL)',
    emoji: '◎',
    description: 'Built for speed and scale — the high-performance blockchain powering consumer apps, DeFi, NFTs, and payments at low cost.',
    order_index: 4,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '◎ What Is Solana?' } },
      { block_type: 'text', content: { text: 'Solana was founded by **Anatoly Yakovenko**, a former Qualcomm engineer, who published a whitepaper in 2017 introducing **Proof of History** — a novel way to keep time on a blockchain without all nodes needing to constantly communicate. Solana\'s mainnet launched in **March 2020**.\n\nSolana is built for **speed and low cost**. While Ethereum transactions can cost $5–50+, Solana transactions cost fractions of a cent. This makes it practical for games, consumer apps, payments, and high-frequency trading.\n\nSolana is often called an **"Ethereum competitor"** — it supports smart contracts and NFTs but prioritizes raw performance over decentralization.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **DeFi (Decentralized Finance):** Trading, lending, and liquidity protocols (Jupiter, Raydium, Drift)\n- **NFTs:** One of the largest NFT ecosystems — collections like Mad Lads, Tensorians, and DeGods\n- **Payments:** Visa announced using Solana to settle USDC stablecoin payments\n- **Gaming:** Fast and cheap transactions are ideal for in-game items and microtransactions\n- **Consumer Apps:** Blink (payments in tweets/links), Solana Pay (QR-code checkout)\n- **Decentralized Physical Infrastructure (DePIN):** Projects like Helium (wireless networks) and Hivemapper (mapping) run on Solana' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **SOL** is used to:\n- Pay gas fees (extremely low — typically $0.00025 per transaction)\n- Stake to validators to earn yield\n- Participate in governance and ecosystem voting\n\n**SPL Tokens** are Solana\'s equivalent of ERC-20 tokens (fungible tokens like USDC on Solana).\n\n**Compressed NFTs (cNFTs):** Solana allows bulk-minting millions of NFTs at near-zero cost — used for loyalty programs, event tickets, and gaming items.\n\n**Developer Language:** **Rust** (primary), C, C++. Smart contracts are called **"programs"** on Solana.' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Yes — Solana has one of the largest and most active NFT ecosystems. The **Metaplex** standard enables NFT creation on Solana. Marketplaces include **Magic Eden** and **Tensor**.\n\nSolana\'s unique advantage is **Compressed NFTs** — by storing NFT data in a compressed Merkle tree structure, millions of NFTs can be minted for the cost of a single Ethereum NFT. This makes NFT-based ticketing, loyalty rewards, and gaming items economically practical.' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2017** — Anatoly Yakovenko publishes the Proof of History whitepaper\n- **2020** — Solana mainnet launches in March\n- **2021** — NFT explosion: Solana becomes the #2 NFT blockchain; SOL price reaches $260\n- **2022** — FTX collapse (Sam Bankman-Fried was a major Solana backer); SOL drops from $40 to under $10; multiple network outages\n- **2023** — Strong recovery; Solana announces Firedancer (new validator client by Jump Crypto)\n- **2024** — Visa expands Solana USDC settlement; Solana reclaims $200+ price; memecoin season drives record activity' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'Solana\'s protocol has not been directly hacked, but the ecosystem has faced challenges:\n\n- **Network Outages:** Solana has suffered multiple network halts due to spam transactions overwhelming validators. The team has addressed many of these with software updates.\n- **Slope Wallet Breach (2022):** A third-party wallet app (Slope) exposed private keys, resulting in ~$8 million in user funds stolen. This was a wallet app vulnerability, not the Solana protocol.\n- **FTX Collapse (2022):** FTX was a major early investor in Solana. When FTX went bankrupt, confidence in SOL dropped sharply, though Solana has since fully recovered.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**Top DApps:** Jupiter (DEX aggregator), Raydium (AMM/DEX), Drift (perpetuals), Magic Eden (NFTs), Tensor (NFT trading), Phantom (wallet), Jito (liquid staking), Helium (wireless DePIN)\n\n**Companies Using Solana:**\n- **Visa** — Processes USDC settlements on Solana\n- **Shopify** — Integrated Solana Pay for merchants\n- **Google Cloud** — Operates a Solana validator node\n- **Stripe** — Re-launched crypto payouts using Solana USDC\n- **Blink by Solana** — Enables payments inside X (Twitter) links' } },

      { block_type: 'heading', content: { text: '⚙️ Consensus: Proof of History + Proof of Stake' } },
      { block_type: 'text', content: { text: 'Solana uses a combination of **Proof of Stake (PoS)** and its unique innovation: **Proof of History (PoH)**.\n\n**Proof of History** is not a consensus mechanism by itself — it\'s a **cryptographic clock**. Every event on Solana gets a verifiable timestamp built into the chain itself, so validators don\'t need to communicate to agree on the order of events.\n\n**Everyday Analogy:** Imagine every transaction comes with a **numbered ticket from a ticket machine** (like at a deli counter). Everyone can verify the order without arguing about who arrived first. Solana\'s PoH is that ticket machine — it creates an unbreakable, trustworthy timeline so validators can process transactions in parallel without waiting for each other.\n\n**Developer Language:** Rust (primary), C, C++' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Speed:** ~65,000 theoretical TPS; typical real-world is 2,000–4,000 TPS. The upcoming **Firedancer** validator client (built by Jump Crypto) targets over **1 million TPS**.\n\n**Scalability:** Solana uses a single global state (no shards or L2s) — everything happens on one chain. This simplifies development but requires powerful hardware from validators.\n\n**Energy:** Low energy — Proof of Stake based. A single Solana transaction uses approximately the same energy as a few Google searches.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=Hoq3s8KeUIE', title: 'What is Solana? SOL Explained — Whiteboard Crypto', description: 'Whiteboard Crypto covers Proof of History (the cryptographic clock), how PoH combines with Proof of Stake, Solana\'s massive throughput, near-zero fees, and the SOL token.' } },
      { block_type: 'article', content: { url: 'https://www.coindesk.com/business/2023/09/05/visa-taps-solana-and-usdc-stablecoin-to-boost-cross-border-payments', title: 'Visa Taps Solana and USDC to Boost Cross-Border Payments — CoinDesk', description: 'Visa expands its stablecoin settlement pilot to the Solana blockchain using USDC, with live merchants Worldpay and Nuvei already processing payments.' } },
      { block_type: 'article', content: { url: 'https://solscan.io', title: 'Solana Block Explorer — Solscan', description: 'Explore Solana transactions, tokens, and NFTs in real time.' } },
    ],
    questions: [
      { question_text: 'What is Proof of History (PoH)?', explanation: 'Proof of History is a cryptographic clock that timestamps every event, allowing validators to process transactions faster without waiting to agree on ordering.', options: [{ option_text: 'A cryptographic clock that timestamps events, allowing faster parallel processing', is_correct: true }, { option_text: 'A mining competition like Bitcoin\'s Proof of Work', is_correct: false }, { option_text: 'A voting system where token holders approve transactions', is_correct: false }, { option_text: 'A record of all past block rewards', is_correct: false }] },
      { question_text: 'Which company announced it would use Solana to settle USDC payments?', explanation: 'Visa announced it would use Solana to settle USDC stablecoin payments, a major vote of confidence from a global payments leader.', options: [{ option_text: 'Visa', is_correct: true }, { option_text: 'Mastercard', is_correct: false }, { option_text: 'PayPal', is_correct: false }, { option_text: 'American Express', is_correct: false }] },
      { question_text: 'What programming language do developers mainly use to build on Solana?', explanation: 'Rust is the primary language for Solana smart contracts (called "programs"), chosen for its speed and memory safety.', options: [{ option_text: 'Rust', is_correct: true }, { option_text: 'Solidity', is_correct: false }, { option_text: 'Python', is_correct: false }, { option_text: 'Move', is_correct: false }] },
      { question_text: 'What are Compressed NFTs (cNFTs)?', explanation: 'Compressed NFTs store data in a compressed Merkle tree, allowing millions to be minted at near-zero cost — perfect for tickets, loyalty programs, and gaming.', options: [{ option_text: 'A way to mint millions of NFTs at near-zero cost using compressed data storage', is_correct: true }, { option_text: 'NFTs that have been reduced in image file size', is_correct: false }, { option_text: 'A type of Ethereum NFT', is_correct: false }, { option_text: 'NFTs that expire after a set time', is_correct: false }] },
      { question_text: 'What is the name of the new Solana validator client being built by Jump Crypto?', explanation: 'Firedancer is a new validator client for Solana targeting over 1 million TPS, which would make Solana far faster than any other major blockchain.', options: [{ option_text: 'Firedancer', is_correct: true }, { option_text: 'Turbine', is_correct: false }, { option_text: 'Gulfstream', is_correct: false }, { option_text: 'Sealevel', is_correct: false }] },
      { question_text: 'According to the Whiteboard Crypto video, what is the main purpose of Proof of History on Solana?', explanation: 'PoH creates a cryptographic timestamp for every event so validators already know the order of transactions — they don\'t need to communicate and wait for each other to agree before processing.', options: [{ option_text: 'To create timestamps so validators know transaction order without waiting to communicate', is_correct: true }, { option_text: 'To record the history of every Solana price change', is_correct: false }, { option_text: 'To let users prove when they first bought SOL', is_correct: false }, { option_text: 'To replace Proof of Stake entirely', is_correct: false }] },
      { question_text: 'The Whiteboard Crypto Solana video explains that validators need powerful hardware. Why does this matter for decentralization?', explanation: 'High hardware requirements mean fewer people can afford to run a Solana validator compared to lower-requirement chains — this is a trade-off Solana makes in exchange for its high speed.', options: [{ option_text: 'Fewer people can afford to run validators, making it less decentralized than lower-cost chains', is_correct: true }, { option_text: 'Powerful hardware makes Solana more decentralized because it processes more transactions', is_correct: false }, { option_text: 'Hardware requirements have no effect on decentralization', is_correct: false }, { option_text: 'Only the Solana Foundation can run validator hardware', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 5. SUI
  // ═══════════════════════════════════════════════════════
  {
    title: 'Sui (SUI)',
    emoji: '🌊',
    description: 'The next-generation Layer 1 built by ex-Meta engineers — redefining how blockchains handle objects, ownership, and user experience.',
    order_index: 5,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🌊 What Is Sui?' } },
      { block_type: 'text', content: { text: 'Sui is a Layer 1 blockchain built by **Mysten Labs**, a company founded by engineers who previously worked on **Meta\'s (Facebook) Diem blockchain** project. The founding team includes **Evan Cheng, Adeniyi Abiodun, Kostas Chalkias, Sam Blackshear, and George Danezis** — all top cryptography and systems engineers.\n\nSui (pronounced "swee") launched its mainnet in **May 2023**. What makes Sui unique is its **object-centric data model** — instead of thinking about accounts and balances (like most blockchains), Sui thinks about **objects** (NFTs, tokens, game items) that are owned by addresses.\n\nThis allows Sui to process many transactions **in parallel** simultaneously, rather than one at a time — making it one of the fastest blockchains ever built.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **Gaming:** Object-centric model is perfect for game items, characters, and in-game economies\n- **DeFi:** Fast finality and low fees support trading, lending, and liquidity protocols\n- **NFTs:** Objects are native to Sui — NFTs are more flexible and composable than on other chains\n- **Identity (zkLogin):** Users can log into Sui dApps using Google, Apple, or Facebook accounts — no seed phrase needed\n- **Consumer Apps:** Sponsored transactions allow apps to pay gas fees on behalf of users (invisible blockchain experience)\n- **Social & Creator Economy:** Kiosk standard allows creators to enforce royalties on NFT resales' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **SUI** is used to:\n- Pay gas fees\n- Stake to validators to earn rewards\n- Participate in governance decisions\n\n**Key Innovations:**\n- **Parallel Execution:** Independent transactions run simultaneously, not sequentially\n- **zkLogin:** Sign in with Web2 accounts (Google/Apple) — no crypto wallet needed for users\n- **Sponsored Transactions:** Apps can cover gas fees so users don\'t need to hold SUI to interact\n- **Programmable Transaction Blocks (PTB):** Chain multiple operations into a single atomic transaction\n\n**Developer Language:** **Move** (Sui Move — a variant designed specifically for Sui\'s object model)' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Yes — and Sui\'s object model makes NFTs more powerful than on most other blockchains. On Sui, NFTs are **native objects** with their own identity, history, and programmable behaviors. They can contain other objects, be transferred with custom rules, and interact directly with smart contracts.\n\nThe **Kiosk standard** allows creators to set and enforce royalty fees on every secondary sale — a major improvement over other chains where royalties can be bypassed.' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2021** — Mysten Labs founded by ex-Meta Diem engineers\n- **2022** — $300 million funding round led by FTX Ventures and a16z (Andreessen Horowitz); Sui devnet launches\n- **2023** — Mainnet launches in May; SUI token begins trading\n- **2024** — **Mysticeti consensus** upgrade: reduces latency from ~500ms to ~390ms; Sui becomes one of fastest L1s\n- **2024** — Multiple gaming studios partner with Sui Foundation; zkLogin enables Web2 logins to become widespread' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'As a relatively new blockchain (launched 2023), Sui does not have major protocol hacks on its record. The network has maintained good uptime since mainnet launch.\n\nNotable consideration: **FTX Ventures** was an early investor. When FTX collapsed in 2022, the Mysten Labs team bought back FTX\'s equity stake, ensuring the project\'s independence. The protocol itself was unaffected by FTX\'s bankruptcy.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**DeFi:** Cetus Protocol (DEX), Aftermath Finance, Navi Protocol (lending), DeepBook (native central limit order book), Scallop\n\n**NFTs & Gaming:** Various gaming studios building on Sui, SuiNS (name service), Clutchy (gaming platform)\n\n**Infrastructure:** Sui Foundation supports ecosystem development with grants; Mysten Labs continues core development\n\nSui is still building its enterprise and mainstream company partnerships, with the strongest traction in gaming and consumer app experiences.' } },

      { block_type: 'heading', content: { text: '⚙️ Consensus: Delegated PoS + Mysticeti BFT' } },
      { block_type: 'text', content: { text: 'Sui uses **Delegated Proof of Stake** combined with **Byzantine Fault Tolerant (BFT)** consensus, now powered by the **Mysticeti** protocol.\n\nFor simple transactions (like sending tokens), Sui can skip full consensus entirely — validators can certify these transactions independently in parallel, which is part of why Sui is so fast.\n\n**Everyday Analogy:** Imagine a restaurant with many independent cashiers (validators), each capable of processing your order without needing to check with every other cashier. Most orders (simple transfers) can be handled instantly by any cashier. Only complex orders (smart contract calls) need a brief group check-in. This "parallel cashier" model is why Sui can handle so many transactions simultaneously.\n\n**Developer Language:** Move (Sui Move variant)' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Speed:** Theoretical maximum of ~297,000 TPS; typical real-world performance of 5,000–10,000 TPS with sub-second finality (~390ms with Mysticeti).\n\n**Scalability:** Parallel execution is the core scalability feature — independent transactions run simultaneously rather than in a queue. As more validators join, throughput can scale horizontally.\n\n**Energy:** Low energy consumption — Delegated Proof of Stake requires no mining.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=_UTFIgSIMDI', title: 'SUI Coin Review — Coin Bureau', description: 'Coin Bureau covers Sui\'s object-centric data model, the Move programming language from Meta\'s Diem project, parallel transaction execution, SUI tokenomics, and use cases in gaming, NFTs, and DeFi.' } },
      { block_type: 'article', content: { url: 'https://www.forbes.com/sites/digital-assets/article/what-is-sui-crypto/', title: 'What Is Sui Crypto? — Forbes', description: 'Forbes beginner\'s guide covering Sui\'s parallel transaction processing, Move programming language, and use cases across gaming, DeFi, and NFTs.' } },
      { block_type: 'article', content: { url: 'https://suiscan.xyz', title: 'Sui Block Explorer — Suiscan', description: 'Explore live Sui transactions, objects, and validator stats.' } },
    ],
    questions: [
      { question_text: 'Who built Sui and what is their background?', explanation: 'Sui was built by Mysten Labs, founded by engineers who previously worked on Meta\'s (Facebook) Diem blockchain project.', options: [{ option_text: 'Mysten Labs — founded by ex-Meta (Facebook) Diem engineers', is_correct: true }, { option_text: 'Ava Labs — founded by Cornell University professors', is_correct: false }, { option_text: 'Ripple Labs — founded by banking executives', is_correct: false }, { option_text: 'Jump Crypto — a high-frequency trading firm', is_correct: false }] },
      { question_text: 'What is zkLogin on Sui?', explanation: 'zkLogin allows users to sign into Sui dApps using familiar Web2 accounts like Google or Apple, removing the need for crypto seed phrases.', options: [{ option_text: 'A feature letting users log in with Google or Apple accounts instead of a crypto wallet', is_correct: true }, { option_text: 'A zero-knowledge proof used for private transactions', is_correct: false }, { option_text: 'A login system for validators only', is_correct: false }, { option_text: 'A password manager built into the Sui wallet', is_correct: false }] },
      { question_text: 'What makes Sui\'s approach to transactions unique?', explanation: 'Sui processes independent transactions in parallel simultaneously, unlike most blockchains that process transactions one at a time in sequence.', options: [{ option_text: 'Independent transactions run in parallel simultaneously, not one at a time', is_correct: true }, { option_text: 'All transactions are free with no gas fees', is_correct: false }, { option_text: 'Transactions require 24-hour confirmation periods', is_correct: false }, { option_text: 'Sui uses Proof of Work like Bitcoin', is_correct: false }] },
      { question_text: 'What programming language is used to write Sui smart contracts?', explanation: 'Sui uses Move (a Sui-specific variant), originally developed at Meta for the Diem blockchain project.', options: [{ option_text: 'Move (Sui Move)', is_correct: true }, { option_text: 'Solidity', is_correct: false }, { option_text: 'Rust', is_correct: false }, { option_text: 'TypeScript', is_correct: false }] },
      { question_text: 'What are "sponsored transactions" on Sui?', explanation: 'Sponsored transactions allow apps to pay gas fees on behalf of users, creating an experience where users don\'t need to hold SUI to interact with apps.', options: [{ option_text: 'Apps pay gas fees on behalf of users, so users don\'t need SUI tokens to start', is_correct: true }, { option_text: 'Advertisers pay users to make transactions', is_correct: false }, { option_text: 'Validators subsidize all transaction fees', is_correct: false }, { option_text: 'A government grant program for Sui users', is_correct: false }] },
      { question_text: 'According to the Coin Bureau video, how does Sui\'s "object-based" model differ from Ethereum\'s "account-based" model?', explanation: 'Sui tracks individual objects (tokens, NFTs, game items) that each have their own identity and history, rather than tracking account balances like Ethereum. This enables parallel processing of unrelated objects.', options: [{ option_text: 'Sui tracks individual objects with their own identity, not just account balances', is_correct: true }, { option_text: 'Sui requires users to create accounts before transacting', is_correct: false }, { option_text: 'Ethereum tracks objects while Sui tracks accounts', is_correct: false }, { option_text: 'The two models are identical but use different programming languages', is_correct: false }] },
      { question_text: 'The Coin Bureau video highlights Sui\'s use cases. Which area is considered Sui\'s strongest competitive advantage due to its object model?', explanation: 'Gaming is where Sui\'s object model shines — game items, characters, and assets are naturally "objects" that benefit from parallel processing, true ownership, and composability.', options: [{ option_text: 'Gaming — in-game items are natural objects that benefit from Sui\'s model', is_correct: true }, { option_text: 'Mining operations — Sui has cheaper hardware requirements', is_correct: false }, { option_text: 'International wire transfers between banks', is_correct: false }, { option_text: 'Government digital ID systems', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 6. HEDERA
  // ═══════════════════════════════════════════════════════
  {
    title: 'Hedera (HBAR)',
    emoji: 'ℏ',
    description: 'Enterprise-grade and governed by the world\'s leading companies — Hedera brings the speed of Hashgraph technology to real business problems.',
    order_index: 6,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: 'ℏ What Is Hedera?' } },
      { block_type: 'text', content: { text: 'Hedera was founded by **Dr. Leemon Baird** (inventor of the Hashgraph algorithm) and **Mance Harman** (CEO). The network launched publicly in **September 2019**.\n\nHedera is technically **not a blockchain** — it uses a data structure called a **directed acyclic graph (DAG)** with the **Hashgraph consensus algorithm**, which its creators argue is faster and more fair than traditional blockchains.\n\nWhat makes Hedera unique is its **Governing Council** — a group of up to 39 leading global companies (including Google, IBM, Boeing, Deutsche Telekom, and others) that each run a validator node and help govern the network. This structure is designed to prevent any single entity from controlling Hedera while bringing institutional trust and resources to the network.\n\nHedera targets enterprise and government use cases that require speed, stability, and regulatory clarity.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **Supply Chain Tracking:** Companies use Hedera to create immutable records of goods moving through supply chains — from farms to store shelves\n- **Tokenization:** Real-world assets like carbon credits, currencies, and financial instruments tokenized on Hedera\n- **Healthcare:** Tracking medical supply chains, vaccine distribution, and patient data access logs\n- **Payments & Micropayments:** Extremely low fees (fractions of a cent) and high speed enable new payment models\n- **ESG & Carbon Markets:** Tracking carbon credit issuance and retirement with transparent on-chain records\n- **Identity & Credentials:** Verifiable credentials for education, licensing, and professional certifications' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **HBAR** is used to:\n- Pay transaction fees (fractions of a cent — ~$0.0001)\n- Stake to network nodes to earn rewards\n- Pay for network services\n\n**Hedera Services:**\n- **HTS (Hedera Token Service):** Create fungible tokens and NFTs natively\n- **HCS (Hedera Consensus Service):** A timestamping and ordering service for any application\n- **HSCS (Hedera Smart Contract Service):** EVM-compatible smart contracts using Solidity\n- **HBAR is deflationary:** Transaction fees are partially burned (destroyed), reducing supply over time\n\n**Developer Language:** **Solidity** (EVM compatible) for smart contracts' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Yes. The **Hedera Token Service (HTS)** allows for native NFT creation without smart contracts — meaning NFT minting on Hedera is faster and cheaper than on Ethereum. NFTs created via HTS benefit from Hedera\'s 10,000+ TPS and near-instant finality. The SaucerSwap ecosystem and various digital art projects operate on Hedera.' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2018** — Hashgraph algorithm patented by Leemon Baird; Hedera founded\n- **2019** — Hedera mainnet launches publicly; Google, IBM, Boeing join Governing Council\n- **2020** — COVID-19 response: Hedera used for vaccine supply chain tracking and transparency\n- **2021** — LG, T-Mobile, Deutsche Telekom, and others join Governing Council\n- **2022** — Hedera Consensus Service used for major ESG/carbon credit projects; Citi Bank joins Governing Council\n- **2023** — Hedera exploit via smart contract decompilation attack (quickly patched); open-source code fully released\n- **2024** — Continued enterprise expansion; HBAR Foundation supports DeFi and Web3 ecosystem growth' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'Hedera\'s core network has a strong security record:\n\n- **2023 Smart Contract Exploit:** An attacker exploited a vulnerability in how EVM smart contracts could be decompiled to drain liquidity from several DeFi pools (SaucerSwap, Pangolin, HeliSwap). Hedera\'s team paused the Hedera Token Service temporarily, patched the vulnerability, and restored normal operations within hours. No funds in HTS native tokens were affected — only EVM smart contract liquidity pools.\n\nThis demonstrates Hedera\'s ability to respond quickly, but also the inherent risks in smart contract code even on secure networks.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=eZqV_X3o1sA', title: 'What Is Hedera Hashgraph (HBAR)? — Whiteboard Crypto', description: 'Whiteboard Crypto explains how Hashgraph differs from a traditional blockchain, the Gossip-about-Gossip protocol, virtual voting, the Governing Council (Google, IBM, Boeing), and HBAR token uses.' } },
      { block_type: 'article', content: { url: 'https://decrypt.co/55357/how-hedera-ensuring-safety-pfizer-covid-vaccine', title: 'How Hedera Is Ensuring the Safety of Pfizer\'s COVID Vaccine — Decrypt', description: 'How UK NHS facilities used Hedera Hashgraph with internet-connected thermometers to monitor Pfizer-BioNTech vaccine temperatures, writing tamper-proof records to the distributed ledger.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**DeFi & DApps:** SaucerSwap (DEX), HeliSwap, Stader (liquid staking), Hashpack (wallet)\n\n**Enterprise Applications:**\n- **Atma.io (Avery Dennison):** Tracking product journeys from manufacturing to consumer\n- **ServiceNow:** Credentials and identity on Hedera\n- **SAFE:** Credential verification\n\n**Governing Council Companies (partial list):**\nGoogle, IBM, Boeing, LG Electronics, T-Mobile, Deutsche Telekom, Dell Technologies, Ubisoft, EDF (French electric utility), Chainlink Labs, Fidelity Digital Assets, Standard Bank, Citi' } },

      { block_type: 'heading', content: { text: '⚙️ Consensus: Hashgraph (aBFT)' } },
      { block_type: 'text', content: { text: 'Hedera uses **Hashgraph consensus**, specifically **Asynchronous Byzantine Fault Tolerant (aBFT)** — the highest possible level of security in distributed systems theory.\n\nHashgraph uses **gossip about gossip**: each node randomly tells another node everything it knows, including what it learned from other nodes. Information spreads exponentially, and a **virtual voting** algorithm allows all nodes to calculate consensus without actually sending vote messages.\n\n**Everyday Analogy:** Imagine you\'re trying to agree on a movie to watch with a large group of friends. Instead of a big meeting, each person quietly whispers to a random friend what movies they\'ve heard suggested. That friend whispers to another, and so on. Within moments, everyone knows what everyone else has heard — and can calculate the most popular choice without ever having a group meeting. This is gossip about gossip: extremely fast, leaderless, and fair.\n\n**Developer Language:** Solidity (EVM), Java, JavaScript, Go, Swift, Python (via SDKs)' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Speed:** 10,000+ TPS with **3–5 second finality** (transactions are irreversible once confirmed).\n\n**Scalability:** Designed for enterprise scale — the leaderless Hashgraph consensus has no single bottleneck.\n\n**Energy:** Hedera is **carbon negative** — it purchases carbon offsets exceeding its energy consumption and has been certified carbon negative by sustainability organizations. A single HBAR transaction uses approximately 0.000003 kWh — making it one of the most environmentally friendly major networks.' } },

      { block_type: 'article', content: { url: 'https://hedera.com', title: 'Hedera Official Website', description: 'Explore Hedera\'s technology, Governing Council, and enterprise use cases.' } },
      { block_type: 'article', content: { url: 'https://hashscan.io', title: 'Hedera Explorer — HashScan', description: 'Explore live Hedera transactions, tokens, and network stats.' } },
    ],
    questions: [
      { question_text: 'What type of data structure does Hedera use instead of a traditional blockchain?', explanation: 'Hedera uses Hashgraph, a Directed Acyclic Graph (DAG) structure, rather than a traditional chain of blocks.', options: [{ option_text: 'Hashgraph — a Directed Acyclic Graph (DAG)', is_correct: true }, { option_text: 'A standard blockchain like Bitcoin', is_correct: false }, { option_text: 'A sharded blockchain with parallel chains', is_correct: false }, { option_text: 'A Layer 2 rollup on Ethereum', is_correct: false }] },
      { question_text: 'What is the Hedera Governing Council?', explanation: 'The Governing Council is up to 39 global companies (Google, IBM, Boeing, etc.) that each run a validator node and help govern the network with no single entity in control.', options: [{ option_text: 'Up to 39 global companies that run validator nodes and govern the network', is_correct: true }, { option_text: 'A group of individual crypto investors who vote on upgrades', is_correct: false }, { option_text: 'The founders of Hedera who control all decisions', is_correct: false }, { option_text: 'A U.S. government regulatory body', is_correct: false }] },
      { question_text: 'What real-world problem did Hedera help solve during COVID-19?', explanation: 'Hedera was used to track vaccine temperature and distribution during COVID-19, ensuring cold-chain integrity in the supply chain.', options: [{ option_text: 'Tracking vaccine temperature and distribution in the supply chain', is_correct: true }, { option_text: 'Processing COVID relief payments to citizens', is_correct: false }, { option_text: 'Managing hospital appointment scheduling', is_correct: false }, { option_text: 'Funding vaccine research with HBAR tokens', is_correct: false }] },
      { question_text: 'How does Hashgraph consensus work?', explanation: 'Hashgraph uses "gossip about gossip" — nodes randomly share everything they know with other nodes, allowing information to spread exponentially and consensus to be calculated without sending actual votes.', options: [{ option_text: 'Nodes gossip information to random peers, spreading it exponentially until consensus emerges', is_correct: true }, { option_text: 'Miners race to solve math puzzles', is_correct: false }, { option_text: 'A committee of 5 nodes approves all transactions', is_correct: false }, { option_text: 'Token holders vote on every transaction', is_correct: false }] },
      { question_text: 'What is Hedera\'s environmental status?', explanation: 'Hedera is carbon negative — it purchases carbon offsets that exceed its energy consumption, making it one of the most environmentally friendly networks.', options: [{ option_text: 'Carbon negative — it offsets more carbon than it produces', is_correct: true }, { option_text: 'Carbon neutral — it produces no emissions', is_correct: false }, { option_text: 'High carbon footprint due to Proof of Work mining', is_correct: false }, { option_text: 'Environmental impact is unknown', is_correct: false }] },
      { question_text: 'According to the Whiteboard Crypto video, what does "Gossip about Gossip" mean in Hedera\'s consensus?', explanation: 'Each node randomly shares all the transaction information it knows — including what it learned from other nodes — with another random node. Information spreads exponentially, and the entire network reaches consensus without a formal vote.', options: [{ option_text: 'Nodes randomly share all known info with each other, spreading it exponentially until consensus emerges', is_correct: true }, { option_text: 'Hedera employees gossip about upcoming network upgrades', is_correct: false }, { option_text: 'Validators gossip to spread disinformation and test network security', is_correct: false }, { option_text: 'A penalty system where dishonest nodes are publicly reported', is_correct: false }] },
      { question_text: 'The Whiteboard Crypto Hedera video explains the Governing Council. Why does having companies like Google and IBM as council members matter?', explanation: 'Council members each run a validator node and help govern the network — their reputations are on the line, making them highly incentivized to act honestly. It also gives Hedera institutional credibility and resources.', options: [{ option_text: 'Their reputations incentivize honest behavior and bring institutional credibility to the network', is_correct: true }, { option_text: 'These companies own all the HBAR tokens and profit from every transaction', is_correct: false }, { option_text: 'The council members approve each transaction manually', is_correct: false }, { option_text: 'It means Hedera is regulated by the U.S. government', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 7. ALGORAND
  // ═══════════════════════════════════════════════════════
  {
    title: 'Algorand (ALGO)',
    emoji: 'Ⓐ',
    description: 'Built by a Turing Award-winning cryptographer — the carbon-negative blockchain with instant finality and no forks, powering government and global finance.',
    order_index: 7,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: 'Ⓐ What Is Algorand?' } },
      { block_type: 'text', content: { text: 'Algorand was created by **Silvio Micali**, an MIT professor and **Turing Award winner** (the highest honor in computer science). Micali invented key cryptographic primitives that underpin most internet security today. His goal was to build a blockchain that solved the "**blockchain trilemma**" — achieving security, decentralization, and scalability simultaneously.\n\nAlgorand launched its mainnet in **June 2019**. Its key innovation is **Pure Proof of Stake (PPoS)**, which uses verifiable random functions (VRF) to secretly and randomly select validators for each block — preventing attacks because no one knows who will validate next.\n\nAlgorand has **instant, absolute finality** — once a block is confirmed (~3.7 seconds), it is permanent with mathematical certainty. There are no forks on Algorand.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **CBDCs (Central Bank Digital Currencies):** The Marshall Islands launched the world\'s first CBDC (SOV) on Algorand\n- **Carbon Markets:** Algorand is a leading platform for carbon credit issuance, trading, and retirement\n- **DeFi:** Lending, trading, and liquidity protocols\n- **Sports & Entertainment:** FIFA built its official NFT platform "FIFA+ Collect" on Algorand\n- **Stablecoins:** USDC operates on Algorand; multiple stablecoin projects live on the network\n- **Government & Identity:** Digital credentials, land registries, and voting systems\n- **Financial Inclusion:** Algorand Foundation partners with organizations to bring financial access to underbanked populations' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **ALGO** is used to:\n- Pay transaction fees (roughly $0.001 or less)\n- Stake to participate in consensus and earn governance rewards\n- Vote in on-chain governance (quarterly governance periods)\n\n**Algorand Standard Assets (ASAs):** A built-in standard for creating any type of token — fungible (like USDC) or non-fungible (NFTs) — natively without smart contracts.\n\n**Atomic Transfers:** Multiple transactions that either all succeed or all fail — perfect for trading and swaps.\n\n**Developer Languages:** **Python** (using PyTeal or Beaker frameworks) and **TEAL** (Transaction Execution Approval Language)' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Yes. NFTs on Algorand are created as **Algorand Standard Assets (ASAs)** — a built-in feature of the protocol, not requiring separate smart contracts. This makes Algorand NFTs efficient and low-cost.\n\n**FIFA+ Collect:** FIFA partnered with Algorand to launch its official digital collectibles platform, where fans can collect and trade official FIFA moments and artwork. This is one of the most prominent mainstream NFT partnerships in sports.' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2017** — Silvio Micali begins developing Algorand\n- **2019** — Algorand mainnet launches; $60M ICO\n- **2020** — Marshall Islands selects Algorand for the world\'s first CBDC (SOV digital currency)\n- **2021** — Circle launches USDC on Algorand; FIFA partnership announced\n- **2022** — FIFA+ Collect NFT platform launches on Algorand; Algorand becomes official blockchain partner of FIFA World Cup Qatar 2022\n- **2023** — Algorand Foundation restructures with new leadership; focus on developer growth and institutional adoption\n- **2024** — Continued expansion of DeFi ecosystem and institutional partnerships' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'Algorand\'s core protocol has maintained an excellent security record with no major protocol hacks.\n\n- **MyAlgo Wallet Phishing Attack (2023):** ~$9.2 million in ALGO and ASAs were stolen through a compromised version of the MyAlgo web wallet. This was an application-level attack (the wallet software was manipulated) — not a flaw in the Algorand protocol itself. The Algorand Foundation advised users to move funds to other wallets and the vulnerability was patched.\n\nAlgorand\'s mathematical security foundations — designed by one of the world\'s top cryptographers — have remained intact.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**DeFi:** Folks Finance (lending), Tinyman DEX, Pact Finance, GARD (algorithmic stablecoin), Algofi\n\n**Infrastructure:** Pera Wallet (mobile), AlgoExplorer (block explorer), AlgoNode\n\n**Companies & Organizations:**\n- **FIFA** — Official blockchain of FIFA, FIFA+ Collect NFT platform\n- **Circle** — USDC on Algorand\n- **Marshall Islands** — Government-issued CBDC on Algorand\n- **Exodus Wallet** — Leading crypto wallet with Algorand support\n- **Borderless Capital** — Investment firm focused entirely on Algorand ecosystem' } },

      { block_type: 'heading', content: { text: '⚙️ Consensus: Pure Proof of Stake (PPoS)' } },
      { block_type: 'text', content: { text: 'Algorand uses **Pure Proof of Stake (PPoS)** with **Verifiable Random Functions (VRF)**. Every ALGO token represents one lottery ticket. For each block, a secret cryptographic lottery randomly selects which token holders will propose and validate the block — and crucially, **no one knows who will be selected until after selection happens**.\n\n**Everyday Analogy:** Imagine every ALGO coin is a lottery ticket, but the lottery is secret. You only find out you won **after** the drawing is complete, and by the time anyone could try to bribe or attack you, the lottery is already over. The more ALGO you hold, the more tickets you have — but even someone with just a few ALGO can be selected. This makes attacks nearly impossible because you can\'t target someone who hasn\'t been chosen yet.\n\n**Key Feature:** Algorand has **absolute finality** — blocks are final immediately (no waiting for confirmations). There are no forks on Algorand ever.\n\n**Developer Language:** Python (PyTeal/Beaker), TEAL' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Speed:** ~6,000 TPS theoretical; ~1,000 TPS typical; **~3.7 second block finality** with instant, absolute finality (no probabilistic confirmation waiting).\n\n**Scalability:** Algorand Foundation\'s roadmap includes co-chains (parallel processing chains) for horizontal scaling. Current throughput is sufficient for most institutional use cases.\n\n**Energy:** Algorand is **carbon negative** — certified by ClimateTrade. Pure Proof of Stake requires no mining, making it extremely energy efficient. Algorand offsets more carbon than it produces.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=XtKTk-ebyQE', title: 'What is Algorand? ALGO Explained — Whiteboard Crypto', description: 'Whiteboard Crypto covers Silvio Micali\'s background, Pure Proof of Stake, how the secret VRF lottery selects validators, why Algorand has no forks, instant finality, and ALGO token distribution.' } },
      { block_type: 'article', content: { url: 'https://www.ledgerinsights.com/algorand-fifa-official-blockchain-platform-sponsors-world-cup/', title: 'Algorand Named FIFA\'s Official Blockchain Platform — Ledger Insights', description: 'How Algorand became FIFA\'s official blockchain platform and World Cup sponsor, with use cases in digital asset strategy, NFT collectibles, and wallet infrastructure for billions of soccer fans.' } },
      { block_type: 'article', content: { url: 'https://explorer.perawallet.app', title: 'Algorand Explorer — Pera', description: 'Explore Algorand transactions, assets, and applications in real time.' } },
    ],
    questions: [
      { question_text: 'Who created Algorand?', explanation: 'Silvio Micali, an MIT professor and Turing Award winner (the highest honor in computer science), created Algorand.', options: [{ option_text: 'Silvio Micali — MIT professor and Turing Award winner', is_correct: true }, { option_text: 'Vitalik Buterin — creator of Ethereum', is_correct: false }, { option_text: 'Leemon Baird — inventor of Hashgraph', is_correct: false }, { option_text: 'Emin Gün Sirer — Cornell University professor', is_correct: false }] },
      { question_text: 'What major sports organization partnered with Algorand for an NFT platform?', explanation: 'FIFA partnered with Algorand to launch FIFA+ Collect, its official digital collectibles platform.', options: [{ option_text: 'FIFA', is_correct: true }, { option_text: 'NBA', is_correct: false }, { option_text: 'NFL', is_correct: false }, { option_text: 'IOC (International Olympic Committee)', is_correct: false }] },
      { question_text: 'What is special about Algorand\'s finality?', explanation: 'Algorand has absolute, instant finality — once a block is confirmed (~3.7 seconds), it is mathematically permanent. There are no forks.', options: [{ option_text: 'Absolute instant finality — confirmed blocks are permanent with no forks ever', is_correct: true }, { option_text: 'Transactions take 10 minutes to confirm like Bitcoin', is_correct: false }, { option_text: 'Finality requires 6 block confirmations like Ethereum', is_correct: false }, { option_text: 'Finality depends on how many tokens you hold', is_correct: false }] },
      { question_text: 'What are Algorand Standard Assets (ASAs)?', explanation: 'ASAs are a built-in standard for creating both fungible tokens and NFTs natively on Algorand without needing separate smart contracts.', options: [{ option_text: 'A built-in way to create fungible tokens and NFTs natively without smart contracts', is_correct: true }, { option_text: 'The ALGO staking rewards program', is_correct: false }, { option_text: 'A type of cross-chain bridge', is_correct: false }, { option_text: 'A savings account offered by Algorand Foundation', is_correct: false }] },
      { question_text: 'Why is Algorand\'s lottery-based validator selection considered secure?', explanation: 'Validators are selected secretly using VRF — no one knows who will validate until after selection, making it impossible to target or bribe them in advance.', options: [{ option_text: 'No one knows who is selected until after the block is done, preventing targeted attacks', is_correct: true }, { option_text: 'Only the richest token holders can validate, making them trustworthy', is_correct: false }, { option_text: 'Validators are chosen by the Algorand Foundation', is_correct: false }, { option_text: 'All validators approve every block simultaneously', is_correct: false }] },
      { question_text: 'According to the Whiteboard Crypto video, what makes Algorand\'s Pure Proof of Stake different from regular Proof of Stake?', explanation: 'In PPoS, ANY ALGO holder — even someone with a tiny amount — can be randomly selected to validate. Regular PoS typically requires a large minimum stake, locking out smaller holders.', options: [{ option_text: 'Any ALGO holder can participate, not just large stakers with a minimum amount', is_correct: true }, { option_text: 'Algorand requires more ALGO than Ethereum requires ETH to validate', is_correct: false }, { option_text: 'Only the Algorand Foundation can stake and earn rewards', is_correct: false }, { option_text: 'Pure PoS uses mining rigs instead of validators', is_correct: false }] },
      { question_text: 'The Whiteboard Crypto video explains Algorand was designed with a specific academic goal. What "trilemma" was Silvio Micali trying to solve?', explanation: 'The blockchain trilemma says you can only have two of three: security, decentralization, and scalability. Algorand was designed to achieve all three simultaneously.', options: [{ option_text: 'The blockchain trilemma — achieving security, decentralization, AND scalability at the same time', is_correct: true }, { option_text: 'The energy trilemma — being fast, cheap, and green simultaneously', is_correct: false }, { option_text: 'The adoption trilemma — appealing to developers, enterprises, and consumers at once', is_correct: false }, { option_text: 'The token trilemma — balancing supply, demand, and price stability', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 8. AVALANCHE
  // ═══════════════════════════════════════════════════════
  {
    title: 'Avalanche (AVAX)',
    emoji: '🔺',
    description: 'The platform for building custom blockchains — Avalanche\'s subnet architecture lets enterprises and developers launch their own chains while sharing security.',
    order_index: 8,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🔺 What Is Avalanche?' } },
      { block_type: 'text', content: { text: 'Avalanche was created by **Ava Labs**, co-founded by **Emin Gün Sirer** (a Cornell University professor and renowned computer scientist), along with **Kevin Sekniqi** and **Maofan "Ted" Yin**. The mainnet launched in **September 2020**.\n\nAvalanche is famous for three things:\n1. **Three built-in blockchains** (X-Chain, C-Chain, P-Chain) each optimized for a specific purpose\n2. **Subnets** — the ability to launch custom blockchains with their own rules, validators, and tokens\n3. **Blazing-fast consensus** — Avalanche\'s novel consensus protocol achieves finality in ~1-2 seconds\n\nThe C-Chain (Contract Chain) is **EVM-compatible**, meaning any Ethereum smart contract or dApp can be deployed on Avalanche with minimal changes — bringing the entire Ethereum developer ecosystem to Avalanche.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **DeFi:** Full Ethereum-compatible DeFi ecosystem (Trader Joe, Aave, GMX, Benqi)\n- **Gaming:** Custom game subnets with own tokens and low fees (DeFi Kingdoms, Shrapnel)\n- **Enterprise Blockchains:** Companies create private/public subnets with custom compliance rules\n- **Institutional Finance:** Avalanche Evergreen (institutional DeFi with KYC) for banks and asset managers\n- **Government & Public Sector:** CBDC pilots and public record systems\n- **NFTs:** Full EVM compatibility means any Ethereum NFT standard works on Avalanche' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **AVAX** is used to:\n- Pay transaction fees across all three chains\n- Stake to validators to secure the network and earn rewards\n- Pay subnet operators for validation services\n\n**The Three Chains:**\n- **X-Chain (Exchange Chain):** Create and trade digital assets\n- **C-Chain (Contract Chain):** Run EVM-compatible smart contracts (where most DeFi happens)\n- **P-Chain (Platform Chain):** Coordinate validators and manage subnets\n\n**Subnets:** Any developer or enterprise can launch a custom blockchain using Avalanche\'s infrastructure. Subnets can have their own virtual machines, token, rules, and validator sets.\n\n**Warp Messaging:** Enables native communication between subnets without bridges.\n\n**Developer Language:** Solidity (C-Chain, EVM compatible), Go' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Yes. Since Avalanche\'s C-Chain is EVM-compatible, it supports all standard Ethereum NFT formats (ERC-721, ERC-1155). Projects like Joepegs (by Trader Joe) have built native Avalanche NFT marketplaces. Game-focused subnets like DeFi Kingdoms Crystalvale also feature in-game NFTs as core game assets.' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2019** — Emin Gün Sirer publishes Avalanche consensus paper; Ava Labs founded\n- **2020** — Avalanche mainnet launches in September; $42M ICO\n- **2021** — Avalanche Rush: $180M DeFi incentive program drives massive growth; AVAX reaches $146 all-time high\n- **2022** — Amazon AWS partnership announced; Avalanche Foundation launches Multiverse program ($290M for subnets)\n- **2023** — Evergreen (institutional DeFi subnets); South Korea government pilot; Avalanche9000 upgrade announced\n- **2024** — Etna upgrade (Avalanche9000) dramatically reduces subnet costs; makes launching a subnet accessible to smaller teams' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'Avalanche\'s core protocol has not suffered major hacks. Some application-level incidents have occurred:\n\n- **Vee Finance Exploit (2021):** $35 million exploited from a DeFi lending protocol built on Avalanche (application vulnerability, not the Avalanche protocol).\n- **Dexalot Hack (2022):** A DeFi exchange on Avalanche was exploited for a smaller amount.\n\nThese were vulnerabilities in individual dApp smart contract code — not the Avalanche blockchain itself. The base protocol and consensus mechanism have remained secure.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**DeFi:** Trader Joe (DEX), Benqi (lending/liquid staking), GMX (perpetuals), Aave (lending), Curve, Dexalot\n\n**Gaming Subnets:** DeFi Kingdoms (Crystalvale), Shrapnel (AAA FPS game), MapleStory Universe\n\n**Companies & Institutions:**\n- **Amazon AWS** — Cloud provider partnership; AWS nodes run Avalanche infrastructure\n- **Deloitte** — Uses Avalanche for FEMA disaster relief fund tracking\n- **KPMG** — Canadian division has explored Avalanche for enterprise use\n- **South Korea** — Government explored Avalanche for CBDC pilot\n- **JPMorgan** — Tested tokenized assets on Avalanche through the Evergreen subnet' } },

      { block_type: 'heading', content: { text: '⚙️ Consensus: Avalanche Consensus (Snowman)' } },
      { block_type: 'text', content: { text: 'Avalanche uses a unique **Avalanche Consensus** protocol (called **Snowman** for linear/ordered chains). It works by repeatedly sampling small random groups of validators and asking their preference. Each round, validators update their preference based on what the group says. This process converges to consensus exponentially fast.\n\n**Everyday Analogy:** Imagine you\'re trying to decide what movie to watch with 1,000 friends, but you can only text a few at a time. You text 5 random friends, see what the majority says, update your preference, text 5 more, update again, and so on. Within a dozen rounds, everyone in the group has converged on the same movie — without ever having one big meeting. Avalanche consensus works the same way: fast convergence through repeated small random samples.\n\n**Key Benefit:** This achieves consensus in ~1-2 seconds while being highly secure and requiring no leader.\n\n**Developer Language:** Solidity (C-Chain), Go (for custom VMs)' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Speed:** ~4,500 TPS on the C-Chain; subnets can achieve much higher independently since each subnet has its own validators and throughput.\n\n**Scalability:** Subnets are Avalanche\'s key scalability story — instead of one congested chain, applications can launch dedicated chains with dedicated capacity. The recent **Etna (Avalanche9000) upgrade** dramatically reduces the cost of launching a subnet, making this approach practical for more teams.\n\n**Energy:** Low energy consumption — Proof of Stake based. No energy-intensive mining required.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=CbM2jidEn0s', title: 'What is the Avalanche Network? AVAX Explained — Whiteboard Crypto', description: 'Whiteboard Crypto explains Avalanche\'s three-chain architecture (X/C/P), the subnet system, Avalanche consensus (Snowman), sub-second finality, EVM compatibility, and how AVAX is used.' } },
      { block_type: 'article', content: { url: 'https://www.coindesk.com/business/2023/01/11/amazon-web-services-taps-avalanche-to-scale-enterprise-and-government-solutions', title: 'Amazon Web Services Taps Avalanche for Enterprise & Government — CoinDesk', description: 'AWS partners with Ava Labs to make Avalanche subnets deployable through the AWS Marketplace, bringing custom blockchain infrastructure to enterprises and government agencies.' } },
      { block_type: 'article', content: { url: 'https://snowtrace.io', title: 'Avalanche C-Chain Explorer — Snowtrace', description: 'Explore live Avalanche transactions, tokens, and smart contracts.' } },
    ],
    questions: [
      { question_text: 'What are Avalanche subnets?', explanation: 'Subnets are custom blockchains built using Avalanche\'s infrastructure — each with its own rules, validators, and tokens, while sharing Avalanche\'s security model.', options: [{ option_text: 'Custom blockchains with their own rules, tokens, and validators built on Avalanche', is_correct: true }, { option_text: 'A type of Avalanche wallet for storing AVAX', is_correct: false }, { option_text: 'A Layer 2 solution similar to Ethereum\'s Arbitrum', is_correct: false }, { option_text: 'Sub-accounts within the Avalanche network', is_correct: false }] },
      { question_text: 'What company uses Avalanche to track disaster relief funds?', explanation: 'Deloitte uses Avalanche to track FEMA disaster relief fund distribution with transparency and auditability.', options: [{ option_text: 'Deloitte (for FEMA disaster relief fund tracking)', is_correct: true }, { option_text: 'Amazon (for product shipment tracking)', is_correct: false }, { option_text: 'Google (for ad revenue distribution)', is_correct: false }, { option_text: 'JPMorgan (for consumer loans)', is_correct: false }] },
      { question_text: 'What are the three built-in chains on Avalanche?', explanation: 'Avalanche has three chains: X-Chain (exchange/assets), C-Chain (smart contracts, EVM compatible), and P-Chain (validators and subnet coordination).', options: [{ option_text: 'X-Chain (assets), C-Chain (smart contracts), P-Chain (validators)', is_correct: true }, { option_text: 'Main Chain, Test Chain, and Dev Chain', is_correct: false }, { option_text: 'Bitcoin Chain, Ethereum Chain, and Solana Chain', is_correct: false }, { option_text: 'Fast Chain, Secure Chain, and Governance Chain', is_correct: false }] },
      { question_text: 'How does Avalanche consensus reach agreement?', explanation: 'Avalanche repeatedly polls small random groups of validators. Each validator updates its preference based on what the group says, converging to consensus extremely quickly through repeated sampling.', options: [{ option_text: 'Repeatedly polling small random groups until the network converges on an answer', is_correct: true }, { option_text: 'Miners competing to solve mathematical puzzles', is_correct: false }, { option_text: 'A single elected leader proposes and confirms all blocks', is_correct: false }, { option_text: 'All validators must vote simultaneously', is_correct: false }] },
      { question_text: 'Why is Avalanche described as "EVM-compatible"?', explanation: 'Avalanche\'s C-Chain runs the Ethereum Virtual Machine, meaning any Ethereum smart contract or dApp can be deployed on Avalanche with minimal changes.', options: [{ option_text: 'Its C-Chain runs the Ethereum Virtual Machine, so Ethereum apps work on Avalanche', is_correct: true }, { option_text: 'Avalanche and Ethereum share the same validators', is_correct: false }, { option_text: 'AVAX and ETH have the same price', is_correct: false }, { option_text: 'Avalanche was built by the Ethereum Foundation', is_correct: false }] },
      { question_text: 'According to the Whiteboard Crypto video, what role does the P-Chain play in Avalanche\'s three-chain architecture?', explanation: 'The P-Chain (Platform Chain) coordinates all validators and manages subnets — it\'s the backbone that lets anyone create and manage a custom blockchain network on Avalanche.', options: [{ option_text: 'It coordinates validators and manages subnets — the backbone for creating custom blockchains', is_correct: true }, { option_text: 'It processes smart contracts and DeFi transactions', is_correct: false }, { option_text: 'It stores NFTs and digital assets', is_correct: false }, { option_text: 'It bridges AVAX to the Ethereum network', is_correct: false }] },
      { question_text: 'The Whiteboard Crypto video explains Avalanche consensus using random sampling. What key advantage does this give Avalanche over Bitcoin\'s Proof of Work?', explanation: 'Avalanche consensus reaches finality in under 2 seconds through probabilistic convergence — far faster than Bitcoin\'s ~10 minute block time, and without any energy-intensive mining.', options: [{ option_text: 'Sub-2-second finality with no mining energy cost', is_correct: true }, { option_text: 'Higher security because more validators are required', is_correct: false }, { option_text: 'Lower transaction fees because miners are paid less', is_correct: false }, { option_text: 'Greater decentralization because anyone can mine', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 9. CHAINLINK
  // ═══════════════════════════════════════════════════════
  {
    title: 'Chainlink (LINK)',
    emoji: '🔗',
    description: 'The connective tissue of Web3 — Chainlink brings real-world data to blockchains, making smart contracts that can actually respond to the real world.',
    order_index: 9,
    tokens_reward: 40,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🔗 What Is Chainlink?' } },
      { block_type: 'text', content: { text: 'Chainlink was founded by **Sergey Nazarov** and **Steve Ellis** in 2017. The whitepaper was published in 2017 and the mainnet launched in **May 2019**.\n\nChainlink solves one of the most fundamental problems in blockchain: **the oracle problem**. Smart contracts are powerful, but they\'re isolated — they can only see data on their own blockchain. They have no way to know the price of Bitcoin, today\'s weather, the score of a sports game, or whether a shipping container arrived safely.\n\n**Chainlink is a decentralized oracle network** — a system of independent data providers (called **node operators**) that fetch real-world information and deliver it to smart contracts in a trustworthy, tamper-resistant way.\n\nThink of Chainlink as the **translator between the real world and the blockchain**. Without oracles like Chainlink, smart contracts would be cut off from reality.' } },

      { block_type: 'heading', content: { text: '🎯 Use Cases' } },
      { block_type: 'text', content: { text: '- **DeFi Price Feeds:** Every major DeFi protocol (Aave, Compound, Synthetix, MakerDAO) uses Chainlink to get real-time crypto prices to prevent bad loans and bad trades\n- **Parametric Insurance:** Automatically pay out insurance claims when real-world conditions are met — e.g., pay a farmer automatically if rainfall drops below X inches\n- **Sports Betting & Fantasy Sports:** Deliver game scores to smart contracts for automatic payout\n- **Gaming (Verifiable Randomness):** Chainlink VRF gives games provably fair random numbers — no one can predict or manipulate in-game lotteries\n- **Cross-Chain Messaging (CCIP):** Chainlink\'s Cross-Chain Interoperability Protocol lets different blockchains communicate securely\n- **Trade Finance & Supply Chain:** Verify shipment arrivals, customs clearances, and payment triggers\n- **Weather Derivatives:** Financial products that pay out based on weather conditions' } },

      { block_type: 'heading', content: { text: '🔧 Utilities & Native Token' } },
      { block_type: 'text', content: { text: 'The native token **LINK** is used to:\n- Pay Chainlink node operators for their data services\n- Stake as collateral by node operators (staking launched in 2022) — nodes that provide bad data lose their staked LINK\n- Align incentives between data providers and data consumers\n\n**Key Chainlink Services:**\n- **Price Feeds:** Real-time price data for 1,000+ asset pairs, used by $20B+ in DeFi\n- **VRF (Verifiable Random Function):** Tamper-proof randomness for gaming and NFT minting\n- **Automation (Keepers):** Automatically trigger smart contract functions when conditions are met\n- **CCIP (Cross-Chain Interoperability Protocol):** Secure messaging between blockchains\n- **Proof of Reserve:** Verify that stablecoins and real-world assets are actually backed\n\nChainlink runs on **Ethereum** primarily but delivers data to nearly every major blockchain including Solana, Avalanche, BNB Chain, Polygon, and more.' } },

      { block_type: 'heading', content: { text: '🖼 Are NFTs Possible?' } },
      { block_type: 'text', content: { text: 'Chainlink is not a standalone blockchain and does not directly mint NFTs. However, Chainlink is **essential infrastructure for NFTs** across all blockchains:\n\n- **Chainlink VRF** is used by NFT projects for fair, random trait assignment during minting — ensuring no one (not even the project creators) can predict or manipulate which NFT you receive\n- Major NFT projects like **Bored Ape Yacht Club** used Chainlink VRF for their land sale randomness\n- Dynamic NFTs that change based on real-world data (sports performance, weather, etc.) are powered by Chainlink oracles' } },

      { block_type: 'heading', content: { text: '📅 Key Milestones' } },
      { block_type: 'text', content: { text: '- **2017** — Chainlink whitepaper published; $32M raised in token sale\n- **2019** — Chainlink mainnet launches on Ethereum\n- **2020** — Chainlink Price Feeds become the standard for DeFi, securing over $5B in value\n- **2021** — LINK reaches $52 all-time high; Chainlink VRF launches for gaming\n- **2022** — Chainlink Staking v0.1 launches; CCIP (Cross-Chain Interoperability Protocol) announced; Chainlink partners with SWIFT (the global banking messaging system)\n- **2023** — SWIFT and Chainlink complete pilot for tokenized asset settlement between major banks\n- **2024** — Chainlink Staking v0.2 expands; DECO privacy protocol; Chainlink becomes backbone of global bank tokenization projects' } },

      { block_type: 'heading', content: { text: '⚠️ Notable Events & Security' } },
      { block_type: 'text', content: { text: 'Chainlink\'s oracle network itself has a strong security record. The biggest risks involve:\n\n- **Oracle Manipulation Attacks:** If a DeFi protocol uses a poorly designed or centralized oracle instead of Chainlink, attackers can manipulate prices to drain funds. Many major DeFi hacks (like the 2020 bZx attack) exploited protocols that were NOT using Chainlink. This actually highlighted Chainlink\'s value.\n- **Flash Loan Price Attacks:** Projects that used single-source or centralized price data were exploited. Chainlink\'s multi-source, aggregated data feeds are designed to resist this.\n\nThe main lesson: Chainlink\'s decentralized design exists specifically to prevent the manipulation attacks that have cost DeFi billions of dollars.' } },

      { block_type: 'article', content: { url: 'https://decrypt.co/resources/what-is-chainlink', title: 'What Is Chainlink? — Decrypt', description: 'How Chainlink\'s oracle network bridges blockchains to real-world data — weather, sports, financial markets — enabling parametric insurance, automated payments, and supply chain tracking.' } },
      { block_type: 'article', content: { url: 'https://chain.link/use-cases/insurance', title: 'Blockchain-Powered Insurance — Chainlink', description: 'Real-world examples of Chainlink powering parametric insurance: Arbol for weather risk, Etherisc for crop and flight insurance, and Acre Africa for smallholder farmers.' } },

      { block_type: 'heading', content: { text: '🏗️ Ecosystem: Apps & Companies' } },
      { block_type: 'text', content: { text: '**DeFi Protocols Using Chainlink:** Aave, Compound, Synthetix, MakerDAO, dYdX, Uniswap — essentially every major DeFi protocol\n\n**Gaming Using Chainlink VRF:** Axie Infinity, Bored Ape Yacht Club, Ether Cards\n\n**Major Companies & Institutions:**\n- **SWIFT** — The global interbank messaging network (used by 11,000 banks) partnered with Chainlink to explore connecting traditional banking to blockchains\n- **Google Cloud** — Partnered to use Chainlink oracles with Google BigQuery blockchain data\n- **T-Systems (Deutsche Telekom)** — Runs Chainlink node operators\n- **Vodafone** — DAB (Digital Asset Broker) uses Chainlink for supply chain\n- **AccuWeather** — Provides weather data directly through Chainlink node\n- **AP News (Associated Press)** — Publishes financial and election data through a Chainlink node' } },

      { block_type: 'heading', content: { text: '⚙️ How Chainlink Works: Decentralized Oracle Networks' } },
      { block_type: 'text', content: { text: 'Chainlink doesn\'t use the same type of consensus as a blockchain. Instead, it uses **Decentralized Oracle Networks (DONs)**:\n\n1. A smart contract requests data (e.g., "What is the price of ETH?")\n2. Multiple independent **Chainlink node operators** each fetch the data from their own sources\n3. The responses are aggregated (median value taken) to remove outliers and manipulation\n4. The agreed-upon answer is delivered back to the smart contract\n5. Node operators who provide accurate data earn LINK; those providing bad data risk losing staked LINK\n\n**Everyday Analogy:** Imagine you want to know the "real" price of a used car. Instead of asking one dealer (who might inflate the price), you ask 31 independent dealers, throw out the highest and lowest, and take the middle value. No single dealer can manipulate the result. Chainlink does this for any data a blockchain needs — getting the "true" answer from many independent sources.\n\n**Chainlink is blockchain-agnostic** — it works with Ethereum, Solana, Avalanche, BNB Chain, and dozens more.' } },

      { block_type: 'heading', content: { text: '📊 Performance, Scalability & Environment' } },
      { block_type: 'text', content: { text: '**Scale:** Chainlink currently secures over **$20 trillion in transaction value** across DeFi protocols and has delivered hundreds of millions of data points to smart contracts.\n\n**Network:** 1,600+ oracle node operators; 1,400+ price feeds; operates on 80+ blockchain networks\n\n**Energy:** Chainlink itself is not a Proof of Work chain — node operators run traditional servers. The environmental footprint is relatively small compared to mining-based systems.\n\n**CCIP (Cross-Chain Interoperability Protocol):** Chainlink\'s newest product aims to be the "internet of blockchains" — the standard protocol for all blockchains to communicate with each other, similar to how TCP/IP became the standard for internet communication.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://www.youtube.com/watch?v=5c1cCsEUB6Q', title: 'What Is Chainlink? LINK Explained — Whiteboard Crypto', description: 'Whiteboard Crypto breaks down the oracle problem, how Chainlink\'s three-contract system works (Reputation, Order-Matching, Aggregating), why node operators stake LINK, and use cases from sports betting to weather data.' } },
      { block_type: 'article', content: { url: 'https://chain.link', title: 'Chainlink Official Website — chain.link', description: 'Explore Chainlink\'s oracle services, CCIP, and ecosystem of 1,000+ integrations.' } },
    ],
    questions: [
      { question_text: 'What problem does Chainlink solve?', explanation: 'Chainlink solves the "oracle problem" — blockchains are isolated and can\'t access real-world data without a trusted bridge. Chainlink provides that bridge.', options: [{ option_text: 'The oracle problem — connecting smart contracts to real-world data', is_correct: true }, { option_text: 'High transaction fees on Ethereum', is_correct: false }, { option_text: 'The lack of NFT standards on Bitcoin', is_correct: false }, { option_text: 'Slow block times on proof of work chains', is_correct: false }] },
      { question_text: 'What is Chainlink VRF used for?', explanation: 'Chainlink VRF (Verifiable Random Function) provides tamper-proof randomness for gaming and NFTs — ensuring no one can predict or manipulate random outcomes like NFT trait assignments.', options: [{ option_text: 'Providing verifiable, tamper-proof randomness for games and NFT minting', is_correct: true }, { option_text: 'Validating transactions on the Ethereum network', is_correct: false }, { option_text: 'Storing LINK tokens in a secure vault', is_correct: false }, { option_text: 'Converting between different cryptocurrencies', is_correct: false }] },
      { question_text: 'Which global banking network partnered with Chainlink to explore blockchain connectivity?', explanation: 'SWIFT, the global interbank messaging network used by 11,000+ banks, partnered with Chainlink to explore connecting traditional finance to blockchains.', options: [{ option_text: 'SWIFT', is_correct: true }, { option_text: 'Visa', is_correct: false }, { option_text: 'Federal Reserve', is_correct: false }, { option_text: 'PayPal', is_correct: false }] },
      { question_text: 'How does Chainlink ensure data accuracy?', explanation: 'Multiple independent node operators each fetch data from their own sources. Responses are aggregated (median taken) so no single source can manipulate the result.', options: [{ option_text: 'Multiple independent nodes each fetch data; the median answer is used', is_correct: true }, { option_text: 'A single trusted company provides all data', is_correct: false }, { option_text: 'Data is pulled directly from Wikipedia', is_correct: false }, { option_text: 'The blockchain automatically generates price data', is_correct: false }] },
      { question_text: 'What is Chainlink CCIP?', explanation: 'CCIP (Cross-Chain Interoperability Protocol) is Chainlink\'s protocol for enabling secure communication between different blockchains.', options: [{ option_text: 'A protocol enabling secure communication between different blockchains', is_correct: true }, { option_text: 'A competitor to Bitcoin and Ethereum', is_correct: false }, { option_text: 'A credit card for crypto payments', is_correct: false }, { option_text: 'A new type of NFT standard', is_correct: false }] },
      { question_text: 'According to the Whiteboard Crypto video, what is the role of the "Aggregating Contract" in Chainlink\'s three-contract system?', explanation: 'The Aggregating Contract collects responses from multiple node operators and combines them into a single trustworthy answer — no single bad actor can skew the result.', options: [{ option_text: 'It collects responses from multiple nodes and combines them into one reliable answer', is_correct: true }, { option_text: 'It aggregates all LINK tokens into a central vault for safekeeping', is_correct: false }, { option_text: 'It connects different blockchains together like a bridge', is_correct: false }, { option_text: 'It creates new LINK tokens as rewards for node operators', is_correct: false }] },
      { question_text: 'The Whiteboard Crypto video uses sports betting as an example. Why does a sports bet smart contract need Chainlink?', explanation: 'Smart contracts can\'t browse the internet — they have no way to know a game\'s final score on their own. Chainlink delivers the verified score so the contract automatically pays the winner without any middleman.', options: [{ option_text: 'Smart contracts can\'t access the internet — Chainlink delivers the verified score to trigger payout', is_correct: true }, { option_text: 'Chainlink manages the betting odds and sets the lines', is_correct: false }, { option_text: 'Without Chainlink, the bet would have to be settled in LINK tokens', is_correct: false }, { option_text: 'Chainlink prevents people from placing unfair bets', is_correct: false }] },
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
      // Check if lesson already exists
      const { data: existingLesson } = await db.from('learn_lessons')
        .select('id').eq('module_id', moduleId).eq('title', lesson.title).limit(1).single();

      let lessonId;
      if (existingLesson) {
        lessonId = existingLesson.id;
        results.push({ lesson: lesson.title, status: 'already_exists', id: lessonId });
        continue;
      }

      // Create lesson
      const { data: newLesson, error: lessonErr } = await db.from('learn_lessons').insert({
        module_id: moduleId,
        title: lesson.title,
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

      // Create blocks
      const blockInserts = lesson.blocks.map((b, i) => ({
        lesson_id: lessonId,
        block_type: b.block_type,
        content: b.content,
        order_index: i + 1,
      }));
      await db.from('learn_blocks').insert(blockInserts);

      // Create questions + options
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

      results.push({ lesson: lesson.title, status: 'created', id: lessonId });
    }

    return Response.json({
      success: true,
      moduleId,
      moduleName: MODULE.title,
      results,
      created: results.filter(r => r.status === 'created').length,
      skipped: results.filter(r => r.status === 'already_exists').length,
      errors: results.filter(r => r.status === 'error').length,
    });

  } catch (err) {
    return Response.json({ error: `Unexpected error: ${err.message}` }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    info: 'POST to this endpoint to seed the Blockchain Deep Dives module.',
    lessons: LESSONS.map(l => `${l.emoji} ${l.title}`),
  });
}
