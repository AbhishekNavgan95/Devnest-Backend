const mongoose = require("mongoose");

const CodingRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  inviteLink: {
    type: String, // Will be generated for private rooms
  },
  participants: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
      mutedUntil: { type: Date, default: null }, // For mute feature
    },
  ],
  kickList: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  chatMessages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  language: {
    type: String,
  },
  editorType: {
    type: String,
  },
  codeContent: {
    type: String, // Store the latest version of the code
    default: "console.log(\"start writing code here...\")",
  },
});

module.exports = mongoose.model("CodingRoom", CodingRoomSchema);
