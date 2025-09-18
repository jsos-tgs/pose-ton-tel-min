// pages/api/socket.js
import { Server } from 'socket.io';

let io;
// Petite mémoire en RAM (suffit pour un proto, pas fiable en prod serverless)
const rooms = global._ptt_rooms || (global._ptt_rooms = new Map());
function getRoom(id) {
  if (!rooms.has(id)) rooms.set(id, { id, players: [], status: 'waiting', started: false });
  return rooms.get(id);
}

export default function handler(req, res) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server, { path: '/api/socket', addTrailingSlash: false });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('[io] connection', socket.id);

      socket.on('room:join', ({ room, nick }) => {
        socket.join(room);
        socket.data.room = room;
        socket.data.nick = nick || 'Joueur';
        const r = getRoom(room);
        if (!r.players.find((p) => p.id === socket.id)) {
          r.players.push({ id: socket.id, nick: socket.data.nick, ready: false });
        }
        console.log('[io] join', room, 'players=', r.players.length);
        io.to(room).emit('room:state', {
          players: r.players,
          status: r.status,
          readyCount: r.players.filter((p) => p.ready).length,
        });
      });

      socket.on('player:ready', () => {
        const room = socket.data.room;
        const r = getRoom(room);
        const p = r.players.find((p) => p.id === socket.id);
        if (p) p.ready = true;

        const readyCount = r.players.filter((p) => p.ready).length;
        io.to(room).emit('room:state', { players: r.players, status: r.status, readyCount });

        // ⚠️ MODE TEST : démarrer dès 1 "ready" pour vérifier le flow
        if (readyCount >= 1 && !r.started) {
          r.started = true;
          r.status = 'countdown';
          let n = 3;
          console.log('[io] countdown start', room);
          const t = setInterval(() => {
            io.to(room).emit('game:countdown', n);
            if (n <= 1) {
              clearInterval(t);
              r.status = 'started';
              console.log('[io] game start', room);
              io.to(room).emit('game:start');
            }
            n--;
          }, 900);
        }
      });

      socket.on('player:lose', ({ reason }) => {
        const room = socket.data.room;
        const r = getRoom(room);
        if (r.started) {
          r.started = false;
          r.status = 'ended';
          const loser = r.players.find((p) => p.id === socket.id);
          console.log('[io] game end', room, 'loser=', loser?.nick);
          io.to(room).emit('game:end', { loser: loser?.nick || 'Un joueur', reason: reason || 'Détection' });
          r.players.forEach((p) => (p.ready = false));
        }
      });

      socket.on('disconnect', () => {
        const room = socket.data.room;
        if (!room) return;
        const r = getRoom(room);
        r.players = r.players.filter((p) => p.id !== socket.id);
        console.log('[io] disconnect', room, 'players=', r.players.length);
        io.to(room).emit('room:state', {
          players: r.players,
          status: r.status,
          readyCount: r.players.filter((p) => p.ready).length,
        });
      });
    });
  }
  res.end();
}

export const config = { api: { bodyParser: false } };
