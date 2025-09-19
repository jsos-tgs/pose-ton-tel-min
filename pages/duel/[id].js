import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

function fmt(ms){ const t=Math.floor(ms),m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),ms3=String(t%1000).padStart(3,'0'); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${ms3}`; }
function uid(n=12){ const c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let s=''; for(let i=0;i<n;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; }

export default function DuelRoom(){
  const r = useRouter();
  const { id } = r.query;

  const [nick, setNick] = useState('');
  const [status, setStatus] = useState('waiting');
  const [players, setPlayers] = useState({});
  const [readyCount, setReadyCount] = useState(0);
  const [countdownEndsAt, setCountdownEndsAt] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [loser, setLoser] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const meRef = useRef('');
  const pollRef = useRef(0);
  const rafRef = useRef(0);
  const detachRef = useRef(null);

  useEffect(()=>{
    if(!r.isReady || !id) return;

    const me = localStorage.getItem('ptt:id') || uid();
    localStorage.setItem('ptt:id', me);
    meRef.current = me;

    const n = localStorage.getItem('ptt:nick') || `Joueur-${Math.floor(Math.random()*1000)}`;
    setNick(n);

    // join room
    fetch(`/api/room/${id}/join`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ playerId: me, nick: n }) });

    // start polling
    startPolling();

    return ()=>{ stopPolling(); stopClock(); detachGuard(); };
  },[r.isReady, id]);

  function startPolling(){
    stopPolling();
    pollRef.current = setInterval(async ()=>{
      const res = await fetch(`/api/room/${id}/state`);
      const s = await res.json();
      setStatus(s.status);
      setPlayers(s.players || {});
      setReadyCount(s.readyCount || 0);
      setCountdownEndsAt(s.countdownEndsAt || null);
      setStartedAt(s.startedAt || null);
      setLoser(s.loser || null);

      // handle transitions
      if(s.status === 'started' && !rafRef.current){
        startClock(s.startedAt ? Date.now() - s.startedAt : 0);
        attachGuard();
      }
      if(s.status !== 'started' && rafRef.current){
        stopClock();
        detachGuard();
      }
    }, 700);
  }
  function stopPolling(){ if(pollRef.current){ clearInterval(pollRef.current); pollRef.current = 0; } }

  function startClock(offset=0){
    const start = performance.now() - offset;
    const tick = ()=>{ setElapsed(performance.now() - start); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }
  function stopClock(){ if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = 0; } }

  async function ready(){
    await fetch(`/api/room/${id}/ready`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ playerId: meRef.current }) });
  }

  function attachGuard(){
    const end = async (reason)=>{ await fetch(`/api/room/${id}/lose`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ playerId: meRef.current, reason }) }); };
    const onAny = (e)=>{ e?.preventDefault?.(); end('Interaction détectée'); };
    const opts = { capture:true, passive:false };
    const handlers = [['pointerdown',onAny],['pointerup',onAny],['touchstart',onAny],['touchend',onAny],['mousedown',onAny],['mouseup',onAny],['wheel',onAny],['scroll',onAny],['keydown',onAny],['contextmenu',onAny]];
    handlers.forEach(([t,fn])=>addEventListener(t,fn,opts));
    const onVis = ()=>{ if(document.hidden) end(\"Changement d'onglet\"); };
    const onBlur = ()=> end('Perte de focus');
    document.addEventListener('visibilitychange', onVis, true);
    addEventListener('blur', onBlur, true);
    detachRef.current = ()=>{ handlers.forEach(([t,fn])=>removeEventListener(t,fn,opts)); document.removeEventListener('visibilitychange', onVis, true); removeEventListener('blur', onBlur, true); };
  }
  function detachGuard(){ if(detachRef.current) detachRef.current(); }

  const codes = Object.fromEntries(Object.entries(players).map(([k,v])=>[k, v.ready?'✅':'⏳']));

  const now = Date.now();
  const remain = countdownEndsAt ? Math.max(0, countdownEndsAt - now) : 0;
  const remainSec = Math.ceil(remain/1000);

  return (
    <div style={{fontFamily:'system-ui', padding:24, maxWidth:560}}>
      <h1>Room {id}</h1>
      <p>Ton pseudo : <strong>{nick}</strong></p>

      <div style={{border:'1px solid #ddd', borderRadius:12, padding:12}}>
        <h3>Joueurs ({Object.keys(players).length}) — prêts: {readyCount}</h3>
        <ul>{Object.entries(players).map(([pid,p])=>(<li key={pid}>{p.nick} {codes[pid]}</li>))}</ul>

        {status==='waiting' && (
          <>
            <button onClick={ready} style={{padding:'10px 14px', fontWeight:700}}>Je suis prêt</button>
            <p style={{color:'#666', fontSize:12, marginTop:6}}>Mode test : la partie démarre dès <strong>1 prêt</strong> (à passer à 2 ensuite).</p>
          </>
        )}

        {status==='countdown' && <h2>Départ dans… {remainSec}</h2>}
        {status==='started' && !loser && <h2 style={{marginTop:8}}>{fmt(elapsed)}</h2>}
        {status==='ended' && loser && <h2>{loser} a perdu 😅</h2>}
      </div>

      <p style={{marginTop:12}}><a href="/">← Accueil</a></p>
    </div>
  );
}
