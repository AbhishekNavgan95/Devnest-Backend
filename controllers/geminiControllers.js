const Course = require("../models/Course");
const Category = require("../models/Category");
const { ai } = require("../config/gemini");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv").config();

const guestChatSessions = new Map();
const FRONTEND_BASE_URL = process.env.CORS_ORIGIN;

// Cleanup guest sessions after 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [guestId, session] of guestChatSessions.entries()) {
    if (now - session.timestamp > 10 * 60 * 1000) {
      guestChatSessions.delete(guestId);
    }
  }
}, 5 * 60 * 1000);

// 🧠 Dynamic platform context generator
let platformContextText = "";

async function preparePlatformContext() {
  const courses = await Course.find().populate("category", "name").limit(10);
  const categories = await Category.find();

  const courseLines = courses
    .map(
      (c) =>
        `- [${c.courseTitle} (${c.category?.name})](${FRONTEND_BASE_URL}/catalog/${c._id})`
    )
    .join("\n");

  const categoryLines = categories.map((cat) => `- ${cat.name}`).join("\n");

  platformContextText = `
You are ECHOBot, an AI assistant for the LMS platform "ECHO".

What is ECHO about:
- ECHO is an LMS (Learning Management System) platform for students and teachers.
- It offers a wide range of courses and programming languages.
- It provides a platform for students to learn and teach programming languages.
- It is a platform for students to learn programming languages, technologies and build a career in computer programming.
- ECHO also provider peer to peer discussion forums for students and teachers on ${FRONTEND_BASE_URL}/chat route.
- ECHO also provides a platform for students to learn and teach programming languages.
- ECHO also have features such as real time code spaces where teachers and students can interrect together using a real time collaborative code editor for learning and duscussions.
- ECHO also provides support via ${FRONTEND_BASE_URL}/contact (known as contact us page) page for reaching out to administrators of ECHO.
- Users can visit ${FRONTEND_BASE_URL}/dashboard to explore the platform and learn more about the platform.
- ECHO  have following page - HOME, EXPLORE (explore courses), Community (public chat forums), About Us (connect with administrators), Dashboard (Manage profile and courses, explore code-spaces)
- ECHO's feature list include, real-time peer to peero or peer to instrcutors communication using chat forums, Real-time collaborative code-spaces for learning and discussions, and a platform for students to learn and teach programming languages.
 
Goals:
- Help users explore and navigate the platform.
- don't use LMS term while responding to user use 'ECHO instead.'
- Explain available courses and categories.
- try to respond within 100-150 words max. 
- always return course name with hyperlink in readme.md syntax format.
- guide users to go to (${FRONTEND_BASE_URL}/catalog) page for exploring more courses.
- help students with their doubts related to programming and coding.
- Guide users to URLs like /catalog/:courseId to view full course info.
- Assist with questions about platform pricing, signing up, or using features.
- Help with course or programming-related doubts.
- Politely warn users for inappropriate behavior.
- STRICTLY avoid answering questions outside ECHO's context except students doubts about tech (e.g., politics, health, general trivia). If such a question comes up, respond with:
  👉 "I'm here to help you with the Learning and doubts. Please ask something related to it."

All links must use this base: ${FRONTEND_BASE_URL}
Avoid external redirects.
Stay in character. Do not answer unrelated queries. you can answer the student's doubts related to studies and programming though.

Tone: Fun, sarcastic, helpful.

Available Categories:
${categoryLines}

Available Courses:
${courseLines}

Only talk about ECHO. If a question is out of scope, say:
👉 "I'm here to help you with the LMS platform. Please ask something related to it."
  `.trim();
}

// Prepare the platform context once at server startup
preparePlatformContext();

exports.streamChatResponse = async (req, res) => {
  let guestId = req.headers["x-guest-id"] || uuidv4();
  const { message } = req.body;

  try {
    // Create a new session if one doesn't exist
    if (!guestChatSessions.has(guestId)) {
      const history = [];

      const chat = ai.chats.create({
        model: "gemini-2.0-flash",
        history,
      });

      guestChatSessions.set(guestId, {
        chat,
        history,
        timestamp: Date.now(),
      });
    }

    const session = guestChatSessions.get(guestId);
    const chat = session.chat;

    // Prepend the platform context to the user's message
    const prompt = `${platformContextText}\nUser: ${message}`;

    // Add user prompt to history
    session.history.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const stream = await chat.sendMessageStream({ message: prompt });

    // Stream the response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("x-guest-id", guestId);

    let fullText = "";

    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        res.write(`${chunk.text}`);
      }
    }

    // Store model reply
    session.history.push({
      role: "model",
      parts: [{ text: fullText }],
    });

    res.write("");
    res.end();
  } catch (err) {
    console.error("Gemini Guest Streaming Error:", err);
    res.status(500).json({ error: "Error streaming Gemini guest response" });
  }
};
