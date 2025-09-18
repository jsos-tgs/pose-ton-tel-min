// pages/duel/[id].js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

let socket;
function fmt(ms) {
  const t = Math.floor(ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const ms3 = String(t % 1000).padStart(3, '0');
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms3}`;
}

export default function DuelRoom() {
  const r = useRouter();
  const { id } = r.query;

  const [nick, setNick] = useState('');
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('Connexion…');
  const [readyCount, setReadyCount] = useState(0);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [loser, setLoser] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);

  const startRef = useRef(0);
  const rafRef = useRef(0);
  const detachRef = useRef(null);

  useEffect(() => {
    if (!r.isReady || !id) return;
    const n = localStorage.getItem('ptt:nick') || `Joueur-${Math.floor(Math.random() * 1000)}`;
    setNick(n);

    if (!socket) {
      socket = io({
        path: '/api/socket',
        addTrailingSlash: false,
        transports: ['websocket', 'polling'], // fallback si WS pas sticky
      });
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', (err) => console.warn('[socket] connect_error', err?.message));
      socket.on('error', (err) => console.warn('[socket] error', err?.message));
    }

    socket.emit('room:join', { room: id, nick: n });
    socket.on('room:state', (s) => {
      setPlayers(s.players || []);
      setStatus(s.status || 'waiting');
      setReadyCount(s.readyCount ?? 0);
    });
    socket.on('game:countdown', (n) => setCount(n));
    socket.on('game:start', () => {
      setStarted(true);
      setCount(0);
      setStatus('Ne touche plus !');
      startClock();
      attachGuard();
    });
    socket.on('game:end', (payload) => {
      stopClock();
      setLoser(payload.loser);
      setStatus(payload.reason || 'Terminé');
      detachGuard();
    });

    return () => {
      socket?.off('room:state');
      socket?.off('game:countdown');
      socket?.off('game:start');
      socket?.off('game:end');
    };
  }, [r.isReady, id]);

  function startClock() {
    startRef.current = performance.now();
    const tick = () => {
      setElapsed(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }
  function stopClock() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }

  function ready() {
    socket.emit('player:ready');
  }

  function attachGuard() {
    const end = (reason) => socket.emit('player:lose', { reason });
    const onAny = (e) => {
      e?.preventDefault?.();
      end('Interaction détectée');
    };
    const opts = { capture: true, passive: false };
    const handlers = [
      ['pointerdown', onAny],
      ['pointerup', onAny],
      ['touchstart', onAny],
      ['touchend', onAny],
      ['mousedown', onAny],
      ['mouseup', onAny],
      ['wheel', onAny],
      ['scroll', onAny],
      ['keydown', onAny],
      ['contextmenu', onAny],
    ];
    handlers.forEach(([t, fn]) => addEventListener(t, fn, opts));

    const onVis = () => {
      if (document.hidden) end("Changement d'onglet");
    };
    const onBlur = () => end('Perte de focus');

    document.addEventListener('visibilitychange', onVis, true);
    addEventListener('blur', onBlur, true);

    detachRef.current = () => {
      handlers.forEach(([t, fn]) => removeEventListener(t, fn, opts));
      document.removeEventListener('visibilitychange', onVis, true);
      removeEventListener('blur', onBlur, true);
    };
  }

  function detachGuard() {
    if (detachRef.current) detachRef.current();
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Room {id}</h1>
      <p>Ton pseudo : <strong>{nick}</strong></p>

      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, maxWidth: 560 }}>
        <p style={{ color: connected ? '#0a0' : '#a00' }}>
          État connexion socket : <strong>{connected ? 'connecté' : 'déconnecté'}</strong>
        </p>

        <h3>Joueurs ({players.length}) — prêts: {readyCount}</h3>
        <ul>{players.map((p) => <li key={p.id}>{p.nick} {p.ready ? '✅' : '⏳'}</li>)}</ul>

        {!started && !loser && (
          <>
            <button onClick={ready} style={{ padding: '10px 14px', fontWeight: 700 }}>
              Je suis prêt
            </button>
            {count > 0 && <h2>Départ dans… {count}</h2>}
            <p style={{ color: '#666', fontSize: 12 }}>
              Mode test : le départ se lance dès <strong>1 prêt</strong> pour valider le flux.
            </p>
          </>
        )}

        {started && !loser && <h2 style={{ marginTop: 8 }}>{fmt(elapsed)}</h2>}
        {loser && <h2>{loser} a perdu 😅</h2>}
        {loser && <p>Sanction IRL : le perdant paye l’addition 💸</p>}
      </div>

      <p style={{ marginTop: 12 }}><a href="/">← Accueil</a></p>
    </div>
  );
}
