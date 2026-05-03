// Email service
const { sendEmail, emailTemplates } = require("../utils/emailService");

// Models
const Admin = require("../models/Admin.model");
const Complaint = require("../models/Complaint.model");


// ══════════════════════════════════════════════════════════
// GET ALL PENDING ADMIN REQUESTS (Super Admin)
// ══════════════════════════════════════════════════════════
const getPendingAdmins = async (req, res) => {
  try {
    const pendingAdmins = await Admin.find({ isApproved: false })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: pendingAdmins.length,
      admins: pendingAdmins,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ══════════════════════════════════════════════════════════
// APPROVE / REJECT ADMIN (Super Admin)
// ══════════════════════════════════════════════════════════
const handleAdminApproval = async (req, res) => {
  try {
    const { action } = req.body; // "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'",
      });
    }

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // ───────────── APPROVE ─────────────
    if (action === "approve") {
      admin.isApproved = true;
      admin.approvedBy = req.user._id;
      admin.approvedAt = new Date();

      await admin.save();

      // ✅ Send email safely (non-blocking)
      if (admin.email) {
        sendEmail(
          admin.email,
          emailTemplates.adminApproved(admin.name, admin.email)
        ).catch((err) =>
          console.error("Email failed:", err.message)
        );
      }

      return res.status(200).json({
        success: true,
        message: `${admin.name} has been approved successfully`,
      });
    }

    // ───────────── REJECT ─────────────
    if (action === "reject") {
      const adminName = admin.name;
      const adminEmail = admin.email;

      await Admin.findByIdAndDelete(req.params.id);

      // (Optional) send rejection email
      if (adminEmail) {
        sendEmail(
          adminEmail,
          emailTemplates.adminRejected(adminName)
        ).catch((err) =>
          console.error("Rejection email failed:", err.message)
        );
      }

      return res.status(200).json({
        success: true,
        message: `${adminName}'s request has been rejected and removed`,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ══════════════════════════════════════════════════════════
// GET ALL ADMINS (Super Admin)
// ══════════════════════════════════════════════════════════
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({ isApproved: true })
      .select("-password")
      .sort({ department: 1 });

    res.status(200).json({
      success: true,
      total: admins.length,
      admins,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ══════════════════════════════════════════════════════════
// ACTIVATE / DEACTIVATE ADMIN
// ══════════════════════════════════════════════════════════
const toggleAdminStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    res.status(200).json({
      success: true,
      message: `Admin ${admin.isActive ? "activated" : "deactivated"} successfully`,
      isActive: admin.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ══════════════════════════════════════════════════════════
// DISTRICT OVERVIEW (Super Admin)
// ══════════════════════════════════════════════════════════
const getDistrictOverview = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: "RESOLVED" });
    const pending = await Complaint.countDocuments({ status: "PENDING" });
    const inProgress = await Complaint.countDocuments({ status: "IN_PROGRESS" });

    // Department stats
    const departmentStats = await Complaint.aggregate([
      {
        $group: {
          _id: "$assignedDepartment",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          resolutionRate: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              {
                $round: [
                  { $multiply: [{ $divide: ["$resolved", "$total"] }, 100] },
                  1,
                ],
              },
            ],
          },
        },
      },
      { $sort: { resolutionRate: -1 } },
    ]);

    // Category stats
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const flaggedDepartments = departmentStats.filter(
      (d) => d.resolutionRate < 50
    );

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const stalledCount = await Complaint.countDocuments({
      status: { $in: ["PENDING", "IN_PROGRESS"] },
      createdAt: { $lt: tenDaysAgo },
    });

    const totalAdmins = await Admin.countDocuments({ isApproved: true });
    const pendingApprovals = await Admin.countDocuments({ isApproved: false });

    res.status(200).json({
      success: true,
      overview: {
        totalComplaints,
        resolved,
        pending,
        inProgress,
        stalledCount,
        totalAdmins,
        pendingApprovals,
      },
      departmentStats,
      categoryStats,
      flaggedDepartments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  getPendingAdmins,
  handleAdminApproval,
  getAllAdmins,
  toggleAdminStatus,
  getDistrictOverview,
};