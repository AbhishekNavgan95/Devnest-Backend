const Course = require("../models/Course");
const Category = require("../models/Category");
const CourseSale = require("../models/courseSale");
const RatingAndReview = require("../models/RatingAndReview");
const User = require("../models/User");
const {
  uploadImageTocloudinary,
  deleteAssetFromCloudinary,
} = require("../utils/imageUploader");
const Section = require("../models/Section");
const SubSection = require("../models/Subsection");
const CourseProgress = require("../models/CourseProgress");
const Topic = require("../models/Topic");
const fs = require("fs");
const got = require("got");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// create Course
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      whatYouWillLearn,
      whoThisCourseIsFor,
      requirements,
      whatsIncluded,
      price,
      actualPrice,
      tags,
      topicId,
      faqs,
    } = req.body;

    // get instructor details for adding in course collection
    const userId = req.user.id;
    const thumbnail = req.files?.thumbnail;
    const intro = req.files?.intro;

    // validate date
    if (
      !title ||
      !description ||
      !whatYouWillLearn ||
      !whoThisCourseIsFor ||
      !requirements ||
      !whatsIncluded ||
      !price ||
      !actualPrice ||
      !tags ||
      !topicId ||
      !faqs ||
      !thumbnail ||
      !intro
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Parse arrays if received as strings
    const parsedWhatYouWillLearn = JSON.parse(whatYouWillLearn || "[]");
    const parsedWhoThisCourseIsFor = JSON.parse(whoThisCourseIsFor || "[]");
    const parsedRequirements = JSON.parse(requirements || "[]");
    const parsedWhatsIncluded = JSON.parse(whatsIncluded || "[]");
    const parsedTags = JSON.parse(tags || "[]");
    const parsedFaqs = JSON.parse(faqs || "[]");

    // console.log("title: ", title);
    // console.log("description: ", description);
    // console.log("whatYouWillLearn: ", parsedWhatYouWillLearn);
    // console.log("whoThisCourseIsFor: ", parsedWhoThisCourseIsFor);
    // console.log("requirements: ", parsedRequirements);
    // console.log("whatsIncluded: ", parsedWhatsIncluded);
    // console.log("price: ", price);
    // console.log("actualPrice: ", actualPrice);
    // console.log("tags: ", parsedTags);
    // console.log("topicId: ", topicId);
    // console.log("faqs: ", parsedFaqs);
    // console.log("thumbnail: ", req.files?.thumbnail);
    // console.log("intro: ", req.files?.intro);
    // console.log("instructor: ", req.user.id);

    const instructorDetails = await User.findById(userId);
    if (!instructorDetails) {
      return res.status(404).json({
        success: false,
        message: "Instructor details not found",
      });
    }

    const uploadedThumbnailDetails = await uploadImageTocloudinary(
      thumbnail,
      process.env.FOLDER_NAME
    );
    const uploadedIntroDetails = await uploadImageTocloudinary(
      intro,
      process.env.FOLDER_NAME
    );

    const thumbnailImage = {
      url: uploadedThumbnailDetails.secure_url,
      publicId: uploadedThumbnailDetails.public_id,
    };
    const introVideo = {
      url: uploadedIntroDetails.secure_url,
      publicId: uploadedIntroDetails.public_id,
    };

    const courseDetails = await Course.create({
      title,
      description,
      instructor: userId,
      whatYouWillLearn: parsedWhatYouWillLearn,
      whoThisCourseIsFor: parsedWhoThisCourseIsFor,
      requirements: parsedRequirements,
      whatsIncluded: parsedWhatsIncluded,
      price,
      actualPrice,
      faqs: parsedFaqs,
      thumbnail: thumbnailImage,
      introVideo,
      tags: parsedTags,
      category: topicId,
    });

    console.log("course details", courseDetails);

    const updatedTopic = await Topic.findByIdAndUpdate(
      topicId,
      {
        $push: {
          courses: courseDetails._id,
        },
      },
      {
        new: true,
      }
    );

    console.log("updated topic", updatedTopic);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          courses: courseDetails._id?.toString(),
        },
      },
      { new: true }
    );

    // unmounting files from local dir
    fs.unlinkSync(thumbnail.tempFilePath);
    fs.unlinkSync(intro.tempFilePath);

    return res.status(200).json({
      success: true,
      message: "Course created successfully",
      data: courseDetails,
    });
  } catch (e) {
    console.log("error occurred while creating new course ", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating new course",
    });
  }
};

// edit course
exports.editCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      whatYouWillLearn,
      whoThisCourseIsFor,
      requirements,
      whatsIncluded,
      price,
      faqs,
      actualPrice,
      tags,
      topicId,
    } = req.body;
    const { id: courseId } = req.params;
    console.log("course id : ", courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course Id is required",
      });
    }

    // get instructor details for adding in course collection
    const userId = req.user.id;
    const thumbnail = req.files?.thumbnail;
    const intro = req.files?.intro;

    // Parse arrays if received as strings
    const parsedWhatYouWillLearn = JSON.parse(whatYouWillLearn || "[]");
    const parsedWhoThisCourseIsFor = JSON.parse(whoThisCourseIsFor || "[]");
    const parsedRequirements = JSON.parse(requirements || "[]");
    const parsedWhatsIncluded = JSON.parse(whatsIncluded || "[]");
    const parsedTags = JSON.parse(tags || "[]");
    const parsedFaqs = JSON.parse(faqs || "[]");

    // get course details
    const courseDetails = await Course.findById(courseId).populate([
      {
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "title timeDuration description isPreviewable video",
        },
      },
    ]);
    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Course details not found",
      });
    }

    // validate Instructor
    const instructorDetails = await User.findById(userId);
    if (!instructorDetails) {
      return res.status(404).json({
        success: false,
        message: "Instructor details not found",
      });
    }

    if (courseDetails.instructor.toString() !== userId) {
      return res.status(401).json({
        success: false,
        message: "You are not authorized to edit this course",
      });
    }

    // update thumbnail
    if (thumbnail && typeof thumbnail !== "string") {
      console.log("➡️➡️➡️➡️ updating thumbnail ");

      const deleteResponse = await deleteAssetFromCloudinary(
        courseDetails?.thumbnail?.publicId
      );

      const thumbnailImage = await uploadImageTocloudinary(
        thumbnail,
        process.env.FOLDER_NAME
      );

      courseDetails.thumbnail = {
        url: thumbnailImage.secure_url,
        publicId: thumbnailImage.public_id,
      };

      fs.unlinkSync(thumbnail.tempFilePath);
    }

    // updateIntroVideo
    if (intro && typeof intro !== "string") {
      console.log("➡️➡️➡️➡️ updating intro ");
      const deleteResponse = await deleteAssetFromCloudinary(
        courseDetails?.intro?.publicId
      );

      const introVideo = await uploadImageTocloudinary(
        intro,
        process.env.FOLDER_NAME
      );

      courseDetails.introVideo = {
        url: introVideo.secure_url,
        publicId: introVideo.public_id,
      };

      fs.unlinkSync(intro.tempFilePath);
    }

    if (topicId) {
      const updatedTopic = await Topic.findByIdAndUpdate(
        courseDetails?.category,
        {
          $pull: {
            courses: courseDetails._id,
          },
        },
        {
          new: true,
        }
      );

      const updatedTopic2 = await Topic.findByIdAndUpdate(
        topicId,
        {
          $push: {
            courses: courseDetails._id,
          },
        },
        {
          new: true,
        }
      );
    }

    if (title) courseDetails.title = title;
    if (topicId) courseDetails.category = topicId;
    if (description) courseDetails.description = description;
    if (whatYouWillLearn)
      courseDetails.whatYouWillLearn = parsedWhatYouWillLearn;
    if (whoThisCourseIsFor)
      courseDetails.whoThisCourseIsFor = parsedWhoThisCourseIsFor;
    if (requirements) courseDetails.requirements = parsedRequirements;
    if (whatsIncluded) courseDetails.whatsIncluded = parsedWhatsIncluded;
    if (price) courseDetails.price = price;
    if (actualPrice) courseDetails.actualPrice = actualPrice;
    if (tags) courseDetails.tags = parsedTags;
    if (faqs) courseDetails.faqs = parsedFaqs;

    await courseDetails.save();

    if (courseDetails) {
      return res.status(200).json({
        success: true,
        message: "Course Updated Successfully...",
        data: courseDetails,
      });
    }
  } catch (e) {
    console.log("error : ", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the course!!!",
      error: e?.message,
    });
  }
};

// make course public
exports.makeCoursePublic = async (req, res) => {
  try {
    const { courseId, status } = req.body;

    // validate data
    if (!courseId || !status) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // search course
    const courseDetails = await Course.findByIdAndUpdate(
      courseId,
      { status: status },
      { new: true }
    )
      .populate({
        path: "instructor",
        select: "firstName lastName email image",
        populate: {
          select: "contactNumber",
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "course updated successfully",
      data: courseDetails,
    });
  } catch (e) {
    console.log("Error : ", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the course status",
    });
  }
};

// get All courses
exports.showAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find({})
      .populate({
        path: "instructor",
        select: "firstName lastName email image",
        populate: {
          select: "contactNumber",
          path: "additionalDetails",
        },
      })
      .exec();
    return res.status(200).json({
      success: true,
      message: "data for all courses is fetched successfull",
      data: allCourses,
    });
  } catch (e) {
    console.log("error occurred while getting all courses ", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching all courses",
    });
  }
};

// get course details
exports.getCourseDetails = async (req, res) => {
  try {
    // get id
    const { courseId } = req.params;

    // find course details
    const courseDetails = await Course.findById(courseId)
      .populate({
        path: "instructor",
        select: "firstName lastName email image",
        populate: {
          path: "additionalDetails",
          select: "about niche followers experience",
        },
      })
      .populate({
        path: "category",
        select: "name description",
      })
      .populate({
        path: "ratingAndReviews",
        populate: {
          path: "user",
          select: "firstName image lastName",
        },
      })
      .populate("studentsEnrolled")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "description timeDuration title isPreviewable video",
        },
      })
      .lean()
      .exec();

    if (courseDetails?.status !== "Published") {
      return res.status(400).json({
        success: false,
        message: "Course is not published yet",
      });
    }

    courseDetails.courseContent?.forEach((section) => {
      section?.subSection?.forEach((lecture) => {
        if (!lecture?.isPreviewable) {
          lecture.video = undefined;
        }
      });
    });

    // validation
    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: "Could not find the course with the course id " + courseId,
      });
    }

    // res
    return res.status(200).json({
      success: true,
      message: "Course found",
      data: courseDetails,
    });
  } catch (e) {
    console.log("Something went wrong while getting all courses ", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while getting all courses",
    });
  }
};

// get list of course for a given instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    // get the instructor id
    const instructorId = req?.user?.id;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: "Instructor id is required",
      });
    }

    // find all courses for this instructor
    const instructorCourses = await Course.find({
      instructor: instructorId,
    })
      .populate({
        path: "instructor",
        select: "firstName lastName email image",
        populate: {
          select: "contactNumber",
          path: "additionalDetails",
        },
      })
      .populate({
        path: "category",
        select: "_id name",
      })
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!instructorCourses) {
      res.status(404).json({
        success: false,
        message: "No courses found for specified instructor",
      });
    }

    res.status(200).json({
      success: true,
      message: "Counses fetched Successfully",
      data: instructorCourses,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching the courses",
    });
  }
};

//Delete Course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    console.log("courseId : ", courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Unenroll students from the course
    const studentsEnrolled = course.studentsEnrolled;
    for (const studentId of studentsEnrolled) {
      await User.findByIdAndUpdate(studentId, {
        $pull: { courses: courseId },
      });
    }

    // Delete sections and sub-sections
    const courseSections = course.courseContent;
    for (const sectionId of courseSections) {
      // Delete sub-sections of the section
      const section = await Section.findById(sectionId);
      if (section) {
        const subSections = section.subSection;
        for (const subSectionId of subSections) {
          await SubSection.findByIdAndDelete(subSectionId);
        }
      }

      // Delete the section
      await Section.findByIdAndDelete(sectionId);
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId);

    //Delete course id from Category
    await Category.findByIdAndUpdate(course.category._id, {
      $pull: { courses: courseId },
    });

    //Delete course id from Instructor
    await User.findByIdAndUpdate(course.instructor._id, {
      $pull: { courses: courseId },
    });

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error?.message,
    });
  }
};

//get full course details
exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    if (!courseId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Course Id is required",
      });
    }

    const courseDetails = await Course.findById({ _id: courseId })
      .populate({
        path: "instructor",
        select: "firstName lastName email image",
        populate: {
          select: "contactNumber",
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    const courseProgressCount = await CourseProgress.findOne({
      courseId: courseId,
      userId: userId,
    });

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      });
    }

    // let totalDurationInSeconds = 0;
    // courseDetails.courseContent.forEach((content) => {
    //   content.subSection.forEach((subSection) => {
    //     const timeDurationInSeconds = parseInt(subSection.timeDuration);
    //     totalDurationInSeconds += timeDurationInSeconds;
    //   });
    // });

    // const totalDuration = convertSecondsToDuration(totalDurationInSeconds);

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        // totalDuration,
        // totalDurationInSeconds, // remove this and add above line
        completedVideos: courseProgressCount?.completedVideos
          ? courseProgressCount?.completedVideos
          : [],
      },
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// search course
exports.searchCourse = async (req, res) => {
  try {
    const { searchParam } = req.body;

    const courses = await Course.find({
      $or: [
        { courseTitle: { $regex: searchParam, $options: "i" } },
        // {courseDescription : {$regex : searchParam , $options : "i"}}, // gives lots of unnecessory courses by matching words from description
        { tag: { $regex: searchParam, $options: "i" } },
      ],
    });

    const topics = await Topic.find({
      name: { $regex: searchParam, $options: "i" },
    });

    if (!courses || topics) {
      return res.status(404).json({
        success: false,
        message: "No results found",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Fetched Courses successfully",
      data: {
        courses,
        topics,
      },
    });
  } catch (e) {
    console.log("error : ", e);
    res.status(500).json({
      success: false,
      message: "Could not find any courses",
    });
  }
};

// getTrending courses for home screen grouped by topics
exports.getTrendingCourses = async (req, res) => {
  try {
    const categories = await Category.find({})
      .populate({
        path: "topics",
        populate: {
          path: "courses",
          model: "Course",
          populate: {
            path: "instructor",
            select: "name", // populate instructor info
          },
        },
      })
      .lean(); // Optional: convert to plain JS objects

    const result = [];

    for (const category of categories) {
      let allCourses = [];

      for (const topic of category.topics) {
        if (topic.courses && Array.isArray(topic.courses)) {
          allCourses = [...allCourses, ...topic.courses];
        }
      }

      // Remove duplicates if any course is in multiple topics
      const uniqueCourses = Array.from(
        new Map(
          allCourses.map((course) => [course._id.toString(), course])
        ).values()
      );

      // Sort by number of enrolled students (descending)
      const trendingCourses = uniqueCourses
        .sort((a, b) => b.studentsEnrolled.length - a.studentsEnrolled.length)
        .slice(0, 6);

      result.push({
        categoryId: category._id,
        categoryName: category.name,
        trendingCourses,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trending courses fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getTrendingCoursesByCategory:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trending courses",
      error: error.message,
    });
  }
};

// top selling courses
exports.getDevnestTrendingCourses = async (req, res) => {
  try {
    const trendingCourses = await Course.find({ status: "Published" })
      .populate({
        path: "instructor",
        select: "firstName lastName email image",
      })
      .populate({
        path: "category",
        select: "name",
      })
      .populate("ratingAndReviews")
      .sort({ studentsEnrolled: -1 }) // Sort by number of enrolled students (array length)
      .limit(6)
      .lean(); // Optional: better performance if no further mongoose manipulation is needed

    return res.status(200).json({
      success: true,
      message: "Trending courses on Devnest fetched successfully",
      data: trendingCourses,
    });
  } catch (error) {
    console.error("Error in getDevnestTrendingCourses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trending courses",
      error: error.message,
    });
  }
};

// stream video
exports.streamSignedVideo = async (req, res) => {
  try {
    const { publicId } = req.params;
    const range = req.headers.range;

    if (!range) {
      return res.status(400).send("Requires Range header");
    }

    // Create signed Cloudinary URL
    const videoUrl = cloudinary.url("Devnest/" + publicId, {
      resource_type: "video",
      secure: true,
      sign_url: true,
    });

    // Stream video directly from Cloudinary with Range header
    const stream = got.stream(videoUrl, {
      headers: {
        Range: range,
      },
    });

    stream.on("response", (cloudRes) => {
      // Pass Cloudinary headers to client
      res.writeHead(cloudRes.statusCode, {
        "Content-Range": cloudRes.headers["content-range"],
        "Accept-Ranges": cloudRes.headers["accept-ranges"] || "bytes",
        "Content-Length": cloudRes.headers["content-length"],
        "Content-Type": "video/mp4",
      });
    });

    stream.on("error", (err) => {
      console.error("Cloudinary stream error:", err.message);
      res.status(500).send("Error streaming video");
    });

    stream.pipe(res);
  } catch (error) {
    console.error("Video stream error:", error.message);
    res.status(500).send("Server error");
  }
};

// instructor dashboard
exports.getInstructorDashboardData = async (req, res) => {
  try {
    const instructorId = req.user.id;

    // 1. Fetch all courses by instructor
    const courses = await Course.find({ instructor: instructorId })
      .populate("studentsEnrolled")
      .populate("ratingAndReviews");

    // --------------------------
    // 1. Summary Cards
    // --------------------------
    const totalCourses = courses?.length;
    const totalStudents = courses?.reduce(
      (acc, course) => acc + course.studentsEnrolled?.length,
      0
    );

    const courseIds = courses.map((course) => course._id);

    const totalReviews = await RatingAndReview.countDocuments({
      course: { $in: courseIds },
    });

    const allRatings = await RatingAndReview.find({
      course: { $in: courseIds },
    }).select("rating");
    const averageRating =
      allRatings?.length > 0
        ? (
            allRatings.reduce((acc, obj) => acc + obj.rating, 0) /
            allRatings?.length
          ).toFixed(2)
        : 0;

    const totalRevenueData = await CourseSale.aggregate([
      { $match: { instructor: instructorId } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);

    const totalRevenue = totalRevenueData[0]?.totalRevenue || 0;

    // --------------------------
    // 2. Revenue Analytics (last 30 days)
    // --------------------------
    const revenueAnalytics = await CourseSale.aggregate([
      {
        $match: {
          instructor: instructorId,
          soldAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$soldAt" },
            month: { $month: "$soldAt" },
            year: { $year: "$soldAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
        },
      },
    ]);

    // --------------------------
    // 3. Course-wise Engagement
    // --------------------------
    const courseEngagement = await Promise.all(
      courses.map(async (course) => {
        const revenue = await CourseSale.aggregate([
          { $match: { course: course._id, instructor: instructorId } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        return {
          courseId: course._id,
          title: course.title,
          enrollments: course.studentsEnrolled?.length,
          reviews: course.ratingAndReviews?.length,
          avgRating:
            course.ratingAndReviews.reduce((acc, r) => acc + r.rating, 0) /
            (course.ratingAndReviews?.length || 1),
          revenue: revenue[0]?.total || 0,
        };
      })
    );

    // --------------------------
    // 5. Reviews & Ratings
    // --------------------------
    const reviews = await RatingAndReview.find({ course: { $in: courseIds } })
      .populate("user", "firstName lastName")
      .populate("course", "title")
      .sort({ _id: -1 })
      .limit(10);

    const starBreakdown = await RatingAndReview.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
    ]);

    // --------------------------
    // 6. Course Status Donut Chart
    // --------------------------
    const statusData = await Course.aggregate([
      {
        $match: { instructor: instructorId },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // --------------------------
    // 7. Sales & Orders Table
    // --------------------------
    const sales = await CourseSale.find({ instructor: instructorId })
      .populate("student", "firstName lastName email")
      .populate("course", "title")
      .sort({ soldAt: -1 })
      .limit(20);

    // --------------------------
    // 8. Drop-off / Feedback (CourseProgress %)
    // --------------------------
    const dropOffData = await CourseProgress.find({
      courseId: { $in: courseIds },
    })
      .populate("userId", "firstName lastName")
      .populate("courseId", "title");

    const dropOffAnalysis = dropOffData.map((entry) => ({
      course: entry.courseId.title,
      student: `${entry.userId.firstName} ${entry.userId.lastName}`,
      progressPercent: Math.round(
        (entry.completedVideos?.length / entry.totalVideos?.length) * 100
      ),
    }));

    // --------------------------
    // Final Response
    // --------------------------
    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCourses,
          totalStudents,
          totalReviews,
          averageRating,
          totalRevenue,
        },
        revenueAnalytics,
        courseEngagement,
        reviews,
        starBreakdown,
        courseStatus: statusData,
        sales,
        dropOff: dropOffAnalysis,
      },
      message: "fetched data successfully",
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};
