// models/CourseSale.js
const mongoose = require("mongoose");

const courseSaleSchema = new mongoose.Schema({
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  paymentId: String,
  orderId: String,
  amount: Number, // in paise
  soldAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CourseSale", courseSaleSchema);
