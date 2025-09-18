import { Server } from 'socket.io';

let io;
// petite mémoire en RAM pour les rooms (OK pour un proto)
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
      socket.on('room:join', ({ room, nick }) => {
        socket.join(room);
        socket.data.room = room;
        socket.data.nick = nick || 'Joueur';
        const r = getRoom(room);
        if (!r.players.find(p => p.id === socket.id)) {
          r.players.push({ id: socket.id, nick: socket.data.nick, ready: false });
        }
        io.to(room).emit('room:state', { players: r.players, status: r.status });
      });

      socket.on('player:ready', () => {
        const room = socket.data.room; const r = getRoom(room);
        const p = r.players.find(p => p.id === socket.id); if (p) p.ready = true;
        io.to(room).emit('room:state', { players: r.players, status: r.status });

        if (r.players.filter(p => p.ready).length >= 2 && !r.started) {
          r.started = true; r.status = 'countdown';
          let n = 3;
          const t = setInterval(() => {
            io.to(room).emit('game:countdown', n);
            if (n <= 1) { clearInterval(t); r.status = 'started'; io.to(room).emit('game:start'); }
            n--;
          }, 900);
        }
      });

      socket.on('player:lose', ({ reason }) => {
        const room = socket.data.room; const r = getRoom(room);
        if (r.started) {
          r.started = false; r.status = 'ended';
          const loser = r.players.find(p => p.id === socket.id);
          io.to(room).emit('game:end', { loser: loser?.nick || 'Un joueur', reason: reason || 'Détection' });
          r.players.forEach(p => (p.ready = false));
        }
      });

      socket.on('disconnect', () => {
        const room = socket.data.room;
        if (!room) return;
        const r = getRoom(room);
        r.players = r.players.filter(p => p.id !== socket.id);
        io.to(room).emit('room:state', { players: r.players, status: r.status });
      });
    });
  }
  res.end();
}

export const config = { api: { bodyParser: false } };
