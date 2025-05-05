const { userQueryEmailTamplate } = require("../mail/tamplates/userQueryEmail");
const mailSender = require("../utils/mailsender");

exports.contactUs = async (req, res) => {
  try {
    const { countryCode, email, name, message, phone, queryType } = req.body;

    if (!countryCode || !email || !name || !message || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const data = {
      name,
      message,
      phone: countryCode + phone,
      email,
      queryType,
    };

    const emailTamplate = userQueryEmailTamplate(data);
    const emailRes = await mailSender(
      process.env.ADMIN_EMAIL,
      "New User Query",
      emailTamplate
    );

    if (emailRes) {
      res.status(200).json({
        success: true,
        message: "Query Submitted Successfully",
      });
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while submitting the query",
    });
  }
};
