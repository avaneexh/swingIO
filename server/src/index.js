import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const io = new Server(8000)

io.on('connection', socket => {
  console.log(`Socket Connected`, socket.id);  
});
