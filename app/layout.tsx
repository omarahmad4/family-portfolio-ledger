import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Family Portfolio Ledger',
  description: 'Owner-level portfolio accounting and decision analytics.',
};

const nav = [
  ['Dashboard', '/dashboard'],
  ['Transactions', '/transactions'],
  ['Holdings', '/holdings'],
  ['Decisions', '/decisions'],
  ['Imports', '/imports'],
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <h1>FamilyAlpha</h1>
            <p>Portfolio ledger & decision analytics</p>
            <nav>
              {nav.map(([label, href]) => (
                <a key={href} href={href}>{label}</a>
              ))}
            </nav>
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
