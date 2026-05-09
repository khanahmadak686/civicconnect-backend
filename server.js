const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const connectDB = require("./config/db");
const startCronJobs = require("./utils/cronJobs");

// Auto create uploads folder
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("uploads folder created");
}

connectDB();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://civicconnect-frontend.vercel.app",
    "https://civicconnect-frontend-pt5tzhy5i-khanahmadak686s-projects.vercel.app"
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth",       require("./routes/auth.routes"));
app.use("/api/complaints", require("./routes/complaint.routes"));
app.use("/api/admin",      require("./routes/admin.routes"));

app.get("/", (req, res) => {
  res.json({ message: "CivicConnect API running!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startCronJobs();
});