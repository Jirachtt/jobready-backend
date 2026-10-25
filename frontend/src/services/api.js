import axios from 'axios';
import {readText} from './session';
const productionApiUrl=import.meta.env.VITE_API_URL||'https://jobready-backend-49l8.onrender.com';
const api=axios.create({baseURL:import.meta.env.DEV?'':productionApiUrl,timeout:65000});
const preferences=()=>({use_ai:readText('useAi')==='true'});
export function errorMessage(error){
 return error.response?.data?.detail||(error.code==='ECONNABORTED'?'ระบบตอบช้าเกินกำหนด ข้อมูลยังอยู่ ลองใหม่ได้':'เชื่อมต่อระบบไม่ได้ กรุณารอสักครู่แล้วลองใหม่');
}
export async function uploadResume(file){
 const data=new FormData();data.append('file',file);
 return (await api.post('/api/resume/upload',data)).data;
}
export async function analyzeResume(resume_text,jd_text){return (await api.post('/api/resume/analyze',{resume_text,jd_text,...preferences()})).data;}
export async function getQuestions(resume_text,jd_text,mode){return (await api.post('/api/interview/questions',{resume_text,jd_text,mode,...preferences()})).data;}
export async function evaluateAnswer(question,answer,jd_text,resume_text){return (await api.post('/api/interview/evaluate',{question,answer,jd_text,resume_text,...preferences()})).data;}
export async function getSummary(questions_and_answers,resume_analysis){return (await api.post('/api/interview/summary',{questions_and_answers,resume_analysis,...preferences()})).data;}
