const cloudinary = require("cloudinary").v2
const fs = require("fs");

exports.uploadImageTocloudinary = async (file, folder, height, quality) => {
    try {
        const options = {folder};
        if(height) {
            options.height = height
        }
        if(quality) {
            options.quality = quality
        }

        options.resource_type = "auto"

        const response =  await cloudinary.uploader.upload(file.tempFilePath, options)

        return response
    } catch (e) {
        console.log("something went wrong while uplaoding the file to cloud", e?.message)
        fs.unlink(file);
    }
}

exports.deleteAssetFromCloudinary = async (publicId) => {
    try {
        if(!publicId) {
            return console.log("No public id provided")
        }

        const response = await cloudinary.uploader.destroy(publicId, {
            invalidate: true,
            resource_type: "image"
        })

        return response

    } catch (error) {
        console.log("something went wrong while deleting the file from cloud", error?.message)
        throw error
    }
}