const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) console.error("❌ Email service error:", error.message);
  else console.log("✅ Email service ready");
});

const emailTemplates = {
  statusUpdated: (userName, complaintId, title, newStatus, note) => ({
    subject: `CivicConnect — Complaint #${complaintId} Has Been Resolved!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1D9E75; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">CivicConnect</h1>
          <p style="color: #d1fae5; margin: 5px 0 0;">Smart City Grievance System</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937;">🎉 Your Complaint Has Been Resolved!</h2>
          <p style="color: #6b7280;">Dear ${userName},</p>
          <p style="color: #6b7280;">Your complaint has been resolved by the concerned department.</p>
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; font-size: 14px; width: 40%;">Complaint ID</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">#${complaintId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; font-size: 14px; border-top: 1px solid #f3f4f6;">Title</td>
                <td style="padding: 8px 0; color: #1f2937; border-top: 1px solid #f3f4f6;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; font-size: 14px; border-top: 1px solid #f3f4f6;">Status</td>
                <td style="padding: 8px 0; border-top: 1px solid #f3f4f6;">
                  <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                    ✅ RESOLVED
                  </span>
                </td>
              </tr>
              ${note ? `
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; font-size: 14px; border-top: 1px solid #f3f4f6;">Resolution Note</td>
                <td style="padding: 8px 0; color: #1f2937; border-top: 1px solid #f3f4f6;">${note}</td>
              </tr>` : ""}
            </table>
          </div>
          <p style="color: #059669; font-weight: 500;">Thank you for helping improve your city! 🏙️</p>
          <p style="color: #9ca3af; font-size: 13px;">For more issues, please register a new complaint on CivicConnect.</p>
        </div>
        <p style="text-align: center; color: #d1d5db; font-size: 12px; margin-top: 20px;">
          © 2026 CivicConnect. All rights reserved.
        </p>
      </div>
    `,
  }),
};

const sendEmail = async (to, template) => {
  try {
    if (!to) return;
    await transporter.sendMail({
      from: `"CivicConnect" <${process.env.EMAIL_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
};

module.exports = { sendEmail, emailTemplates };