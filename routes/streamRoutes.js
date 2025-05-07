const express = require("express");
const { streamSignedVideo } = require("../controllers/Course");
const { auth } = require("../middlewares/auth");
const router = express.Router();

router.get("/lecture/:publicId", streamSignedVideo);

exports.streamRoutes = router;
