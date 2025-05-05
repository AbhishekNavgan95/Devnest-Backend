const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  gender: {
    type: String,
  },
  DOB: {
    type: String,
  },
  about: {
    type: String,
    default: "You have not added any details yet",
  },
  niche: [
    {
      type: String,
    },
  ],
  followers: {
    type: Number,
    default: 0,
  },
  following: {
    type: Number,
    default: 0,
  },
  experience: {
    type: String,
    default: "You haven't added any experience yet",
  },
  contactNumber: {
    type: String,
    trim: true,
    default: "You haven't added any contact number yet",
  },
});

module.exports = mongoose.model("Profile", profileSchema);
