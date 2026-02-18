import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
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

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/", (req, res) => {
    res.json({ message: "JobReady API is running", version: "1.0.0" });
});

app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
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

        const result = await analyzeResume(resume_text, jd_text);
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

        const result = await generateSummary(questions_and_answers, resume_analysis);
        res.json(result);
    } catch (error) {
        console.error("Summary generation error:", error);
        res.status(500).json({ detail: `Error generating summary: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 JobReady API running on http://localhost:${PORT}`);
});
