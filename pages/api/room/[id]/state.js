import { kv } from '@vercel/kv';

const KEY = (id) => `room:${id}`;

async function loadRoom(id) {
  const raw = await kv.get(KEY(id));
  if (!raw) return null;
  if (typeof raw === 'string') return JSON.parse(raw);
  return raw; // certains clients KV renvoient déjà de l'objet
}

async function saveRoom(id, room) {
  // on stocke en JSON brut (fiable partout)
  await kv.set(KEY(id), JSON.stringify(room));
}

export default async function handler(req, res) {
  const { id } = req.query;
  let room = await loadRoom(id);
  if (!room) {
    room = { id, players: {}, status: 'waiting' };
    await saveRoom(id, room);
  }

  // transition automatique countdown -> started
  if (room.status === 'countdown' && room.countdownEndsAt && Date.now() >= room.countdownEndsAt) {
    room.status = 'started';
    room.startedAt = room.countdownEndsAt;
    delete room.countdownEndsAt;
    await saveRoom(id, room);
  }

  const playerCount = Object.keys(room.players).length;
  const readyCount = Object.values(room.players).filter((p) => p.ready).length;

  res.status(200).json({
    id: room.id,
    status: room.status,
    players: room.players,
    playerCount,
    readyCount,
    countdownEndsAt: room.countdownEndsAt || null,
    startedAt: room.startedAt || null,
    loser: room.loser || null,
  });
}
