import { SessionProvider } from './SessionProvider';

export const metadata = { title: 'CryptoClassroom', description: 'Virtual Crypto Trading Simulator' };

const THEME_SCRIPT = `(function(){
  var t=localStorage.getItem('cc-theme')||'dark';
  document.documentElement.setAttribute('data-theme',t);
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
