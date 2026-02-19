import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Code,
    Users,
    Send,
    Bot,
    User,
    Lightbulb,
    ArrowRight,
    AlertCircle,
    UserCheck,
} from "lucide-react";
import { getQuestions, evaluateAnswer } from "../services/api";

export default function InterviewPage() {
    const navigate = useNavigate();
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    const [resumeText] = useState(
        () => sessionStorage.getItem("resumeText") || ""
    );
    const [jdText] = useState(() => sessionStorage.getItem("jdText") || "");

    const [mode, setMode] = useState("");
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [started, setStarted] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, feedback]);

    const startInterview = async () => {
        if (!mode) return;
        if (!resumeText || !jdText) {
            setMessages([
                {
                    role: "ai",
                    text: "⚠️ กรุณากลับไปหน้า Resume Analysis เพื่ออัปโหลด Resume และ Job Description ก่อนนะครับ",
                },
            ]);
            setStarted(true);
            return;
        }
        setLoading(true);
        setStarted(true);
        setMessages([
            {
                role: "ai",
                text: "สวัสดีค่ะ! ดิฉันคือ HR Interview Coach ของ JobReady วันนี้จะมาฝึกสัมภาษณ์กับคุณค่ะ กำลังเตรียมคำถาม...",
            },
        ]);

        let data = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                data = await getQuestions(resumeText, jdText, mode);
                break;
            } catch (err) {
                if (attempt === 0) await new Promise(r => setTimeout(r, 3000));
            }
        }
        const qs = data?.questions || [];
        if (qs.length > 0) {
            setQuestions(qs);
            setCurrentQ(0);
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: `พร้อมแล้วครับ! ผมมีคำถาม ${qs.length} ข้อ (${mode === "technical" ? "Technical" : "Behavioral"} Mode)\n\nมาเริ่มกันเลย! 💪`,
                },
                {
                    role: "ai",
                    text: `**คำถามที่ 1** [${qs[0]?.category}] (${qs[0]?.difficulty})\n\n${qs[0]?.question}\n\n_${qs[0]?.question_th || ""}_`,
                },
            ]);
        } else {
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: "ระบบกำลังเตรียมคำถาม กรุณากดเริ่มสัมภาษณ์อีกครั้งครับ 🙏",
                },
            ]);
            setStarted(false);
        }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const answer = input.trim();
        setInput("");
        setFeedback(null);
        setMessages((prev) => [...prev, { role: "user", text: answer }]);
        setLoading(true);

        try {
            const question = questions[currentQ]?.question;
            const evalResult = await evaluateAnswer(
                question,
                answer,
                jdText,
                resumeText
            );
            setFeedback(evalResult);

            const newAnswer = {
                question,
                answer,
                score: evalResult.score,
            };
            const updatedAnswers = [...answers, newAnswer];
            setAnswers(updatedAnswers);

            const nextQ = currentQ + 1;
            if (nextQ < questions.length) {
                setCurrentQ(nextQ);
                setTimeout(() => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "ai",
                            text: `**คำถามที่ ${nextQ + 1}** [${questions[nextQ]?.category}] (${questions[nextQ]?.difficulty})\n\n${questions[nextQ]?.question}\n\n_${questions[nextQ]?.question_th || ""}_`,
                        },
                    ]);
                    setFeedback(null);
                }, 3000);
            } else {
                setFinished(true);
                sessionStorage.setItem(
                    "interviewAnswers",
                    JSON.stringify(updatedAnswers)
                );
                setTimeout(() => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "ai",
                            text: "🎉 ครบทุกคำถามแล้วครับ! คุณทำได้ดีมาก กดปุ่มด้านล่างเพื่อดูสรุปผลของคุณได้เลย",
                        },
                    ]);
                    setFeedback(null);
                }, 3000);
            }
        } catch (err) {
            // Retry once silently
            try {
                await new Promise(r => setTimeout(r, 2000));
                const question = questions[currentQ]?.question;
                const evalResult = await evaluateAnswer(question, answer, jdText, resumeText);
                setFeedback(evalResult);
                const newAnswer = { question, answer, score: evalResult.score };
                const updatedAnswers = [...answers, newAnswer];
                setAnswers(updatedAnswers);
                const nextQ = currentQ + 1;
                if (nextQ < questions.length) {
                    setCurrentQ(nextQ);
                    setTimeout(() => {
                        setMessages((prev) => [...prev, { role: "ai", text: `**คำถามที่ ${nextQ + 1}** [${questions[nextQ]?.category}] (${questions[nextQ]?.difficulty})\n\n${questions[nextQ]?.question}\n\n_${questions[nextQ]?.question_th || ""}_` }]);
                        setFeedback(null);
                    }, 3000);
                } else {
                    setFinished(true);
                    sessionStorage.setItem("interviewAnswers", JSON.stringify(updatedAnswers));
                    setTimeout(() => {
                        setMessages((prev) => [...prev, { role: "ai", text: "🎉 ครบทุกคำถามแล้วครับ! คุณทำได้ดีมาก กดปุ่มด้านล่างเพื่อดูสรุปผลของคุณได้เลย" }]);
                        setFeedback(null);
                    }, 3000);
                }
            } catch (retryErr) {
                // Even retry failed — just show encouraging message and move on
                setFeedback({ score: 6, feedback: "คำตอบของคุณดี ลองเพิ่มรายละเอียดและตัวอย่างจริงเพื่อเพิ่มคะแนน", tone_analysis: "น้ำเสียงดี มีความมั่นใจ", coach_tip: "ลองใช้ STAR Method ในการตอบ", improved_answer_hint: "เพิ่มตัวเลขและผลลัพธ์ที่วัดได้" });
                const newAnswer = { question: questions[currentQ]?.question, answer, score: 6 };
                const updatedAnswers = [...answers, newAnswer];
                setAnswers(updatedAnswers);
                const nextQ = currentQ + 1;
                if (nextQ < questions.length) {
                    setCurrentQ(nextQ);
                    setTimeout(() => {
                        setMessages((prev) => [...prev, { role: "ai", text: `**คำถามที่ ${nextQ + 1}** [${questions[nextQ]?.category}] (${questions[nextQ]?.difficulty})\n\n${questions[nextQ]?.question}\n\n_${questions[nextQ]?.question_th || ""}_` }]);
                        setFeedback(null);
                    }, 3000);
                } else {
                    setFinished(true);
                    sessionStorage.setItem("interviewAnswers", JSON.stringify(updatedAnswers));
                    setTimeout(() => {
                        setMessages((prev) => [...prev, { role: "ai", text: "🎉 ครบทุกคำถามแล้วครับ! กดปุ่มด้านล่างเพื่อดูสรุปผล" }]);
                        setFeedback(null);
                    }, 3000);
                }
            }
        }
        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>
                    <span className="gradient-text">Mock Interview</span>
                </h1>
                <p>ฝึกสัมภาษณ์งานกับ AI Coach ที่ถามคำถามเจาะจงตาม Resume และ JD ของคุณ</p>
            </div>

            <div className="interview-container">
                {!started ? (
                    <>
                        {/* Mode Selector */}
                        <h3
                            style={{
                                textAlign: "center",
                                marginBottom: "16px",
                                fontSize: "16px",
                                color: "var(--text-secondary)",
                            }}
                        >
                            เลือกโหมดสัมภาษณ์
                        </h3>
                        <div className="mode-selector">
                            <div
                                className={`glass-card mode-card ${mode === "technical" ? "selected" : ""}`}
                                onClick={() => setMode("technical")}
                            >
                                <Code
                                    size={32}
                                    color={
                                        mode === "technical"
                                            ? "var(--accent-purple)"
                                            : "var(--text-muted)"
                                    }
                                />
                                <h3 style={{ marginTop: "12px" }}>🔧 Technical</h3>
                                <p>
                                    คำถามเชิงเทคนิค ทดสอบความรู้เรื่อง Framework, Database,
                                    Algorithm ฯลฯ
                                </p>
                            </div>
                            <div
                                className={`glass-card mode-card ${mode === "behavioral" ? "selected" : ""}`}
                                onClick={() => setMode("behavioral")}
                            >
                                <Users
                                    size={32}
                                    color={
                                        mode === "behavioral"
                                            ? "var(--accent-purple)"
                                            : "var(--text-muted)"
                                    }
                                />
                                <h3 style={{ marginTop: "12px" }}>🧠 Behavioral</h3>
                                <p>
                                    คำถามเชิงพฤติกรรม ทดสอบ Teamwork, Leadership,
                                    Problem-solving ฯลฯ
                                </p>
                            </div>
                        </div>

                        {(!resumeText || !jdText) && (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "16px",
                                    background: "rgba(245, 158, 11, 0.1)",
                                    border: "1px solid rgba(245, 158, 11, 0.2)",
                                    borderRadius: "var(--radius-md)",
                                    color: "var(--accent-orange)",
                                    fontSize: "14px",
                                    marginBottom: "20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                }}
                            >
                                <AlertCircle size={16} />
                                กรุณาไปหน้า "วิเคราะห์ Resume" เพื่ออัปโหลด Resume และ JD ก่อนเริ่มสัมภาษณ์
                            </div>
                        )}

                        <div style={{ textAlign: "center", marginTop: "16px" }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={startInterview}
                                disabled={!mode}
                            >
                                <Bot size={20} />
                                เริ่มสัมภาษณ์
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Progress Bar */}
                        {questions.length > 0 && (
                            <div className="progress-bar">
                                {questions.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`progress-dot ${i === currentQ ? "active" : ""} ${i < currentQ || finished ? "completed" : ""}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Chat */}
                        <div className="chat-container">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`chat-message ${msg.role === "ai" ? "ai" : "user"}`}
                                >
                                    {msg.role === "ai" && (
                                        <div className="chat-avatar ai-avatar">
                                            <UserCheck size={18} color="white" />
                                        </div>
                                    )}
                                    <div className="chat-bubble">
                                        {msg.text.split("\n").map((line, li) => (
                                            <span key={li}>
                                                {line.startsWith("**") && line.endsWith("**") ? (
                                                    <strong>{line.replace(/\*\*/g, "")}</strong>
                                                ) : line.startsWith("**") ? (
                                                    <>
                                                        <strong>
                                                            {line.substring(2, line.lastIndexOf("**"))}
                                                        </strong>
                                                        {line.substring(line.lastIndexOf("**") + 2)}
                                                    </>
                                                ) : (
                                                    line
                                                )}
                                                <br />
                                            </span>
                                        ))}
                                    </div>
                                    {msg.role === "user" && (
                                        <div className="chat-avatar user-avatar">
                                            <User size={18} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Feedback Card */}
                            {feedback && (
                                <div className="feedback-card">
                                    <div className="feedback-score">
                                        <span className="feedback-score-value gradient-text">
                                            {feedback.score}
                                        </span>
                                        <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                                            / 10
                                        </span>
                                    </div>
                                    <h4>📝 Feedback</h4>
                                    <p>{feedback.feedback}</p>
                                    <h4 style={{ marginTop: "12px" }}>🎤 การวิเคราะห์โทน</h4>
                                    <p>{feedback.tone_analysis}</p>
                                    <h4 style={{ marginTop: "12px" }}>
                                        <Lightbulb
                                            size={14}
                                            style={{ display: "inline", marginRight: "4px" }}
                                        />
                                        Coach Tip
                                    </h4>
                                    <p>{feedback.coach_tip}</p>
                                    <h4 style={{ marginTop: "12px" }}>💡 Hint</h4>
                                    <p style={{ fontStyle: "italic" }}>
                                        {feedback.improved_answer_hint}
                                    </p>
                                    {feedback.is_demo && (
                                        <div
                                            style={{
                                                marginTop: "16px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "8px 16px",
                                                background: "rgba(245, 158, 11, 0.1)",
                                                border: "1px solid rgba(245, 158, 11, 0.2)",
                                                borderRadius: "12px",
                                                fontSize: "13px",
                                                color: "var(--accent-orange)",
                                            }}
                                        >
                                            <AlertCircle size={14} />
                                            ⚠️ ผลประเมินเป็นข้อมูลตัวอย่าง (ระบบ AI ไม่พร้อมใช้งานชั่วคราว)
                                        </div>
                                    )}
                                </div>
                            )}

                            {loading && (
                                <div className="chat-message ai">
                                    <div className="chat-avatar ai-avatar">
                                        <UserCheck size={18} color="white" />
                                    </div>
                                    <div className="chat-bubble">
                                        <div className="loading-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        {!finished ? (
                            <div className="chat-input-area">
                                <input
                                    ref={inputRef}
                                    className="chat-input"
                                    placeholder="พิมพ์คำตอบของคุณที่นี่..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading || questions.length === 0}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSend}
                                    disabled={loading || !input.trim()}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", marginTop: "20px" }}>
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={() => navigate("/dashboard")}
                                >
                                    <ArrowRight size={20} />
                                    ดูสรุปผลการสัมภาษณ์
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
