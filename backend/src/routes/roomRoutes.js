import express from "express";
import Room from "../models/Room.js";
import crypto from "crypto";

const router = express.Router();

/* ===================== CREATE ROOM ===================== */
router.post("/create", async (req, res) => {
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

    const room = await Room.create({
      roomId: roomId.trim(),
      createdBy: req.user?.id, // optional
      users: req.user ? [req.user.id] : [],
    });

    res.json({ success: true, roomId: room.roomId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Room creation failed" });
  }
});

/* ===================== JOIN ROOM ===================== */
router.post("/join", async (req, res) => {
  const { roomId } = req.body;

  const room = await Room.findOne({ roomId });
  if (!room) {
    return res
      .status(404)
      .json({ success: false, message: "Room not found" });
  }

  // Optional: add user to room 
  if (req.user && !room.users.includes(req.user.id)) {
    room.users.push(req.user.id);
    await room.save();
  }

  res.json({ success: true });
});

export default router;
