import { kv } from '@vercel/kv';
const KEY = (id) => `room:${id}`;

async function load(id){ const raw = await kv.get(KEY(id)); return raw ? JSON.parse(raw) : null; }
async function save(id, room){ await kv.set(KEY(id), JSON.stringify(room)); }

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();
  const { id } = req.query;
  const { playerId } = req.body || {};
  if(!playerId) return res.status(400).json({ error: 'playerId manquant' });

  let room = await load(id);
  if(!room) room = { id, players:{}, status:'waiting' };

  if(!room.players[playerId]) room.players[playerId] = { nick:'Joueur', ready:false };
  room.players[playerId].ready = true;

  const readyCount = Object.values(room.players).filter(p=>p.ready).length;

  // 🔧 MODE TEST: démarre à 1 prêt (mets 2 pour le vrai duel)
  if(readyCount >= 1 && room.status === 'waiting'){
    room.status = 'countdown';
    room.countdownEndsAt = Date.now() + 3000; // 3 secondes
  }

  await save(id, room);
  res.status(200).json({ ok:true, status: room.status, countdownEndsAt: room.countdownEndsAt || null });
}
