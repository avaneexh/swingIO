const rooms = {}; // { roomCode: [socketId, ...] }

export const addUserToRoom = (roomCode, socketId) => {
  if (!rooms[roomCode]) rooms[roomCode] = [];
  rooms[roomCode].push(socketId);
};

export const getUsersInRoom = (roomCode) => {
  return rooms[roomCode] || [];
};

export const removeUserFromRoom = (roomCode, socketId) => {
  if (rooms[roomCode]) {
    rooms[roomCode] = rooms[roomCode].filter(id => id !== socketId);
    if (rooms[roomCode].length === 0) delete rooms[roomCode];
  }
};