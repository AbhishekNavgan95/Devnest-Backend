const ratingAndReview = require("../models/RatingAndReview");
const Course = require("../models/Course");
const RatingAndReview = require("../models/RatingAndReview");
const { default: mongoose } = require("mongoose");

// create Rating
exports.createRating = async (req, res) => {
  try {
    // get user id
    const userId = req.user.id;

    // fetch data
    const { rating, review, courseId } = req.body;

    // check if user is enrolled
    const courseDetails = await Course.findOne(
      {
        _id : courseId,
        studentsEnrolled: { $elemMatch: { $eq: userId } },
      }
    );

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "User is not entrolled in the course",
      });
    }

    // check for duplication of review by same user
    const alreadyReviewed = await RatingAndReview.findOne({
      user: userId,
      course: courseId,
    });

    if (alreadyReviewed) {
      return res.status(403).json({
        success: false,
        message: "Course is already reviewed by the user",
      });
    }

    // create review
    const ratingReview = await RatingAndReview.create({
      rating,
      review,
      course: courseId,
      user: userId,
    });

    // update review in course
    const updatedCourseDetails = await Course.findByIdAndUpdate(
      { _id: courseId },
      {
        $push: {
          ratingAndReviews: ratingReview._id,
        },
      },
      {
        new: true,
      }
    );

    // res
    return res.status(200).json({
      success: true,
      message: "Rating and review created successfully",
      ratingReview,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "something went wrong while creating rating and review",
    });
  }
};

// get average rating and review
exports.getAverageRating = async (req, res) => {
  try {
    // get course id
    const courseId = req.body.courseId;

    // calculate average rating
    const result = await RatingAndReview.aggregate([
      {
        $match: {
          course: new mongoose.Types.ObjectId(courseId),
        },
      },
      {
        $group: {
          _id: null,
          averageRating: {
            $avg: "$rating",
          },
        },
      },
    ]);

    // return rating
    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        message: "fetched average rating successfully",
        averageRating: result[0].averageRating,
      });
    }

    // if no rating available

    return res.status(200).json({
      success: true,
      message: "average rating is 0, no rating available",
      averageRating: 0,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "something went wrong fetching average rating",
      ratingReview,
    });
  }
};

// get All Ratings and reviews
exports.getAllRating = async (req, res) => {
  try {
    const allReviews = await RatingAndReview.find({})
      .sort({ rating: "desc" })
      .populate({
        path: "user",
        select: "firstName lastName email image",
      })
      .populate({
        path: "course",
        select: "courseTitle",
      })
      .exec();

    return res.status(200).json({
      success: true,
      message: "All reviews fetched successfully",
      data : allReviews,
    });
  } catch (e) {
    return res.status(500).json({
      success: true,
      message: "something went wrong while fetching all reviews",
      error: e?.message
    });
  }
};
