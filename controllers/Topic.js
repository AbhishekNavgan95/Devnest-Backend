const Category = require("../models/Category");
const Topic = require("../models/Topic");

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
    const { topicId } = req.body;

    if (!topicId || !mongoose.Types.ObjectId.isValid(topicId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid topicId is required." });
    }

    const topicObjectId = new mongoose.Types.ObjectId(topicId);

    const results = await Topic.aggregate([
      { $match: { _id: topicObjectId } },

      // Lookup all courses in this topic
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

      // Unwind for further operations (like rating)
      { $unwind: "$allCourses" },

      // Lookup ratingAndReviews
      {
        $lookup: {
          from: "ratingandreviews",
          localField: "allCourses.ratingAndReviews",
          foreignField: "_id",
          as: "allCourses.ratings",
        },
      },

      // Calculate average rating for each course
      {
        $addFields: {
          "allCourses.avgRating": {
            $cond: [
              { $gt: [{ $size: "$allCourses.ratings" }, 0] },
              { $avg: "$allCourses.ratings.rating" },
              0,
            ],
          },
        },
      },

      // Group back to Topic level
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          allCourses: { $push: "$allCourses" },
        },
      },

      // Sort and slice top rated
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
          recentCourses: {
            $slice: [
              {
                $sortArray: {
                  input: "$allCourses",
                  sortBy: { createdAt: -1 },
                },
              },
              6,
            ],
          },
        },
      },

      // Get instructors with this topic in niche
      {
        $lookup: {
          from: "users",
          let: { topicId: "$_id" },
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
                  $in: ["$$topicId", "$profile.niche"],
                },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                email: 1,
                image: 1,
                "profile.niche": 1,
              },
            },
          ],
          as: "instructorsWithSameNiche",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Aggregated topic data fetched successfully",
      data: results[0] || {},
    });
  } catch (error) {
    console.error("Error in aggregation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
