import axios from "axios";

// ใช้ Render URL ถ้ามี, ถ้าไม่มีก็ใช้ localhost
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: API_BASE,
    timeout: 120000, // 2 min for AI responses
});

export async function uploadResume(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}

export async function analyzeResume(resumeText, jdText) {
    const response = await api.post("/api/resume/analyze", {
        resume_text: resumeText,
        jd_text: jdText,
    });
    return response.data;
}

export async function getQuestions(resumeText, jdText, mode) {
    const response = await api.post("/api/interview/questions", {
        resume_text: resumeText,
        jd_text: jdText,
        mode,
    });
    return response.data;
}

export async function evaluateAnswer(question, answer, jdText, resumeText) {
    const response = await api.post("/api/interview/evaluate", {
        question,
        answer,
        jd_text: jdText,
        resume_text: resumeText,
    });
    return response.data;
}

export async function getSummary(questionsAndAnswers, resumeAnalysis) {
    const response = await api.post("/api/interview/summary", {
        questions_and_answers: questionsAndAnswers,
        resume_analysis: resumeAnalysis,
    });
    return response.data;
}
