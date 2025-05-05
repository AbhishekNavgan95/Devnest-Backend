const Message = require("../models/Message");

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
