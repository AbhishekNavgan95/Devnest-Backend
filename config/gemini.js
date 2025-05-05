const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

exports.ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
