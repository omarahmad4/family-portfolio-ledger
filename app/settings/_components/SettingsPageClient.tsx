'use client';

/**
 * @file SettingsPageClient.tsx
 * @description Interactive client settings manager for LedgerAlpha partners.
 * Supports adding, renaming, and deleting owners with clean validation warnings.
 */

import React, { useState } from 'react';

interface Owner {
  id: string;
  name: string;
  slug: string;
}

interface SettingsPageClientProps {
  initialOwners: Owner[];
}

export function SettingsPageClient({ initialOwners }: SettingsPageClientProps) {
  const [owners, setOwners] = useState<Owner[]>(initialOwners);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Notification states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const triggerNotification = (success: string | null, error: string | null) => {
    setSuccessMsg(success);
    setErrorMsg(error);
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 6000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add partner');

      setOwners((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      triggerNotification(`Successfully added partner "${data.name}"`, null);
    } catch (err: any) {
      triggerNotification(null, err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/owners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename partner');

      setOwners((prev) =>
        prev.map((o) => (o.id === id ? data : o)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditId(null);
      setEditName('');
      triggerNotification(`Successfully renamed partner to "${data.name}"`, null);
    } catch (err: any) {
      triggerNotification(null, err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove partner "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/owners?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete partner');

      setOwners((prev) => prev.filter((o) => o.id !== id));
      triggerNotification(`Successfully removed partner "${name}"`, null);
    } catch (err: any) {
      triggerNotification(null, err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Notifications */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: '1px solid #10b981',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: '1px solid #ef4444',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          ⚠ {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Card: Add Partner */}
        <section className="card">
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>Add New Partner</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: 0, marginBottom: 18 }}>
            Add a new family member or entity to participate in the portfolio pool.
          </p>

          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Partner Name (e.g. Omar, Sarah)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: '#0f172a',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="button"
              style={{
                background: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading || !newName.trim() ? 0.6 : 1
              }}
            >
              Add Partner
            </button>
          </form>
        </section>

        {/* Card: Active Partners */}
        <section className="card">
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>Manage Partners</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: 0, marginBottom: 18 }}>
            Rename or delete ledger partners. Deleting is only allowed if the partner has no allocations history.
          </p>

          {owners.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '24px 0' }}>
              No partners defined. Please add a partner above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {owners.map((owner) => {
                const isEditing = editId === owner.id;
                return (
                  <div
                    key={owner.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      gap: '12px'
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #475569',
                            background: '#1e293b',
                            color: 'var(--text)',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        <button
                          onClick={() => handleRename(owner.id)}
                          className="button"
                          style={{
                            padding: '6px 12px',
                            background: '#10b981',
                            color: '#0f172a',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditName('');
                          }}
                          className="button"
                          style={{
                            padding: '6px 12px',
                            background: '#475569',
                            color: '#cbd5e1',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                            {owner.name}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '12px' }}>
                            Slug: {owner.slug}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditId(owner.id);
                              setEditName(owner.name);
                            }}
                            className="button"
                            style={{
                              padding: '6px 12px',
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              color: 'var(--text)',
                              cursor: 'pointer'
                            }}
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDelete(owner.id, owner.name)}
                            className="button"
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
