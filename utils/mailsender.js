const nodemailer = require("nodemailer");
require("dotenv").config();

const mailSender = async (email, title, body) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST ,
            auth: {
                user: process.env.MAIL_USER,
                pass : process.env.MAIL_PASSWORD,
            } 
        })

        let info = transporter.sendMail({
            from : "Devnest - by Abhishek Navgan", 
            to: `${email}`,
            subject: `${title}`,
            html: `${body}`
        })
        return info;
    }
    catch(e) {
        console.log(e?.message)
    }
}

module.exports = mailSender;