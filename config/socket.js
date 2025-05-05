const { Server } = require("socket.io");

// Initialize Socket.io
const socketConnect = (server) => {
  const io = new Server(server, {
    cors: {
      // origin: process.env.CORS_ORIGIN || "https://echo-an.netlify.app",
      origin: "*",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  return io;
};

module.exports = socketConnect; // Use module.exports instead of export
