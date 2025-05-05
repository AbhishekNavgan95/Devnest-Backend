const express = require("express");
const router = express.Router();
const ChatRoom = require("../models/ChatRoom");
const Message = require("../models/Message");
const { isAdmin, auth } = require("../middlewares/auth");
const { getMessageHistory } = require("../controllers/Message");

// Get all chat rooms
router.get("/rooms", async (req, res) => {
  try {
    const rooms = await ChatRoom.find();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat rooms" });
  }
});

// Create a new chat room
router.post("/rooms", auth, isAdmin, async (req, res) => {
  try {
    const { name, icon } = req.body;
    const newRoom = new ChatRoom({ name, icon });
    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) {
    res.status(500).json({ error: "Failed to create room" });
  }
});

// Get message history for a room
router.get("/messages/:roomId", getMessageHistory);

module.exports = router;
