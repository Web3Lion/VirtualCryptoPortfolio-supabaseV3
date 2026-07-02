import { SessionProvider } from './SessionProvider';
import './globals.css';

export const metadata = { title: 'CryptoClassroom', description: 'Virtual Crypto Trading Simulator' };

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const THEME_SCRIPT = `(function(){
  var t=localStorage.getItem('cc-theme')||'dark';
  document.documentElement.setAttribute('data-theme',t);
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
