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
    const { id: roomId } = req.params;
    const { joiningToken } = req.body;
    const userId = req.user.id;

    // console.log("userid : ", userId);

    const codingRoom = await CodingRoom.findById(roomId).populate(
      "participants kickList chatMessages"
    );

    // console.log("coding room details : ", codingRoom);

    if (!codingRoom) {
      return res
        .status(404)
        .json({ message: "Coding Room not found", success: false });
    }

    if (
      codingRoom.visibility === "private" &&
      userId !== codingRoom.instructor.toString()
    ) {
      if (!joiningToken || joiningToken !== codingRoom.inviteLink) {
        return res
          .status(403)
          .json({ message: "Invalid joining token", success: false });
      }
    }

    const isKicked = codingRoom.kickList?.some((u) => u?.toString() === userId);
    if (isKicked) {
      return res
        .status(403)
        .json({ message: "You are kicked out of this room", success: false });
    }

    return res.status(200).json({ success: true, data: codingRoom });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
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
