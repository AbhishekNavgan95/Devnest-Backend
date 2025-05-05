const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const {
  isAdmin,
  auth,
  isInstructor,
  isStudent,
} = require("../middlewares/auth");
const {
  createCodingRoom,
  deleteCodingRoom,
  joinCodingRoom,
  updateParticipantRole,
  getAllCodingRooms,
  getRoomDetails,
} = require("../controllers/CodeRoom");

// create coding room
router.post("/create", auth, isInstructor, createCodingRoom);

// delete coding room
router.delete("/delete/:id", auth, isInstructor, deleteCodingRoom);

// join coding room
router.post("/join/:id", auth, joinCodingRoom);

// update participent role
router.post("/updaterole", auth, isInstructor, updateParticipantRole);

// fetch all code space
router.get("/get", auth, getAllCodingRooms);

// fetch all code space
router.get("/get/:roomId", auth, getRoomDetails);

module.exports = router;
