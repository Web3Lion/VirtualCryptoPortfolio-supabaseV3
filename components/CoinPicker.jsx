"use client";
import { useState, useMemo } from "react";

// Consensus mechanism per coin (static — CoinGecko doesn't return this)
const CONSENSUS = {
  BTC:'PoW', LTC:'PoW', BCH:'PoW', DOGE:'PoW',
  ETH:'PoS', ADA:'PoS', AVAX:'PoS', NEAR:'PoS', ATOM:'PoS',
  APT:'PoS', SUI:'PoS', INJ:'PoS', FET:'PoS', TAO:'PoS',
  AXS:'PoS', HYPE:'PoS',
  DOT:'NPoS',
  SOL:'PoH+PoS',
  ALGO:'PPoS',
  HBAR:'Hashgraph',
  XRP:'RPCA',
  VET:'PoA',
  TRX:'DPoS',
  BNB:'PoSA',
  XLM:'SCP',
  ARB:'L2 (ETH)', OP:'L2 (ETH)', MATIC:'L2 (ETH)', IMX:'L2 (ETH)',
  STX:'L2 (BTC)',
  LINK:'ERC-20', UNI:'ERC-20', SHIB:'ERC-20', PEPE:'ERC-20',
  FLOKI:'ERC-20', RNDR:'ERC-20', WLD:'ERC-20', SAND:'ERC-20',
  MANA:'ERC-20', NEXO:'ERC-20', OKB:'ERC-20', GRT:'ERC-20',
  BONK:'SPL', WIF:'SPL',
  USDT:'N/A', USDC:'N/A', DAI:'N/A',
  ICP:'Threshold', FIL:'PoSt',
};

// Broad group used for filter matching
function consensusGroup(symbol) {
  const c = CONSENSUS[symbol?.toUpperCase()];
  if (!c) return 'PoS';
  if (c === 'PoW') return 'PoW';
  if (c.startsWith('L2')) return 'L2';
  if (c === 'N/A') return 'N/A';
  if (['DPoS','PoSA','SCP'].includes(c)) return 'DPoS';
  if (['RPCA','Hashgraph','Threshold','PoSt','PoA','PPoS','NPoS','PoH+PoS'].includes(c)) return 'Unique';
  if (['ERC-20','SPL'].includes(c)) return 'Token';
  return 'PoS';
}

// Color per consensus group
const CONSENSUS_COLOR = {
  PoW:'#f59e0b', PoS:'#00e5a0', DPoS:'#60a5fa', L2:'#a78bfa',
  Token:'#94a3b8', Unique:'#fb923c', 'N/A':'#475569',
};

const CONSENSUS_DESC = {
  PoW:   'Mining-based security — SHA-256, Scrypt, etc.',
  PoS:   'Validators stake tokens as collateral',
  DPoS:  'Token holders vote for block producers',
  L2:    'Inherits security from parent L1 chain',
  Token: 'Smart contract token on another chain',
  Unique:'Non-standard protocol (PoH+PoS, Hashgraph, RPCA…)',
  'N/A': 'Stablecoin — pegged, no consensus needed',
};

const SECTOR_FILTERS = ['All','Layer 1','Layer 2','DeFi','AI / Data','Gaming/NFT','Memecoin','Stablecoin','Exchange','Infrastructure','Other'];
const CONSENSUS_FILTERS = ['All','PoW','PoS','DPoS','L2','Token','Unique','N/A'];

const fmtPrice = p => {
  const n = parseFloat(p || 0);
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1)    return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(4);
  return '$' + n.toFixed(6);
};

// Props:
//   coins         — array from /api/coins?source=coingecko
//   selected      — array of selected coin objects (parent state)
//   onToggle(coin)— parent toggles selection
//   activeSymbols — string[] of symbols already added to the class (shown as dimmed)
export default function CoinPicker({ coins = [], selected = [], onToggle, activeSymbols = [] }) {
  const [sectorFilter,    setSectorFilter]    = useState('All');
  const [consensusFilter, setConsensusFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => coins.filter(c => {
    const matchSector    = sectorFilter === 'All' || c.sector === sectorFilter;
    const cg             = consensusGroup(c.symbol);
    const matchConsensus = consensusFilter === 'All' || cg === consensusFilter;
    const q = search.toLowerCase();
    const matchSearch    = !search || c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    return matchSector && matchConsensus && matchSearch;
  }), [coins, sectorFilter, consensusFilter, search]);

  const pill = (label, active, onClick, color) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding:'4px 10px', borderRadius:20, cursor:'pointer', fontSize:10,
        fontFamily:"'DM Mono',monospace", whiteSpace:'nowrap', transition:'all .15s',
        border:`1px solid ${active ? (color||'rgba(0,229,160,.4)') : 'var(--border,#1e293b)'}`,
        background: active ? `${color||'#00e5a0'}18` : 'transparent',
        color: active ? (color||'var(--accent,#00e5a0)') : 'var(--muted,#475569)',
      }}
    >{label}</button>
  );

  return (
    <div>
      {/* Search */}
      <input
        placeholder="Search by name or symbol..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width:'100%', background:'var(--surface,#0f172a)', border:'1px solid var(--border,#1e293b)',
          borderRadius:10, padding:'9px 14px', color:'var(--text,#e2e8f0)',
          fontFamily:"'DM Mono',monospace", fontSize:12, outline:'none',
          marginBottom:10, boxSizing:'border-box',
        }}
      />

      {/* Sector filters */}
      <div style={{marginBottom:10}}>
        <div style={{fontSize:9,color:'var(--muted,#475569)',letterSpacing:2,textTransform:'uppercase',marginBottom:5}}>Sector</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {SECTOR_FILTERS.map(s => pill(s, sectorFilter===s, ()=>setSectorFilter(s)))}
        </div>
      </div>

      {/* Consensus mechanism filters */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:9,color:'var(--muted,#475569)',letterSpacing:2,textTransform:'uppercase',marginBottom:5}}>Consensus Mechanism</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {CONSENSUS_FILTERS.map(f => pill(f, consensusFilter===f, ()=>setConsensusFilter(f), CONSENSUS_COLOR[f]))}
        </div>
        {consensusFilter !== 'All' && (
          <div style={{fontSize:10,color:'var(--muted,#475569)',marginTop:5,paddingLeft:2,fontStyle:'italic'}}>
            {CONSENSUS_DESC[consensusFilter]}
          </div>
        )}
      </div>

      {/* Result count */}
      <div style={{fontSize:10,color:'var(--muted,#475569)',marginBottom:8}}>
        {filtered.length} coins shown · {selected.length} selected
      </div>

      {/* Coin grid */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))',
        gap:8, maxHeight:380, overflowY:'auto', paddingRight:4,
      }}>
        {filtered.map(coin => {
          const isSelected = selected.some(c => c.symbol === coin.symbol);
          const isActive   = activeSymbols.includes(coin.symbol);
          const cg         = consensusGroup(coin.symbol);
          const cColor     = CONSENSUS_COLOR[cg] || '#475569';
          const rawConsensus = CONSENSUS[coin.symbol?.toUpperCase()] || 'PoS';
          const change     = parseFloat(coin.change24h || 0);
          return (
            <div
              key={coin.symbol}
              onClick={() => !isActive && onToggle(coin)}
              style={{
                background: isSelected ? 'rgba(0,229,160,.08)' : isActive ? 'rgba(71,85,105,.08)' : 'var(--surface,#0f172a)',
                border: `1px solid ${isSelected ? 'var(--accent,#00e5a0)' : isActive ? 'rgba(71,85,105,.25)' : 'var(--border,#1e293b)'}`,
                borderRadius:12, padding:'10px 12px',
                cursor: isActive ? 'default' : 'pointer',
                opacity: isActive ? 0.45 : 1,
                position:'relative', transition:'border-color .15s',
              }}
            >
              {isSelected && (
                <div style={{position:'absolute',top:8,right:8,width:16,height:16,borderRadius:'50%',background:'var(--accent,#00e5a0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#000',fontWeight:700}}>✓</div>
              )}
              {isActive && (
                <div style={{position:'absolute',top:8,right:6,fontSize:8,color:'var(--muted,#475569)'}}>added</div>
              )}
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:'var(--text,#e2e8f0)',marginBottom:1}}>{coin.symbol}</div>
              <div style={{fontSize:9,color:'var(--muted,#475569)',marginBottom:4,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{coin.name}</div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--text,#e2e8f0)',marginBottom:3}}>{fmtPrice(coin.price)}</div>
              <div style={{fontSize:9,color:change>=0?'var(--up,#00e5a0)':'var(--down,#f43f5e)',marginBottom:6}}>
                {change>=0?'+':''}{change.toFixed(2)}% 24h
              </div>
              <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                <span style={{fontSize:8,padding:'2px 5px',borderRadius:4,background:'rgba(71,85,105,.25)',color:'var(--muted,#475569)'}}>{coin.sector||'Other'}</span>
                <span style={{fontSize:8,padding:'2px 5px',borderRadius:4,background:`${cColor}18`,color:cColor}} title={CONSENSUS_DESC[cg]}>{rawConsensus}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{gridColumn:'1/-1',textAlign:'center',padding:28,fontSize:12,color:'var(--muted,#475569)'}}>
            No coins match these filters
          </div>
        )}
      </div>
    </div>
  );
}
