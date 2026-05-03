const express = require("express");
const router = express.Router();
const {
  getPendingAdmins,
  handleAdminApproval,
  getAllAdmins,
  toggleAdminStatus,
  getDistrictOverview,
} = require("../controllers/admin.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// All routes are Super Admin only
router.use(protect);
router.use(authorizeRoles("SUPER_ADMIN"));

router.get("/pending-admins", getPendingAdmins);
router.patch("/approve/:id", handleAdminApproval);
router.get("/all-admins", getAllAdmins);
router.patch("/toggle-status/:id", toggleAdminStatus);
router.get("/district-overview", getDistrictOverview);

module.exports = router;