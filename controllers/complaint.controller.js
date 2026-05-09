const Complaint = require("../models/Complaint.model");
const Upvote = require("../models/Upvote.model");
const User = require("../models/User.model");
const cloudinary = require("../config/cloudinary");
const calculatePriorityScore = require("../utils/priorityScore");
const { sendEmail, emailTemplates } = require("../utils/emailService");

const categoryDepartmentMap = {
  ROAD: "PWD",
  ELECTRICITY: "BSES",
  WATER: "DELHI_JAL_BOARD",
  SANITATION: "MCD_SANITATION",
  PARK: "HORTICULTURE",
  CONSTRUCTION: "PWD",
  OTHER: "DISTRICT_ADMIN",
};

// Helper — Cloudinary upload from memory buffer
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ══════════════════════════════════════════════════════════
// REGISTER COMPLAINT
// ══════════════════════════════════════════════════════════
const registerComplaint = async (req, res) => {
  try {
    const { title, description, category, address, ward, zone, latitude, longitude } = req.body;

    if (!title || !description || !category || !address) {
      return res.status(400).json({
        success: false,
        message: "Title, description, category and address are required",
      });
    }

    // Upload photos from memory buffer to Cloudinary
    let photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, "civicconnect/complaints");
        photos.push({ url: result.secure_url, publicId: result.public_id });
      }
    }

    const assignedDepartment = categoryDepartmentMap[category] || "DISTRICT_ADMIN";

    const complaint = await Complaint.create({
      title,
      description,
      category,
      location: {
        address,
        ward,
        zone,
        coordinates: {
          type: "Point",
          coordinates:
            longitude && latitude
              ? [parseFloat(longitude), parseFloat(latitude)]
              : [],
        },
      },
      photos,
      registeredBy: req.user._id,
      assignedDepartment,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalComplaintsRegistered: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Complaint registered successfully!",
      complaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════
// GET ALL COMPLAINTS
// ══════════════════════════════════════════════════════════
const getAllComplaints = async (req, res) => {
  try {
    const { status, category, department, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (department) filter.assignedDepartment = department;

    const skip = (page - 1) * limit;

    const complaints = await Complaint.find(filter)
      .populate("registeredBy", "name mobile ward")
      .populate("assignedOfficer", "name designation department")
      .sort({ isPinned: -1, priorityScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════
// GET SINGLE COMPLAINT
// ══════════════════════════════════════════════════════════
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("registeredBy", "name mobile ward")
      .populate("assignedOfficer", "name designation department")
      .populate("statusHistory.changedBy", "name designation");

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    res.status(200).json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════
// GET MY COMPLAINTS
// ══════════════════════════════════════════════════════════
const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ registeredBy: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, total: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════
// UPVOTE COMPLAINT
// ══════════════════════════════════════════════════════════
const upvoteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (complaint.status === "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Cannot upvote a resolved complaint",
      });
    }

    const existingUpvote = await Upvote.findOne({
      complaint: req.params.id,
      user: req.user._id,
    });

    if (existingUpvote) {
      return res.status(400).json({
        success: false,
        message: "You have already upvoted this complaint",
      });
    }

    await Upvote.create({ complaint: req.params.id, user: req.user._id });

    complaint.upvoteCount += 1;
    complaint.priorityScore = calculatePriorityScore(
      complaint.upvoteCount,
      complaint.createdAt,
      complaint.categorySeverity
    );
    await complaint.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalUpvotesGiven: 1 },
    });

    res.status(200).json({
      success: true,
      message: "Complaint upvoted successfully!",
      upvoteCount: complaint.upvoteCount,
      priorityScore: complaint.priorityScore,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════
// UPDATE COMPLAINT STATUS (Authority)
// ══════════════════════════════════════════════════════════
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (
      req.user.role === "AUTHORITY" &&
      req.user.department !== complaint.assignedDepartment
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update complaints assigned to your department",
      });
    }

    // Upload resolution photos from memory buffer
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, "civicconnect/resolutions");
        complaint.resolutionPhotos.push({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    }

    complaint.status = status;
    complaint.assignedOfficer = req.user._id;
    complaint.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || "",
    });

    if (status === "RESOLVED") {
      complaint.resolvedAt = new Date();
      complaint.resolutionNote = note || "";
    }

    await complaint.save();

    // Send email ONLY when RESOLVED
    if (status === "RESOLVED") {
      const complaintOwner = await User.findById(complaint.registeredBy);
      if (complaintOwner?.email) {
        await sendEmail(
          complaintOwner.email,
          emailTemplates.statusUpdated(
            complaintOwner.name,
            complaint.complaintId,
            complaint.title,
            status,
            note
          )
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Complaint status updated to ${status}`,
      complaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════
// GET DEPARTMENT COMPLAINTS (Authority)
// ══════════════════════════════════════════════════════════
const getDepartmentComplaints = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { assignedDepartment: req.user.department };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const complaints = await Complaint.find(filter)
      .populate("registeredBy", "name mobile ward")
      .sort({ priorityScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    const stats = await Complaint.aggregate([
      { $match: { assignedDepartment: req.user.department } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      stats,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════
// GET DISTRICT STATS (Super Admin)
// ══════════════════════════════════════════════════════════
const getDistrictStats = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: "RESOLVED" });
    const pending = await Complaint.countDocuments({ status: "PENDING" });
    const inProgress = await Complaint.countDocuments({ status: "IN_PROGRESS" });

    const departmentStats = await Complaint.aggregate([
      {
        $group: {
          _id: "$assignedDepartment",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] } },
          avgPriorityScore: { $avg: "$priorityScore" },
        },
      },
      {
        $addFields: {
          resolutionRate: {
            $round: [
              { $multiply: [{ $divide: ["$resolved", "$total"] }, 100] },
              1,
            ],
          },
        },
      },
      { $sort: { resolutionRate: -1 } },
    ]);

    const categoryStats = await Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const flaggedDepartments = departmentStats.filter((d) => d.resolutionRate < 50);

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const stalledComplaints = await Complaint.countDocuments({
      status: { $in: ["PENDING", "IN_PROGRESS"] },
      createdAt: { $lt: tenDaysAgo },
    });

    res.status(200).json({
      success: true,
      overview: { totalComplaints, resolved, pending, inProgress, stalledComplaints },
      departmentStats,
      categoryStats,
      flaggedDepartments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerComplaint,
  getAllComplaints,
  getComplaintById,
  getMyComplaints,
  upvoteComplaint,
  updateComplaintStatus,
  getDepartmentComplaints,
  getDistrictStats,
};