import { SOCKET_EVENTS } from '../constants/socketEvents.js';
import { generateRoomCode } from '../utils/generateRoomCode.js';
import { addUserToRoom, getUsersInRoom, removeUserFromRoom } from '../services/room.js';

export const handleSocketEvents = (io, socket) => {
  socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomCode, isSender }) => {
    if (!roomCode) {
      roomCode = generateRoomCode();
      socket.emit(SOCKET_EVENTS.ROOM_CODE_GENERATED, { roomCode });
    }

    socket.join(roomCode);
    addUserToRoom(roomCode, socket.id);

    const users = getUsersInRoom(roomCode);
    io.to(roomCode).emit(SOCKET_EVENTS.ROOM_USERS, { count: users.length });

    if (!isSender) {
      socket.to(roomCode).emit(SOCKET_EVENTS.USER_JOINED, { socketId: socket.id });
    }
  });

  socket.on(SOCKET_EVENTS.FILE_SEND, ({ roomCode, fileData }) => {
    socket.to(roomCode).emit(SOCKET_EVENTS.FILE_RECEIVE, { fileData });
  });

  socket.on('disconnecting', () => {
    for (let roomCode of socket.rooms) {
      if (roomCode !== socket.id) {
        removeUserFromRoom(roomCode, socket.id);
        const users = getUsersInRoom(roomCode);
        io.to(roomCode).emit(SOCKET_EVENTS.ROOM_USERS, { count: users.length });
      }
    }
  });
};
