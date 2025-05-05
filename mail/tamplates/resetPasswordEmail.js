exports.resetPasswordEmail = (url) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Password Reset Link</title>
<style>
    body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        padding: 20px;
        text-align: center;
    }
    
    #emailContainer {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.1);
        text-align: center;
    }
    
    h2 {
        color: #333333;
    }
    
    p {
        font-size: 16px;
        color: #333333;
    }
    
    a {
        color: #007bff;
        text-decoration: none;
    }
</style>
</head>
<body>

<div id="emailContainer">
    <h2>Password Reset Link - Action Required</h2>
    
    <p>Dear User,</p>
    
    <p>We've received your request to reset your password. To proceed, click the link below:</p>
    
    <p><a href="${url}">Reset Password</a></p>
    
    <p>This link will expire after a certain period of time for security reasons. If you didn't request this reset, please ignore this email.</p>
    
    <p>For further assistance, contact our support team at <a href="mailto:devnest@help.com">devnest@help.com</a>.</p>
</div>

</body>
</html>

`;
