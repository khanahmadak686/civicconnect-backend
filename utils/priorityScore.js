/**
 * Priority Score Calculator
 * Score = (upvotes * 0.4) + (daysPending * 0.3) + (categorySeverity * 10 * 0.3)
 * Max possible score = 100
 */
const calculatePriorityScore = (upvotes, createdAt, categorySeverity) => {
  const daysPending = Math.floor(
    (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24)
  );
  const upvoteScore   = Math.min(upvotes, 500) * 0.4;
  const pendingScore  = Math.min(daysPending, 30) * 0.3;
  const severityScore = (categorySeverity / 10) * 30;
  return Math.min(Math.round(upvoteScore + pendingScore + severityScore), 100);
};

module.exports = calculatePriorityScore;