const mongoose = require("mongoose");

const subSectionSchema = new mongoose.Schema({
    title: {
        type :String,
    },
    timeDuration: {
        type: String
    },
    description: {
        type: String
    },
    isPreviewable: {
        type: Boolean,
        default: false
    },
    video: {
        url: {
            type: String,
            // required: true,
        },
        publicId: {
            type: String,
            required: true,
        },
    },
})

module.exports = mongoose.model("SubSection", subSectionSchema);