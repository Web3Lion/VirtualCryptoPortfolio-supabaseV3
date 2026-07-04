import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// ─────────────────────────────────────────────────────────
// NFT MODULE DATA
// ─────────────────────────────────────────────────────────
const MODULE = {
  title: 'NFTs & Digital Ownership',
  emoji: '🖼️',
  description: 'From digital art to gaming, music, ticketing, and identity — what NFTs actually are, why the market boomed and crashed, and where real-world utility is emerging.',
  order_index: 12,
};

const LESSONS = [

  // ═══════════════════════════════════════════════════════
  // 1. WHAT IS AN NFT?
  // ═══════════════════════════════════════════════════════
  {
    title: 'What Is an NFT?',
    emoji: '🎨',
    description: 'Non-fungible tokens explained — what makes something unique on a blockchain, how metadata works, and the difference between owning an NFT and owning the underlying art.',
    order_index: 1,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🎨 Fungible vs. Non-Fungible' } },
      { block_type: 'text', content: { text: '**Fungible** means interchangeable — one dollar is exactly equal to any other dollar. One Bitcoin equals one Bitcoin. You can swap them freely.\n\n**Non-fungible** means unique — each token is one-of-a-kind and cannot be equally exchanged for another.\n\nA trading card collection is non-fungible: a 1952 Mickey Mantle rookie card is not the same as any other baseball card. An original painting is non-fungible: a Picasso cannot be swapped equally for a Monet.\n\n**NFTs (Non-Fungible Tokens)** apply this concept to the blockchain — creating verifiable digital uniqueness for the first time in history. Before NFTs, any digital file could be perfectly copied infinite times. NFTs create a certificate of ownership that lives on a public blockchain, proving who owns the "original."' } },

      { block_type: 'heading', content: { text: '⚙️ How NFTs Work Technically' } },
      { block_type: 'text', content: { text: '**ERC-20 vs ERC-721:**\n- **ERC-20** is the token standard for fungible tokens (USDC, UNI, LINK). Each token is identical.\n- **ERC-721** is the NFT standard. Each token has a unique `tokenId` — no two are the same.\n- **ERC-1155** is a hybrid standard supporting both fungible and non-fungible tokens in one contract — used heavily in gaming.\n\n**Smart contracts** govern all NFT logic:\n- Who created the NFT (the "minter")\n- Who currently owns it\n- Transfer history (provenance)\n- Royalty rules (creator earns % on every resale)\n\n**The token itself** is tiny — it\'s just a record on the blockchain saying "token #4271 belongs to wallet 0x…". The actual image, video, or music lives elsewhere.' } },

      { block_type: 'heading', content: { text: '📦 Metadata & Storage: The Dirty Secret' } },
      { block_type: 'text', content: { text: 'Most people think buying an NFT means owning a JPEG on the blockchain. Usually, it doesn\'t.\n\n**What\'s actually stored on-chain:** A token ID + a URL pointing to a metadata JSON file.\n\n**What\'s in the metadata JSON:** Name, description, traits, and another URL pointing to the actual image.\n\n**Where does the image live?**\n- **Centralized server (bad):** If the company shuts down, the image URL breaks. You own a token pointing to a 404 error.\n- **IPFS (better):** InterPlanetary File System — a decentralized file network. The image stays accessible as long as nodes host it, but there\'s no guarantee.\n- **Fully on-chain (best):** The image data is encoded directly into the blockchain. Can never be deleted. Examples: CryptoPunks, Autoglyphs. Much more expensive to mint.\n\n**Famous example:** In 2021, an NFT project called "Evolved Apes" raised $2.7M and then the developer disappeared — the NFT images were hosted on a server that went offline. Buyers were left with tokens pointing to broken links.' } },

      { block_type: 'heading', content: { text: '🔑 What You Actually Own' } },
      { block_type: 'text', content: { text: 'Buying an NFT gives you:\n- ✅ A verifiable record on the blockchain proving you own that specific token\n- ✅ The ability to resell, transfer, or display it\n- ✅ Membership/community access (if the project offers it)\n\nBuying an NFT does NOT give you:\n- ❌ Copyright to the underlying artwork (unless explicitly stated)\n- ❌ The right to reproduce or sell prints\n- ❌ Any legal claim if the image is stolen or plagiarized\n\n**The copyright issue:** When Bored Ape Yacht Club owners discovered this, Yuga Labs updated their terms to grant full commercial rights — but most NFT projects never do. You can own the NFT but not legally put the image on a T-shirt.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://youtube.com/watch?v=4dkl5O9LOKg', title: 'What is an NFT? — Whiteboard Crypto', description: 'Whiteboard Crypto explains what makes tokens non-fungible, how ERC-721 contracts work, what metadata is, and what you actually own when you buy an NFT.' } },

      { block_type: 'article', content: { url: 'https://decrypt.co/resources/non-fungible-tokens-nfts-explained-guide-learn-blockchain', title: 'Beginner\'s Guide to NFTs: What Are Non-Fungible Tokens? — Decrypt', description: 'Decrypt\'s explainer on how NFTs work as cryptographically unique blockchain tokens — covering ERC-721, collectibles, gaming, and DeFi use cases.' } },
      { block_type: 'article', content: { url: 'https://opensea.io/learn/nft/what-are-nfts', title: 'What Are NFTs? — OpenSea Learn', description: 'OpenSea\'s official explainer on how NFTs work, how to buy and sell them, and what rights ownership grants.' } },
    ],
    questions: [
      { question_text: 'What makes a token "non-fungible"?', explanation: 'Non-fungible means each token is unique and cannot be equally exchanged for another. Unlike ETH or USDC where every unit is identical, each NFT has a unique ID making it one-of-a-kind.', options: [{ option_text: 'Each token is unique and cannot be equally swapped for another', is_correct: true }, { option_text: 'The token cannot be transferred to another wallet', is_correct: false }, { option_text: 'The token is not backed by any real-world asset', is_correct: false }, { option_text: 'The token has no monetary value', is_correct: false }] },
      { question_text: 'What is the ERC-721 token standard?', explanation: 'ERC-721 is the Ethereum standard for NFTs — each token has a unique tokenId making it distinct from all others, unlike ERC-20 tokens where every unit is identical.', options: [{ option_text: 'The Ethereum standard for NFTs — each token has a unique ID', is_correct: true }, { option_text: 'A standard for stablecoins pegged to $1', is_correct: false }, { option_text: 'A gaming token standard for play-to-earn rewards', is_correct: false }, { option_text: 'The standard for fungible tokens like USDC and UNI', is_correct: false }] },
      { question_text: 'Why is "fully on-chain" NFT storage considered the safest?', explanation: 'When image data is encoded directly on the blockchain, it can never be deleted or lost. Off-chain storage (servers or IPFS) can go offline, leaving NFT holders with tokens pointing to broken links.', options: [{ option_text: 'The image data is on the blockchain itself and can never be deleted or lost', is_correct: true }, { option_text: 'On-chain storage is cheaper than IPFS', is_correct: false }, { option_text: 'On-chain NFTs automatically earn staking rewards', is_correct: false }, { option_text: 'Only on-chain NFTs can be resold on marketplaces', is_correct: false }] },
      { question_text: 'What does buying an NFT typically NOT grant you?', explanation: 'Buying an NFT gives you ownership of the token but not copyright to the underlying artwork. You cannot legally reproduce or sell the image unless the project explicitly grants those rights.', options: [{ option_text: 'Copyright to the underlying artwork', is_correct: true }, { option_text: 'The ability to sell or transfer the token', is_correct: false }, { option_text: 'A verifiable record of ownership on the blockchain', is_correct: false }, { option_text: 'Community access if the project offers it', is_correct: false }] },
      { question_text: 'What is NFT metadata?', explanation: 'Metadata is the JSON file linked to an NFT token containing the name, description, traits, and URL to the actual image. The blockchain only stores the token ID and a link to this metadata.', options: [{ option_text: 'A JSON file with the name, traits, and image URL linked from the token', is_correct: true }, { option_text: 'The transaction history of everyone who owned the NFT', is_correct: false }, { option_text: 'The price history of the NFT on secondary markets', is_correct: false }, { option_text: 'The smart contract code that governs the NFT', is_correct: false }] },
      { question_text: 'What is the ERC-1155 standard used for?', explanation: 'ERC-1155 is a hybrid standard that supports both fungible and non-fungible tokens in a single contract, making it ideal for gaming where you might have 1,000 identical swords (fungible) but also a unique legendary item (non-fungible).', options: [{ option_text: 'A hybrid standard supporting both fungible and non-fungible tokens — popular in gaming', is_correct: true }, { option_text: 'A standard for NFTs that can only be used once', is_correct: false }, { option_text: 'The standard for minting NFTs on Solana', is_correct: false }, { option_text: 'A stablecoin standard for in-game currencies', is_correct: false }] },
      { question_text: 'What risk does "centralized server" NFT storage create?', explanation: 'If the company hosting the images shuts down or the server goes offline, the NFT\'s image URL breaks. The token still exists on the blockchain but points to a 404 error — leaving owners with a broken NFT.', options: [{ option_text: 'If the company shuts down, the image URL breaks and owners are left with broken tokens', is_correct: true }, { option_text: 'Centralized servers make NFTs worth less than on-chain ones', is_correct: false }, { option_text: 'The government can seize NFTs stored on centralized servers', is_correct: false }, { option_text: 'Centralized storage makes it impossible to transfer the NFT', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 2. NFT MARKETPLACES
  // ═══════════════════════════════════════════════════════
  {
    title: 'NFT Marketplaces & Trading',
    emoji: '🏪',
    description: 'How NFT buying and selling works — royalties, gas wars, the rise of Blur, and what "marketplace wars" mean for creators.',
    order_index: 2,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🏪 How NFT Marketplaces Work' } },
      { block_type: 'text', content: { text: 'An **NFT marketplace** is a platform where you can buy, sell, and discover NFTs. Think of it like eBay or Amazon — but for digital collectibles, and where transactions are settled by smart contracts rather than a company.\n\n**How a sale works:**\n1. The seller lists an NFT at a fixed price or starts an auction\n2. A buyer clicks "Buy Now" and signs a transaction with their wallet\n3. The smart contract transfers the NFT to the buyer and sends ETH (minus fees) to the seller\n4. The creator automatically receives a royalty percentage\n5. The marketplace takes a platform fee (typically 1–2.5%)\n\n**Major marketplaces:**\n- **OpenSea** — launched 2017, was the dominant marketplace for years; supports Ethereum, Polygon, Solana\n- **Blur** — launched 2022; disrupted OpenSea with zero trading fees and token rewards for traders\n- **Magic Eden** — largest Solana NFT marketplace; expanded to Ethereum and Bitcoin\n- **Foundation** — curated platform for digital artists; invite-only, higher-quality focus\n- **Rarible** — community-governed marketplace with its own RARI token' } },

      { block_type: 'heading', content: { text: '💰 Royalties: The Creator Economy Problem' } },
      { block_type: 'text', content: { text: '**Creator royalties** were one of NFTs\' biggest innovations — the idea that artists earn a percentage (typically 5–10%) every time their work resells, forever.\n\n**Example:** Beeple sold an NFT for $500. It later resells for $10,000. Beeple automatically receives 10% = $1,000 — with no middleman.\n\n**The royalty wars (2022–2023):**\nBlur launched with a radical strategy: zero trading fees and optional royalties (traders could set them to 0%). This attracted high-volume traders away from OpenSea.\n\nOpenSea initially tried to enforce royalties by blocking Blur. Then in 2023 it surrendered and also made royalties optional.\n\n**Impact on creators:** Royalty payments dropped significantly. Many artists saw their secondary sale income collapse. This sparked a debate about whether blockchain can truly enforce creator rights without marketplace cooperation.\n\n**Current state:** Some newer contracts enforce royalties at the smart contract level (on-chain royalties), which no marketplace can bypass. But adoption is still limited.' } },

      { block_type: 'heading', content: { text: '⛽ Gas Wars & Minting Costs' } },
      { block_type: 'text', content: { text: 'During NFT peak season (2021–early 2022), popular drops caused **gas wars** — frenzies where thousands of people competed to mint NFTs simultaneously.\n\n**What happens in a gas war:**\n- A project announces minting opens at noon\n- Thousands of wallets try to transact in the same block\n- Ethereum can only process ~15 transactions per second\n- People bid up gas fees to get their transactions included first\n- Gas fees spiked to $500–$2,000 per transaction during peak gas wars\n- Many people paid $500 in gas fees to mint an NFT worth $200\n\n**The failed mint problem:** If your transaction fails (because someone else got the last NFT before you), you still pay the gas fee but receive nothing.\n\n**Solutions:** Many projects moved to Polygon, Solana, or other chains with much lower fees. Ethereum L2s (Arbitrum, Base) also offer cheap NFT minting.' } },

      { block_type: 'heading', content: { text: '📊 Wash Trading & Fake Volume' } },
      { block_type: 'text', content: { text: '**Wash trading** is when someone buys and sells an NFT to themselves using different wallets to artificially inflate the price and trading volume.\n\n**How it works:**\n1. Trader owns Wallet A and Wallet B\n2. Wallet A lists an NFT for 1 ETH\n3. Wallet B "buys" it for 1 ETH\n4. The NFT "sale" is recorded, making the collection look active and valuable\n5. Repeat with increasing prices to create a fake price history\n\n**Scale of the problem:** A 2022 analysis by Chainalysis found wash trading accounted for a significant portion of NFT volume on some platforms. Some collections had nearly all their volume from a small number of self-trading wallets.\n\n**Why it matters:** Fake volume misleads buyers into thinking a collection is popular, pumping the price before insiders sell to real buyers at the inflated price.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://youtube.com/watch?v=z8MCevWETm4', title: 'TOP 5 Best NFT Marketplaces — Coin Bureau', description: 'Coin Bureau breaks down the top NFT marketplaces on Ethereum, Solana, and Flow — fee structures, creator royalties, and how platform competition changed the landscape for collectors and creators.' } },

      { block_type: 'article', content: { url: 'https://decrypt.co/121768/blur-opensea-ethereum-nft-trading-skyrockets', title: 'Blur Overtakes OpenSea as Ethereum NFT Trading Skyrockets — Decrypt', description: 'How Blur disrupted OpenSea with zero fees and token rewards, reshaping the NFT marketplace landscape.' } },
      { block_type: 'article', content: { url: 'https://blur.io', title: 'Blur NFT Marketplace — blur.io', description: 'The professional NFT trading platform that overtook OpenSea — see live volume, floor prices, and bids.' } },
    ],
    questions: [
      { question_text: 'What percentage does an NFT marketplace typically charge as a platform fee?', explanation: 'Most NFT marketplaces charge 1–2.5% of each sale as a platform fee, separate from the creator royalty (typically 5–10%) that goes to the original artist.', options: [{ option_text: '1–2.5% platform fee, separate from creator royalties', is_correct: true }, { option_text: '10–20% of each sale', is_correct: false }, { option_text: 'A flat fee of $5 per transaction', is_correct: false }, { option_text: 'No fees — all revenue comes from token sales', is_correct: false }] },
      { question_text: 'What is an NFT creator royalty?', explanation: 'A creator royalty is a percentage (typically 5–10%) the original artist receives automatically every time their NFT is resold, enforced by the smart contract. It was designed to give artists ongoing income from secondary sales.', options: [{ option_text: 'A percentage the original creator earns on every secondary resale, enforced by smart contract', is_correct: true }, { option_text: 'A fee collectors pay to mint NFTs on a platform', is_correct: false }, { option_text: 'The amount of ETH the marketplace gives creators for listing', is_correct: false }, { option_text: 'A tax paid to the Ethereum network on every NFT sale', is_correct: false }] },
      { question_text: 'How did Blur disrupt OpenSea starting in 2022?', explanation: 'Blur launched with zero trading fees and optional royalties, attracting high-volume traders away from OpenSea. It also incentivized trading with its BLUR token rewards, making it cheaper and more profitable for professional traders.', options: [{ option_text: 'Zero trading fees and optional royalties, plus BLUR token rewards for traders', is_correct: true }, { option_text: 'By launching its own NFT collection that became more popular than BAYC', is_correct: false }, { option_text: 'By partnering exclusively with major celebrities', is_correct: false }, { option_text: 'By moving all NFTs off Ethereum to a cheaper blockchain', is_correct: false }] },
      { question_text: 'What is a "gas war" in NFT minting?', explanation: 'A gas war happens when thousands of people try to mint a popular NFT at the same time. Since Ethereum processes ~15 transactions per second, people bid up gas fees to get priority — sometimes paying more in gas than the NFT is worth.', options: [{ option_text: 'Thousands of people bidding up gas fees to mint a popular NFT simultaneously', is_correct: true }, { option_text: 'A price war between competing NFT marketplaces', is_correct: false }, { option_text: 'A dispute between NFT projects over gas fee revenue', is_correct: false }, { option_text: 'Artists competing to have their NFT featured on OpenSea', is_correct: false }] },
      { question_text: 'What is NFT wash trading?', explanation: 'Wash trading is buying and selling an NFT between your own wallets to artificially inflate price history and volume, making a collection appear more popular and valuable than it actually is.', options: [{ option_text: 'Buying and selling between your own wallets to fake volume and inflate prices', is_correct: true }, { option_text: 'Selling an NFT immediately after minting at a loss', is_correct: false }, { option_text: 'Using a bot to auto-buy NFTs at floor price', is_correct: false }, { option_text: 'Laundering stolen funds through NFT purchases', is_correct: false }] },
      { question_text: 'What happened to creator royalties during the 2022–2023 "royalty wars"?', explanation: 'Blur made royalties optional (traders could set them to 0%). OpenSea eventually followed. Royalty payments to creators dropped significantly, hurting artists who relied on secondary sale income.', options: [{ option_text: 'Marketplaces made royalties optional, causing creator payments to collapse', is_correct: true }, { option_text: 'Royalties doubled as competition increased between platforms', is_correct: false }, { option_text: 'The Ethereum network banned royalties to reduce gas costs', is_correct: false }, { option_text: 'Artists successfully lobbied to have royalties made mandatory by law', is_correct: false }] },
      { question_text: 'Why did many NFT projects move to Polygon, Solana, or Ethereum L2s?', explanation: 'Ethereum mainnet gas wars made minting extremely expensive and unpredictable. Polygon, Solana, and L2s like Base and Arbitrum offer near-zero fees, making NFT minting accessible without risking hundreds of dollars in failed transaction fees.', options: [{ option_text: 'To avoid expensive and unpredictable Ethereum mainnet gas fees', is_correct: true }, { option_text: 'Because Ethereum banned NFT minting in 2022', is_correct: false }, { option_text: 'Because these chains have larger user bases than Ethereum', is_correct: false }, { option_text: 'OpenSea required all projects to move to Polygon', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 3. NFT ART & THE BORED APE ERA
  // ═══════════════════════════════════════════════════════
  {
    title: 'NFT Art & the Bored Ape Era',
    emoji: '🐒',
    description: 'The rise of profile picture NFTs, celebrity culture, the $69M Beeple sale, and how the market hit $25 billion then crashed.',
    order_index: 3,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🐒 The PFP Era' } },
      { block_type: 'text', content: { text: '**Profile Picture NFTs (PFPs)** are collections of algorithmically generated character images — each one unique based on a random combination of traits (background, fur color, hat, eyes, etc.).\n\nThe format was pioneered by **CryptoPunks** (2017) — 10,000 pixelated characters generated by Larva Labs, given away for free (just pay gas) to Ethereum wallet holders. Today, individual CryptoPunks have sold for millions.\n\n**Bored Ape Yacht Club (BAYC)** — launched April 2021 by Yuga Labs:\n- 10,000 unique cartoon ape images\n- Mint price: 0.08 ETH (~$190 at the time)\n- Within weeks, floor price hit 1 ETH. By 2022, floor was 150 ETH (~$430,000)\n- Holders received exclusive access: parties, merchandise, real-world events\n- Full commercial rights granted — owners could use their ape in businesses\n- Celebrities who bought in: Justin Bieber, Eminem, Steph Curry, Jimmy Fallon, Paris Hilton\n\nThe BAYC\'s genius wasn\'t the art — it was creating a **status symbol and social club** where your profile picture doubled as a membership card.' } },

      { block_type: 'heading', content: { text: '💎 Beeple & the $69 Million Sale' } },
      { block_type: 'text', content: { text: 'On March 11, 2021, digital artist **Mike "Beeple" Winkelmann** sold an NFT at Christie\'s auction house for **$69.3 million** — the third highest price ever paid for a living artist\'s work.\n\nThe piece — **"Everydays: The First 5000 Days"** — was a collage of 5,000 images Beeple had posted online daily for over 13 years.\n\n**Why this moment mattered:**\n- It was the first purely digital artwork sold by a major auction house\n- It proved NFTs were being taken seriously by the traditional art world\n- It introduced millions of people (and many artists) to NFTs overnight\n- It put $69M directly in the hands of the artist with no gallery taking 50%\n\n**The buyer:** Vignesh Sundareswaran ("Metakovan"), a crypto fund manager who paid entirely in ETH.\n\n**The aftermath:** The sale supercharged the NFT market. Artists who had been struggling for recognition suddenly saw NFTs as a path to financial freedom. The NFT market went from $340M in 2020 to **$25 billion in 2021**.' } },

      { block_type: 'heading', content: { text: '📉 The Crash' } },
      { block_type: 'text', content: { text: 'The NFT market peaked in early 2022 and then collapsed dramatically:\n\n**By the numbers:**\n- January 2022: NFT trading volume $4.8B/month\n- September 2022: NFT trading volume $466M/month (down 90%)\n- 2023: Majority of NFTs from the 2021 boom had 0 trading volume\n\n**What went wrong:**\n- **Speculation over substance:** Most buyers were purchasing to flip, not because they valued the art\n- **Oversupply:** Thousands of copycat PFP collections launched weekly\n- **Celebrity dumps:** Many celebrities who promoted NFT projects sold their holdings shortly after, leaving buyers holding losses\n- **Crypto bear market:** As ETH and BTC prices crashed in 2022, NFT prices followed\n- **Lack of utility:** Most NFTs promised exclusive communities and real-world perks that never materialized\n\n**The Beeple effect in reverse:** In 2023, Beeple\'s secondary market prices also declined significantly from their 2021 peaks.' } },

      { block_type: 'heading', content: { text: '🎭 What Survived' } },
      { block_type: 'text', content: { text: 'Despite the crash, some blue-chip NFT projects maintained significant value and communities:\n\n- **CryptoPunks** — still the gold standard; Visa bought one in 2021. Floor remains in the tens of thousands of dollars.\n- **BAYC** — floor dropped 90%+ from peak but community/IP remained active. Yuga Labs expanded into gaming (Otherside metaverse)\n- **Art Blocks** — generative art platform where algorithms create unique works at mint time. Collectors focus on artistic merit over hype\n- **Pudgy Penguins** — recovered from a rocky start to become one of the most recognized NFT brands; launched physical toys in Walmart\n\n**Lesson:** NFTs with genuine community, utility, or artistic merit survived. Pure speculation plays collapsed.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://youtube.com/watch?v=WOxYlBTRncY', title: 'NFT Mania: CryptoPunks, BAYC & Generative Art Explained — Finematics', description: 'Finematics explains CryptoPunks, Bored Ape Yacht Club, generative art, and the PFP mania that drove the NFT market to $25 billion — including the IP rights model that made BAYC different.' } },

      { block_type: 'article', content: { url: 'https://decrypt.co/86135/biggest-celebrity-nft-owners-bored-ape-yacht-club', title: 'The Biggest Celebrity NFT Owners in the Bored Ape Yacht Club — Decrypt', description: 'A key moment in the NFT art market — either the Beeple Christie\'s sale or the Bored Ape phenomenon explained.' } },
      { block_type: 'article', content: { url: 'https://boredapeyachtclub.com', title: 'Bored Ape Yacht Club — Official Site', description: 'The official home of BAYC — see the collection, community, and latest Yuga Labs developments.' } },
    ],
    questions: [
      { question_text: 'What are "PFP NFTs"?', explanation: 'PFP (Profile Picture) NFTs are algorithmically generated character collections — each image unique based on random trait combinations. Buyers use them as social media avatars that signal membership in a community.', options: [{ option_text: 'Algorithmically generated character collections used as social media profile pictures', is_correct: true }, { option_text: 'NFTs that include a photograph of the buyer\'s face', is_correct: false }, { option_text: 'NFTs that can only be displayed as profile pictures, not resold', is_correct: false }, { option_text: 'Professional photography NFTs sold on Foundation', is_correct: false }] },
      { question_text: 'How much did Beeple\'s "Everydays: The First 5000 Days" sell for at Christie\'s?', explanation: 'Beeple\'s collage sold for $69.3 million at Christie\'s in March 2021 — the third highest price ever for a living artist\'s work and the first purely digital artwork sold by a major auction house.', options: [{ option_text: '$69.3 million', is_correct: true }, { option_text: '$1.2 million', is_correct: false }, { option_text: '$420 million', is_correct: false }, { option_text: '$25 million', is_correct: false }] },
      { question_text: 'What was the original mint price of a Bored Ape Yacht Club NFT?', explanation: 'BAYC launched in April 2021 at 0.08 ETH — roughly $190 at the time. By early 2022, the floor price had risen to around 150 ETH (~$430,000), a gain of roughly 2,000x for early minters.', options: [{ option_text: '0.08 ETH (~$190 at launch)', is_correct: true }, { option_text: '1 ETH (~$2,000)', is_correct: false }, { option_text: '$10,000 in USDC', is_correct: false }, { option_text: 'Free — gas fee only', is_correct: false }] },
      { question_text: 'What was the total NFT trading volume in 2021 at the market\'s peak?', explanation: 'The NFT market grew from $340 million in 2020 to approximately $25 billion in 2021, fueled by the Beeple sale, BAYC mania, celebrity adoption, and speculative trading.', options: [{ option_text: 'Approximately $25 billion', is_correct: true }, { option_text: '$1.5 billion', is_correct: false }, { option_text: '$500 million', is_correct: false }, { option_text: '$250 billion', is_correct: false }] },
      { question_text: 'Which NFT collection — launched in 2017 — is considered the original pioneer of the PFP format?', explanation: 'CryptoPunks, created by Larva Labs in 2017, were 10,000 pixelated characters given away free (gas-only). They pioneered the PFP format and remain among the most valuable NFTs ever — individual Punks have sold for millions.', options: [{ option_text: 'CryptoPunks by Larva Labs', is_correct: true }, { option_text: 'Bored Ape Yacht Club by Yuga Labs', is_correct: false }, { option_text: 'Pudgy Penguins', is_correct: false }, { option_text: 'Doodles', is_correct: false }] },
      { question_text: 'What distinguished BAYC from most other NFT collections and helped it succeed?', explanation: 'BAYC granted holders full commercial rights to their ape images and built a genuine community with real-world events, exclusive parties, and merchandise. The NFT doubled as both art and a membership card to an exclusive club.', options: [{ option_text: 'Full commercial rights, real-world events, and genuine community building', is_correct: true }, { option_text: 'Each ape had a unique AI personality that interacted with the holder', is_correct: false }, { option_text: 'BAYC was the first NFT collection to be minted on Solana', is_correct: false }, { option_text: 'The collection was created by a famous traditional artist', is_correct: false }] },
      { question_text: 'What was a primary reason the NFT market crashed 90%+ from its 2022 peak?', explanation: 'Most NFT buyers were speculators hoping to flip for profit, not genuine art collectors. When the broader crypto market crashed and the supply of new NFT projects overwhelmed demand, the speculative bubble collapsed.', options: [{ option_text: 'Speculation dominated over genuine demand — the market was driven by flippers, not collectors', is_correct: true }, { option_text: 'Ethereum banned NFT trading in 2022', is_correct: false }, { option_text: 'A hack drained all major NFT wallets', is_correct: false }, { option_text: 'NFT art was proven to be AI-generated and therefore worthless', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 4. GAMING NFTs & PLAY-TO-EARN
  // ═══════════════════════════════════════════════════════
  {
    title: 'Gaming NFTs & Play-to-Earn',
    emoji: '🎮',
    description: 'How blockchain gaming reimagined in-game ownership — Axie Infinity, the play-to-earn boom, why it collapsed, and what comes next.',
    order_index: 4,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🎮 The Problem with Traditional Gaming' } },
      { block_type: 'text', content: { text: 'In traditional games, you spend real money on skins, characters, weapons, and items — but you don\'t truly own them:\n- You can\'t sell your items to other players (usually)\n- If the game shuts down, everything disappears\n- The game company can ban you and you lose everything\n- Items are locked inside one game — a sword in Fortnite can\'t go to Call of Duty\n\n**Blockchain gaming** proposes a different model:\n- In-game items are NFTs owned by the player\'s wallet\n- Items can be sold on open marketplaces\n- Items theoretically survive the game shutting down\n- True digital ownership — the game company can\'t take it away\n\nThe idea sparked a wave of blockchain games, with **Axie Infinity** becoming the first massive success.' } },

      { block_type: 'heading', content: { text: '🦎 Axie Infinity: The Play-to-Earn Phenomenon' } },
      { block_type: 'text', content: { text: '**Axie Infinity** (by Sky Mavis) is a Pokémon-style battle game where players collect, breed, and battle creatures called Axies — each one an NFT.\n\n**The play-to-earn model:**\n- Players earn **SLP (Smooth Love Potion)** tokens by winning battles\n- SLP could be sold for real money on exchanges\n- At peak, skilled players in the Philippines earned $1,000–$1,500/month — more than the average salary\n\n**The boom (2021):**\n- 2.5 million daily active players at peak\n- Axie became a full-time job for thousands in Southeast Asia\n- "Scholarship" programs: people who couldn\'t afford the $1,000+ entry cost (you need 3 Axies to play) borrowed teams from investors and split earnings\n- Sky Mavis generated over $1.3 billion in revenue in 2021\n\n**The Ronin Bridge hack:**\nIn March 2022, hackers (North Korea\'s Lazarus Group) compromised the Ronin Bridge and stole $625M — the largest gaming hack in history. Sky Mavis spent $150M of their own funds to partially reimburse players.' } },

      { block_type: 'heading', content: { text: '📉 The P2E Collapse' } },
      { block_type: 'text', content: { text: '**Why the model broke:**\n\nPlay-to-earn economics rely on new players constantly buying in to generate the tokens that existing players sell. It\'s essentially a pyramid:\n- New players buy Axies → creates demand for Axies → price stays high\n- Old players sell SLP tokens → new players must keep buying SLP to breed Axies\n- When new player growth slows → SLP price crashes → game stops being profitable to play\n\n**The numbers:**\n- SLP peaked at $0.35 in mid-2021\n- By early 2022 it was $0.01 — a 97% crash\n- Players who needed 6 months of play to recoup their Axie purchase were suddenly underwater\n- Many Philippine players who had quit jobs to play Axie were left with worthless tokens\n\n**Broader P2E failures:**\nNearly every major P2E game that launched in 2021–2022 followed the same economic doom loop. The fundamentals were circular: the token only had value because new players needed it; when growth stopped, value collapsed.' } },

      { block_type: 'heading', content: { text: '🚀 What\'s Next: Play-and-Own' } },
      { block_type: 'text', content: { text: 'The industry has shifted from "play-to-earn" to **"play-and-own"** — games that are fun first, with blockchain ownership as an added benefit rather than the core economic model.\n\n**Promising projects:**\n- **Immutable X** — Ethereum L2 for gaming; partners include Gods Unchained and Guild of Guardians. Gas-free NFT trades.\n- **Parallel** — a sci-fi card game with deep lore, trading card NFTs, and gameplay that stands on its own without needing crypto to enjoy it\n- **Pixels** — a farming game on Ronin that hit 1M+ daily players in 2024\n- **BigTime** — an action RPG from major gaming veterans; NFT cosmetics optional\n\n**The key insight:** Blockchain gaming succeeds when the game is genuinely fun and NFT ownership is a bonus, not when the only reason to play is to earn money.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://youtube.com/watch?v=mXEYCXCPI5c', title: 'Axie Infinity & Play-to-Earn Explained — Whiteboard Crypto', description: 'How Axie Infinity pioneered play-to-earn, the scholarship model, why the economics collapsed, and what blockchain gaming looks like going forward.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/business/2021/05/11/for-filipinos-axie-infinity-is-more-than-a-crypto-game', title: 'For Filipinos, Axie Infinity Is More Than a Crypto Game — CoinDesk', description: 'CoinDesk reports how the Philippines became Axie\'s #1 user base globally, with players earning 10,000 PHP/week and the scholarship model enabling low-income players to participate.' } },
      { block_type: 'article', content: { url: 'https://axieinfinity.com', title: 'Axie Infinity — Official Site', description: 'The original play-to-earn phenomenon — see the game, marketplace, and current Axie economy.' } },
    ],
    questions: [
      { question_text: 'What is the core promise of blockchain gaming vs. traditional gaming?', explanation: 'Blockchain gaming promises true ownership — in-game items are NFTs in your wallet that you can sell, trade, or keep even if the game shuts down. In traditional games, items are controlled by the company and can be taken away.', options: [{ option_text: 'True item ownership — items are NFTs you can sell or keep even if the game shuts down', is_correct: true }, { option_text: 'Better graphics and gameplay than traditional games', is_correct: false }, { option_text: 'Free-to-play with no upfront costs', is_correct: false }, { option_text: 'Items from different games can be used together', is_correct: false }] },
      { question_text: 'What token did Axie Infinity players earn by winning battles?', explanation: 'Players earned SLP (Smooth Love Potion) tokens by winning battles. SLP was required to breed new Axies and could be sold on exchanges for real money — making it the core of the play-to-earn economy.', options: [{ option_text: 'SLP (Smooth Love Potion)', is_correct: true }, { option_text: 'AXS (Axie Infinity Shard)', is_correct: false }, { option_text: 'RON (Ronin)', is_correct: false }, { option_text: 'ETH (Ethereum)', is_correct: false }] },
      { question_text: 'Why did Axie Infinity\'s play-to-earn economy collapse?', explanation: 'The model required constant new player growth to sustain token prices. When new players stopped joining, SLP token demand fell, prices crashed 97%, and the game stopped being economically viable to play.', options: [{ option_text: 'The token economy needed constant new players — when growth stopped, token prices crashed 97%', is_correct: true }, { option_text: 'Sky Mavis got hacked and the entire game was deleted', is_correct: false }, { option_text: 'The Philippines government banned the game', is_correct: false }, { option_text: 'A competitor released a better game and stole all the players', is_correct: false }] },
      { question_text: 'What was the "scholarship" system in Axie Infinity?', explanation: 'Since starting Axie required buying 3 Axies (costing $1,000+ at peak), investors who owned many Axies would loan teams to players who couldn\'t afford entry. The player split their earnings with the investor — like sharecropping for crypto gaming.', options: [{ option_text: 'Investors loaned Axie teams to players who couldn\'t afford entry and split the earnings', is_correct: true }, { option_text: 'Axie Academy where new players learned strategy for free', is_correct: false }, { option_text: 'A program where universities offered courses in blockchain gaming', is_correct: false }, { option_text: 'Top players earned scholarships to gaming tournaments', is_correct: false }] },
      { question_text: 'How much was stolen in the Ronin Bridge hack connected to Axie Infinity?', explanation: 'In March 2022, North Korea\'s Lazarus Group compromised Axie Infinity\'s Ronin Bridge and stole $625 million — the largest gaming hack in history. Sky Mavis used $150M of their own funds to partially compensate players.', options: [{ option_text: '$625 million', is_correct: true }, { option_text: '$50 million', is_correct: false }, { option_text: '$1.2 billion', is_correct: false }, { option_text: '$125 million', is_correct: false }] },
      { question_text: 'What is the "play-and-own" model that replaced play-to-earn?', explanation: 'Play-and-own means the game is genuinely fun to play first, with NFT ownership as an optional benefit — not a requirement. The core appeal is entertainment, not earning money. This avoids the pyramid economics of P2E.', options: [{ option_text: 'Games that are fun first, with NFT ownership as a bonus rather than the core economic model', is_correct: true }, { option_text: 'Players must own NFTs before they are allowed to play', is_correct: false }, { option_text: 'Games where you pay with NFTs instead of real money', is_correct: false }, { option_text: 'A model where the game company owns all in-game items', is_correct: false }] },
      { question_text: 'What fundamental economic problem made most play-to-earn games unsustainable?', explanation: 'P2E economies are circular — tokens only have value because new players need them. Without constant new player growth buying in, token prices collapse and the game stops paying. It\'s structurally similar to a pyramid scheme.', options: [{ option_text: 'Token value depended on new players constantly buying in — a circular economy requiring endless growth', is_correct: true }, { option_text: 'Governments taxed play-to-earn income at 90%, making it unprofitable', is_correct: false }, { option_text: 'The games were too technically difficult for mainstream players', is_correct: false }, { option_text: 'Traditional game companies lobbied governments to shut them down', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 5. MUSIC NFTs & CREATOR ROYALTIES
  // ═══════════════════════════════════════════════════════
  {
    title: 'Music NFTs & Creator Economy',
    emoji: '🎵',
    description: 'How musicians are using NFTs to sell directly to fans, earn ongoing royalties, and cut out record labels and streaming platforms.',
    order_index: 5,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🎵 The Problem with the Music Industry' } },
      { block_type: 'text', content: { text: 'The modern music industry takes a massive cut from artists:\n- **Record labels** take 80–90% of streaming revenue in exchange for distribution and marketing\n- **Spotify** pays roughly $0.003–$0.005 per stream — an artist needs ~250,000 streams to earn $1,000\n- **Concert promoters** take 15–25%\n- **Publishers and PROs** take cuts of synchronization and performance royalties\n\nThe result: most musicians — even ones with millions of plays — barely make a living from their music.\n\n**NFTs offer a different model:**\n- Sell music directly to fans with no intermediary\n- Set your own price\n- Earn royalties on every secondary resale automatically via smart contract\n- Build a direct relationship with your most dedicated fans\n- Give fans ownership stakes in your success' } },

      { block_type: 'heading', content: { text: '🤘 Pioneer Artists' } },
      { block_type: 'text', content: { text: '**3LAU (DJ Justin Blau) — $11.7M in one weekend (2021):**\nElectronic musician 3LAU sold 33 tokenized versions of his 2018 album "Ultraviolet," offering buyers unreleased music, custom songs, and vinyl records. He raised $11.7 million in one weekend — entirely without a label.\n\n**Kings of Leon — "When You See Yourself" (March 2021):**\nThe first major band to release an album as an NFT. They sold three types of tokens: the album itself, limited-edition vinyl, and front-row concert seats for life. Raised $2M+.\n\n**Grimes — $6M in 20 minutes:**\nThe musician sold digital art + music NFTs through Nifty Gateway, raising $6 million in under 20 minutes. Included original paintings paired with music.\n\n**Snoop Dogg, Eminem, Jay-Z:** All purchased Bored Apes and incorporated them into music videos and merchandise — blurring the line between NFT culture and mainstream music.' } },

      { block_type: 'heading', content: { text: '🏗️ Music NFT Platforms' } },
      { block_type: 'text', content: { text: '**Catalog** — a music NFT marketplace where artists release single tracks as 1-of-1 NFTs. The collector who buys it owns the "original" — it\'s like owning a master recording. Artists retain copyright.\n\n**Sound.xyz** — lets artists mint "listening parties" where early fans can own a numbered edition of a song. Like owning a numbered print of a painting.\n\n**Royal** — allows artists to sell fractional royalty rights to fans. Buy a 1% stake in a Taylor Swift-style artist\'s streaming revenue. If the song goes platinum, your stake pays out proportionally.\n\n**Audius** — a decentralized Spotify alternative where artists keep 90%+ of revenue and fans can tip directly in AUDIO tokens.\n\n**The key innovation at Royal:** Fans become stakeholders, not just consumers. When "your" artist blows up, you share in their success.' } },

      { block_type: 'heading', content: { text: '🔮 The Future: Fan Ownership' } },
      { block_type: 'text', content: { text: '**The streaming royalty problem:** Traditional streaming is a winner-take-all economy. The top 1% of artists earn 90% of royalties. The other 99% earn fractions of a cent.\n\n**What music NFTs could change:**\n- Artists can crowdfund albums directly from fans before recording\n- Super-fans who invest early share in the artist\'s success\n- Smart contracts automatically split royalties between multiple collaborators instantly\n- An artist can release 100 editions of a track — fans who own one get a portion of streaming revenue forever\n\n**Challenges:**\n- Music NFT markets are much smaller than visual art NFTs\n- Most fans don\'t want to "invest" in music — they just want to stream\n- Copyright law still hasn\'t caught up with fractional royalty ownership\n- Mainstream adoption requires making wallets and crypto invisible to casual fans' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://youtube.com/watch?v=aeGoyh3twn0', title: 'Billboard Explains NFTs & the Music Industry', description: 'Billboard Magazine covers how 3LAU, Kings of Leon, The Weeknd, and others used NFTs to sell music directly to fans — bypassing labels and earning automatic resale royalties.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/business/2021/03/03/kings-of-leon-to-release-new-album-as-nft-with-tokenized-tickets-for-superfans', title: 'Kings of Leon to Release New Album as NFT With Tokenized Tickets — CoinDesk', description: 'A key moment in music NFTs — either the Kings of Leon album release or 3LAU\'s $11.7M weekend explained.' } },
      { block_type: 'article', content: { url: 'https://sound.xyz', title: 'Sound.xyz — Music NFT Platform', description: 'A platform where artists mint music NFTs and fans can own numbered editions of songs, building a direct fan-artist economy.' } },
    ],
    questions: [
      { question_text: 'How much does Spotify typically pay per stream?', explanation: 'Spotify pays roughly $0.003–$0.005 per stream. An artist needs approximately 250,000 streams to earn $1,000 — making it very difficult for most musicians to live from streaming income alone.', options: [{ option_text: 'About $0.003–$0.005 per stream (~250,000 streams for $1,000)', is_correct: true }, { option_text: '$1 per stream', is_correct: false }, { option_text: '$0.50 per stream', is_correct: false }, { option_text: '$0.10 per stream', is_correct: false }] },
      { question_text: 'What did 3LAU sell as NFTs in 2021 that raised $11.7 million?', explanation: '3LAU sold 33 tokenized versions of his 2018 album "Ultraviolet," offering buyers unreleased music, custom songs, and vinyl records — raising $11.7 million in one weekend without a label.', options: [{ option_text: 'Tokenized versions of his album with unreleased music and custom songs', is_correct: true }, { option_text: 'Concert tickets for his entire world tour as NFTs', is_correct: false }, { option_text: 'His music production equipment as physical-backed NFTs', is_correct: false }, { option_text: 'Exclusive merchandise with embedded NFC chips linked to NFTs', is_correct: false }] },
      { question_text: 'What does the Royal platform allow fans to purchase?', explanation: 'Royal lets artists sell fractional royalty rights to fans — you can buy a 1% stake in a song\'s streaming revenue. When the song earns royalties, your stake pays out proportionally, making fans financial stakeholders in the music\'s success.', options: [{ option_text: 'Fractional royalty stakes in an artist\'s streaming revenue', is_correct: true }, { option_text: 'NFT versions of old vinyl records', is_correct: false }, { option_text: 'Exclusive access to an artist\'s unreleased songs', is_correct: false }, { option_text: 'Governance rights over which songs an artist should release', is_correct: false }] },
      { question_text: 'What was significant about Kings of Leon\'s NFT release in 2021?', explanation: 'Kings of Leon were the first major band to release an album as an NFT, offering three types of tokens including front-row concert seats for life. It showed that mainstream musicians could use NFTs without being crypto-native.', options: [{ option_text: 'They were the first major band to release an album as an NFT', is_correct: true }, { option_text: 'They sold the most expensive music NFT in history', is_correct: false }, { option_text: 'They launched their own NFT marketplace', is_correct: false }, { option_text: 'They gave their entire music catalog away as free NFTs', is_correct: false }] },
      { question_text: 'What is Audius designed to do for musicians?', explanation: 'Audius is a decentralized Spotify alternative where artists keep 90%+ of revenue and fans can tip directly in AUDIO tokens — eliminating the intermediary that takes the majority of streaming income.', options: [{ option_text: 'A decentralized streaming platform where artists keep 90%+ of revenue', is_correct: true }, { option_text: 'A platform for auctioning the rights to famous songs', is_correct: false }, { option_text: 'An AI tool that generates music for NFT projects', is_correct: false }, { option_text: 'A marketplace for buying physical vinyl records with NFT certificates', is_correct: false }] },
      { question_text: 'What is the core innovation of music NFTs compared to traditional music distribution?', explanation: 'Music NFTs allow artists to sell directly to fans with no intermediary taking 80-90%, earn automatic royalties on every resale via smart contract, and build direct financial relationships with their most dedicated supporters.', options: [{ option_text: 'Direct fan sales with no intermediary and automatic resale royalties via smart contract', is_correct: true }, { option_text: 'Better audio quality than streaming platforms', is_correct: false }, { option_text: 'Music that can only be heard by the NFT owner', is_correct: false }, { option_text: 'Automatic copyright registration for every song', is_correct: false }] },
      { question_text: 'What is one major challenge preventing mainstream adoption of music NFTs?', explanation: 'Most music fans just want to stream — they don\'t want to set up crypto wallets or invest in music as an asset. Making the crypto layer invisible to casual listeners is a major unsolved challenge for music NFT platforms.', options: [{ option_text: 'Most fans want to stream, not invest — wallets and crypto add too much friction', is_correct: true }, { option_text: 'Music NFTs are illegal in most countries', is_correct: false }, { option_text: 'Spotify and Apple Music have successfully sued all music NFT platforms', is_correct: false }, { option_text: 'Musicians must give up their copyright when minting music NFTs', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 6. NFT TICKETING & REAL-WORLD USE
  // ═══════════════════════════════════════════════════════
  {
    title: 'NFT Ticketing & Real-World Use',
    emoji: '🎟️',
    description: 'How NFTs are solving real problems in ticketing, event access, loyalty programs, and proof of attendance.',
    order_index: 6,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🎟️ The Ticketing Problem' } },
      { block_type: 'text', content: { text: 'The live events industry has a massive scalping and fraud problem:\n- **Scalpers** buy tickets instantly using bots, then resell at 2–10x face value\n- **Fake tickets** — fraudulent paper and PDF tickets are rampant\n- **Artists earn nothing** from resales, even when tickets flip for $5,000\n- **Fans get exploited** — paying thousands for a $100 ticket while algorithms profit\n\nTicketmaster\'s 2023 Taylor Swift "Eras Tour" disaster put this in the spotlight:\n- Millions of fans waited in queue for hours, then were locked out\n- Verified tickets appeared on resale sites minutes later for $20,000+\n- Congress held hearings on Ticketmaster\'s monopoly power\n\n**NFT ticketing** proposes a solution where every ticket is a unique on-chain token with programmable rules baked in.' } },

      { block_type: 'heading', content: { text: '⚙️ How NFT Ticketing Works' } },
      { block_type: 'text', content: { text: 'An NFT ticket is a blockchain token that:\n- **Proves authenticity** — impossible to counterfeit since the blockchain records every transfer\n- **Has programmable rules** built into the smart contract:\n  - "This ticket cannot be resold above 2x face value"\n  - "20% of resale proceeds go to the artist"\n  - "This ticket is soul-bound — cannot be transferred at all"\n- **Verifies identity** at the door — scan the QR code tied to the buyer\'s wallet\n- **Becomes a collectible** after the event — a permanent souvenir proving you attended\n\n**GET Protocol** is the leading NFT ticketing infrastructure:\n- Powers ticketing for event organizers across Europe and beyond\n- Over 2 million NFT tickets issued\n- Artists can cap resale prices and claim secondary market revenue\n\n**Coachella** sold NFT passes in 2022 that included lifetime festival access, physical items, and exclusive art.' } },

      { block_type: 'heading', content: { text: '🏅 POAPs: Proof of Attendance Protocol' } },
      { block_type: 'text', content: { text: '**POAP (Proof of Attendance Protocol)** are free NFT badges that prove you were present at an event — physical or digital.\n\n**How they work:**\n- Organizer creates a POAP mint link for their event\n- Attendees claim their POAP by scanning a QR code or clicking a link\n- The POAP appears in their wallet forever — proof they were there\n\n**Real-world uses:**\n- **Conferences:** ETHDenver, ETH Global, Devcon all issue POAPs to attendees\n- **Community building:** Discord communities issue POAPs to members who participate in specific events\n- **Loyalty programs:** Brands issue POAPs to customers who try products or attend launches\n- **Voting rights:** Some DAOs give voting power based on POAP ownership\n- **Academic credentials:** Early experiments in using POAPs to verify course completion\n\n**Over 6 million POAPs** have been issued across thousands of events. They cost nothing to claim and are stored on the Gnosis chain (near-zero fees).' } },

      { block_type: 'heading', content: { text: '🏬 Loyalty Programs & Brand NFTs' } },
      { block_type: 'text', content: { text: '**Starbucks Odyssey (2022–2024):**\nStarbucks launched an NFT-based loyalty extension called Odyssey. Members completed activities and collected "Journey Stamps" (NFTs) that unlocked real-world rewards — coffee tastings, exclusive merchandise, virtual espresso-making classes. It operated on Polygon (no crypto knowledge required from users).\n\n**Nike .SWOOSH:**\nNike built a platform for digital wearables and NFT collectibles. Owners can use their digital Nike items in games and virtual environments. Nike also filed patents for "CryptoKicks" — physical shoes linked to NFT certificates of authenticity.\n\n**Adidas Into the Metaverse:**\nAdidas partnered with BAYC, gmoney, and Punks Comic to release NFTs granting holders access to exclusive physical merchandise drops.\n\n**Ticketmaster + NFTs:**\nTicketmaster has piloted NFT tickets for select NFL games and concerts — fans receive a digital collectible alongside their ticket, which becomes a souvenir after the event.\n\n**The pattern:** Successful brand NFTs focus on tangible real-world value (physical goods, experiences) rather than pure speculation.' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://youtube.com/watch?v=KtvDSjb4UQQ', title: 'NFT Tickets & Ticketmaster — CNBC Crypto World', description: 'CNBC Crypto World covers how NFT ticketing is disrupting the live events industry — programmable resale rules, anti-scalping measures, and how Ticketmaster is experimenting with blockchain tickets.' } },

      { block_type: 'article', content: { url: 'https://decrypt.co/108627/ticketmaster-chooses-dapper-labs-flow-blockchain-for-nft-tickets', title: 'Ticketmaster Chooses Dapper Labs\' Flow Blockchain for NFT Tickets — Decrypt', description: 'Decrypt reports Ticketmaster\'s partnership with Dapper Labs to mint event NFTs on the Flow blockchain — 5M+ NFTs issued during a six-month pilot including concerts and sports events.' } },
      { block_type: 'article', content: { url: 'https://poap.xyz', title: 'POAP — Proof of Attendance Protocol', description: 'The official POAP platform — see how organizations create attendance badges and how to claim yours at events.' } },
    ],
    questions: [
      { question_text: 'What fundamental problem does NFT ticketing solve that traditional tickets cannot?', explanation: 'NFT tickets have programmable rules built into the smart contract — resale price caps, artist royalties on resales, and anti-scalping measures — all automatically enforced without needing a central authority to police violations.', options: [{ option_text: 'Programmable resale rules (price caps, artist royalties) enforced automatically by smart contract', is_correct: true }, { option_text: 'NFT tickets are always cheaper than traditional tickets', is_correct: false }, { option_text: 'NFT tickets work without a smartphone', is_correct: false }, { option_text: 'NFT tickets allow unlimited entry to any event in the collection', is_correct: false }] },
      { question_text: 'What is a POAP?', explanation: 'A POAP (Proof of Attendance Protocol) is a free NFT badge that proves you attended a specific event — physical or digital. They\'re stored in your wallet permanently as verifiable proof of participation.', options: [{ option_text: 'A free NFT badge proving you attended a specific event, stored permanently in your wallet', is_correct: true }, { option_text: 'A paid NFT membership to an exclusive event series', is_correct: false }, { option_text: 'A protocol for paying event fees with cryptocurrency', is_correct: false }, { option_text: 'A system for artists to receive royalties from live performances', is_correct: false }] },
      { question_text: 'What was Starbucks Odyssey?', explanation: 'Starbucks Odyssey was an NFT-based loyalty extension where members earned "Journey Stamps" (NFTs) by completing activities, which unlocked real-world rewards like coffee tastings and exclusive merchandise — built on Polygon with no crypto knowledge required.', options: [{ option_text: 'An NFT loyalty program where stamps unlocked real coffee tastings and merchandise', is_correct: true }, { option_text: 'Starbucks\' cryptocurrency for paying at the register', is_correct: false }, { option_text: 'A virtual Starbucks in the metaverse where NFT holders could work', is_correct: false }, { option_text: 'Starbucks\' blockchain supply chain tracking system for coffee beans', is_correct: false }] },
      { question_text: 'Why is ticket scalping difficult to prevent with traditional tickets?', explanation: 'Traditional tickets (PDF or paper) can be resold on any platform with no way for the artist or venue to cap prices or claim secondary revenue. Scalper bots buy thousands of tickets instantly, then resell them at 10x face value.', options: [{ option_text: 'Traditional tickets have no programmable rules — anyone can resell at any price', is_correct: true }, { option_text: 'Traditional tickets are too cheap, making scalping unprofitable', is_correct: false }, { option_text: 'Ticket companies intentionally allow scalping to increase their own revenue', is_correct: false }, { option_text: 'Scalping is already illegal but impossible to enforce', is_correct: false }] },
      { question_text: 'What does GET Protocol do?', explanation: 'GET Protocol is the leading NFT ticketing infrastructure, powering event ticketing for organizers across Europe and beyond. It has issued over 2 million NFT tickets and allows artists to cap resale prices and claim secondary market revenue.', options: [{ option_text: 'An NFT ticketing infrastructure allowing resale caps and artist secondary revenue', is_correct: true }, { option_text: 'A decentralized exchange for trading music royalty tokens', is_correct: false }, { option_text: 'A POAP creation platform for corporate events', is_correct: false }, { option_text: 'A blockchain gaming platform for sports prediction markets', is_correct: false }] },
      { question_text: 'What makes NFT tickets valuable as collectibles after an event?', explanation: 'NFT tickets remain in your wallet permanently as verifiable proof you attended — they can be displayed, traded as memorabilia, or unlock future benefits. A ticket from a historic concert becomes a digital souvenir with provenance on the blockchain.', options: [{ option_text: 'They remain as permanent on-chain proof you attended, usable as memorabilia or for future benefits', is_correct: true }, { option_text: 'They automatically convert to POAP tokens worth money after the event', is_correct: false }, { option_text: 'They can be burned to get a refund of the ticket price', is_correct: false }, { option_text: 'They give holders voting rights over future event lineups', is_correct: false }] },
      { question_text: 'What pattern do successful brand NFT programs (Nike, Starbucks, Adidas) share?', explanation: 'Successful brand NFTs focus on tangible real-world value — physical merchandise, exclusive experiences, product access — rather than pure digital speculation. The NFT is a gateway to something valuable in the physical world.', options: [{ option_text: 'They focus on tangible real-world rewards (physical goods, experiences) rather than pure speculation', is_correct: true }, { option_text: 'They all launched on the same blockchain (Ethereum mainnet)', is_correct: false }, { option_text: 'They all partnered with Bored Ape Yacht Club to reach NFT audiences', is_correct: false }, { option_text: 'They all required users to have crypto wallets before participating', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 7. THE NFT CRASH & WHAT WENT WRONG
  // ═══════════════════════════════════════════════════════
  {
    title: 'The NFT Crash & What Went Wrong',
    emoji: '📉',
    description: 'Why a $25 billion market lost 95%+ of its value — speculation, wash trading, celebrity pump-and-dumps, and the lessons learned.',
    order_index: 7,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '📉 The Numbers' } },
      { block_type: 'text', content: { text: 'The NFT market\'s collapse was one of the fastest wealth destruction events in modern financial history:\n\n| Metric | Peak (Jan 2022) | Trough (2023) |\n|---|---|---|\n| Monthly trading volume | $4.8 billion | $80–100 million |\n| OpenSea monthly volume | $3.5 billion | $80 million |\n| BAYC floor price | 152 ETH ($430,000) | 25 ETH ($40,000) |\n| Average NFT project success | Most went to zero | 95%+ of collections now worthless |\n\n**A 2023 study by dappGambl** found that of 73,257 NFT collections analyzed:\n- 95% had a market cap of zero\n- 79% of collections had never sold a single NFT\n- Only 21% of all NFTs minted had any buyers at all\n\nThis doesn\'t mean the technology failed — it means the speculative bubble was much larger than the genuine market.' } },

      { block_type: 'heading', content: { text: '🚨 What Went Wrong: The Root Causes' } },
      { block_type: 'text', content: { text: '**1. Pure speculation with no utility:**\nMost NFTs were bought purely to resell at a higher price. When buyers dried up, there was no floor of genuine demand to stop prices falling.\n\n**2. Celebrity pump-and-dumps:**\nCelebrities were paid to promote NFT projects to their millions of followers, often in undisclosed partnerships. Many celebrities sold their own holdings shortly after promotion:\n- Kim Kardashian promoted EthereumMax (a token, not strictly NFT) — SEC fined her $1.26M\n- Floyd Mayweather, DJ Khaled, and others promoted projects that collapsed\n- Justin Bieber paid $1.29M for a Bored Ape that later dropped to ~$60,000 in value\n\n**3. Infinite supply, finite demand:**\nAnyone could create and mint an NFT. The market was flooded with millions of worthless collections as creators tried to cash in on hype.\n\n**4. The bear market:**\nWhen ETH dropped 75%+ in 2022, NFT prices — denominated in ETH — fell in dollar terms even before the ETH loss.\n\n**5. Broken promises:**\nMost projects promised utility (exclusive communities, games, real-world perks) that never materialized.' } },

      { block_type: 'heading', content: { text: '🔍 Wash Trading at Scale' } },
      { block_type: 'text', content: { text: 'Wash trading — buying from yourself to inflate prices — was rampant during the NFT boom.\n\n**How widespread was it?**\n- Chainalysis (2022): Identified 110 wallets that had purchased NFTs from their own previous wallets, collectively earning $8.9M in net profit through price manipulation\n- Some collections had 70–90% of their trading volume from wash trades\n- The top-performing wash traders turned $45,000 in initial investment into $6.8M through self-dealing\n\n**The Bored Ape wash trading controversy:**\nMultiple blockchain analytics firms found evidence of coordinated wash trading in early BAYC sales that helped establish the collection\'s initial price trajectory.\n\n**Why was it so easy?**\n- No identity requirements for wallets\n- No regulation\n- Marketplaces had no incentive to stop it — they earned fees on every trade, real or fake' } },

      { block_type: 'heading', content: { text: '📚 Lessons Learned' } },
      { block_type: 'text', content: { text: '**For buyers:**\n- Speculative markets need an "exit" — if everyone is waiting to sell higher, someone ends up holding worthless assets\n- Celebrity endorsement is a red flag, not a signal to buy\n- "Floor price" doesn\'t matter if there\'s no liquidity — you can\'t sell if no one\'s buying\n- Free mints are not truly free — you pay gas, and often the project is designed to dump on you immediately after\n\n**For creators:**\n- Projects with genuine utility and community survived. Pure speculation didn\'t.\n- Promising unrealistic roadmaps destroys trust and crashes value faster\n- A smaller, dedicated community is more valuable than hyped early numbers\n\n**For the industry:**\n- The crash cleared out speculative noise\n- What remained: genuine digital art collectors, gaming with real utility, brand loyalty programs, and ticketing\n- NFT technology is sound — the speculation bubble just massively over-valued the nascent market' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://youtube.com/watch?v=adcT_BYB8hI', title: 'What Went Wrong With NFTs? — Bloomberg Crypto IRL', description: 'Bloomberg investigates the NFT collapse — why a $25 billion market lost 95% of its value, the role of speculation and wash trading, and whether NFTs have a lasting future beyond the hype.' } },

      { block_type: 'article', content: { url: 'https://www.coindesk.com/web3/2022/12/23/over-30b-of-nft-trading-volume-on-ethereum-is-wash-trading-research-suggests', title: 'Over $30B of NFT Trading Volume on Ethereum Is Wash Trading — CoinDesk', description: 'Dune Analytics research found wash trading accounted for 58% of Ethereum\'s 2022 NFT volume, peaking at 80% in January — LooksRare (98%) and X2Y2 (87%) were the worst offenders.' } },
      { block_type: 'article', content: { url: 'https://dappradar.com/blog/nft-market-report', title: 'NFT Market Reports — DappRadar', description: 'Live NFT market data, trading volume trends, and analysis from the leading blockchain app tracker.' } },
    ],
    questions: [
      { question_text: 'According to a 2023 study, what percentage of NFT collections had a market cap of zero?', explanation: 'A 2023 dappGambl study found that 95% of 73,257 NFT collections analyzed had a market cap of zero — showing that the vast majority of NFTs minted during the boom became completely worthless.', options: [{ option_text: '95%', is_correct: true }, { option_text: '30%', is_correct: false }, { option_text: '60%', is_correct: false }, { option_text: '10%', is_correct: false }] },
      { question_text: 'What is a "celebrity pump-and-dump" in NFTs?', explanation: 'A celebrity is paid (often undisclosed) to promote an NFT project to their followers, driving up prices. Then the celebrity and/or project insiders sell their holdings at peak prices, leaving regular buyers with losses as the price crashes.', options: [{ option_text: 'A celebrity promotes an NFT project for pay, drives prices up, then insiders sell while followers are left with losses', is_correct: true }, { option_text: 'A celebrity creates their own NFT collection and donates proceeds to charity', is_correct: false }, { option_text: 'A celebrity\'s NFT collection loses value when they announce a career change', is_correct: false }, { option_text: 'A pump-and-dump where celebrities are the victims, not the beneficiaries', is_correct: false }] },
      { question_text: 'Why did NFT prices in dollar terms fall even before demand collapsed?', explanation: 'NFTs are priced in ETH. When ETH dropped 75%+ in the 2022 bear market, an NFT worth 1 ETH that was $3,000 in November 2021 became worth just $750 in June 2022 — a 75% loss in dollars even with no change in ETH price.', options: [{ option_text: 'NFTs are priced in ETH — when ETH dropped 75%, dollar values fell even without any ETH-price change', is_correct: true }, { option_text: 'The U.S. government imposed a 75% tax on NFT profits', is_correct: false }, { option_text: 'Marketplaces started charging 75% fees on all NFT sales', is_correct: false }, { option_text: 'NFT smart contracts automatically reduced prices when the market cap fell', is_correct: false }] },
      { question_text: 'What made wash trading so easy and widespread in the NFT market?', explanation: 'No identity requirements for wallets (anyone can create unlimited wallets anonymously), no regulation, and marketplaces earned fees on every trade whether real or fake — giving them no financial incentive to stop it.', options: [{ option_text: 'Anonymous wallets, no regulation, and marketplaces earning fees on all trades regardless', is_correct: true }, { option_text: 'Wash trading software was freely available in the App Store', is_correct: false }, { option_text: 'NFT smart contracts made wash trading technically mandatory', is_correct: false }, { option_text: 'Tax authorities encouraged wash trading to generate more taxable events', is_correct: false }] },
      { question_text: 'What was the Bored Ape Yacht Club floor price at its peak vs. 2023?', explanation: 'BAYC peaked at 152 ETH (~$430,000) in early 2022, then fell to around 25 ETH (~$40,000) by 2023 — a roughly 90% decline in ETH terms and even more in dollar terms due to ETH\'s own price decline.', options: [{ option_text: 'Peaked at ~152 ETH ($430,000), fell to ~25 ETH ($40,000)', is_correct: true }, { option_text: 'Peaked at $10 million, fell to $100,000', is_correct: false }, { option_text: 'Never exceeded $5,000 — the hype was entirely media fabrication', is_correct: false }, { option_text: 'Peaked at $10,000, fell to zero', is_correct: false }] },
      { question_text: 'What distinguished NFT projects that survived the crash from those that went to zero?', explanation: 'Projects with genuine utility, real communities, and tangible value (like CryptoPunks\' historical significance, or Pudgy Penguins\' physical toys) survived. Pure speculation plays with no underlying value went to zero.', options: [{ option_text: 'Genuine utility, real communities, and tangible value beyond pure speculation', is_correct: true }, { option_text: 'Having a celebrity founder guaranteed survival', is_correct: false }, { option_text: 'Projects that charged higher mint prices survived because they attracted serious collectors', is_correct: false }, { option_text: 'Only projects built on Ethereum survived — other chain NFTs went to zero', is_correct: false }] },
      { question_text: 'What is the key investing lesson from the NFT crash about "exit liquidity"?', explanation: 'In a purely speculative market where everyone is waiting to sell higher, someone has to be the last buyer. When demand dries up, holders discover there is no liquidity — they cannot sell even at massive losses because no one is buying.', options: [{ option_text: 'If everyone is waiting to sell higher, someone ends up stuck holding when demand dries up', is_correct: true }, { option_text: 'Exit liquidity means you should sell immediately when you profit 10%', is_correct: false }, { option_text: 'NFT markets always have enough liquidity because blockchains never close', is_correct: false }, { option_text: 'Exit liquidity only matters for tokens, not for NFTs', is_correct: false }] },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // 8. SOULBOUND TOKENS & DIGITAL IDENTITY
  // ═══════════════════════════════════════════════════════
  {
    title: 'Soulbound Tokens & Digital Identity',
    emoji: '🪪',
    description: 'What happens when NFTs can\'t be sold? Vitalik\'s vision for non-transferable credentials, digital reputation, and the decentralized society.',
    order_index: 8,
    tokens_reward: 35,
    pass_threshold: 70,
    blocks: [
      { block_type: 'heading', content: { text: '🪪 The Problem with Transferable Identity' } },
      { block_type: 'text', content: { text: 'Every NFT and token we\'ve studied so far can be bought and sold. Your Bored Ape? Sell it tomorrow. Your USDC? Transfer to anyone.\n\nBut some things in life are **non-transferable** by nature:\n- Your university diploma\n- Your driver\'s license\n- Your work experience\n- Your medical records\n- Your reputation\n- Your relationships\n\nYou can\'t sell your Harvard diploma to someone else. You can\'t transfer your 10 years of work experience to another person. These things are **bound to you as a person** — they have no market value as standalone assets.\n\nIn the blockchain world, everything has been designed to be traded. **Soulbound Tokens (SBTs)** propose the opposite: tokens that cannot be transferred after being issued.' } },

      { block_type: 'heading', content: { text: '📜 Vitalik Buterin\'s Vision' } },
      { block_type: 'text', content: { text: 'In May 2022, Ethereum co-founder **Vitalik Buterin** co-authored a paper titled **"Decentralized Society: Finding Web3\'s Soul"** with economist Glen Weyl and lawyer Puja Ohlhaver.\n\n**The core idea:** Imagine wallets called "Souls" that hold non-transferable NFTs representing:\n- Educational credentials (your degrees, certificates, courses completed)\n- Employment history (verified by employers)\n- Medical records (with privacy controls)\n- Community memberships (DAOs you\'ve participated in)\n- Reputation (how you\'ve behaved in various communities)\n\n**Why does this matter?**\nCurrently, DeFi protocols can\'t verify if you\'re a real person, a trusted borrower, or an experienced developer. They can only see wallet balances. SBTs would let the blockchain represent who you ARE, not just what you OWN.\n\nVitalik called this vision a **"Decentralized Society" (DeSoc)** — a world where your on-chain identity is as rich and nuanced as your real-world one.' } },

      { block_type: 'heading', content: { text: '🎓 Real-World Applications' } },
      { block_type: 'text', content: { text: '**Academic Credentials:**\n- MIT has issued blockchain-based diplomas since 2017 through the Blockcerts standard\n- The University of Bahrain issues NFT degrees on Ethereum\n- Coursera, edX, and LinkedIn Learning are exploring on-chain course completion certificates\n- Benefit: No more fake diplomas — employers can verify credentials in seconds on-chain\n\n**Professional Certifications:**\n- ConsenSys Academy issues NFT certificates for blockchain developer courses\n- Gitcoin Passport aggregates on-chain credentials (GitHub contributions, ETH holdings, POAP collection) to prove you\'re a real human\n\n**Community Governance:**\n- Some DAOs issue SBTs to long-term contributors — voting rights proportional to contribution, not wallet size\n- This prevents "whale" attacks where rich wallets buy governance control\n\n**Credit & Lending:**\n- Reputation-based lending using SBTs as proof of creditworthiness — your on-chain payment history and community standing as a credit score\n- Goldfinch and Maple Finance are exploring under-collateralized lending using identity/reputation' } },

      { block_type: 'heading', content: { text: '⚠️ Risks & Concerns' } },
      { block_type: 'text', content: { text: 'SBTs raise serious concerns that haven\'t been solved:\n\n**Privacy:** If all your credentials are public on a blockchain, anyone can see your medical history, employment history, and community memberships. This is the opposite of privacy.\n\n**Discrimination:** Employers could screen job candidates based on on-chain political affiliations, club memberships, or health records. What you owe on-chain could be used against you.\n\n**The loss/theft problem:** Normal NFTs can be moved to a new wallet if your old one is compromised. A soul-bound NFT is permanently stuck to your wallet — if you lose access, you lose your entire identity.\n\n**Coercion:** Governments or employers could demand you "prove" your credentials on-chain, exposing other private information in the process.\n\n**Vitalik\'s proposed solutions:**\n- Zero-knowledge proofs — prove you have a credential without revealing its contents\n- "Community recovery" — trusted contacts can help recover a lost Soul wallet\n- Selective disclosure — control what information is visible to whom' } },

      { block_type: 'heading', content: { text: '📺 Watch & Learn' } },
      { block_type: 'video', content: { url: 'https://youtube.com/watch?v=Fu4lrv47c0g', title: 'Soulbound Tokens: The Craziest Paper You Have To See — Coin Bureau', description: 'Coin Bureau dives into Vitalik Buterin\'s Decentralized Society paper — what soulbound tokens are, how they could replace diplomas and credentials on-chain, and the serious privacy risks involved.' } },

      { block_type: 'article', content: { url: 'https://decrypt.co/resources/what-are-soulbound-tokens-building-blocks-for-a-web3-decentralized-society', title: 'What Are Soulbound Tokens? Building Blocks for a Web3 Decentralized Society — Decrypt', description: 'Coverage of Vitalik\'s soulbound token paper and its implications for digital identity on the blockchain.' } },
      { block_type: 'article', content: { url: 'https://vitalik.eth.limo/general/2022/01/26/soulbound.html', title: 'Soulbound — Vitalik.eth.limo', description: 'Vitalik Buterin\'s original blog post introducing the concept of soulbound tokens and their role in building a richer on-chain identity system.' } },
    ],
    questions: [
      { question_text: 'What makes a "Soulbound Token" different from a regular NFT?', explanation: 'Soulbound tokens cannot be transferred or sold after being issued — they are permanently bound to the wallet that received them, just like a diploma or driver\'s license cannot be transferred to another person.', options: [{ option_text: 'They cannot be transferred or sold — permanently bound to the receiving wallet', is_correct: true }, { option_text: 'They are worth more than regular NFTs because of their scarcity', is_correct: false }, { option_text: 'They can only be traded between verified humans, not companies', is_correct: false }, { option_text: 'They automatically burn after one year to prevent hoarding', is_correct: false }] },
      { question_text: 'Who coined the term "Soulbound Token" and wrote the foundational paper?', explanation: 'Ethereum co-founder Vitalik Buterin co-authored "Decentralized Society: Finding Web3\'s Soul" in May 2022, introducing the concept of non-transferable tokens as the foundation for on-chain identity.', options: [{ option_text: 'Vitalik Buterin, in his May 2022 paper "Decentralized Society: Finding Web3\'s Soul"', is_correct: true }, { option_text: 'Satoshi Nakamoto, in the original Bitcoin whitepaper', is_correct: false }, { option_text: 'The Ethereum Foundation, as part of the Merge upgrade', is_correct: false }, { option_text: 'OpenSea, to solve the royalty enforcement problem', is_correct: false }] },
      { question_text: 'What is a "Soul" wallet in Vitalik\'s Decentralized Society vision?', explanation: 'A Soul is a wallet that holds non-transferable SBTs representing your real-world attributes — credentials, employment history, community memberships, medical records — creating a rich on-chain identity beyond just what you own.', options: [{ option_text: 'A wallet holding non-transferable tokens representing who you are — credentials, history, reputation', is_correct: true }, { option_text: 'A hardware wallet with biometric security for storing large crypto holdings', is_correct: false }, { option_text: 'An anonymous wallet that hides all transaction history', is_correct: false }, { option_text: 'A smart contract wallet controlled by a DAO community', is_correct: false }] },
      { question_text: 'How could SBTs improve DAO governance over the current system?', explanation: 'Currently, DAO voting power is based on token holdings — wealthy wallets buy governance control ("whale attacks"). SBTs for long-term contributors could make voting proportional to participation and contribution rather than wealth.', options: [{ option_text: 'By making votes proportional to contribution rather than token wealth — preventing whale attacks', is_correct: true }, { option_text: 'By requiring all voters to reveal their real names on-chain', is_correct: false }, { option_text: 'By automatically delegating votes to the richest wallet in the DAO', is_correct: false }, { option_text: 'By removing voting entirely and replacing it with AI governance', is_correct: false }] },
      { question_text: 'What is the biggest privacy concern with public Soulbound Tokens?', explanation: 'If credentials are stored publicly on a blockchain, anyone can see your medical history, employment record, political affiliations, and community memberships — enabling surveillance, discrimination, and violations of personal privacy.', options: [{ option_text: 'Public blockchains expose all credentials — medical records, memberships, history — to anyone', is_correct: true }, { option_text: 'SBTs can be hacked by quantum computers and reassigned to other wallets', is_correct: false }, { option_text: 'Only governments can issue SBTs, creating a state control problem', is_correct: false }, { option_text: 'SBTs cost too much ETH to mint, making them inaccessible', is_correct: false }] },
      { question_text: 'What technology could preserve SBT privacy while still proving credentials?', explanation: 'Zero-knowledge proofs allow you to prove you possess a credential (e.g., "I have a college degree") without revealing the credential\'s contents — protecting privacy while still enabling on-chain verification.', options: [{ option_text: 'Zero-knowledge proofs — prove you have a credential without revealing its contents', is_correct: true }, { option_text: 'Encrypting SBTs with a password only the holder knows', is_correct: false }, { option_text: 'Storing all SBT data off-chain on a private government server', is_correct: false }, { option_text: 'Burning the SBT after each use and reissuing a new one', is_correct: false }] },
      { question_text: 'What problem does Gitcoin Passport solve using SBT-like credentials?', explanation: 'Gitcoin Passport aggregates on-chain credentials (GitHub contributions, ETH holdings, POAPs, social accounts) to create a "humanity score" proving you\'re a unique real human — used to prevent Sybil attacks where bots create thousands of fake wallets.', options: [{ option_text: 'It aggregates on-chain credentials to prove you\'re a unique real human, preventing bot attacks', is_correct: true }, { option_text: 'It issues passports to let crypto users travel without a government ID', is_correct: false }, { option_text: 'It stores your physical passport data on Ethereum for border crossing', is_correct: false }, { option_text: 'It replaces Gitcoin grants with a direct token airdrop system', is_correct: false }] },
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
    info: 'POST to this endpoint to seed the NFT & Digital Ownership module.',
    lessons: LESSONS.map(l => `${l.emoji} ${l.title}`),
  });
}
