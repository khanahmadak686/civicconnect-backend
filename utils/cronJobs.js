const cron = require("node-cron");
const Complaint = require("../models/Complaint.model");
const calculatePriorityScore = require("./priorityScore");

const startCronJobs = () => {
  // Runs every hour — recalculate priority scores for all active complaints
  cron.schedule("0 * * * *", async () => {
    console.log("Running priority score recalculation...");
    try {
      const activeComplaints = await Complaint.find({
        status: { $in: ["PENDING", "IN_PROGRESS"] },
      });

      for (const complaint of activeComplaints) {
        complaint.priorityScore = calculatePriorityScore(
          complaint.upvoteCount,
          complaint.createdAt,
          complaint.categorySeverity
        );
        await complaint.save();
      }

      console.log(`Priority scores updated for ${activeComplaints.length} complaints`);
    } catch (error) {
      console.error("Cron job error:", error.message);
    }
  });

  // Runs every day at midnight — flag stalled complaints
  cron.schedule("0 0 * * *", async () => {
    console.log("Checking for stalled complaints...");
    try {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      const stalledComplaints = await Complaint.find({
        status: { $in: ["PENDING", "IN_PROGRESS"] },
        createdAt: { $lt: tenDaysAgo },
      }).populate("assignedOfficer", "name email");

      console.log(`Found ${stalledComplaints.length} stalled complaints`);
      // In production: send email alerts to department heads here
    } catch (error) {
      console.error("Stalled complaints check error:", error.message);
    }
  });

  console.log("Cron jobs started successfully");
};

module.exports = startCronJobs;