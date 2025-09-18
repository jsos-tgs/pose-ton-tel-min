import { useState } from 'react';
import { useRouter } from 'next/router';

function makeCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/1/O/I
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function Home() {
  const r = useRouter();
  const [generated, setGenerated] = useState('');
  const [code, setCode] = useState('');

  const join = (c) => {
    const id = (c || '').trim().toUpperCase();
    if (id.length === 6) r.push(`/duel/${id}`);
  };

  const copy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      alert('Code copié ✅');
    } catch {
      // fallback simple si clipboard bloqué
      prompt('Copie manuelle du code :', generated);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <h1>Pose ton tel — Duel</h1>
      <p>Le créateur génère un <strong>code à 6 caractères</strong> et le partage. Les deux joueurs entrent le <strong>même code</strong> pour rejoindre la room.</p>

      {/* Générer un code */}
      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, marginTop: 16 }}>
        <h3>Je génère un code</h3>
        <button
          onClick={() => setGenerated(makeCode())}
          style={{ padding: '10px 14px', fontWeight: 700 }}
        >
          Générer un code
        </button>

        {generated && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 28,
                letterSpacing: 2,
                border: '1px dashed #bbb',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'inline-block',
              }}
            >
              {generated}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={copy} style={{ padding: '8px 12px' }}>Copier</button>
              <button onClick={() => join(generated)} style={{ padding: '8px 12px', fontWeight: 700 }}>
                Lancer avec ce code
              </button>
            </div>
            <p style={{ color: '#666', fontSize: 12, marginTop: 6 }}>
              Partage ce code à l’autre joueur.
            </p>
          </div>
        )}
      </div>

      {/* Rejoindre avec un code */}
      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, marginTop: 16 }}>
        <h3>Je rejoins la partie</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Code reçu (ex: 7K2F9Q)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && join(code)}
            maxLength={6}
            style={{ flex: 1, padding: '10px 12px' }}
          />
          <button onClick={() => join(code)} style={{ padding: '10px 14px' }}>
            Rejoindre
          </button>
        </div>
        <p style={{ color: '#666', fontSize: 12, marginTop: 6 }}>
          Saisis exactement le code que tu as reçu (6 caractères).
        </p>
      </div>
    </div>
  );
}
