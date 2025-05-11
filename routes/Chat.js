const express = require("express");
const router = express.Router();
const ChatRoom = require("../models/ChatRoom");
const Message = require("../models/Message");
const { isAdmin, auth } = require("../middlewares/auth");
const { fetchRooms, createRoom, getMessageHistory } = require("../models/Chat");

// Get all chat rooms
router.get("/rooms", fetchRooms);

// Create a new chat room
router.post("/rooms", auth, isAdmin, createRoom);

// Get message history for a room
router.get("/messages/:roomId", getMessageHistory);

module.exports = router;
