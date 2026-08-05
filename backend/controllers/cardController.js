import crypto from "crypto";
import Card from "../models/card.js";
import Student from "../models/student.js";

// Admin: enroll a new NFC card for a student — generates a fresh opaque token,
// revokes any card the student already has active, and returns the token for
// the app to write onto the physical tag.
export const enrollCard = async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    await Card.updateMany(
      { student: studentId, status: "active" },
      { $set: { status: "revoked", revokedBy: req.userId, revokedAt: new Date(), revokeReason: "Replaced by new card" } }
    );

    const token = crypto.randomBytes(24).toString("base64url");

    const card = await Card.create({
      student: studentId,
      token,
      enrolledBy: req.userId,
    });

    res.status(201).json({ success: true, token, cardId: card._id });
  } catch (error) {
    console.error("enrollCard error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: current active card (if any) for a student
export const getCardForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const card = await Card.findOne({ student: studentId, status: "active" });
    res.json({ success: true, card });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: revoke a lost/stolen card
export const revokeCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { reason } = req.body;

    const card = await Card.findById(cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });
    if (card.status === "revoked") {
      return res.status(400).json({ message: "Card is already revoked" });
    }

    card.status = "revoked";
    card.revokedBy = req.userId;
    card.revokedAt = new Date();
    card.revokeReason = reason || "Reported lost";
    await card.save();

    res.json({ success: true, message: "Card revoked", card });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: list all cards, for an audit/overview screen
export const listCards = async (req, res) => {
  try {
    const cards = await Card.find()
      .populate({ path: "student", select: "grade user", populate: { path: "user", select: "name email" } })
      .sort({ createdAt: -1 });
    res.json({ success: true, cards });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
