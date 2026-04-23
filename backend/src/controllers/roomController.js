import Room from "../models/Room.js";

/* ================= CREATE ROOM ================= */
export const createRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId || !roomId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: "Room already exists",
      });
    }

    await Room.create({
      roomId,
      createdBy: req.user?.id || null,
      users: req.user ? [req.user.id] : [],
    });

    res.json({ success: true, roomId });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Room creation failed",
    });
  }
};

/* ================= JOIN ROOM ================= */
export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId || !roomId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    if (req.user && !room.users.includes(req.user.id)) {
      room.users.push(req.user.id);
      await room.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to join room",
    });
  }
};
