const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const Admin = require("../models/Admin.model");

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === "USER") {
      req.user = await User.findById(decoded.id);
    } else {
      req.user = await Admin.findById(decoded.id);
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = { protect };