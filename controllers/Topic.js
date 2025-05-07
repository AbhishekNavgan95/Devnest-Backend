const Category = require("../models/Category");
const Course = require("../models/Course");
const Topic = require("../models/Topic");
const mongoose = require("mongoose");

exports.createTopic = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const topicExist = await Topic.findOne({ name: name });
    if (topicExist) {
      return res.status(400).json({
        success: false,
        message: "Topic already exists",
      });
    }

    const newTopic = await Topic.create({
      name: name,
      category: categoryId,
    });

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        $push: {
          topics: newTopic._id,
        },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Topic created successfully",
      data: newTopic,
    });
  } catch (error) {
    console.error("Error while creating topic : ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating topic",
      error: error.message,
    });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const { topicId, name } = req.body;

    if (!topicId || !name) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const topicExist = await Topic.findById(topicId);
    if (!topicExist) {
      return res.status(400).json({
        success: false,
        message: "Topic does not exist",
      });
    }

    const updatedTopic = await Topic.findByIdAndUpdate(
      topicId,
      {
        name: name,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Topic updated successfully",
      data: updatedTopic,
    });
  } catch (error) {
    console.error("Error while updating topic : ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating topic",
      error: error.message,
    });
  }
};

exports.fetchAllTopics = async (req, res) => {
  try {
    const topics = await Topic.find({});
    return res.status(200).json({
      success: true,
      message: "Topics fetched successfully",
      data: topics,
    });
  } catch (error) {
    console.error("Error while fetching topics : ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching topics",
      error: error.message,
    });
  }
};

exports.getTopicCoursesAggregated = async (req, res) => {
  try {
    const { topicId } = req.params;

    if (!topicId || !mongoose.Types.ObjectId.isValid(topicId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid topicId is required." });
    }

    const topicObjectId = new mongoose.Types.ObjectId(topicId);

    const results = await Topic.aggregate([
      { $match: { _id: topicObjectId } },

      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "category",
          as: "allCourses",
        },
      },
      {
        $addFields: {
          allCourses: {
            $filter: {
              input: "$allCourses",
              as: "course",
              cond: { $eq: ["$$course.status", "Published"] },
            },
          },
        },
      },

      // Lookup for instructors
      {
        $lookup: {
          from: "users",
          localField: "allCourses.instructor",
          foreignField: "_id",
          as: "instructors",
        },
      },
      // Lookup for categories (topics)
      {
        $lookup: {
          from: "topics",
          localField: "allCourses.category",
          foreignField: "_id",
          as: "categories",
        },
      },

      // Replace instructor and category in each course
      {
        $addFields: {
          allCourses: {
            $map: {
              input: "$allCourses",
              as: "course",
              in: {
                $mergeObjects: [
                  "$$course",
                  {
                    instructor: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$instructors",
                            as: "inst",
                            cond: { $eq: ["$$inst._id", "$$course.instructor"] },
                          },
                        },
                        0,
                      ],
                    },
                    category: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$categories",
                            as: "cat",
                            cond: { $eq: ["$$cat._id", "$$course.category"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          instructors: 0,
          categories: 0,
        },
      },

      {
        $addFields: {
          topRatedCourses: {
            $slice: [
              {
                $sortArray: {
                  input: "$allCourses",
                  sortBy: { avgRating: -1 },
                },
              },
              6,
            ],
          },
        },
      },

      {
        $lookup: {
          from: "users",
          let: { topicName: "$name" },
          pipeline: [
            { $match: { accountType: "Instructor" } },
            {
              $lookup: {
                from: "profiles",
                localField: "additionalDetails",
                foreignField: "_id",
                as: "profile",
              },
            },
            { $unwind: "$profile" },
            {
              $match: {
                $expr: {
                  $in: ["$$topicName", "$profile.niche"],
                },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                email: 1,
                image: 1,
                courses: 1,
                "profile.niche": 1,
                "profile.followers": 1
              },
            },
          ],
          as: "instructorsWithSameNiche",
        },
      },
    ]);

    const responseData = results[0] || {
      _id: topicObjectId,
      name: "",
      allCourses: [],
      topRatedCourses: [],
      instructorsWithSameNiche: [],
    };

    // Always fetch 6 most recent published courses globally with populated instructor and category
    const globalRecentCourses = await Course.find({ status: "Published" })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("instructor", "firstName lastName email image")
      .populate("category", "name")
      .lean();

    responseData.recentCourses = globalRecentCourses;

    return res.status(200).json({
      success: true,
      message: "Aggregated topic data fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error in aggregation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
