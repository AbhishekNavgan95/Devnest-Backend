const User = require("../models/User");
const Otp = require("../models/Otp");
const Profile = require("../models/Profile");
const optGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const mailSender = require("../utils/mailsender");
const updatePasswordEmailBody = require("../mail/tamplates/passwordUpdate");
const { passwordUpdated } = require("../mail/tamplates/passwordUpdate");
const { verifyAccountEmailBody } = require("../mail/tamplates/verifyAccount");

// sendOTP
exports.sendOTP = async (req, res) => {
  try {
    // fetch email from req body
    const { email } = req.body;

    // check if user already exist
    const checkUserPresent = await User.findOne({ email: email });

    // if user exist
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: "User already rugistered",
      });
    }

    // generaate OTP
    const otp = optGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    // check for unique otp
    let result = await Otp.findOne({ otp: otp });

    while (result) {
      otp = optGenerator(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      result = await Otp.findOne({ otp: otp });
    }

    const otpPayload = {
      email,
      otp,
    };

    // create a entry in db for OTP
    const otpBody = await Otp.create(otpPayload);

    // return response successfull
    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otp,
    });
  } catch (e) {
    console.log("error in generating otp", e);
    return res.status(500).json({
      success: false,
      message: "error occurred while generating otp : " + e.message,
    });
  }
};

// sign up
exports.signUp = async (req, res) => {
  try {
    // fetch data from req body
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      adminSecret,
      // contactNumber,
      // otp,
    } = req.body;

    // validate data
    if (
      !firstName ||
      !lastName ||
      !accountType ||
      !email ||
      !password ||
      !confirmPassword
      // !contactNumber ||
      // !otp
    ) {
      return res.status(403).json({
        success: false,
        message:
          "not all fields are filled, Kindly fill all the fields and try again!",
      });
    }

    // match both passwords
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "passwords do not match, please try again!",
      });
    }

    if (adminSecret !== process.env.ADMIN_SECRET && accountType === "Admin") {
      return res.status(400).json({
        success: false,
        message: "Admin secret is not correct, please try again!",
      });
    }

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.verified) {
        const verificationToken = jwt.sign(
          { email },
          process.env.VERIFICATION_TOKEN_SECRET,
          { expiresIn: "1h" }
        );

        existingUser.verificationToken = verificationToken;
        await existingUser.save();

        const mailResponse = await mailSender(
          email,
          "Verify your account to get started with Devnest.",
          verifyAccountEmailBody(
            email,
            firstName + " " + lastName,
            process.env.CORS_ORIGIN + `/verify/${verificationToken}`
          )
        );

        return res.status(400).json({
          success: false,
          message:
            "User is already rugistered, a new varification email has been sent to your email",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "User is already registered, please sign in to continue.",
        });
      }
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = jwt.sign(
      { email },
      process.env.VERIFICATION_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    // create entry in DB
    const profileDetails = await Profile.create({
      gender: null,
      DOB: null,
      about: null,
      contactNumber: null,
    });

    const user = await User.create({
      firstName,
      lastName,
      email,
      image: {
        url: `https://ui-avatars.com/api/?name=${firstName}+${lastName}`,
        publicId: "",
      },
      // contactNumber,
      password: hashedPassword,
      verificationToken,
      accountType,
      additionalDetails: profileDetails._id,
    });

    const mailResponse = await mailSender(
      email,
      "Verify your account to get started with Devnest.",
      verifyAccountEmailBody(
        email,
        firstName + " " + lastName,
        process.env.CORS_ORIGIN + `/verify/${verificationToken}`
      )
    );

    // return res
    return res.status(200).json({
      success: true,
      message: "User is registered successfully",
      data: user,
    });
  } catch (e) {
    console.log("error occurred while creating new user entry", e);
    res.status(500).json({
      success: false,
      message: "User cannot be registered, please try again!",
    });
  }
};

exports.verifyAccount = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required.",
      });
    }

    const decoded = jwt.verify(token, process.env.VERIFICATION_TOKEN_SECRET);

    const user = await User.findOneAndUpdate(
      { email: decoded.email },
      { verified: true, verificationToken: "" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account verified successfully.",
      user,
    });
  } catch (err) {
    console.error("Account verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
};

// login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Check if user exists
    const tempUser = await User.findOne({ email }).populate(
      "additionalDetails courses"
    );

    if (!tempUser) {
      return res.status(401).json({
        success: false,
        message: "User is not registered. Please sign up.",
      });
    }

    const user = tempUser.toObject();

    // Match password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password.",
      });
    }

    if (!user.verified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your account.",
      });
    }

    if (user?.markedForDeletionAt) {
      return res.status(401).json({
        success: false,
        message: "Your account has been marked for deletion. contact admin for more info",
      });
    }

    // Create payload and sign a single token
    const payload = {
      id: user._id,
      email: user.email,
      accountType: user.accountType,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d", // or any duration you prefer
    });

    // Remove sensitive fields
    user.password = undefined;
    user.verificationToken = undefined;

    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      data: user,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
};

// logout
exports.logout = async (req, res) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
};

// Controller for Changing Password
exports.changePassword = async (req, res) => {
  try {
    // get user id
    const id = req.user.id;
    // Get old password, new password, and confirm new password from req.body
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "The password and confirm password do not match",
      });
    }

    // Get user data from db
    const userDetails = await User.findById(id);

    // validate user
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate old password
    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      userDetails.password
    );

    // If old password does not match, return a 401 (Unauthorized) error
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "The password is incorrect" });
    }

    // Update password
    const encryptedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUserDetails = await User.findByIdAndUpdate(
      id,
      { password: encryptedPassword },
      { new: true }
    );

    // Send notification email
    try {
      const mailBody = passwordUpdated(
        updatedUserDetails.email,
        `${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
      );

      const emailResponse = await mailSender(
        updatedUserDetails.email,
        "Password for your account has been updated",
        mailBody
      );
    } catch (error) {
      // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
      console.error("Error occurred while sending email:", error);
      return res.status(500).json({
        success: false,
        message: "Error occurred while sending email",
        error: error.message,
      });
    }

    // Return success response
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    // If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
    console.error("Error occurred while updating password:", error);
    return res.status(500).json({
      success: false,
      message: "Error occurred while updating password",
      error: error.message,
    });
  }
};
