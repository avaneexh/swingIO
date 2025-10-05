import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";
import { env } from "../env";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = (props) => {
  const socket = useMemo(
    () =>
      io(env.BASE_URL, {
        transports: ["websocket"], 
        withCredentials: true,
      }),
    []
  );

  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
};
