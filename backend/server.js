const express = require("express");
const multer = require("multer");
const cors = require("cors");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Multer config - memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed (JPEG, PNG, WEBP, GIF)"));
  },
});

// Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Font identification prompt
const FONT_PROMPT = `You are an expert typographer and font identification specialist with deep knowledge of typography, type design, and font libraries.

Analyze this image carefully and identify ALL fonts/typefaces visible in it.

For each font found, provide a detailed JSON response with this exact structure:
{
  "fonts": [
    {
      "name": "Font Name",
      "confidence": 95,
      "category": "Serif | Sans-Serif | Display | Script | Monospace | Decorative | Handwritten",
      "style": "Regular | Bold | Italic | Light | Medium | etc.",
      "description": "Brief description of the font's characteristics and history",
      "usage": "Common use cases for this font",
      "alternatives": ["Similar Font 1", "Similar Font 2", "Similar Font 3"],
      "where_to_find": ["Google Fonts", "Adobe Fonts", "Font Squirrel", etc.],
      "designer": "Font designer/foundry if known",
      "year": "Year created if known",
      "text_sample": "The actual text in the image using this font"
    }
  ],
  "overall_typography": {
    "mood": "Description of the overall typographic mood/feel",
    "hierarchy": "Description of the type hierarchy observed",
    "pairing_notes": "Notes on how fonts are paired if multiple fonts present"
  },
  "image_context": "Brief description of what the image appears to be (logo, poster, website, etc.)"
}

Be as specific and accurate as possible. If you cannot identify a font with certainty, provide your best guess with a lower confidence score and note it might be a custom or rare font. Always return valid JSON only, no extra text.`;

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "AI Font Identifier API is running" });
});

// Font identification endpoint
app.post("/api/identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY not configured" });
    }

    // Convert image to base64
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    // Call Groq API with vision
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
            {
              type: "text",
              text: FONT_PROMPT,
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // Parse JSON response
    let fontData;
    try {
      // Extract JSON from response (in case model adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fontData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return res.status(500).json({
        error: "Failed to parse font identification response",
        raw: responseText,
      });
    }

    res.json({
      success: true,
      data: fontData,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error) {
    console.error("API Error:", error);

    if (error.status === 401) {
      return res.status(401).json({ error: "Invalid GROQ API key" });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
    }

    res.status(500).json({
      error: error.message || "Font identification failed",
    });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
});
