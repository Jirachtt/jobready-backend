import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Upload,
    FileText,
    CheckCircle,
    AlertCircle,
    XCircle,
    ArrowRight,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Search,
    Lightbulb,
    Tag,
} from "lucide-react";
import { uploadResume, analyzeResume } from "../services/api";

export default function ResumePage() {
    const navigate = useNavigate();
    const fileInputRef = useRef();
    const [file, setFile] = useState(null);
    const [resumeText, setResumeText] = useState("");
    const [jdText, setJdText] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState("");

    const handleFile = async (f) => {
        if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
            setError("กรุณาอัปโหลดไฟล์ PDF เท่านั้น");
            return;
        }
        setFile(f);
        setError("");
        setUploading(true);
        try {
            const data = await uploadResume(f);
            setResumeText(data.text);
        } catch (err) {
            setError(err.response?.data?.detail || "เกิดข้อผิดพลาดในการอ่านไฟล์ PDF");
            setFile(null);
        }
        setUploading(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleAnalyze = async () => {
        if (!resumeText || !jdText.trim()) {
            setError("กรุณาอัปโหลด Resume และระบุ Job Description");
            return;
        }
        setError("");
        setAnalyzing(true);
        // Try up to 2 times on frontend side
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await analyzeResume(resumeText, jdText);
                setAnalysis(result);
                sessionStorage.setItem("resumeText", resumeText);
                sessionStorage.setItem("jdText", jdText);
                sessionStorage.setItem("resumeAnalysis", JSON.stringify(result));
                setAnalyzing(false);
                return;
            } catch (err) {
                if (attempt === 0) {
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
        }
        setError("ระบบกำลังประมวลผลหนัก กรุณากดวิเคราะห์อีกครั้ง");
        setAnalyzing(false);
    };

    const scoreClass =
        analysis?.matching_score >= 70
            ? "high"
            : analysis?.matching_score >= 40
                ? "medium"
                : "low";

    return (
        <div className="page">
            <div className="page-header">
                <h1>
                    <span className="gradient-text">วิเคราะห์ Resume</span>
                </h1>
                <p>
                    อัปโหลด Resume (PDF) และวาง Job Description เพื่อให้ AI
                    วิเคราะห์ความเหมาะสม
                </p>
            </div>

            <div className="resume-layout">
                {/* Left: Upload */}
                <div>
                    <div className="form-section">
                        <label className="input-label">📄 อัปโหลด Resume (PDF)</label>
                        <div
                            className={`upload-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
                            onClick={() => fileInputRef.current.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                style={{ display: "none" }}
                                onChange={(e) => handleFile(e.target.files[0])}
                            />
                            {uploading ? (
                                <>
                                    <div
                                        className="spinner"
                                        style={{ width: 40, height: 40, margin: "0 auto 16px" }}
                                    ></div>
                                    <h3>กำลังอ่านไฟล์...</h3>
                                </>
                            ) : file ? (
                                <>
                                    <div className="upload-icon">
                                        <CheckCircle size={48} color="var(--accent-green)" />
                                    </div>
                                    <h3>อัปโหลดสำเร็จ!</h3>
                                    <div className="upload-filename">
                                        <FileText size={14} />
                                        {file.name}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="upload-icon">
                                        <Upload size={48} />
                                    </div>
                                    <h3>ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</h3>
                                    <p>รองรับไฟล์ .pdf เท่านั้น</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: JD Input */}
                <div>
                    <div className="form-section">
                        <label className="input-label">💼 Job Description</label>
                        <textarea
                            className="jd-input"
                            placeholder="วางรายละเอียดตำแหน่งงานที่ต้องการสมัครลงที่นี่...

เช่น:
- ตำแหน่ง: Frontend Developer
- บริษัท: XYZ Company
- คุณสมบัติ: React, TypeScript, REST API
- ประสบการณ์: 0-2 ปี"
                            value={jdText}
                            onChange={(e) => setJdText(e.target.value)}
                            style={{ minHeight: "280px" }}
                        />
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div
                    style={{
                        maxWidth: "1200px",
                        margin: "16px auto",
                        padding: "12px 20px",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--accent-red)",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Analyze Button */}
            <div
                style={{
                    textAlign: "center",
                    margin: "32px 0",
                }}
            >
                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleAnalyze}
                    disabled={!resumeText || !jdText.trim() || analyzing}
                >
                    {analyzing ? (
                        <>
                            <div className="spinner"></div>
                            กำลังวิเคราะห์ โปรดรอสักครู่...
                        </>
                    ) : (
                        <>
                            <Sparkles size={20} />
                            วิเคราะห์ Resume
                        </>
                    )}
                </button>
            </div>

            {/* Analysis Results */}
            {analysis && (
                <div className="analysis-results">
                    {/* Score Gauge */}
                    <div className="score-gauge">
                        <div className={`score-circle ${scoreClass}`}>
                            <span
                                className="score-number gradient-text"
                            >
                                {analysis.matching_score}
                            </span>
                            <span className="score-label">Matching Score</span>
                        </div>
                        <p
                            style={{
                                color: "var(--text-secondary)",
                                fontSize: "15px",
                                maxWidth: "500px",
                                margin: "0 auto",
                            }}
                        >
                            {analysis.summary}
                        </p>
                        {analysis.is_demo && (
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
                                <AlertCircle size={14} />
                                <span>Demo Mode (Mock Data)</span>
                            </div>
                        )}
                    </div>

                    {/* Results Grid */}
                    <div className="results-grid">
                        <div className="glass-card result-card">
                            <h3>
                                <TrendingUp size={18} color="var(--accent-green)" />
                                จุดแข็ง
                            </h3>
                            <ul className="result-list">
                                {analysis.strengths?.map((s, i) => (
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

                        <div className="glass-card result-card">
                            <h3>
                                <TrendingDown size={18} color="var(--accent-orange)" />
                                จุดที่ควรปรับปรุง
                            </h3>
                            <ul className="result-list">
                                {analysis.weaknesses?.map((w, i) => (
                                    <li key={i}>
                                        <AlertCircle
                                            size={14}
                                            color="var(--accent-orange)"
                                            style={{ flexShrink: 0, marginTop: 3 }}
                                        />
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="glass-card result-card">
                            <h3>
                                <Lightbulb size={18} color="var(--accent-cyan)" />
                                คำแนะนำ
                            </h3>
                            <ul className="result-list">
                                {analysis.suggestions?.map((s, i) => (
                                    <li key={i}>
                                        <Sparkles
                                            size={14}
                                            color="var(--accent-cyan)"
                                            style={{ flexShrink: 0, marginTop: 3 }}
                                        />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="glass-card result-card">
                            <h3>
                                <Tag size={18} color="var(--accent-blue)" />
                                Keywords
                            </h3>
                            <div style={{ marginBottom: "12px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--text-muted)",
                                        marginBottom: "8px",
                                    }}
                                >
                                    ✅ Keyword ที่ตรง:
                                </p>
                                <div>
                                    {analysis.keyword_matches?.map((k, i) => (
                                        <span key={i} className="tag tag-green">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--text-muted)",
                                        marginBottom: "8px",
                                    }}
                                >
                                    ❌ Keyword ที่ขาด:
                                </p>
                                <div>
                                    {analysis.missing_keywords?.map((k, i) => (
                                        <span key={i} className="tag tag-red">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Next Step */}
                    <div style={{ textAlign: "center", marginTop: "40px" }}>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => navigate("/interview")}
                        >
                            <ArrowRight size={20} />
                            ไปฝึกสัมภาษณ์ต่อ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
