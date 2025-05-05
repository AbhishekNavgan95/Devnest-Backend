exports.verifyAccountEmailBody = (email, name, verificationLink) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Verify Your DevNest Account</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <h2 style="color: #1e293b;">Welcome to DevNest, ${name}!</h2>
      <p style="font-size: 16px; color: #334155;">
        Thanks for joining DevNest — your new hub for developers, creators, and innovators. We’re excited to have you in the community!
      </p>
      <p style="font-size: 16px; color: #334155;">
        Please confirm your email address to activate your account and start exploring the platform.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" target="_blank" style="background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Verify My Email
        </a>
      </div>
      <p style="font-size: 14px; color: #64748b;">
        If you didn’t create a DevNest account, no worries — just ignore this message.
      </p>
      <p style="font-size: 14px; color: #64748b;">– The DevNest Team</p>
    </div>
  </body>
  </html>
`;
