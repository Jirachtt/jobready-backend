import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {getSummary,errorMessage} from '../services/api';
import {readJson,save} from '../services/session';
import ResultNotice from '../components/ResultNotice';
export default function DashboardPage(){
 const [answers]=useState(()=>readJson('interviewAnswers',[]));
 const [resume]=useState(()=>readJson('resumeAnalysis'));
 const [summary,setSummary]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function load(){
  setLoading(true);setError('');
  try{const data=await getSummary(answers,resume);setSummary(data);save('dashboardSummary',{answers:JSON.stringify(answers),data});}
  catch(e){setError(errorMessage(e));}finally{setLoading(false);}
 }
 useEffect(()=>{
  if(!Array.isArray(answers)||!answers.length)return;
  const cached=readJson('dashboardSummary');
  if(cached?.answers===JSON.stringify(answers)){setSummary(cached.data);return;}
  let active=true;setLoading(true);
  getSummary(answers,resume).then(data=>{if(active){setSummary(data);save('dashboardSummary',{answers:JSON.stringify(answers),data});}}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[answers,resume]);
 function download(){
  const text=['บันทึกฝึกสัมภาษณ์ JobReady',new Date().toLocaleString('th-TH'),summary?.notice||'',summary?.overall_feedback||'',...answers.flatMap((a,i)=>['','คำถาม '+(i+1)+': '+a.question,'คำตอบ: '+a.answer,'ข้อเสนอแนะ: '+(a.feedback||'')])].join('\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='JobReady_Practice_Notes.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 if(!Array.isArray(answers)||!answers.length)return <div className="page"><div className="page-header"><h1>ยังไม่มีบันทึกการฝึก</h1><p>เริ่มฝึกตอบก่อน แล้วกลับมาดูสรุปและดาวน์โหลดบันทึกได้</p><Link className="btn btn-primary" to="/interview">ไปฝึกสัมภาษณ์</Link></div></div>;
 return <div className="page"><div className="page-header"><h1><span className="gradient-text">สรุปการฝึก</span></h1><p>ทบทวนจากคำตอบจริง {answers.length} ข้อในแท็บนี้</p></div><div className="practice-container">
  {loading&&<p role="status">กำลังสรุปผล…</p>}{error&&<div className="workflow-error" role="alert">{error}<button className="btn btn-secondary" onClick={load}>ลองสรุปใหม่</button></div>}
  {summary&&<><ResultNotice result={summary}/><section className="glass-card practice-card"><h2>{summary.overall_score==null?'สรุปโดยไม่มีคะแนนรวม':String(summary.overall_score)+'/100 · '+summary.grade}</h2><p>{summary.overall_feedback}</p><p className="help-text">{summary.confidence_assessment}</p><p className="help-text">ผลฝึกไม่ใช่โอกาสได้งานหรือการยืนยันความเหมาะสมของผู้สมัคร</p></section><div className="results-grid">{[['จุดที่ทำไว้แล้ว','strengths'],['สิ่งที่ควรฝึกเพิ่ม','improvements'],['ขั้นตอนต่อไป','next_steps']].map(([label,key])=><section key={key} className="glass-card result-card"><h3>{label}</h3><ul>{(summary[key]||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></section>)}</div></>}
  <section className="glass-card practice-card"><h2>บันทึกคำถามและคำตอบ</h2>{answers.map((a,i)=><details key={i}><summary>ข้อ {i+1}: {a.question}</summary><p>{a.answer}</p><p className="help-text">{a.feedback}</p></details>)}</section>
  <div className="workflow-actions"><button className="btn btn-primary" onClick={download}>ดาวน์โหลดบันทึก .txt</button><Link className="btn btn-secondary" to="/interview">ฝึกอีกชุด</Link><Link className="btn btn-secondary" to="/resume">ปรับเรซูเม่</Link></div>
 </div></div>;
}
