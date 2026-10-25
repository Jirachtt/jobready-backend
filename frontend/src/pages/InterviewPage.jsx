import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {getQuestions,evaluateAnswer,errorMessage} from '../services/api';
import {readText,readJson,save,remove} from '../services/session';
import ResultNotice from '../components/ResultNotice';
export default function InterviewPage(){
 const navigate=useNavigate(),inputRef=useRef(null),completed=useRef(false);
 const [resume]=useState(()=>readText('resumeText')),[jd]=useState(()=>readText('jdText'));
 const restored=useRef((()=>{const s=readJson('interviewSession',{});return s.questions?.length&&s.answers?.length>=s.questions.length?{}:s;})());
 const [mode,setMode]=useState(restored.current.mode||'technical');
 const [questions,setQuestions]=useState(restored.current.questions||[]);
 const [index,setIndex]=useState(restored.current.index||0);
 const [answers,setAnswers]=useState(restored.current.answers||[]);
 const [input,setInput]=useState(restored.current.input||'');
 const [feedback,setFeedback]=useState(restored.current.feedback||null);
 const [questionResult,setQuestionResult]=useState(restored.current.questionResult||null);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const current=questions[index];
 useEffect(()=>{if(!completed.current)save('interviewSession',{mode,questions,index,answers,input,feedback,questionResult});},[mode,questions,index,answers,input,feedback,questionResult]);
 async function start(){
  setLoading(true);setError('');remove('dashboardSummary');remove('interviewAnswers');
  try{const data=await getQuestions(resume,jd,mode);if(!data.questions?.length)throw new Error('No questions');
   setQuestions(data.questions);setQuestionResult(data);setIndex(0);setAnswers([]);setInput('');setFeedback(null);
  }catch(e){setError(errorMessage(e));}finally{setLoading(false);}
 }
 async function submit(){
  if(!input.trim()||!current)return;
  setLoading(true);setError('');
  try{setFeedback(await evaluateAnswer(current.question_th||current.question,input.trim(),jd,resume));}
  catch(e){setError(errorMessage(e));}finally{setLoading(false);}
 }
 function next(){
  if(!feedback)return;
  const updated=[...answers,{question:current.question_th||current.question,answer:input.trim(),score:feedback.score??null,provider:feedback.provider,feedback:feedback.feedback}];
  if(index+1>=questions.length)completed.current=true;
  setAnswers(updated);setInput('');setFeedback(null);
  if(index+1>=questions.length){save('interviewAnswers',updated);remove('interviewSession');remove('dashboardSummary');navigate('/dashboard');}
  else{setIndex(index+1);inputRef.current?.focus();}
 }
 if(!resume||!jd)return <div className="page"><div className="page-header"><h1>เตรียมข้อมูลก่อนฝึก</h1><p>วางเรซูเม่และรายละเอียดงานก่อน เพื่อให้คำถามเชื่อมกับงานที่สมัคร</p><Link className="btn btn-primary" to="/resume">ไปหน้าเรซูเม่</Link></div></div>;
 return <div className="page"><div className="page-header"><h1><span className="gradient-text">ฝึกสัมภาษณ์ทีละข้อ</span></h1><p>คำตอบค้างอยู่ได้เมื่อกลับมาหน้านี้ในแท็บเดิม</p></div><div className="practice-container">
  {!questions.length?<section className="glass-card practice-card"><h2>เลือกชุดคำถาม</h2><div className="workflow-actions">{[['technical','เทคนิค'],['behavioral','ประสบการณ์และการทำงาน']].map(([value,label])=><button key={value} aria-pressed={mode===value} className={'btn '+(mode===value?'btn-primary':'btn-secondary')} disabled={loading} onClick={()=>setMode(value)}>{label}</button>)}</div><button className="btn btn-primary" disabled={loading} onClick={start}>{loading?'กำลังเตรียมคำถาม…':'เริ่มฝึก 5 ข้อ'}</button></section>:<>
   <ResultNotice result={questionResult}/><section className="glass-card practice-card">
   <p className="help-text">คำถาม {index+1} / {questions.length} · {current?.category}</p><h2>{current?.question_th||current?.question}</h2><p className="help-text">{current?.question}</p>
   <label className="input-label" htmlFor="practice-answer">คำตอบของคุณ</label><textarea ref={inputRef} id="practice-answer" className="jd-input" rows={7} maxLength={8000} disabled={loading||!!feedback} value={input} onChange={e=>setInput(e.target.value)} placeholder="ลองตอบด้วยข้อมูลจริง: บริบท ส่วนที่ทำ ขั้นตอนตรวจ และผลที่ยืนยันได้..."/>
   {!feedback&&<button className="btn btn-primary" disabled={loading||!input.trim()} onClick={submit}>{loading?'กำลังตรวจคำตอบ…':'รับข้อเสนอแนะ'}</button>}
   {feedback&&<div className="practice-feedback"><ResultNotice result={feedback}/><h3>{feedback.score==null?'เช็กลิสต์ทบทวนคำตอบ':'คะแนนฝึกจาก AI: '+feedback.score+'/10'}</h3><p>{feedback.feedback}</p>{feedback.rubric&&<ul>{feedback.rubric.map(x=><li key={x.label}>{x.found?'พบคำที่เกี่ยวข้อง: ':'ลองเติม: '}{x.label}</li>)}</ul>}<h3>ลองปรับแบบนี้</h3><p>{feedback.coach_tip}</p><p>{feedback.improved_answer_hint}</p><h3>ตัวอย่างสำหรับซ้อม</h3><p>{feedback.sample_answer}</p><p className="help-text">ตรวจและเติมเฉพาะข้อเท็จจริงของคุณ ตัวอย่างไม่ใช่ประสบการณ์ที่ยืนยันแล้วของผู้ใช้ทุกคน</p><div className="workflow-actions"><button className="btn btn-secondary" onClick={()=>setFeedback(null)}>ลองตอบข้อนี้ใหม่</button><button className="btn btn-primary" onClick={next}>{index+1===questions.length?'บันทึกและดูสรุป':'บันทึกและไปข้อถัดไป'}</button></div></div>}
   </section><button className="btn btn-secondary" disabled={loading} onClick={()=>{setQuestions([]);setAnswers([]);setIndex(0);setFeedback(null);setInput('');remove('interviewAnswers');remove('dashboardSummary');}}>เริ่มชุดฝึกใหม่</button>
  </>}
  {error&&<div className="workflow-error" role="alert">{error} คำตอบของคุณยังอยู่ กรุณาลองอีกครั้ง</div>}
 </div></div>;
}
