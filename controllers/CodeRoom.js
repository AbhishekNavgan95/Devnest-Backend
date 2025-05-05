const crypto = require("crypto");
const CodingRoom = require("../models/CodingRoom");

exports.getAllCodingRooms = async (req, res) => {
  try {
    const codingRooms = await CodingRoom.find().populate("instructor", "name");

    codingRooms.forEach((room) => {
      if (room.visibility === "private") {
        room.joiningToken = undefined;
      }
    });

    res.status(200).json({
      success: true,
      message: "Coding Rooms fetched successfully",
      data: codingRooms,
    });
  } catch (error) {
    console.error("Error fetching coding rooms:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.createCodingRoom = async (req, res) => {
  try {
    const { name, visibility } = req.body;
    const instructorId = req.user.id; // Extracted from auth middleware

    const roomData = {
      name,
      instructor: instructorId,
      visibility,
      language: "javascript",
      codeContent: "",
      editorType: "simple",
      participants: [],
    };

    // If private, generate an invite link
    if (visibility === "private") {
      roomData.inviteLink = crypto.randomUUID();
    }

    const newRoom = new CodingRoom(roomData);
    await newRoom.save();

    res.status(201).json({
      message: "Coding Room created successfully",
      data: newRoom,
      success: true,
    });
  } catch (error) {
    console.error("Error creating coding room:", error);
    res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

exports.deleteCodingRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;

    const codingRoom = await CodingRoom.findById(id);
    if (!codingRoom)
      return res
        .status(404)
        .json({ message: "Coding Room not found", success: false });

    if (codingRoom.instructor.toString() !== instructorId) {
      return res.status(403).json({
        message: "You are not authorized to delete this coding room",
        success: false,
      });
    }

    await codingRoom.deleteOne();
    res
      .status(200)
      .json({ message: "Coding Room deleted successfully", success: true });
  } catch (error) {
    console.error("Error deleting coding room:", error);
    res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

exports.joinCodingRoom = async (req, res) => {
  try {
    const { joiningToken } = req.body;
    const userId = req.user.id;
    const roomId = req.params.id;

    const room = await CodingRoom.findById(roomId);
    if (!room)
      return res
        .status(404)
        .json({ success: false, message: "Room not found" });

    // Check if private and validate invite link
    if (
      room.visibility === "private" &&
      room.inviteLink !== joiningToken &&
      room?.instructor?.toString() !== userId
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid invite link" });
    }

    if (room.kickList.includes(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "You are blocked from this room" });
    }

    // Check if user is already in room
    const isParticipant = room.participants.some(
      (p) => p.user.toString() === userId
    );

    // dont include instructor
    if (!isParticipant && userId !== room?.instructor?._id.toString()) {
      room.participants.push({ user: userId, role: "viewer" });
      await room.save();
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

exports.updateParticipantRole = async (req, res) => {
  try {
    const { roomId, userId, role } = req.body;
    const instructorId = req.user.id;

    const room = await CodingRoom.findById(roomId);
    if (!room || room.instructor.toString() !== instructorId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const participant = room.participants.find(
      (p) => p.user.toString() === userId
    );
    if (participant) {
      participant.role = role;
      await room.save();
      return res.status(200).json({ success: true, message: "Role updated" });
    }

    res.status(404).json({ message: "Participant not found" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

exports.getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await CodingRoom.findById(roomId)
      .populate("participants.user", "firstName lastName email image")
      .populate("chatMessages.sender", "firstName lastName email image");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};
