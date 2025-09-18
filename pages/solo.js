import { useEffect, useRef, useState } from 'react';

function fmt(ms){
  const total = Math.floor(ms);
  const m = Math.floor(total/60000);
  const s = Math.floor((total%60000)/1000);
  const ms3 = String(total%1000).padStart(3,'0');
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${ms3}`;
}

export default function Solo(){
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [msg, setMsg] = useState('Prêt ?');
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const detachRef = useRef(null);

  useEffect(()=>()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); if(detachRef.current) detachRef.current(); },[]);

  function start(){
    setElapsed(0);
    setMsg('Ne touche plus !');
    setRunning(true);
    startRef.current = performance.now();
    const tick = ()=>{ setElapsed(performance.now()-startRef.current); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    attachGuard();
  }

  function stop(reason='Terminé'){
    setRunning(false);
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(detachRef.current) detachRef.current();
    setMsg(reason);
  }

  function attachGuard(){
    const end = (reason)=>{ if(!running) return; stop(reason); };
    const onAny = (e)=>{ e && e.preventDefault && e.preventDefault(); end('Interaction détectée'); };
    const opts = { capture:true, passive:false };
    const handlers = [
      ['pointerdown', onAny],['pointerup', onAny],['touchstart', onAny],['touchend', onAny],
      ['mousedown', onAny],['mouseup', onAny],['wheel', onAny],['scroll', onAny],['keydown', onAny],['contextmenu', onAny]
    ];
    handlers.forEach(([t,fn])=>addEventListener(t,fn,opts));
    const onVis = ()=>{ if(document.hidden) end('Changement d\'onglet'); };
    const onBlur = ()=> end('Perte de focus');
    document.addEventListener('visibilitychange', onVis, true);
    addEventListener('blur', onBlur, true);
    detachRef.current = ()=>{
      handlers.forEach(([t,fn])=>removeEventListener(t,fn,opts));
      document.removeEventListener('visibilitychange', onVis, true);
      removeEventListener('blur', onBlur, true);
    };
  }

  return (
    <div style={{fontFamily:'system-ui', padding:24}}>
      <h1>Défi solo — ne touche plus à ton tel</h1>
      <p>{msg}</p>
      <h2 style={{margin:'12px 0'}}>{fmt(elapsed)}</h2>
      {!running ? (
        <button onClick={start} style={{padding:'12px 16px', fontWeight:700}}>Démarrer</button>
      ) : (
        <button onClick={()=>stop('Arrêt manuel')} style={{padding:'12px 16px', fontWeight:700}}>Arrêter</button>
      )}
      <p style={{marginTop:12}}><a href="/">← Retour</a></p>
    </div>
  );
}
