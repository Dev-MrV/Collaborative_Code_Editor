import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    createdBy: { type: String },
    users: [{ type: String }],
  },
  { timestamps: true }
);

// ✅ IMPORTANT FIX
const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default Room;
