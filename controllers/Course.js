const Course = require("../models/Course");
const Category = require("../models/Category");
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
      courseId,
    } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course Id is required",
      });
    }

    // get instructor details for adding in course collection
    const userId = req.user.id;
    const thumbnail = req.files.thumbnail;
    const intro = req.files.intro;

    // get course details
    const courseDetails = await Course.findById(courseId);
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

    // validate topic
    const TopicDetails = await Topic.findById(topicId);
    if (!TopicDetails) {
      return res.status(404).json({
        success: false,
        message: "Category details not found",
      });
    }

    if (!TopicDetails.courses?.includes(courseDetails?._id)) {
      return res.status(404).json({
        success: false,
        message: "Course not found in the topic",
      });
    }

    // update thumbnail
    if (thumbnail) {
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
    if (intro) {
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
        topicId,
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
    if (description) courseDetails.description = description;
    if (whatYouWillLearn) courseDetails.whatYouWillLearn = whatYouWillLearn;
    if (whoThisCourseIsFor)
      courseDetails.whoThisCourseIsFor = whoThisCourseIsFor;
    if (requirements) courseDetails.requirements = requirements;
    if (whatsIncluded) courseDetails.whatsIncluded = whatsIncluded;
    if (price) courseDetails.price = price;
    if (actualPrice) courseDetails.actualPrice = actualPrice;
    if (tags) courseDetails.tags = tags;
    if (faqs) courseDetails.faqs = faqs;

    await courseDetails.save();

    if (updatedCourse) {
      return res.status(200).json({
        success: true,
        message: "Course Updated Successfully...",
        updatedCourse,
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
    const { courseId } = req.body;

    // find course details
    const courseDetails = await Course.findById(courseId)
      .populate({
        path: "instructor",
        select: "firstName lastName email image",
        populate: {
          path: "additionalDetails",
          select: "about",
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
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "description duraiton title",
        },
      })
      .exec();

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
    const { courseId } = req.body;
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

    let totalDurationInSeconds = 0;
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration);
        totalDurationInSeconds += timeDurationInSeconds;
      });
    });

    // const totalDuration = convertSecondsToDuration(totalDurationInSeconds);

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        // totalDuration,
        totalDurationInSeconds, // remove this and add above line
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