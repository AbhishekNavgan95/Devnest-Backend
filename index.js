const express = require("express");
const app = express();
require("dotenv").config();
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");

// Import routes
const userRoutes = require("./routes/User");
const profileRoutes = require("./routes/Profile");
const paymentRoutes = require("./routes/Payment");
const courseRoutes = require("./routes/Course");
const chatRoutes = require("./routes/Chat");
const { contactUs } = require("./controllers/ContactUs");
const codeSpace = require("./routes/CodeRoom");
const { streamChatResponse } = require("./controllers/geminiControllers");

// Import DB config
const { connectToDB } = require("./config/databse");
const socketConnect = require("./config/socket");
const { cloudinaryConnect } = require("./config/cloudinary");
const listenToSocketEvents = require("./controllers/socket");
const { auth } = require("./middlewares/auth");

// Initialize Server
const PORT = process.env.PORT || 4000;
const server = http.createServer(app); // Create HTTP Server for Socket.io
const io = socketConnect(server);

listenToSocketEvents(io);

// Connect to Database
connectToDB();

// Connect to Cloudinary
cloudinaryConnect();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "https://echo-an.netlify.app/",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    accessControlAllowOrigin: "*",
    optionSuccessStatus: 200,
    maxAge: 14400,
  })
);
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// Routes
app.use("/api/v1/contact", contactUs);
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/codespace", codeSpace);
app.use("/api/v1/generate", streamChatResponse);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hello world",
  });
});

// Start the Server
server.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
