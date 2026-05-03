const mongoose = require("mongoose");

const upvoteSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// One user can only upvote a complaint once
upvoteSchema.index({ complaint: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Upvote", upvoteSchema);