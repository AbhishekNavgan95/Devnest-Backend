const Section = require("../models/Section");
const Course = require("../models/Course");
const { deleteAssetFromCloudinary } = require("../utils/imageUploader");
const Subsection = require("../models/Subsection");

exports.createSection = async (req, res) => {
  try {
    // fetch data
    const { sectionName, courseId } = req.body;

    // validation
    if (!sectionName || !courseId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const validateCourse = await Course.findById(courseId);
    if (!validateCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // add section in db
    const newSection = await Section.create({ sectionName: sectionName });

    // update course with section ObjectID
    const updatedCourseDetails = await Course.findByIdAndUpdate(
      courseId,
      {
        $push: {
          courseContent: newSection._id,
        },
      },
      {
        new: true,
      }
    )
      .populate({
        path: "courseContent",
        model: "Section",
        populate: {
          path: "subSection",
          model: "SubSection",
        },
      })
      .exec();

    // res
    return res.status(200).json({
      success: true,
      message: "Section created successfully",
      data: newSection,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message:
        "something went wrong while creating the section, unable to create section",
    });
  }
};

// update section handler
exports.updateSection = async (req, res) => {
  try {
    // fetch data
    const { sectionName, sectionId } = req.body;

    // validate data
    if (!sectionName || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // update data in db
    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      { sectionName },
      { new: true }
    );

    // res
    return res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: updatedSection,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message:
        "something went wrong while updating the section, unable to create section",
    });
  }
};

// dekete section handler
exports.deleteSection = async (req, res) => {
  try {
    // fetch data
    const { sectionId, courseId } = req.body;

    // validate data
    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: "cannot delete section without id",
      });
    }

    // delete data in db
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    if (section.subSection.length > 0) {
      for (const subSectionId of section.subSection) {
        const subSection = await Subsection.findById(subSectionId);

        const deleteResponse = deleteAssetFromCloudinary(
          subSection.video.publicId
        );

        await Subsection.findByIdAndDelete(subSectionId);
      }
    }

    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    course.courseContent.pull(sectionId);
    const deltedSection = await Section.findByIdAndDelete(sectionId);

    await course.save();

    // res
    return res.status(200).json({
      success: true,
      message: "Section deleted successfully",
      data: deltedSection,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message:
        "something went wrong while deleting the section, unable to create section",
    });
  }
};
