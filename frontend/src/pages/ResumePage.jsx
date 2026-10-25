import {useState,useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {Upload,ArrowRight,Sparkles,AlertCircle,FileText} from 'lucide-react';
import {uploadResume,analyzeResume,errorMessage} from '../services/api';
import {readText,readJson,save,clearPractice,clearSession} from '../services/session';
import ResultNotice from '../components/ResultNotice';
export default function ResumePage(){
 const navigate=useNavigate(),fileInput=useRef(null),uploadRevision=useRef(0);
 const [resume,setResume]=useState(()=>readText('resumeText'));
 const [jd,setJd]=useState(()=>readText('jdText'));
 const [useAi,setUseAi]=useState(()=>readText('useAi')==='true');
 const [analysis,setAnalysis]=useState(()=>readJson('resumeAnalysis'));
 const [fileName,setFileName]=useState(''),[uploading,setUploading]=useState(false),[analyzing,setAnalyzing]=useState(false),[error,setError]=useState('');
 const busy=uploading||analyzing;
 function changeResume(value){uploadRevision.current++;setUploading(false);setResume(value);setAnalysis(null);save('resumeText',value);save('resumeAnalysis',null);clearPractice();}
 function changeJd(value){setJd(value);setAnalysis(null);save('jdText',value);save('resumeAnalysis',null);clearPractice();}
 async function handleFile(file){
  if(!file)return;
  if(!file.name.toLowerCase().endsWith('.pdf')){setError('กรุณาเลือก PDF หรือวางข้อความแทน');return;}
  if(file.size>5*1024*1024){setError('ไฟล์ต้องมีขนาดไม่เกิน 5 MB');return;}
  const revision=++uploadRevision.current;setUploading(true);setError('');
  try{
   const data=await uploadResume(file);
   if(revision!==uploadRevision.current)return;
   setResume(data.text);setFileName(data.filename);setAnalysis(null);save('resumeText',data.text);save('resumeAnalysis',null);clearPractice();
  }catch(e){if(revision===uploadRevision.current)setError(errorMessage(e));}
  finally{if(revision===uploadRevision.current)setUploading(false);if(fileInput.current)fileInput.current.value='';}
 }
 async function analyze(){
  if(!resume.trim()||!jd.trim())return;
  setAnalyzing(true);setError('');save('useAi',String(useAi));clearPractice();
  try{const data=await analyzeResume(resume,jd);setAnalysis(data);save('resumeAnalysis',data);}
  catch(e){setError(errorMessage(e));}finally{setAnalyzing(false);}
 }
 function clear(){uploadRevision.current++;clearSession();setResume('');setJd('');setUseAi(false);setAnalysis(null);setFileName('');setError('');setUploading(false);}
 return <div className="page">
  <div className="page-header"><h1><span className="gradient-text">วิเคราะห์ Resume</span></h1><p>อ่านเรซูเม่ เทียบรายละเอียดงาน แล้วนำข้อเสนอแนะไปฝึกตอบด้วยประสบการณ์จริง</p></div>
  <div className="workflow-note">ไฟล์ PDF ใช้เพื่ออ่านข้อความและไม่บันทึกลงฐานข้อมูลของแอป ข้อความและผลฝึกเก็บชั่วคราวในแท็บนี้ หากเลือกใช้ AI ข้อความเรซูเม่ รายละเอียดงานและคำตอบจะส่งไป Google Gemini เพื่อประมวลผล</div>
  <div className="resume-layout"><section className="form-section">
   <label className="input-label" htmlFor="resume-file"><Upload size={18}/> อัปโหลด PDF หรือวางข้อความ</label>
   <input ref={fileInput} id="resume-file" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={e=>handleFile(e.target.files?.[0])}/>
   <p className="help-text">{uploading?'กำลังอ่านข้อความ…':fileName||'PDF ไม่เกิน 5 MB / 50 หน้า ภาพสแกนที่อ่านข้อความไม่ได้สามารถวางข้อความแทนได้'}</p>
   <label className="input-label" htmlFor="resume-text"><FileText size={18}/> ข้อความเรซูเม่ (ตรวจและแก้ก่อนวิเคราะห์)</label>
   <textarea id="resume-text" className="jd-input" value={resume} disabled={analyzing} maxLength={50000} onChange={e=>changeResume(e.target.value)} placeholder="วางข้อความประสบการณ์ ทักษะ และโปรเจกต์ของคุณ..." style={{minHeight:300}}/>
   <p className="help-text">{resume.length.toLocaleString()} / 50,000 ตัวอักษร</p>
  </section><section className="form-section">
   <label className="input-label" htmlFor="jd-text">รายละเอียดตำแหน่งงาน</label>
   <textarea id="jd-text" className="jd-input" value={jd} disabled={busy} maxLength={15000} onChange={e=>changeJd(e.target.value)} placeholder="วางหน้าที่และคุณสมบัติของตำแหน่งที่ต้องการสมัคร..." style={{minHeight:380}}/>
   <p className="help-text">{jd.length.toLocaleString()} / 15,000 ตัวอักษร</p>
  </section></div>
  <div className="workflow-note"><label className="consent-label"><input type="checkbox" checked={useAi} disabled={busy} onChange={e=>{setUseAi(e.target.checked);save('useAi',String(e.target.checked));setAnalysis(null);save('resumeAnalysis',null);clearPractice();}}/> ให้ AI ช่วยวิเคราะห์และฝึกตอบ โดยยินยอมส่งข้อความข้างต้นไป Google Gemini</label><p className="help-text">หากไม่เลือก จะตรวจคำทักษะและฝึกด้วยคำถาม/เช็กลิสต์พื้นฐาน ผลไม่มีการสุ่มคะแนน</p></div>
  {error&&<div className="workflow-error" role="alert"><AlertCircle size={18}/>{error}</div>}
  <div className="workflow-actions"><button className="btn btn-primary" disabled={busy||!resume.trim()||!jd.trim()} onClick={analyze}><Sparkles size={18}/>{analyzing?'กำลังวิเคราะห์…':useAi?'วิเคราะห์ด้วย AI':'ตรวจคำในเรซูเม่'}</button><button className="btn btn-secondary" disabled={busy} onClick={clear}>ล้างข้อมูลในแท็บนี้</button></div>
  {analysis&&<section className="analysis-results">
   <ResultNotice result={analysis}/>
   <div className="score-gauge"><div className="score-circle medium"><span className="score-number gradient-text">{analysis.matching_score??'—'}</span><span className="score-label">{analysis.provider==='local'?'คำทักษะที่พบ (%)':'คะแนนช่วยทบทวน /100'}</span></div><p>{analysis.summary}</p><p className="help-text">ใช้เป็นตัวช่วยทบทวน ไม่ใช่เปอร์เซ็นต์โอกาสได้งานหรือผลคัดเลือก</p></div>
   <div className="results-grid">{[['จุดที่พบในข้อความ','strengths'],['จุดที่ควรตรวจเพิ่ม','weaknesses'],['คำแนะนำ','suggestions']].map(([label,key])=><div className="glass-card result-card" key={key}><h3>{label}</h3><ul className="result-list">{(analysis[key]||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div>)}</div>
   <div className="workflow-note"><strong>คำที่ตรงกัน:</strong> {(analysis.keyword_matches||[]).join(', ')||'ยังไม่พบ'}<br/><strong>คำที่ยังไม่พบ:</strong> {(analysis.missing_keywords||[]).join(', ')||'ไม่มีในรายการที่ตรวจ'}<p className="help-text">เพิ่มเฉพาะทักษะที่มีจริง การไม่พบคำไม่ได้แปลว่าคุณทำสิ่งนั้นไม่ได้</p></div>
   <div className="workflow-actions"><button className="btn btn-primary" onClick={()=>navigate('/interview')}>ไปฝึกสัมภาษณ์ <ArrowRight size={18}/></button></div>
  </section>}
 </div>;
}
