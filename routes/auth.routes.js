const express = require("express");
const router = express.Router();
const {
  userRegister,
  verifyOTP,
  userLogin,
  adminRegister,
  adminLogin,
  getMe,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

// User routes
router.post("/user/register", userRegister);
router.post("/user/verify-otp", verifyOTP);
router.post("/user/login", userLogin);

// Admin routes
router.post("/admin/register", adminRegister);
router.post("/admin/login", adminLogin);

// Protected route
router.get("/me", protect, getMe);

module.exports = router;