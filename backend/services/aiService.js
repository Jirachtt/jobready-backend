import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"];

function getModel(modelName) {
    return genAI.getGenerativeModel({ model: modelName });
}

function cleanJsonResponse(text) {
    let cleaned = text.trim();
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
        cleaned = codeBlockMatch[1].trim();
    }
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("[AI] JSON parse failed. Raw response (first 500 chars):", cleaned.substring(0, 500));
        throw new Error(`JSON parse failed: ${e.message}`);
    }
}

async function callWithRetry(prompt) {
    if (!process.env.GEMINI_API_KEY) {
        console.error("[AI] ❌ GEMINI_API_KEY is missing in environment variables!");
        return null;
    }
    console.log(`[AI] API Key present: ${process.env.GEMINI_API_KEY.substring(0, 8)}...`);

    for (const modelName of MODELS) {
        try {
            console.log(`[AI] Trying ${modelName}...`);
            const model = getModel(modelName);
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            console.log(`[AI] ✅ Got response from ${modelName} (${text.length} chars)`);
            const parsed = cleanJsonResponse(text);
            console.log(`[AI] ✅ Successfully parsed JSON from ${modelName}`);
            return parsed;
        } catch (error) {
            const msg = error.message || "";
            console.error(`[AI] ❌ ${modelName} failed: ${msg.substring(0, 300)}`);
            if (error.status === 429 || msg.includes("429") || msg.includes("Resource has been exhausted")) {
                console.warn(`[AI] 🚫 ${modelName} rate limited, trying next...`);
            } else if (msg.includes("404") || msg.includes("not found")) {
                console.warn(`[AI] ❌ ${modelName} not available (404), trying next...`);
            }
            // Continue to next model regardless of error type
        }
    }
    console.error("[AI] ⚠️ All models failed, using fallback data");
    return null;
}

// ─── FALLBACK DEMO DATA ──────────────────────────────────
function fallbackAnalysis(resumeText, jdText) {
    const jdLower = jdText.toLowerCase();
    const keywords = [];
    const missing = [];
    const techTerms = ["react", "node", "python", "javascript", "typescript", "sql", "docker", "git", "aws", "api", "html", "css", "vue", "angular", "java", "c#", "mongodb", "postgresql", "firebase", "figma", "nextjs", "express"];
    techTerms.forEach((term) => {
        if (jdLower.includes(term) && resumeText.toLowerCase().includes(term)) keywords.push(term);
        else if (jdLower.includes(term)) missing.push(term);
    });
    return {
        matching_score: 50 + Math.floor(Math.random() * 30),
        summary: "Resume มีความเกี่ยวข้องกับตำแหน่งงานในระดับปานกลาง พบ Keyword ที่ตรงกัน " + keywords.length + " รายการ และยังขาดอีก " + missing.length + " รายการ",
        strengths: [
            "มีประสบการณ์ทำงาน/โปรเจกต์ที่เกี่ยวข้องกับสายงาน",
            "มีทักษะพื้นฐานที่สอดคล้องกับ Job Description",
            "Resume มีโครงสร้างดี อ่านง่ายและเป็นระบบ",
        ],
        weaknesses: [
            "ควรเพิ่มรายละเอียดเชิงปริมาณ เช่น ผลลัพธ์ที่วัดได้",
            "ควรเพิ่มการอธิบาย Soft Skills",
            "ควรปรับ Summary ให้ตรงกับตำแหน่งที่สมัครมากขึ้น",
        ],
        missing_keywords: missing.slice(0, 5),
        suggestions: [
            "เพิ่ม Keyword จาก Job Description ที่ยังขาดหายไป",
            "ใส่ตัวเลขความสำเร็จ เช่น 'เพิ่มยอดขาย 30%' หรือ 'ลด Bug 50%'",
            "ปรับ Objective/Summary ให้สอดคล้องกับตำแหน่งที่สมัครโดยเฉพาะ",
        ],
        keyword_matches: keywords.slice(0, 6),
        is_demo: true,
    };
}

function fallbackQuestions(mode) {
    const techQuestions = [
        { id: 1, question: "อธิบายความแตกต่างระหว่าง Client-Side Rendering และ Server-Side Rendering ว่าแต่ละแบบเหมาะกับงานแบบไหน?", category: "Web Architecture", difficulty: "Medium" },
        { id: 2, question: "ถ้าต้องออกแบบ REST API สำหรับระบบ E-commerce คุณจะออกแบบ Endpoint หลักๆ อย่างไร?", category: "API Design", difficulty: "Medium" },
        { id: 3, question: "เล่าประสบการณ์การ Debug ปัญหาที่ยากที่สุดที่เคยเจอ คุณใช้วิธีไหนในการแก้ไข?", category: "Problem Solving", difficulty: "Hard" },
        { id: 4, question: "อธิบายวิธีจัดการ State Management ใน Application ขนาดใหญ่ แนะนำ Tool หรือ Pattern อะไร?", category: "Frontend", difficulty: "Medium" },
        { id: 5, question: "คุณมีวิธีเขียน Code ให้ Clean และ Maintainable อย่างไร? ยกตัวอย่าง Best Practice ที่คุณใช้", category: "Code Quality", difficulty: "Easy" },
    ];
    const behavioralQuestions = [
        { id: 1, question: "เล่าถึงสถานการณ์ที่คุณต้องทำงานภายใต้ความกดดันและ Deadline ที่จำกัด คุณจัดการอย่างไร?", category: "Pressure Management", difficulty: "Medium" },
        { id: 2, question: "คุณเคยมีความขัดแย้งกับเพื่อนร่วมทีมไหม? แก้ไขอย่างไร?", category: "Conflict Resolution", difficulty: "Medium" },
        { id: 3, question: "เล่าถึงโปรเจกต์ที่คุณภูมิใจที่สุด ทำไมถึงภูมิใจ?", category: "Achievement", difficulty: "Easy" },
        { id: 4, question: "คุณ handle feedback เชิงลบอย่างไร? ยกตัวอย่างสถานการณ์จริง", category: "Growth Mindset", difficulty: "Hard" },
        { id: 5, question: "ถ้าได้รับมอบหมายงานที่ไม่เคยทำมาก่อน คุณจะเริ่มต้นอย่างไร?", category: "Adaptability", difficulty: "Medium" },
    ];
    return {
        questions: mode === "technical" ? techQuestions : behavioralQuestions,
        is_demo: true,
    };
}

function fallbackEvaluation(answer) {
    const len = answer ? answer.length : 0;
    const score = len > 100 ? 7 : len > 50 ? 6 : 5;
    return {
        score,
        feedback: len > 100
            ? "คำตอบค่อนข้างดี มีรายละเอียดเพียงพอ แต่ลองเพิ่มตัวอย่างจริงจากประสบการณ์จะทำให้น่าเชื่อถือมากขึ้น"
            : "คำตอบสั้นเกินไป ควรเพิ่มรายละเอียดและยกตัวอย่างจากประสบการณ์จริงเพื่อแสดงความเข้าใจ",
        tone_analysis: len > 100
            ? "น้ำเสียงดี แสดงความมั่นใจและความรู้ได้ชัดเจน"
            : "น้ำเสียงยังไม่ค่อยมั่นใจนัก ควรฝึกพูดให้กระชับและชัดเจนมากขึ้น",
        coach_tip: "ลองใช้ STAR Method (Situation, Task, Action, Result) เพื่อจัดโครงสร้างคำตอบให้ชัดเจนยิ่งขึ้น",
        improved_answer_hint: "คำตอบที่ดีควรมีตัวอย่างเรียลจากประสบการณ์จริง พร้อมผลลัพธ์เป็นตัวเลขที่วัดได้",
        is_demo: true,
    };
}

function fallbackSummary(questionsAndAnswers, resumeAnalysis) {
    const scores = questionsAndAnswers.map((qa) => qa.score || 5);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const overall = Math.round(avgScore * 10);
    const grade = overall >= 80 ? "A" : overall >= 70 ? "B" : overall >= 50 ? "C" : "D";
    return {
        overall_score: overall,
        grade,
        overall_feedback: `คุณตอบคำถามทั้ง ${questionsAndAnswers.length} ข้อ ได้คะแนนเฉลี่ย ${avgScore.toFixed(1)}/10 ${overall >= 70 ? "ถือว่าทำได้ดีในภาพรวม" : "ยังมีจุดที่ต้องปรับปรุงบ้าง"} ควรเน้นเพิ่มตัวอย่างจากประสบการณ์จริงและจัดโครงสร้างคำตอบให้ชัดเจนยิ่งขึ้น`,
        strengths: [
            "กล้าตอบทุกคำถาม แสดงความพร้อมที่ดี",
            "มีพื้นฐานความรู้ที่เกี่ยวข้องกับตำแหน่ง",
            "สามารถสื่อสารได้ชัดเจนและเข้าใจง่าย",
        ],
        improvements: [
            "เพิ่มตัวอย่างจริงจากประสบการณ์ (ใช้ STAR Method)",
            "ฝึกตอบให้กระชับและตรงประเด็นมากขึ้น",
            "เพิ่มข้อมูลเชิงตัวเลขเพื่อสนับสนุนคำตอบ",
        ],
        readiness_level: overall >= 70 ? "พร้อมสัมภาษณ์" : overall >= 50 ? "เกือบพร้อม" : "ควรฝึกซ้อมเพิ่มเติม",
        next_steps: [
            "ฝึกซ้อมตอบคำถามอีก 2-3 รอบเพื่อเพิ่มความมั่นใจ",
            "ศึกษาข้อมูลบริษัทและตำแหน่งงานให้ละเอียดก่อนสัมภาษณ์จริง",
            "เตรียม Portfolio หรือผลงานที่เกี่ยวข้องไว้แสดง",
        ],
        confidence_assessment: overall >= 70 ? "แสดงความมั่นใจได้ดี พูดชัดเจน" : "ยังมีท่าทีไม่มั่นใจบ้าง ฝึกเพิ่มจะดีขึ้นมาก",
        is_demo: true,
    };
}

// ─── EXPORTED FUNCTIONS (AI + Fallback) ───────────────────

export async function analyzeResume(resumeText, jdText) {
    try {
        const prompt = `You are an expert HR consultant and resume analyst. Analyze the following resume against the job description.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

Provide your analysis in the following JSON format ONLY (no markdown, no code blocks, just pure JSON):
{
    "matching_score": <number 0-100>,
    "summary": "<brief overall assessment in Thai>",
    "strengths": ["<strength 1 in Thai>", "<strength 2>", "<strength 3>"],
    "weaknesses": ["<weakness 1 in Thai>", "<weakness 2>", "<weakness 3>"],
    "missing_keywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>"],
    "suggestions": ["<suggestion 1 in Thai>", "<suggestion 2>", "<suggestion 3>"],
    "keyword_matches": ["<matched keyword 1>", "<matched keyword 2>"]
}

Be specific, actionable, and honest. Rate the matching score realistically.`;

        const result = await callWithRetry(prompt);
        if (result) return result;
    } catch (err) {
        console.log("[AI] analyzeResume error:", err.message);
    }
    console.log("[AI] Using fallback demo data for analyzeResume");
    return fallbackAnalysis(resumeText, jdText);
}

export async function generateQuestions(resumeText, jdText, mode) {
    try {
        const modeDesc =
            mode === "technical"
                ? "Technical (focus on technical skills, deep knowledge)"
                : "Behavioral (focus on behavior, situations, attitude)";

        const prompt = `You are an expert interviewer for a company hiring for this position.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

INTERVIEW MODE: ${modeDesc}

Generate exactly 5 interview questions that are highly personalized based on the candidate's resume and the specific job description.
- For Technical mode: Ask about specific technologies, frameworks, and technical scenarios relevant to both the resume and JD.
- For Behavioral mode: Ask STAR-method questions about leadership, teamwork, conflict resolution, and situations related to the role.

Return your response as JSON ONLY (no markdown, no code blocks):
{
    "questions": [
        {
            "id": 1,
            "question": "<question text - use Thai if JD is in Thai, otherwise English>",
            "category": "<category like Framework, Database, Leadership, etc.>",
            "difficulty": "<Easy/Medium/Hard>"
        }
    ]
}

Make questions challenging but fair. Generate exactly 5 questions.`;

        const result = await callWithRetry(prompt);
        if (result) return result;
    } catch (err) {
        console.log("[AI] generateQuestions error:", err.message);
    }
    console.log("[AI] Using fallback demo data for generateQuestions");
    return fallbackQuestions(mode);
}

export async function evaluateAnswer(question, answer, jdText, resumeText) {
    try {
        const prompt = `You are an expert interview coach. Evaluate the candidate's answer to this interview question.

JOB DESCRIPTION:
${jdText}

RESUME CONTEXT:
${resumeText}

QUESTION: ${question}

CANDIDATE'S ANSWER: ${answer}

Provide your evaluation as JSON ONLY (no markdown, no code blocks):
{
    "score": <number 1-10>,
    "feedback": "<detailed feedback in Thai about what was good and what needs improvement>",
    "tone_analysis": "<analysis of confidence level, clarity, and professionalism in Thai>",
    "coach_tip": "<specific actionable tip to improve this answer in Thai>",
    "improved_answer_hint": "<brief hint on what a great answer would include, in Thai>"
}

Be encouraging but honest. Focus on actionable improvement.`;

        const result = await callWithRetry(prompt);
        if (result) return result;
    } catch (err) {
        console.log("[AI] evaluateAnswer error:", err.message);
    }
    console.log("[AI] Using fallback demo data for evaluateAnswer");
    return fallbackEvaluation(answer);
}

export async function generateSummary(questionsAndAnswers, resumeAnalysis) {
    try {
        let qaText = "";
        questionsAndAnswers.forEach((qa, i) => {
            qaText += `\nQ${i + 1}: ${qa.question}\nAnswer: ${qa.answer}\nScore: ${qa.score || "N/A"}\n`;
        });

        let resumeContext = "";
        if (resumeAnalysis) {
            resumeContext = `\nResume Matching Score: ${resumeAnalysis.matching_score || "N/A"}%\n`;
        }

        const prompt = `You are an expert career coach. Based on the mock interview session below, provide a comprehensive summary.
${resumeContext}
INTERVIEW SESSION:
${qaText}

Provide your summary as JSON ONLY (no markdown, no code blocks):
{
    "overall_score": <number 1-100>,
    "grade": "<A/B/C/D/F>",
    "overall_feedback": "<comprehensive feedback in Thai>",
    "strengths": ["<strength 1 in Thai>", "<strength 2>", "<strength 3>"],
    "improvements": ["<area to improve 1 in Thai>", "<area 2>", "<area 3>"],
    "readiness_level": "<Ready/Almost Ready/Needs Practice — in Thai>",
    "next_steps": ["<recommended action 1 in Thai>", "<action 2>", "<action 3>"],
    "confidence_assessment": "<assessment of overall confidence displayed in Thai>"
}

Be balanced — highlight what went well and what needs work.`;

        const result = await callWithRetry(prompt);
        if (result) return result;
    } catch (err) {
        console.log("[AI] generateSummary error:", err.message);
    }
    console.log("[AI] Using fallback demo data for generateSummary");
    return fallbackSummary(questionsAndAnswers, resumeAnalysis);
}
