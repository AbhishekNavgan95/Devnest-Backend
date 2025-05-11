// Import the required modules
const express = require("express");
const router = express.Router();

const {
  capturePayment,
  varifyPayment,
  sendPaymentSuccessEmail,
  getInstructorSales,
} = require("../controllers/Payment");
const {
  auth,
  isInstructor,
  isStudent,
  isAdmin,
} = require("../middlewares/auth");

router.post("/capturePayment", auth, isStudent, capturePayment);
router.post("/verifyPayment", auth, isStudent, varifyPayment);
router.post(
  "/sendPaymentSuccessEmail",
  auth,
  isStudent,
  sendPaymentSuccessEmail
);
router.get('/getInstructorSales', auth, isInstructor, getInstructorSales)

module.exports = router;
