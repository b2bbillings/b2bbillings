# 📧 Email Configuration Guide for OTP System

## Overview
The forgot password feature now sends OTPs via email. Follow this guide to configure your email settings.

## Current Status
- ✅ nodemailer installed
- ✅ Email service created (`src/utils/emailService.js`)
- ✅ OTP sending integrated
- ⏳ **SMTP credentials need to be configured**

## Quick Setup (Gmail)

### Step 1: Enable 2-Factor Authentication on your Gmail account
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification"

### Step 2: Generate an App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer"
3. Click "Generate"
4. Copy the 16-character password

### Step 3: Update `.env` file
Open `Backend/.env` and update these lines:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com     # Replace with your Gmail
SMTP_PASS=xxxx xxxx xxxx xxxx             # Replace with App Password from Step 2
APP_NAME=B2B Billings
```

### Step 4: Restart the Backend Server
```bash
cd Backend
node server.js
```

## Alternative Email Services

### Using SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Using Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

### Using Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

## Testing the Setup

### Development Mode (No Email Required)
If you don't configure SMTP credentials, the system will:
- Log the OTP to the console/terminal
- Still show OTP on screen (development mode)
- Allow testing without actual emails

### Production Mode
Once SMTP is configured:
- OTPs will be sent to user's email
- Beautiful HTML email template
- 10-minute expiration
- Success notification after password reset

## Email Templates

The system sends two types of emails:

### 1. OTP Email
- Subject: "Password Reset OTP - B2B Billings"
- Contains 6-digit OTP code
- Valid for 10 minutes
- Security warnings included

### 2. Password Reset Success Email
- Subject: "Password Reset Successful - B2B Billings"
- Confirmation of password change
- Security alert if not authorized

## Troubleshooting

### "No SMTP configuration found" Warning
This means SMTP credentials are not set in `.env`. The system will fallback to console logging in development mode.

### Email not sending
1. Check SMTP credentials in `.env`
2. Verify Gmail App Password (not regular password)
3. Check server logs for email errors
4. Ensure port 587 is not blocked by firewall

### OTP still showing on screen
This is intentional in development mode (`NODE_ENV=development`). In production, set:
```env
NODE_ENV=production
```

## Security Best Practices

1. **Never commit `.env` file** to version control
2. Use App Passwords, not your main email password
3. Rotate credentials regularly
4. Monitor email sending logs
5. Set up rate limiting for OTP requests

## Current Behavior

### With SMTP Configured:
- ✅ Email sent to user's inbox
- ✅ Development mode also shows OTP on screen for testing
- ✅ Professional HTML email template

### Without SMTP (Development):
- ⚠️ No email sent
- ✅ OTP logged to console
- ✅ OTP displayed on frontend (development mode)
- ✅ All OTP verification works normally

## Next Steps

1. **For Production**: Configure Gmail or professional email service
2. **For Development**: Current setup works - OTP shown on screen
3. **For Phone OTP**: Integrate SMS service like Twilio (future enhancement)

## Support

If you encounter issues:
1. Check server logs: `Backend/logs/`
2. Review email service code: `Backend/src/utils/emailService.js`
3. Verify `.env` configuration
4. Test with development console logs first

---

**Note**: The current setup works perfectly for development and testing. Configure SMTP only when deploying to production.
