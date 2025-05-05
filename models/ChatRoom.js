const mongoose = require("mongoose");

const ChatRoomSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    icon: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
