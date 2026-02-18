import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Trophy,
    TrendingUp,
    TrendingDown,
    Target,
    Lightbulb,
    ArrowLeft,
    Star,
    CheckCircle,
    AlertCircle,
    RotateCcw,
} from "lucide-react";
import { getSummary } from "../services/api";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState("");
    const [resumeAnalysis, setResumeAnalysis] = useState(null);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        setLoading(true);
        setError("");

        const answersRaw = sessionStorage.getItem("interviewAnswers");
        const resumeRaw = sessionStorage.getItem("resumeAnalysis");

        if (!answersRaw) {
            setError("ยังไม่มีข้อมูลการสัมภาษณ์ กรุณาทำ Mock Interview ก่อน");
            setLoading(false);
            return;
        }

        const answers = JSON.parse(answersRaw);
        const resume = resumeRaw ? JSON.parse(resumeRaw) : null;
        setResumeAnalysis(resume);

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await getSummary(answers, resume);
                setSummary(result);
                setLoading(false);
                return;
            } catch (err) {
                if (attempt === 0) await new Promise(r => setTimeout(r, 3000));
            }
        }
        setError("ระบบกำลังประมวลผลหนัก กรุณากดลองใหม่");
        setLoading(false);
    };

    const getReadinessClass = (level) => {
        if (!level) return "almost";
        const l = level.toLowerCase();
        if (l.includes("ready") || l.includes("พร้อม")) return "ready";
        if (l.includes("almost") || l.includes("เกือบ")) return "almost";
        return "needs-practice";
    };

    const getGradeColor = (grade) => {
        if (!grade) return "var(--text-primary)";
        switch (grade) {
            case "A":
                return "var(--accent-green)";
            case "B":
                return "var(--accent-cyan)";
            case "C":
                return "var(--accent-orange)";
            case "D":
                return "var(--accent-orange)";
            case "F":
                return "var(--accent-red)";
            default:
                return "var(--text-primary)";
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="dashboard-container">
                    <div className="loading-overlay">
                        <div
                            className="spinner"
                            style={{ width: 48, height: 48 }}
                        ></div>
                        <p>AI กำลังวิเคราะห์ผลการสัมภาษณ์ของคุณ...</p>
                        <div className="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page">
                <div className="dashboard-container" style={{ textAlign: "center" }}>
                    <div
                        style={{
                            padding: "48px",
                            background: "var(--glass)",
                            borderRadius: "var(--radius-xl)",
                            border: "1px solid var(--glass-border)",
                        }}
                    >
                        <AlertCircle
                            size={48}
                            color="var(--accent-orange)"
                            style={{ marginBottom: "16px" }}
                        />
                        <h2 style={{ marginBottom: "12px" }}>{error}</h2>
                        <p
                            style={{
                                color: "var(--text-secondary)",
                                marginBottom: "24px",
                            }}
                        >
                            กรุณาเริ่มจากอัปโหลด Resume แล้วทำ Mock Interview ก่อน
                        </p>
                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                justifyContent: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <Link to="/resume" className="btn btn-primary">
                                <ArrowLeft size={16} />
                                ไปหน้าวิเคราะห์ Resume
                            </Link>
                            <Link to="/interview" className="btn btn-secondary">
                                ไปหน้า Mock Interview
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>
                    <span className="gradient-text">สรุปผลการฝึกซ้อม</span>
                </h1>
                <p>ผลลัพธ์จาก AI Coach สำหรับเซสชันนี้</p>
            </div>

            <div className="dashboard-container">
                {/* Hero Stat */}
                <div className="dashboard-hero">
                    <div
                        className="dashboard-grade gradient-text"
                        style={{ color: getGradeColor(summary?.grade) }}
                    >
                        {summary?.grade || "–"}
                    </div>
                    <div className="dashboard-score">
                        <Trophy
                            size={20}
                            style={{ display: "inline", marginRight: "6px" }}
                        />
                        คะแนนรวม: {summary?.overall_score || 0}/100
                    </div>
                    <div
                        className={`readiness-badge ${getReadinessClass(summary?.readiness_level)}`}
                    >
                        <Star size={14} />
                        {summary?.readiness_level || "N/A"}
                    </div>
                    {resumeAnalysis && (
                        <p
                            style={{
                                marginTop: "16px",
                                color: "var(--text-secondary)",
                                fontSize: "14px",
                            }}
                        >
                            Resume Matching Score: {resumeAnalysis.matching_score}%
                        </p>
                    )}
                    {summary?.is_demo && (
                        <div
                            style={{
                                marginTop: "16px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 12px",
                                background: "rgba(245, 158, 11, 0.1)",
                                border: "1px solid rgba(245, 158, 11, 0.2)",
                                borderRadius: "16px",
                                fontSize: "12px",
                                color: "var(--accent-orange)",
                            }}
                        >
                            ⚡ Demo Mode (Mock Data)
                        </div>
                    )}
                </div>

                {/* Overall Feedback */}
                <div
                    className="glass-card"
                    style={{ padding: "24px", marginBottom: "24px" }}
                >
                    <h3
                        style={{
                            fontSize: "16px",
                            fontWeight: 700,
                            marginBottom: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <Lightbulb size={18} color="var(--accent-cyan)" />
                        ภาพรวม
                    </h3>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            fontSize: "14px",
                            lineHeight: 1.7,
                        }}
                    >
                        {summary?.overall_feedback}
                    </p>
                    {summary?.confidence_assessment && (
                        <p
                            style={{
                                marginTop: "12px",
                                color: "var(--text-muted)",
                                fontSize: "13px",
                                fontStyle: "italic",
                            }}
                        >
                            🎤 ความมั่นใจ: {summary.confidence_assessment}
                        </p>
                    )}
                </div>

                {/* Grid */}
                <div className="dashboard-grid">
                    <div className="glass-card dashboard-card">
                        <h3>
                            <TrendingUp size={18} color="var(--accent-green)" />
                            จุดแข็ง
                        </h3>
                        <ul>
                            {summary?.strengths?.map((s, i) => (
                                <li key={i}>
                                    <CheckCircle
                                        size={14}
                                        color="var(--accent-green)"
                                        style={{ flexShrink: 0, marginTop: 3 }}
                                    />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="glass-card dashboard-card">
                        <h3>
                            <TrendingDown size={18} color="var(--accent-orange)" />
                            จุดที่ต้องปรับปรุง
                        </h3>
                        <ul>
                            {summary?.improvements?.map((im, i) => (
                                <li key={i}>
                                    <AlertCircle
                                        size={14}
                                        color="var(--accent-orange)"
                                        style={{ flexShrink: 0, marginTop: 3 }}
                                    />
                                    {im}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="glass-card dashboard-card">
                        <h3>
                            <Target size={18} color="var(--accent-purple)" />
                            สิ่งที่ควรทำต่อไป
                        </h3>
                        <ul>
                            {summary?.next_steps?.map((step, i) => (
                                <li key={i}>
                                    <span style={{ color: "var(--accent-purple)" }}>
                                        {i + 1}.
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div
                    style={{
                        textAlign: "center",
                        marginTop: "32px",
                        display: "flex",
                        gap: "16px",
                        justifyContent: "center",
                        flexWrap: "wrap",
                    }}
                >
                    <Link to="/interview" className="btn btn-primary">
                        <RotateCcw size={16} />
                        ฝึกซ้อมอีกรอบ
                    </Link>
                    <Link to="/resume" className="btn btn-secondary">
                        <ArrowLeft size={16} />
                        กลับไปปรับ Resume
                    </Link>
                </div>
            </div>
        </div>
    );
}
