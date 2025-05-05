const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    whatYouWillLearn: [
      {
        type: String,
      },
    ],
    whoThisCourseIsFor: [
      {
        type: String,
      },
    ],
    requirements: [
      {
        type: String,
      },
    ],
    whatsIncluded: [
      {
        type: String,
      },
    ],
    courseContent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
      },
    ],
    faqs: [
      {
        question: {
          type: String,
        },
        answer: {
          type: String,
        },
      }
    ],
    ratingAndReviews: [
      {
        type: mongoose.Types.ObjectId,
        ref: "RatingAndReview",
      },
    ],
    price: {
      type: Number,
    },
    actualPrice: {
      type: Number,
    },
    thumbnail: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
    },
    introVideo: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
    },
    tags: [
      {
        type: String,
        required: true,
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
    },
    studentsEnrolled: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    status: {
      type: String,
      default: "Draft",
      enum: ["Draft", "Published"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);
