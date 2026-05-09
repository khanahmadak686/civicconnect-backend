const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  registerComplaint,
  getAllComplaints,
  getComplaintById,
  getMyComplaints,
  upvoteComplaint,
  updateComplaintStatus,
  getDepartmentComplaints,
  getDistrictStats,
} = require("../controllers/complaint.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// Memory storage — Render par disk nahi hoti
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Static routes FIRST
router.get("/my-complaints", protect, authorizeRoles("USER"), getMyComplaints);
router.get("/department", protect, authorizeRoles("AUTHORITY", "SUPER_ADMIN"), getDepartmentComplaints);
router.get("/district-stats", protect, authorizeRoles("SUPER_ADMIN"), getDistrictStats);

// General routes
router.get("/", getAllComplaints);
router.post("/", protect, authorizeRoles("USER"), upload.array("photos", 5), registerComplaint);

// Dynamic routes LAST
router.get("/:id", getComplaintById);
router.post("/:id/upvote", protect, authorizeRoles("USER"), upvoteComplaint);
router.patch("/:id/status", protect, authorizeRoles("AUTHORITY", "SUPER_ADMIN"), upload.array("photos", 3), updateComplaintStatus);

module.exports = router;