// Import the required modules
const express = require("express");
const router = express.Router();

// Import the Controllers
const {
  createCourse,
  showAllCourses,
  getCourseDetails,
  getFullCourseDetails,
  editCourse,
  makeCoursePublic,
  getInstructorCourses,
  deleteCourse,
  searchCourse,
  getTrendingCourses,
  getInstructorDashboardData,
  getDevnestTrendingCourses,
  getInstructorDetails,
} = require("../controllers/Course");

const {
  showAllCategories,
  createCategory,
  // categoryPageDetails,
  // getAllCategoryAndCourses
} = require("../controllers/Category");

const {
  createSection,
  updateSection,
  deleteSection,
} = require("../controllers/Section");

const {
  createSubSection,
  updateSubSection,
  deleteSubSection,
} = require("../controllers/SubSection");

const {
  createRating,
  getAverageRating,
  getAllRating,
} = require("../controllers/RatingAndReview");

const { updateCourseProgress } = require("../controllers/courseProgress");

// Importing Middlewares
const {
  auth,
  isInstructor,
  isStudent,
  isAdmin,
} = require("../middlewares/auth");
const {
  getTopicCoursesAggregated,
  createTopic,
  updateTopic,
  fetchAllTopics,
} = require("../controllers/Topic");

// Course routes

// Courses can Only be Created by Instructors
router.post("/createCourse", auth, isInstructor, createCourse);

//Add a Section to a Course
router.post("/addSection", auth, isInstructor, createSection);

// Update a Section
router.put("/updateSection", auth, isInstructor, updateSection);

// Delete a Section
router.post("/deleteSection", auth, isInstructor, deleteSection);

// Add a Sub Section to a Section
router.post("/addSubSection", auth, isInstructor, createSubSection);

// Edit Sub Section
router.post("/updateSubSection", auth, isInstructor, updateSubSection);

// Delete Sub Section
router.post("/deleteSubSection", auth, isInstructor, deleteSubSection);

// Get all Registered Courses
router.get("/showAllCourses", showAllCourses);

// Get Details for a Specific Courses
router.get("/getCourseDetails/:courseId", getCourseDetails);

// Get Details for a Specific Courses
router.get("/getFullCourseDetails/:courseId", auth, getFullCourseDetails);

// Edit Course routes
router.post("/editCourse/:id", auth, isInstructor, editCourse);

// make course public
router.post("/editStatus", auth, isInstructor, makeCoursePublic);

// Get all Courses Under a Specific Instructor
router.get("/getInstructorCourses", auth, isInstructor, getInstructorCourses);

// Delete a Course
router.post("/deleteCourse", auth, isInstructor, deleteCourse);

// get trending courses
router.get("/getTrendingCourses", getTrendingCourses);

// get top selling courses
router.get("/getTopSellingCourses", getDevnestTrendingCourses);

// search course
router.post("/search", searchCourse);

// get instructor dashboard data
router.get('/InstructorDashboardData', auth, isInstructor, getInstructorDashboardData)

// get Instructor details
router.get('/instructorDetails/:instructorId', getInstructorDetails)

router.post("/updateCourseProgress", auth, isStudent, updateCourseProgress);

router.post("/createCategory", auth, isAdmin, createCategory);
router.post("/createTopic", auth, isAdmin, createTopic);
router.post("/updateTopic", auth, isAdmin, updateTopic);
router.get("/getAllTopics", fetchAllTopics);
router.get("/getAllCategories", showAllCategories);
router.get("/getTopicPageDetails/:topicId", getTopicCoursesAggregated);
// router.get("/getAllCategoryAndCourses",auth, isAdmin, getAllCategoryAndCourses)

// ********************************************************************************************************
//                                      Rating and Review
// ********************************************************************************************************
router.post("/createRating", auth, isStudent, createRating);
router.get("/getAverageRating", getAverageRating);
router.get("/getReviews", getAllRating);

module.exports = router;
