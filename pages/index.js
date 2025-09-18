import { useRouter } from 'next/router';
import { useState } from 'react';

function uid(len=6){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s; }

export default function Home(){
  const r = useRouter();
  const [nick, setNick] = useState('');
  const [code, setCode] = useState('');

  return (
    <div style={{fontFamily:'system-ui', padding:24, maxWidth:560}}>
      <h1>Pose ton tel — Duel</h1>
      <p>Crée une partie et invite un ami. Le premier qui touche son téléphone a perdu.</p>

      <div style={{border:'1px solid #ddd', borderRadius:12, padding:12, marginTop:12}}>
        <h3>Créer une partie</h3>
        <div style={{display:'flex', gap:8}}>
          <input placeholder="Ton pseudo" value={nick} onChange={e=>setNick(e.target.value)} style={{flex:1, padding:'10px 12px'}}/>
          <button onClick={()=>{ if(nick) localStorage.setItem('ptt:nick', nick); r.push(`/duel/${uid()}`); }} style={{padding:'10px 14px', fontWeight:700}}>Créer</button>
        </div>
        <p style={{color:'#666', fontSize:12, marginTop:6}}>Envoie le code (6 lettres/chiffres) à ton ami.</p>
      </div>

      <div style={{border:'1px solid #ddd', borderRadius:12, padding:12, marginTop:12}}>
        <h3>Rejoindre une partie</h3>
        <div style={{display:'flex', gap:8}}>
          <input placeholder="Code de la partie" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} style={{flex:1, padding:'10px 12px'}}/>
          <button onClick={()=> r.push(`/duel/${code.trim()}`)} style={{padding:'10px 14px'}}>Rejoindre</button>
        </div>
      </div>

      <div style={{border:'1px solid #ddd', borderRadius:12, padding:12, marginTop:12}}>
        <h3>Mode solo (test)</h3>
        <p><a href="/solo">Aller à la page “solo”</a></p>
      </div>
    </div>
  );
}
