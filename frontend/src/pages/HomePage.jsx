import { Link } from "react-router-dom";
import {
    FileSearch,
    MessageSquareText,
    Brain,
    Target,
    Zap,
    ArrowRight,
} from "lucide-react";

export default function HomePage() {
    return (
        <div className="page">
            {/* Hero */}
            <section className="hero">
                <div className="hero-bg"></div>
                <div className="hero-content">
                    <div className="hero-badge">
                        <Zap size={14} />
                        Powered by AI — Gemini 2.0 Flash
                    </div>
                    <h1 className="hero-title">
                        คู่ซ้อม<span className="gradient-text">สัมภาษณ์งาน</span>
                        <br />
                        ส่วนตัวของคุณ
                    </h1>
                    <p className="hero-subtitle">
                        ฝึกตอบคำถามสัมภาษณ์งานกับ AI ที่จำลองเป็น HR มืออาชีพ
                        พร้อมวิเคราะห์ Resume ว่าแมตช์กับงานที่ต้องการแค่ไหน
                        ช่วยให้คุณกล้าพูดและได้งานที่ฝัน
                    </p>
                    <div className="hero-cta">
                        <Link to="/resume" className="btn btn-primary btn-lg">
                            <FileSearch size={20} />
                            เริ่มวิเคราะห์ Resume
                        </Link>
                        <Link to="/interview" className="btn btn-secondary btn-lg">
                            <MessageSquareText size={20} />
                            เริ่มฝึกสัมภาษณ์
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features">
                <h2 className="features-title">
                    ทำไมต้อง <span className="gradient-text">JobReady</span>?
                </h2>
                <p className="features-subtitle">
                    ระบบ AI ที่ออกแบบมาเพื่อช่วยคุณเตรียมตัวสัมภาษณ์งานอย่างมืออาชีพ
                </p>
                <div className="features-grid">
                    <div className="glass-card feature-card">
                        <div className="feature-icon purple">
                            <FileSearch size={24} />
                        </div>
                        <h3>Resume Analyzer</h3>
                        <p>
                            อัปโหลด Resume แล้วให้ AI ตรวจสอบว่าแมตช์กับ Job Description
                            แค่ไหน พร้อมแนะนำ Keyword ที่ขาด และจุดที่ควรแก้ไข
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon cyan">
                            <MessageSquareText size={24} />
                        </div>
                        <h3>Mock Interview</h3>
                        <p>
                            AI จำลองเป็น HR ถามคำถามที่เจาะจงตาม Resume
                            และตำแหน่งงานที่คุณเลือก ทั้ง Technical และ Behavioral
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon green">
                            <Brain size={24} />
                        </div>
                        <h3>Coach Mode</h3>
                        <p>
                            ไม่ใช่แค่ถาม-ตอบ แต่มีโค้ชแนะนำแบบเรียลไทม์ว่าคำตอบดีพอไหม
                            ควรเพิ่มอะไร ปรับโทนยังไง พร้อมให้คะแนนทันที
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon pink">
                            <Target size={24} />
                        </div>
                        <h3>Personalized Questions</h3>
                        <p>
                            คำถามไม่ได้สุ่มมั่ว แต่สร้างจาก Resume
                            และ JD ของคุณโดยเฉพาะ
                            สมัคร Web Dev ก็จะโดนถามเรื่อง Framework ตรงจุด
                        </p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon blue">
                            <Zap size={24} />
                        </div>
                        <h3>Instant Feedback</h3>
                        <p>
                            ได้รับ Feedback ทันทีหลังตอบทุกข้อ พร้อม Dashboard
                            สรุปจุดแข็งจุดอ่อน ช่วยให้รู้ว่าต้องปรับปรุงตรงไหน
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section
                style={{
                    textAlign: "center",
                    padding: "60px 24px",
                    maxWidth: "600px",
                    margin: "0 auto",
                }}
            >
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "16px" }}>
                    พร้อมเริ่ม<span className="gradient-text">ฝึกซ้อม</span>แล้วหรือยัง?
                </h2>
                <p
                    style={{
                        color: "var(--text-secondary)",
                        marginBottom: "28px",
                        fontSize: "15px",
                    }}
                >
                    อัปโหลด Resume และ Job Description แล้วเริ่มฝึกสัมภาษณ์กับ AI ได้เลย
                </p>
                <Link to="/resume" className="btn btn-primary btn-lg">
                    เริ่มเลย
                    <ArrowRight size={18} />
                </Link>
            </section>

            {/* Footer */}
            <footer className="footer">
                <p>
                    © 2026 JobReady — AI-Powered Interview Coach & Resume Analyzer |
                    Powered by Google Gemini
                </p>
            </footer>
        </div>
    );
}
