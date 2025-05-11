const ChatRoom = require("./ChatRoom");
const Message = require("./Message");

exports.fetchRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat rooms" });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { name, icon } = req.body;
    const newRoom = new ChatRoom({ name, icon });
    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) {
    res.status(500).json({ error: "Failed to create room" });
  }
};


exports.getMessageHistory = async (req, res) => {
  const { roomId } = req.params;

  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId })
    .sort({ timestamp: -1 })
    .limit(500)
    .populate("sender")
    .exec();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};