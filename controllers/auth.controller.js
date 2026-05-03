const User = require("../models/User.model");
const Admin = require("../models/Admin.model");
const jwt = require("jsonwebtoken");
const { sendEmail, emailTemplates } = require("../utils/emailService");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// USER REGISTER — Direct, no OTP
const userRegister = async (req, res) => {
  try {
    const { name, mobile, password, ward, email } = req.body;

    if (!name || !mobile || !password || !ward) {
      return res.status(400).json({
        success: false,
        message: "Name, mobile, password and ward are required",
      });
    }

    const existing = await User.findOne({ mobile });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This mobile number is already registered",
      });
    }

    const user = await User.create({
      name, mobile, password, ward, email,
      isVerified: true,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        ward: user.ward,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// VERIFY OTP (kept for backward compatibility)
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.otp.code !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }
    user.isVerified = true;
    user.otp = undefined;
    await user.save();
    const token = generateToken(user._id, user.role);
    res.status(200).json({
      success: true,
      message: "Account verified successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        ward: user.ward,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// USER LOGIN
const userLogin = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile and password are required",
      });
    }
    const user = await User.findOne({ mobile }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Mobile number is not registered",
      });
    }
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your account first",
      });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }
    const token = generateToken(user._id, user.role);
    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        ward: user.ward,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADMIN REGISTER
const adminRegister = async (req, res) => {
  try {
    const { name, email, employeeId, password, role, department, designation, jurisdiction } = req.body;
    if (!name || !email || !employeeId || !password || !role || !department || !designation) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const existing = await Admin.findOne({ $or: [{ email }, { employeeId }] });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email or Employee ID already registered",
      });
    }
    const admin = await Admin.create({
      name, email, employeeId, password,
      role, department, designation, jurisdiction,
      isApproved: false,
    });
    res.status(201).json({
      success: true,
      message: "Request submitted. Waiting for Super Admin approval.",
      adminId: admin._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADMIN LOGIN
const adminLogin = async (req, res) => {
  try {
    const { email, employeeId, password } = req.body;
    if (!email || !employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, Employee ID and password are required",
      });
    }
    const admin = await Admin.findOne({ email, employeeId }).select("+password");
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    if (!admin.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Account not approved yet. Please wait.",
      });
    }
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account has been deactivated",
      });
    }
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }
    const token = generateToken(admin._id, admin.role);
    res.status(200).json({
      success: true,
      message: "Admin login successful!",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        department: admin.department,
        designation: admin.designation,
        jurisdiction: admin.jurisdiction,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET CURRENT USER
const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

module.exports = {
  userRegister,
  verifyOTP,
  userLogin,
  adminRegister,
  adminLogin,
  getMe,
};