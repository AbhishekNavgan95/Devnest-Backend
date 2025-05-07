const SubSection = require("../models/Subsection");
const Section = require("../models/Section");
const {
  uploadImageTocloudinary,
  deleteAssetFromCloudinary,
} = require("../utils/imageUploader");
require("dotenv").config();
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// create Subsection
exports.createSubSection = async (req, res) => {
  try {
    const { sectionId, title, description } = req.body;
    const video = req.files.video;
    const isPreviewable = req.body.isPreviewable === "true"; // strict check

    // console.log("sectionId : ", sectionId);
    // console.log("title : ", title);
    // console.log("description : ", description);
    console.log("isPreviewable : ", isPreviewable);
    // console.log("video : ", video);

    // Validate
    if (!sectionId || !title || !description || !video) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const ifsection = await Section.findById(sectionId);
    if (!ifsection) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    // Get temp file path directly from fileUpload
    const tempFilePath = video.tempFilePath;

    // Get video duration
    const getVideoDuration = () =>
      new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata.format.duration); // in seconds
        });
      });

    const durationInSeconds = await getVideoDuration();
    const formattedDuration = `${Math.floor(
      durationInSeconds / 60
    )}:${Math.floor(durationInSeconds % 60)
      .toString()
      .padStart(2, "0")}`; // mm:ss format

    // Upload to Cloudinary
    const uploadDetils = await uploadImageTocloudinary(
      video,
      process.env.FOLDER_NAME
    );

    // Delete local file after upload
    fs.unlinkSync(tempFilePath);

    if (!uploadDetils) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong while uploading the file",
      });
    }

    const videoData = {
      url: !Boolean(isPreviewable) ? "" : uploadDetils.secure_url,
      publicId: uploadDetils.public_id,
    };

    const subSectionDetails = await SubSection.create({
      title: title,
      timeDuration: formattedDuration,
      description: description,
      isPreviewable: isPreviewable,
      video: videoData,
    });

    const updatedSection = await Section.findByIdAndUpdate(
      { _id: sectionId },
      {
        $push: {
          subSection: subSectionDetails._id,
        },
      },
      { new: true }
    )
      .populate("subSection")
      .exec();

    return res.status(200).json({
      success: true,
      message: "Subsection created successfully",
      data: subSectionDetails,
    });
  } catch (e) {
    console.error("Error in createSubSection:", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the subsection",
    });
  }
};

exports.updateSubSection = async (req, res) => {
  try {
    const {
      subSectionId,
      title,
      description,
      // isPreviewable = false,
    } = req.body;

    const video = req.files?.video;
    const isPreviewable = req.body.isPreviewable === "true";

    const subSection = await SubSection.findById(subSectionId);
    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "Subsection not found",
      });
    }

    if (video) {
      // Delete old video from Cloudinary
      await deleteAssetFromCloudinary(subSection.video.publicId);

      // Save to temp
      const tempFilePath = video.tempFilePath;

      // Calculate new duration
      const durationInSeconds = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata.format.duration);
        });
      });
      const formattedDuration = `${Math.floor(
        durationInSeconds / 60
      )}:${Math.floor(durationInSeconds % 60)
        .toString()
        .padStart(2, "0")}`;

      // Upload new video to Cloudinary
      const uploadDetails = await uploadImageTocloudinary(
        video,
        process.env.FOLDER_NAME
      );

      fs.unlinkSync(tempFilePath); // Cleanup

      if (!uploadDetails) {
        return res.status(500).json({
          success: false,
          message: "Something went wrong while uploading the file",
        });
      }

      subSection.video = {
        url: isPreviewable ? uploadDetails.secure_url : "",
        publicId: uploadDetails.public_id,
      };

      subSection.timeDuration = formattedDuration;
    }

    if (title) subSection.title = title;
    if (description) subSection.description = description;
    subSection.isPreviewable = isPreviewable;

    // Save updates
    await subSection.save();

    return res.status(200).json({
      success: true,
      message: "Subsection updated successfully",
      data: subSection,
    });
  } catch (e) {
    console.log("Error while updating the subSection", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the subsection",
    });
  }
};

exports.deleteSubSection = async (req, res) => {
  try {
    const { subSectionId, sectionId } = req.body;

    if (!subSectionId || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const isSubSectionExist = await SubSection.findById(subSectionId);
    const isSectionExist = await Section.findById(sectionId);

    if (!isSubSectionExist) {
      return res.status(404).json({
        success: false,
        message: "Subsection didn't exist",
      });
    }

    if (!isSectionExist) {
      return res.status(404).json({
        success: false,
        message: "Section didn't exist",
      });
    }

    const deleteResponse = deleteAssetFromCloudinary(
      isSubSectionExist.video.publicId
    );

    await SubSection.findByIdAndDelete(subSectionId);
    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      {
        $pull: {
          subSection: subSectionId,
        },
      },
      {
        new: true,
      }
    )
      .populate("subSection")
      .exec();

    if (updatedSection) {
      return res.status(200).json({
        success: true,
        message: "SubSection deleted Sucessfully",
        data: updatedSection,
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the SubSection",
    });
  }
};
