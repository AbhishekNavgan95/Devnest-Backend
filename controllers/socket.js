const CodingRoom = require("../models/CodingRoom");
const Message = require("../models/Message");

const codeCache = {};

const saveInterval = 15000; // 15 seconds

setInterval(async () => {
  for (const roomId in codeCache) {
    const { code, lastUpdated, dirty } = codeCache[roomId];
    if (!dirty) continue;

    try {
      const codingRoom = await CodingRoom.findById(roomId);
      if (codingRoom) {
        codingRoom.codeContent = code;
        await codingRoom.save();

        codeCache[roomId].dirty = false;
        console.log(`✅ Saved code for room ${roomId} to DB`);
      }
    } catch (error) {
      console.error("❌ Error auto-saving code:", error);
    }
  }
}, saveInterval);

const listenToSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket ID: ", socket.id);

    // ********** message events **********

    socket.on("joinGroup", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined group ${roomId}`);
    });

    socket.on("sendMessage", async (data) => {
      const newMessage = new Message(data);
      await newMessage.save();
      const message = await Message.findById(newMessage._id).populate("sender");

      io.to(data?.roomId).emit("receiveMessage", message);
    });

    // ********** codespace events **********
    // join code space
    socket.on("joinCodingRoom", async ({ roomId, userId, inviteCode }) => {
      try {
        console.log("✅✅ joining room : ", userId, " + room id : ", roomId);

        const codingRoom = await CodingRoom.findById(roomId)
          .populate("participants.user", "firstName lastName email image")
          .populate("chatMessages.sender", "firstName lastName email image");

        if (!codingRoom) return;

        const isKicked = codingRoom.kickList?.some(
          (u) => u?.toString() === userId
        );

        if (isKicked) {
          console.log(" ❌❌ user is kicked out, cannot join");
          return;
        }

        socket.join(roomId);

        const isInstructor = userId === codingRoom?.instructor?.toString();

        if (!isInstructor) {
          const participantIds = codingRoom.participants.map(
            (p) => p.user?._id?.toString() || p.user?.toString()
          );

          if (!participantIds.includes(userId)) {
            codingRoom.participants.push({ user: userId });
          }

          // 💡 remove accidental duplicates (by converting to Map)
          const uniqueMap = new Map();
          codingRoom.participants.forEach((p) => {
            const id = p.user?._id?.toString() || p.user?.toString();
            if (!uniqueMap.has(id)) {
              uniqueMap.set(id, p);
            }
          });
          codingRoom.participants = Array.from(uniqueMap.values());

          await codingRoom.save();
        }

        const updatedCodingRoom = await CodingRoom.findById(roomId)
          .populate("participants.user", "firstName lastName email image")
          .populate("chatMessages.sender", "firstName lastName email image");

        updatedCodingRoom.inviteLink = undefined;

        // console.log(
        //   "updatedCodingRoom.participants after joining ✅✅✅ : ",
        //   updatedCodingRoom.participants
        // );

        io.to(roomId).emit(
          "participentsListUpdated",
          updatedCodingRoom.participants
        );
      } catch (e) {
        console.log("error joining room : ", e);
      }
    });

    // Leave code space
    socket.on("leaveCodingRoom", async ({ roomId, userId }) => {
      try {
        console.log(" ->> leaved the room ", userId);

        const codingRoom = await CodingRoom.findById(roomId)
          .populate("participants.user", "firstName lastName email image")
          .populate("chatMessages.sender", "firstName lastName email image");

        if (!codingRoom) return;

        codingRoom.participants = codingRoom.participants.filter(
          (p) => p.user?._id?.toString() !== userId
        );
        await codingRoom.save();

        const updatedCodingRoom = await CodingRoom.findById(roomId)
          .populate("participants.user", "firstName lastName email image")
          .populate("chatMessages.sender", "firstName lastName email image");

        socket.leave(roomId);

        // console.log(
        //   "updatedCodingRoom after user leave ❌❌ : ",
        //   updatedCodingRoom.participants
        // );

        updatedCodingRoom.inviteLink = undefined;

        io.to(roomId).emit(
          "participentsListUpdated",
          updatedCodingRoom.participants
        );
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    });

    // send message
    socket.on(
      "sendMessageToCodingRoom",
      async ({ roomId, userId, message }) => {
        try {
          const codingRoom = await CodingRoom.findById(roomId)
            .populate("participants.user", "firstName lastName email image")
            .populate("chatMessages.sender", "firstName lastName email image");

          if (!codingRoom) return;

          const participant = codingRoom.participants.find(
            (p) => p.user?._id?.toString() === userId
          );

          const instructor = codingRoom?.instructor?.toString() === userId;

          // Only allow room participants to chat
          if (!participant && !instructor) {
            console.log("not a participent ❌❌");
            return;
          }

          // if (participant?.mutedUntil) {
          //   const now = new Date();
          //   if (now < participant.mutedUntil) {
          //     socket.emit(
          //       "chatError",
          //       "You are muted until " + participant.mutedUntil
          //     );
          //     return;
          //   }
          // }

          codingRoom.chatMessages.push({ sender: userId, content: message });
          await codingRoom.save();

          // Populate the last message's sender
          await codingRoom.populate({
            path: "chatMessages.sender",
            select: "firstName lastName email image",
          });

          const lastMessage =
            codingRoom.chatMessages[codingRoom.chatMessages.length - 1];

          // Emit the populated message
          io.to(roomId).emit("receiveMessage", lastMessage);
        } catch (error) {
          console.error("Error sending message:", error);
        }
      }
    );

    // kick user
    socket.on("kickUser", async ({ roomId, userId, instructorId }) => {
      try {
        const room = await CodingRoom.findById(roomId)
          .populate("participants.user", "firstName lastName email image")
          .populate("chatMessages.sender", "firstName lastName email image");

        if (!room || room.instructor.toString() !== instructorId) return;

        room.kickList.push({ user: userId });
        await room.save();

        const updateRoom = await CodingRoom.findById(roomId)
          .populate("participants.user", "firstName lastName email image")
          .populate("chatMessages.sender", "firstName lastName email image");

        room.inviteLink = undefined;
        io.to(roomId).emit("kickListUpdated", updateRoom.kickList);
      } catch (e) {
        console.log("error kicking out user : ", e);
      }
    });

    // update code
    socket.on("updateCode", async ({ roomId, userId, code }) => {
      if (!codeCache[roomId]) {
        codeCache[roomId] = { code: "", lastUpdated: Date.now(), dirty: false };
      }

      if (codeCache[roomId].code !== code) {
        codeCache[roomId].code = code;
        codeCache[roomId].lastUpdated = Date.now();
        codeCache[roomId].dirty = true; // mark for saving
      }

      socket.to(roomId).emit("codeUpdated", {code, userId});
    });

    // change Language
    socket.on("changeLanguage", async ({ roomId, userId, language }) => {
      try {
        const codingRoom = await CodingRoom.findById(roomId)
          .populate("participants.user", "firstName lastName email image")
          .populate("chatMessages.sender", "firstName lastName email image");

        if (!codingRoom) return;

        const participant = codingRoom.participants.find(
          (p) => p.user?._id?.toString() === userId
        );

        if (
          codingRoom.instructor.toString() !== userId &&
          participant?.role !== "editor"
        ) {
          return;
        }

        codingRoom.language = language;
        await codingRoom.save();

        codingRoom.inviteLink = undefined;
        io.to(roomId).emit("languageChanged", { language });
        // io.to(roomId).emit("getUpdatedRoomDetails", codingRoom);
      } catch (error) {
        console.error("Error changing language:", error);
      }
    });

    // change Editor Type
    socket.on("changeEditorType", async ({ roomId, userId, editorType }) => {
      try {
        const codingRoom = await CodingRoom.findById(roomId)
          .populate("participants.user", "firstName lastName email image")
          .populate("chatMessages.sender", "firstName lastName email image");

        if (!codingRoom) return;

        const participant = codingRoom.participants.find(
          (p) => p.user?._id?.toString() === userId
        );

        if (
          codingRoom.instructor.toString() !== userId &&
          participant?.role !== "editor"
        ) {
          return;
        }

        codingRoom.editorType = editorType;
        await codingRoom.save();

        codingRoom.inviteLink = undefined;
        io.to(roomId).emit("editorTypeChanged", { editorType });
      } catch (error) {
        console.error("Error changing editor type:", error);
      }
    });

    // toggle Allow Edit
    socket.on(
      "toggleAllowEdit",
      async ({ roomId, status, userId, instructorId }) => {
        try {
          const codingRoom = await CodingRoom.findById(roomId)
            .populate("participants.user", "firstName lastName email image")
            .populate("chatMessages.sender", "firstName lastName email image");

          if (!codingRoom) return;

          if (codingRoom.instructor.toString() !== instructorId) return;

          const participant = codingRoom.participants.find(
            (p) => p.user?._id?.toString() === userId
          );

          if (!participant) return;

          participant.role = status;
          await codingRoom.save();

          io.to(roomId).emit("editStatusChanged", codingRoom?.participants);
        } catch (error) {
          console.error("Error toggling allow edit:", error);
        }
      }
    );

    // disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = listenToSocketEvents;
