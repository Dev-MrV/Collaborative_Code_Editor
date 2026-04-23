import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

router.post("/explain-error", async (req, res) => {
  const { language, code, message } = req.body;

  const prompt = `
You are a programming assistant. I ran the following ${language} code:

${code}

It produced this error:

${message}

Respond ONLY in valid JSON with exactly these two fields:

{
  "errorType": "Name of the error",
  "message": "One-line explanation of the error suitable for a beginner"
}

Do NOT include any text outside JSON. Do NOT use markdown or backticks.
`;

  try {
    const response = await client.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a helpful programming assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 100,
    });

    let aiOutput = response.choices[0].message?.content || "{}";

    // Remove any code block markers and extra whitespace
    aiOutput = aiOutput.replace(/```(?:json)?/g, "").trim();
    aiOutput = aiOutput.replace(/^[\`"\s]+|[\`"\s]+$/g, "");

    let parsed;
    try {
      parsed = JSON.parse(aiOutput);
    } catch (err) {
      parsed = {
        errorType: "AIError",
        message: aiOutput || "Unable to parse AI response",
      };
    }

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      errorType: "AIError",
      message: "Failed to fetch explanation from AI",
    });
  }
});

export default router;
