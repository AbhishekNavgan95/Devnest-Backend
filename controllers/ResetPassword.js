const User = require("../models/User");
const mailSender = require("../utils/mailsender");
const bcrypt = require("bcrypt");
const crypto = require("crypto")
const {resetPasswordEmail} = require("../mail/tamplates/resetPasswordEmail");

// resetPassword token
exports.resetPasswordToken = async (req, res) => {
  try {
    // get email from req body
    const { email } = req.body;

    // check if user exists for this email
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.json({
        success: false,
        message: "This email is not rugistered with us",
      });
    }

    // generate a token
    const token = crypto.randomUUID();

    // update user by adding token and expiration time
    const updatedDetails = await User.findOneAndUpdate(
      { email: email },
      { token: token, resetPasswordExpires: Date.now() + 5 * 60 * 1000 },
      { new: true }
    );

    // create Url
    const url = `${process.env.CORS_ORIGIN}/update-password/${token}`;

    const emailBody = resetPasswordEmail(url)
    // send mail containing url
    await mailSender(
      email,
      "Password reset link",
      emailBody
    );

    // res
    return res.json({
      success: true,
      message: "link to reset the password has been sent to your email",
    });
  } catch (e) {
    console.log("error while sending the reset password link email ", e);
    return res.status(500).json({
      success: false,
      message: "something went wrong while sending the reset password email",
    });
  }
};

// reset password
exports.resetPassword = async (req, res) => {
  try {
    // fetch data
    const { password, confirmPassword, token } = req.body;

    // validation
    if (password !== confirmPassword) {
      return res.json({
        success: false,
        message: "password do not match please try again!",
      });
    }

    // get user details by varifying the token
    const userDetails = await User.findOne({ token: token });

    // if no entry found - invalid token 
    if (!userDetails) {
        return res.json({
            success: false,
            message: "Token is invalid",
        });
    }
    
    // if token has been expired
    if (userDetails.resetPasswordExpires < Date.now()) {
      return res.json({
        success: false,
        message: "Token has been expired please regenerate new token",
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // update password in db
    await User.findOneAndUpdate(
      { token: token },
      { password: hashedPassword },
      { new: true }
    );

    // res
    return res.status(200).json({
        success: true,
        message: "password has been updated successfully",
      });
      
    } catch (e) {
        // failure occurred
        return res.status(500).json({
            success: false,
            message: "Something went wrong while setting up new password",
          });
  }
};
