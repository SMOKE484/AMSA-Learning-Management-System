import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },

    // Opaque random value written to the physical NFC tag — never the raw student id,
    // so a lost/stolen card can be revoked without the tag itself ever being valid again.
    token: { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },

    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    enrolledAt: { type: Date, default: Date.now },

    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revokedAt: Date,
    revokeReason: String,

    lastTapAt: Date,
  },
  { timestamps: true }
);

cardSchema.index({ student: 1, status: 1 });

const Card = mongoose.model("Card", cardSchema);
export default Card;
