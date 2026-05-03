const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true },
    title: {
      type: String,
      required: [true, "Complaint title is required"],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      enum: ["ROAD", "ELECTRICITY", "WATER", "SANITATION", "PARK", "CONSTRUCTION", "OTHER"],
    },
    location: {
      address: { type: String, required: true },
      ward: String,
      zone: String,
      coordinates: {
        type: { type: String, default: "Point" },
        coordinates: [Number],
      },
    },
    photos: [{ url: String, publicId: String }],
    resolutionPhotos: [
      {
        url: String,
        publicId: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedDepartment: {
      type: String,
      enum: ["PWD", "DELHI_JAL_BOARD", "BSES", "MCD_SANITATION", "HORTICULTURE", "DISTRICT_ADMIN"],
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "PENDING",
    },
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        note: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: Date,
    resolutionNote: String,
    upvoteCount: { type: Number, default: 0 },
    priorityScore: { type: Number, default: 0 },
    categorySeverity: { type: Number, default: 5 },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

complaintSchema.index({ "location.coordinates": "2dsphere" });
complaintSchema.index({ priorityScore: -1 });
complaintSchema.index({ status: 1, priorityScore: -1 });

complaintSchema.pre("save", async function () {
  if (!this.complaintId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("Complaint").countDocuments();
    this.complaintId = `CIV-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  const severityMap = {
    ROAD: 7, ELECTRICITY: 8, WATER: 9,
    SANITATION: 6, PARK: 4, CONSTRUCTION: 5, OTHER: 3,
  };
  this.categorySeverity = severityMap[this.category] || 5;
});

module.exports = mongoose.model("Complaint", complaintSchema);