const nodemailer = require("nodemailer");
const logger = require("../config/logger");

// Create reusable transporter
let transporter = null;

const createTransporter = () => {
  if (transporter) return transporter;

  // Configure based on environment
  const emailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  };

  // For development, use ethereal email if no SMTP configured
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_USER) {
    logger.warn("No SMTP configuration found. Emails will be logged to console only.");
    return null;
  }

  try {
    transporter = nodemailer.createTransporter(emailConfig);
    logger.info("Email transporter created successfully");
    return transporter;
  } catch (error) {
    logger.error("Failed to create email transporter", {
      error: error.message,
    });
    return null;
  }
};

/**
 * Send OTP email for password reset
 */
const sendOTPEmail = async (email, otp, userName = "User") => {
  try {
    const transport = createTransporter();

    // If no transporter in development, just log
    if (!transport && process.env.NODE_ENV === "development") {
      logger.info("📧 OTP Email (Development Mode)", {
        to: email,
        otp: otp,
        userName: userName,
      });
      console.log("\n" + "=".repeat(60));
      console.log("📧 EMAIL NOTIFICATION (Development Mode)");
      console.log("=".repeat(60));
      console.log(`To: ${email}`);
      console.log(`Subject: Password Reset OTP`);
      console.log(`OTP: ${otp}`);
      console.log("=".repeat(60) + "\n");
      return { success: true, mode: "console" };
    }

    if (!transport) {
      throw new Error("Email transporter not configured");
    }

    const mailOptions = {
      from: `"${process.env.APP_NAME || "B2B Billings"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset OTP - B2B Billings",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .otp-box {
              background: #f8f9fa;
              border: 2px dashed #667eea;
              border-radius: 8px;
              padding: 25px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #667eea;
              letter-spacing: 8px;
              margin: 10px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6c757d;
              border-top: 1px solid #dee2e6;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              <p>We received a request to reset your password for your B2B Billings account.</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your One-Time Password (OTP)</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 0; font-size: 12px; color: #666;">Valid for 10 minutes</p>
              </div>

              <p>Enter this OTP on the password reset page to continue.</p>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This OTP will expire in 10 minutes</li>
                  <li>Never share this OTP with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>

              <p style="margin-top: 30px;">
                <strong>Need help?</strong> Contact our support team if you have any questions.
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} B2B Billings. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset OTP

Hello ${userName},

We received a request to reset your password for your B2B Billings account.

Your One-Time Password (OTP): ${otp}

This OTP is valid for 10 minutes.

Enter this OTP on the password reset page to continue.

Security Notice:
- This OTP will expire in 10 minutes
- Never share this OTP with anyone
- If you didn't request this, please ignore this email

Need help? Contact our support team if you have any questions.

© ${new Date().getFullYear()} B2B Billings. All rights reserved.
This is an automated email. Please do not reply to this message.
      `,
    };

    const info = await transport.sendMail(mailOptions);

    logger.info("OTP email sent successfully", {
      messageId: info.messageId,
      to: email,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error("Failed to send OTP email", {
      error: error.message,
      email: email,
    });
    throw error;
  }
};

/**
 * Send password reset success notification
 */
const sendPasswordResetSuccessEmail = async (email, userName = "User") => {
  try {
    const transport = createTransporter();

    // If no transporter in development, just log
    if (!transport && process.env.NODE_ENV === "development") {
      logger.info("📧 Password Reset Success Email (Development Mode)", {
        to: email,
        userName: userName,
      });
      return { success: true, mode: "console" };
    }

    if (!transport) {
      throw new Error("Email transporter not configured");
    }

    const mailOptions = {
      from: `"${process.env.APP_NAME || "B2B Billings"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Successful - B2B Billings",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .content {
              padding: 40px 30px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6c757d;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Reset Successful</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              <p>Your password has been successfully reset.</p>
              <p>You can now log in to your B2B Billings account using your new password.</p>
              <p style="margin-top: 30px;">
                <strong>⚠️ Didn't make this change?</strong><br>
                If you didn't reset your password, please contact our support team immediately.
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} B2B Billings. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Successful

Hello ${userName},

Your password has been successfully reset.

You can now log in to your B2B Billings account using your new password.

Didn't make this change?
If you didn't reset your password, please contact our support team immediately.

© ${new Date().getFullYear()} B2B Billings. All rights reserved.
      `,
    };

    const info = await transport.sendMail(mailOptions);

    logger.info("Password reset success email sent", {
      messageId: info.messageId,
      to: email,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error("Failed to send password reset success email", {
      error: error.message,
      email: email,
    });
    // Don't throw error for notification emails
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetSuccessEmail,
};
