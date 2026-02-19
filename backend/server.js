import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import dotenv from "dotenv";
import crypto from "crypto";
import pdf from "pdf-parse/lib/pdf-parse.js";
import {
    analyzeResume,
    generateQuestions,
    evaluateAnswer,
    generateSummary,
} from "./services/aiService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const upload = multer({ storage: multer.memoryStorage() });

// ─── Security ────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS — allow only frontend origins
const ALLOWED_ORIGINS = [
    "https://jobready-frontend-04fr.onrender.com",
    "https://jobready-frontend.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(null, true); // Still allow but log
            console.warn(`[CORS] Request from unknown origin: ${origin}`);
        }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
}));

app.use(express.json({ limit: "10mb" }));

// Rate limiter — 30 requests per minute per IP on API routes
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { detail: "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" },
});
app.use("/api/", apiLimiter);

// ─── Simple In-Memory Cache ──────────────────────────────────
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(prefix, data) {
    const hash = crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");
    return `${prefix}:${hash}`;
}

function getFromCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    console.log(`[CACHE] Hit for ${key.substring(0, 30)}...`);
    return entry.data;
}

function setCache(key, data) {
    // Limit cache size to prevent memory leak
    if (cache.size > 100) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
    }
    cache.set(key, { data, timestamp: Date.now() });
}

// ─── Health Check ────────────────────────────────────────────
app.get("/", (req, res) => {
    res.json({ message: "JobReady API is running", version: "1.1.0" });
});

app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// ─── Resume Routes ───────────────────────────────────────────
app.post("/api/resume/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ detail: "No file uploaded" });
        }
        if (!req.file.originalname.toLowerCase().endsWith(".pdf")) {
            return res.status(400).json({ detail: "Only PDF files are accepted" });
        }

        const data = await pdf(req.file.buffer);
        const text = data.text;

        if (!text || !text.trim()) {
            return res
                .status(400)
                .json({ detail: "Could not extract text from PDF. The file may be image-based." });
        }

        res.json({
            filename: req.file.originalname,
            text: text,
            pages: data.numpages,
        });
    } catch (error) {
        console.error("PDF upload error:", error);
        res.status(500).json({ detail: `Error processing PDF: ${error.message}` });
    }
});

app.post("/api/resume/analyze", async (req, res) => {
    try {
        const { resume_text, jd_text } = req.body;
        if (!resume_text || !resume_text.trim()) {
            return res.status(400).json({ detail: "Resume text is required" });
        }
        if (!jd_text || !jd_text.trim()) {
            return res.status(400).json({ detail: "Job description is required" });
        }

        // Check cache
        const cacheKey = getCacheKey("analyze", { resume_text, jd_text });
        const cached = getFromCache(cacheKey);
        if (cached) return res.json(cached);

        const result = await analyzeResume(resume_text, jd_text);
        if (!result.is_demo) setCache(cacheKey, result);
        res.json(result);
    } catch (error) {
        console.error("Resume analyze error:", error);
        res.status(500).json({ detail: `Error analyzing resume: ${error.message}` });
    }
});

// ─── Interview Routes ────────────────────────────────────────
app.post("/api/interview/questions", async (req, res) => {
    try {
        const { resume_text, jd_text, mode } = req.body;
        if (!["technical", "behavioral"].includes(mode)) {
            return res.status(400).json({ detail: "Mode must be 'technical' or 'behavioral'" });
        }

        const result = await generateQuestions(resume_text, jd_text, mode);
        res.json(result);
    } catch (error) {
        console.error("Questions generation error:", error);
        res.status(500).json({ detail: `Error generating questions: ${error.message}` });
    }
});

app.post("/api/interview/evaluate", async (req, res) => {
    try {
        const { question, answer, jd_text, resume_text } = req.body;
        if (!answer || !answer.trim()) {
            return res.status(400).json({ detail: "Answer is required" });
        }

        const result = await evaluateAnswer(question, answer, jd_text, resume_text);
        res.json(result);
    } catch (error) {
        console.error("Answer evaluation error:", error);
        res.status(500).json({ detail: `Error evaluating answer: ${error.message}` });
    }
});

app.post("/api/interview/summary", async (req, res) => {
    try {
        const { questions_and_answers, resume_analysis } = req.body;
        if (!questions_and_answers || questions_and_answers.length === 0) {
            return res.status(400).json({ detail: "At least one Q&A pair is required" });
        }

        // Check cache
        const cacheKey = getCacheKey("summary", { questions_and_answers, resume_analysis });
        const cached = getFromCache(cacheKey);
        if (cached) return res.json(cached);

        const result = await generateSummary(questions_and_answers, resume_analysis);
        if (!result.is_demo) setCache(cacheKey, result);
        res.json(result);
    } catch (error) {
        console.error("Summary generation error:", error);
        res.status(500).json({ detail: `Error generating summary: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 JobReady API v1.1.0 running on http://localhost:${PORT}`);
});
