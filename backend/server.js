import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import dotenv from 'dotenv';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import service from './services/aiService.js';
dotenv.config();
export const MAX_FILE_BYTES=5*1024*1024;
function required(body,key,max){
 if(typeof body?.[key]!=='string'||!body[key].trim()||body[key].length>max){
  const error=new Error(key+' ต้องเป็นข้อความไม่ว่างและยาวไม่เกิน '+max+' ตัวอักษร');error.status=400;throw error;
 }
 return body[key].trim();
}
export function createApp({ai=service,pdfParser=pdf,env=process.env}={}){
 const app=express();
 if(env.RENDER==='true'||env.TRUST_PROXY==='1')app.set('trust proxy',1);
 app.disable('x-powered-by');
 const origins=new Set(['https://jobready-frontend-044r.onrender.com','http://localhost:5173','http://127.0.0.1:5173',...(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)]);
 app.use(helmet());
 app.use(cors({origin:(origin,callback)=>{
  if(!origin||origins.has(origin))return callback(null,true);
  const error=new Error('Origin นี้ไม่ได้รับอนุญาต');error.status=403;callback(error);
 },methods:['GET','POST','OPTIONS'],allowedHeaders:['Content-Type']}));
 app.use(express.json({limit:'256kb'}));
 app.use('/api/',rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,message:{detail:'คำขอมากเกินไป กรุณารอหนึ่งนาทีแล้วลองใหม่'}}));
 const health=(_req,res)=>res.json({status:'healthy',version:'2.0.0',ai:ai.status(),maxFileBytes:MAX_FILE_BYTES,timestamp:new Date().toISOString()});
 app.get('/',health);app.get('/health',health);
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_FILE_BYTES,files:1,fields:0},fileFilter:(_req,file,callback)=>{
  if(!file.originalname.toLowerCase().endsWith('.pdf')){const e=new Error('รองรับไฟล์ PDF เท่านั้น');e.status=400;return callback(e);}
  callback(null,true);
 }});
 app.post('/api/resume/upload',upload.single('file'),async(req,res,next)=>{
  try{
   if(!req.file){const e=new Error('กรุณาเลือกไฟล์ PDF');e.status=400;throw e;}
   if(!req.file.buffer.subarray(0,1024).includes(Buffer.from('%PDF-'))){const e=new Error('ไฟล์นี้ไม่มีรูปแบบ PDF ที่ถูกต้อง');e.status=422;throw e;}
   let data;
   // PDF.js expects an ordinary typed array. Node Buffer.slice() returns a
   // shared view, which makes this legacy parser misread valid cross references.
   try{data=await pdfParser(new Uint8Array(req.file.buffer),{max:50});}
   catch{const e=new Error('อ่าน PDF นี้ไม่ได้ อาจมีรหัสผ่านหรือไฟล์เสีย กรุณาวางข้อความเรซูเม่แทน');e.status=422;throw e;}
   if(!data.text?.trim()){const e=new Error('ไม่พบข้อความใน PDF ภาพสแกน กรุณาวางข้อความหรือทำ OCR ก่อนอัปโหลด');e.status=422;throw e;}
   if(data.text.length>50000||data.numpages>50){const e=new Error('รองรับเรซูเม่ไม่เกิน 50 หน้าและข้อความ 50,000 ตัวอักษร');e.status=422;throw e;}
   res.set('Cache-Control','no-store').json({filename:req.file.originalname,text:data.text.trim(),pages:data.numpages});
  }catch(error){next(error);}
 });
 const route=(url,fn)=>app.post(url,async(req,res,next)=>{
  try{
   if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)){const e=new Error('ข้อมูลคำขอไม่ถูกต้อง');e.status=400;throw e;}
   if(req.body.use_ai!==undefined&&typeof req.body.use_ai!=='boolean'){const e=new Error('use_ai ต้องเป็น boolean');e.status=400;throw e;}
   const result=await fn(req.body,{useAi:req.body.use_ai===true});
   res.set('Cache-Control','no-store').json(result);
  }catch(error){next(error);}
 });
 const context=body=>[required(body,'resume_text',50000),required(body,'jd_text',15000)];
 route('/api/resume/analyze',(body,o)=>ai.analyzeResume(...context(body),o));
 route('/api/interview/questions',(body,o)=>{
  const values=context(body);
  if(!['technical','behavioral'].includes(body.mode)){const e=new Error('กรุณาเลือก technical หรือ behavioral');e.status=400;throw e;}
  return ai.generateQuestions(...values,body.mode,o);
 });
 route('/api/interview/evaluate',(body,o)=>{
  const [resume,jd]=context(body);
  return ai.evaluateAnswer(required(body,'question',3000),required(body,'answer',8000),jd,resume,o);
 });
 route('/api/interview/summary',(body,o)=>{
  const values=body.questions_and_answers;
  if(!Array.isArray(values)||values.length<1||values.length>10){const e=new Error('ต้องมีคำตอบจริง 1-10 ข้อ');e.status=400;throw e;}
  const answers=values.map(row=>{
   const question=required(row,'question',3000),answer=required(row,'answer',8000);
   if(row.score!=null&&(typeof row.score!=='number'||!Number.isFinite(row.score)||row.score<0||row.score>10)){const e=new Error('คะแนนไม่อยู่ในช่วงที่รองรับ');e.status=400;throw e;}
   return {question,answer,score:row.score??null,provider:row.provider==='gemini'?'gemini':'local'};
  });
  const a=body.resume_analysis;
  const safe=a&&typeof a==='object'?{matching_score:typeof a.matching_score==='number'?a.matching_score:null,summary:typeof a.summary==='string'?a.summary.slice(0,3000):''}:null;
  return ai.generateSummary(answers,safe,o);
 });
 app.use((error,_req,res,_next)=>{
  const status=error.code==='LIMIT_FILE_SIZE'?413:error instanceof multer.MulterError?400:error.type==='entity.too.large'?413:error.type==='entity.parse.failed'?400:Number(error.status)||500;
  const detail=error.code==='LIMIT_FILE_SIZE'?'ไฟล์ต้องมีขนาดไม่เกิน 5 MB':status>=500?'ระบบประมวลผลไม่สำเร็จ กรุณาลองใหม่':error.type==='entity.parse.failed'?'JSON ไม่ถูกต้อง':error.message;
  res.status(status).json({detail});
 });
 return app;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT)||8000;
 createApp().listen(port,process.env.HOST||'0.0.0.0',()=>console.log('JobReady API v2 ready on port '+port));
}
