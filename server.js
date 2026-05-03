const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors"); // 👈 add this
const connectDB = require("./config/db");
const startCronJobs = require("./utils/cronJobs");

connectDB();

const app = express();

// 👇 CORS middleware (routes se pehle lagana zaroori hai)
app.use(cors()); 

// Agar sirf specific frontend allow karna ho:
// app.use(cors({ origin: "http://localhost:5173" }));

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