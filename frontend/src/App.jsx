import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ResumePage from "./pages/ResumePage";
import InterviewPage from "./pages/InterviewPage";
import DashboardPage from "./pages/DashboardPage";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<main className="page"><h1>ไม่พบหน้านี้</h1><p>ตรวจสอบลิงก์ หรือกลับไปเริ่มใช้งาน JobReady</p><Link className="btn btn-primary" to="/">กลับหน้าแรก</Link></main>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
