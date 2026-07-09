/**
 * @file page.tsx
 * @description Settings page server wrapper. Fetches owners and renders the Settings UI.
 */

import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { SettingsPageClient } from './_components/SettingsPageClient';

export default async function SettingsPage() {
  const owners = await prisma.owner.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>Settings</h2>
        <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '14px' }}>
          Manage LedgerAlpha partners and system configurations.
        </p>
      </header>
      <SettingsPageClient initialOwners={owners} />
    </>
  );
}
