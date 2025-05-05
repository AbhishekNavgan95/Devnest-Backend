const { instance } = require("../config/razorPay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailsender");
const {
  courseEnrollmentEmail,
} = require("../mail/tamplates/courseEntrollmentEmail");
const { default: mongoose } = require("mongoose");
const crypto = require("crypto");
const { paymentSuccess } = require("../mail/tamplates/paymentSuccessEmail");
const CourseProgress = require("../models/CourseProgress")

const enrollStudent = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res.status(404).json({
      success: false,
      message: "Please provide data for courses and userId",
    });
  }

  // find course and enroll student in it
  for (const courseId of courses) {
    try {
      const enrolledCourse = await Course.findByIdAndUpdate(
        courseId,
        {
          $push: {
            studentsEnrolled: userId,
          },
        },
        { new: true }
      );

      if (!enrolledCourse) {
        return res.status(500).json({
          success: false,
          message: "course not found",
        });
      }

      const courseProgress = await CourseProgress.create({
        courseId: courseId,
        userId: userId,
        completedVideos: []
      })

      // add course in the user model
      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id
          },
        },
        { new: true }
      );

      if (!enrolledStudent) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // send confimation mail
      const emailResponse = await mailSender(
        enrolledStudent?.email,
        `Successfully Enrolled in the ${enrolledCourse?.courseTitle}`,
        courseEnrollmentEmail(
          enrolledCourse?.courseTitle,
          enrolledStudent?.firstName + " " + enrolledStudent?.lastName
        )
      );
    } catch (e) {
      console.log("something went wrong while purchasing the course!!!")
      return res.status(500).json({
        success: false,
        message: e?.message
      })
    }
  }
};

exports.capturePayment = async (req, res) => {
  try {
    const { courses } = req.body;
    const userId = req.user.id;

    if (courses?.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide course Id",
      });
    }

    // calculate total amount
    let totalAmount = 0;

    for (const course_Id of courses) {
      let course;
      try {
        course = await Course.findById(course_Id);

        if (!course) {
          return res.status(404).json({
            success: false,
            message: "Course Not Found",
          });
        }

        // check if user is already enrolled in the same course
        const uid = new mongoose.Types.ObjectId(userId);

        if (course?.studentsEnrolled?.includes(uid)) {
          return res.status(400).json({
            success: false,
            message: "You are already enrolled in this course",
          });
        }

        totalAmount += course?.price;
      } catch (e) {
        console.log("something went wrong while validating the course");
        return res.status(500).json({
          success: true,
          message: e?.message,
        });
      }
    }

    // creating option for order
    const options = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: Math.random(Date.now()).toString(),
    };

    // creating the order
    try {
      const paymentRes = await instance?.orders?.create(options);

      return res.status(200).json({
        success: true,
        message: paymentRes,
      });

    } catch (e) {

      console.log(e);
      return res.status(500).json({
        success: false,
        message: "Something went wrong while creating the order " + e?.message,
      });

    }

  } catch (e) {

    console.log(e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while capturing the payment" + e?.message,
    });
  }
};

exports.varifyPayment = async (req, res) => {
  const {razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body;
  // const razorPayPaymentId = req.body?.razorPayPaymentId;
  // const razorPaySignature = req.body?.razorPaySignature;

  const courses = req.body?.courses;
  const userId = req?.user?.id;

  if (
    !razorpay_order_id||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !courses ||
    !userId
  ) {
    return res.status(500).json({
      success: false,
      message: "Payment failed",
    });
  }

  let body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // enroll student
    await enrollStudent(courses, userId, res);

    // return res
    return res.status(200).json({
      success: true,
      message: "Payment varified",
    });
  }

  res.status(400).json({
    success: false,
    message: "Payment failed",
  });
};

exports.sendPaymentSuccessEmail = async (req, res) => {

  const {orderId, paymentId, amount} = req.body;

  const userId = req.user.id;

  if(!orderId || !paymentId || !amount || !userId) {
    return res.status(400).json({
      success:false,
      message: "Please provide all the fields"
    })
  }
    try {

      const studentData =  await User.findById(userId);

      await mailSender(
        studentData?.email,
        `Payment Successfull`,
        paymentSuccess(amount/100, paymentId, orderId, studentData?.firstName, studentData?.lastName )
      )

    } catch(e) {  
      console.log("error in sending mail : ", e);
      res.status(500).json({
        success:false,
        message: "Something went wrong while sending payment success mail"
      })
    }
}