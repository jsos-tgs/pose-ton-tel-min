import { kv } from '@vercel/kv';
const KEY = (id) => `room:${id}`;

async function load(id){ const raw = await kv.get(KEY(id)); return raw ? JSON.parse(raw) : null; }
async function save(id, room){ await kv.set(KEY(id), JSON.stringify(room)); }

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();
  const { id } = req.query;
  const { playerId } = req.body || {};

  let room = await load(id);
  if(!room) return res.status(200).json({ ok:true }); // rien à faire

  if(room.status === 'started'){
    const nick = room.players[playerId]?.nick || 'Un joueur';
    room.status = 'ended';
    room.loser = nick;
    await save(id, room);
  }
  res.status(200).json({ ok:true });
}
