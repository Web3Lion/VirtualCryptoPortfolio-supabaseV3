'use client';
import { useState } from 'react';

const COIN_COLORS = {
  BTC:'#f7931a',ETH:'#627eea',SOL:'#9945ff',XRP:'#00aae4',ADA:'#0033ad',
  DOGE:'#c2a633',AVAX:'#e84142',LINK:'#2a5ada',DOT:'#e6007a',MATIC:'#8247e5',
  BNB:'#f3ba2f',SHIB:'#ff0000',LTC:'#bfbbbb',UNI:'#ff007a',ATOM:'#6f7390',
  USDC:'#2775ca',USDT:'#26a17b',NEAR:'#00ec97',FTM:'#1969ff',ALGO:'#00b4d8',
  DEFAULT:'#475569',
};

export default function CoinLogo({ symbol, size = 24, style = {} }) {
  const [failed, setFailed] = useState(false);
  const sym = (symbol || '').toUpperCase();
  const color = COIN_COLORS[sym] || COIN_COLORS.DEFAULT;
  const src = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${sym.toLowerCase()}.png`;

  if (failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color + '33', border: `1.5px solid ${color}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, color,
        flexShrink: 0, lineHeight: 1, fontFamily: "'Syne',sans-serif",
        ...style,
      }}>
        {sym.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={sym}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ borderRadius: '50%', flexShrink: 0, display: 'block', ...style }}
    />
  );
}
