exports.userQueryEmailTamplate = (data) => (
    `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New User Requested to Connect</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            text-align: center;
        }
        h2 {
          text-align: center;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
        }
        ul {
          text-align: left;
        }
        h2 {
            color: #333;
        }
        p {
            color: #666;
            text-align: center;
        }
    </style>
    </head>
    <body>
    <div class="container">
        <h2>New User Query Recieved</h2>
        <p>Dear Admin Team,</p>
        <p>A new user has submitted a query via our website's contact form. Please find the details below:</p>
        <ul>
            <li>Name: ${data.firstName} ${data.lastName}</li>
            <li>Email: ${data.email}</li>
            <li>Phone: ${data.phone}</li>
            <li>Query: ${data.queryType}</li>
            <li>Message: ${data.message}</li>
        </ul>
        <p>Please take appropriate action to address the user's inquiry promptly.</p>
        <p>Thank you.</p>
    </div>
    </body>
    </html>
    `
)