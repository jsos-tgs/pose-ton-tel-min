import { kv } from '@vercel/kv';
const KEY = (id) => `room:${id}`;

async function load(id){ const raw = await kv.get(KEY(id)); return raw ? JSON.parse(raw) : null; }
async function save(id, room){ await kv.set(KEY(id), JSON.stringify(room)); }

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();
  const { id } = req.query;
  const { playerId, nick } = req.body || {};
  if(!playerId) return res.status(400).json({ error: 'playerId manquant' });

  let room = await load(id);
  if(!room) room = { id, players:{}, status:'waiting' };

  room.players[playerId] = room.players[playerId] || { nick: nick || 'Joueur', ready:false };
  if(nick) room.players[playerId].nick = nick;

  await save(id, room);
  res.status(200).json({ ok:true });
}
