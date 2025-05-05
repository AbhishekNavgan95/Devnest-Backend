const Profile = require("../models/Profile");
const User = require("../models/User");
const Course = require("../models/Course");
require("dotenv").config();
const {
  uploadImageTocloudinary,
  deleteAssetFromCloudinary,
} = require("../utils/imageUploader");
const RatingAndReview = require("../models/RatingAndReview");
const cron = require("node-cron");
const fs = require("fs");

cron.schedule("0 0 * * *", async () => {
  // Runs daily at 12:00 AM
  try {
    const expiryDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const usersToDelete = await User.find({
      markedForDeletionAt: { $lte: expiryDate },
    });

    for (let user of usersToDelete) {
      await Profile.findByIdAndDelete(user.additionalDetails);

      const userCourses = user.courses || [];
      for (let courseId of userCourses) {
        await Course.findByIdAndUpdate(courseId, {
          $pull: { studentsEnrolled: user._id },
        });
      }

      await RatingAndReview.deleteMany({ user: user._id });
      await User.findByIdAndDelete(user._id);

      console.log(`✅ Deleted user: ${user.email}`);
    }
  } catch (err) {
    console.error("Cron deletion job failed:", err);
  }
});

exports.updateProfile = async (req, res) => {
  try {
    // fetch data with user id
    const { dateOfBirth, about, contactNumber, gender, niche, experience } =
      req.body;

    const id = req.user.id;

    //  find profile
    const userDetails = await User.findById(id);
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    const profileDetails = await Profile.findById(
      userDetails.additionalDetails
    );

    // update profile
    profileDetails.DOB = dateOfBirth || profileDetails.DOB;
    profileDetails.about = about || profileDetails.about;
    profileDetails.gender = gender || profileDetails.gender;
    profileDetails.contactNumber =
      contactNumber || profileDetails.contactNumber;
    profileDetails.niche = niche || profileDetails.niche;
    profileDetails.experience = experience || profileDetails.experience;

    await profileDetails.save();

    const updatedUser = await User.findById(id)
      .populate("additionalDetails")
      .exec();

    // res
    return res.status(200).json({
      success: true,
      message: "Profile has been uptated successfully",
      data: updatedUser,
    });
  } catch (e) {
    console.log("Update profile error : ", e)

    return res.status(500).json({
      success: false,
      message: "something went wrong while updating the profile!",
    });
  }
};

// delete account handler
exports.deleteAccount = async (req, res) => {
  try {
    const id = req.user.id;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    // Mark for deletion after 7 days
    user.markedForDeletionAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your account has been scheduled for deletion in 7 days.",
    });
  } catch (e) {
    console.error("Delete (soft) error:", e);
    return res.status(500).json({
      success: false,
      message: "Could not schedule account deletion.",
    });
  }
};

// get all user details handler
exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id;

    const userDetails = await User.findById(id)
      .populate("additionalDetails courseProgress courses")
      .exec();

    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // remove account password from the res
    const user = userDetails.toObject();
    user.password = undefined;

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: user,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while fetching user details",
    });
  }
};

// get all enrolled courses
exports.getEnrolledCourses = async (req, res) => {
  try {
    const id = req.user.id;

    const userDetails = await User.findById(id)
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .populate("courseProgress")
      .exec();

    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: userDetails,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while fetching user details",
    });
  }
};

// upload disaply picture
exports.updateDisplayPicture = async (req, res) => {
  try {
    // get id
    const id = req.user.id;

    // find user with that id
    const user = await User.findById(id).populate('additionalDetails');
    const image = req.files?.image;
    const banner = req.files?.banner;

    // validate user
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (image) {
      // console.log("updating profile picture")
      // delete old image from cloudinary
      const oldImage = user.image?.publicId;
      if (oldImage) {
        await deleteAssetFromCloudinary(oldImage);
      }

      // upload file to cloud
      const uploadDetails = await uploadImageTocloudinary(
        image,
        process.env.FOLDER_NAME
      );

      user.image = {
        url: uploadDetails.secure_url,
        publicId: uploadDetails?.public_id,
      };

      // cleanup
      fs.unlinkSync(image.tempFilePath);
    }

    if (banner) {
      // console.log("updating banner picture")
      const oldBanner = user.banner?.publicId;
      if (oldBanner) {
        await deleteAssetFromCloudinary(oldBanner);
      }

      const uploadDetails = await uploadImageTocloudinary(
        banner,
        process.env.FOLDER_NAME
      );

      user.banner = {
        url: uploadDetails.secure_url,
        publicId: uploadDetails?.public_id,
      };

      // cleanup
      fs.unlinkSync(banner.tempFilePath);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Image uploaded to successfully",
      data: user,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "something went wrong while uploading the image",
    });
  }
};

exports.instructorDashboard = async (req, res) => {
  try {
    const { id } = req.user;

    const courseDetails = await Course.find({ instructor: id });

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "No courses fouund for this user",
      });
    }

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = course?.studentsEnrolled?.length;
      const totalAmountGenerated = totalStudentsEnrolled * course?.price;

      // create a new object with the additional fields
      const courseDataWithStats = {
        _id: course?._id,
        courseTitle: course?.courseTitle,
        courseDescription: course?.courseDescription,
        totalStudentsEnrolled,
        totalAmountGenerated,
      };

      return courseDataWithStats;
    });

    res.status(200).json({
      success: true,
      message: "Fetched Course Data Successfully",
      data: courseData,
    });
  } catch (e) {
    console.log("error : ", e);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
