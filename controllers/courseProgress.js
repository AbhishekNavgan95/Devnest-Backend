const CourseProgress = require("../models/CourseProgress");
const SubSection = require("../models/Subsection");

exports.updateCourseProgress = async (req, res) => {
    try {

        const {courseId, subSectionId} = req.body;
        const {id} = req.user;

        // check if subSection is valid or not
        const subSection = await SubSection.findById(subSectionId);

        if(!subSection) {
            return res.status(400).json({
                success:false,
                message: "Invalid subSection"
            })
        }

        // check for old entry
        let courseProgress = await CourseProgress.findOne({
            courseId: courseId,
            userId: id
        })

        if(!courseProgress) {
            return res.status(404).json({
                success:false,
                message: "Course Progress does not exist"
            })
        } else {
            // check for already existing entry
            if(courseProgress?.completedVideos?.includes(subSectionId)) {
                return res.status(400).json({
                    success:false,
                    message: "SubSection already completed"
                })
            }

            // add new entry
            courseProgress.completedVideos.push(subSectionId);
        }
        const newCourseProgress = await courseProgress.save();

        res.status(200).json({
            success: true,
            message: "course progress updated successfully",
            data: newCourseProgress
        })

    } catch(e) {
        return res.status(500).json({
            success:false,
            message:"Something went wrong while marking lecture as completed",
            error: e.message
        })
    }
}