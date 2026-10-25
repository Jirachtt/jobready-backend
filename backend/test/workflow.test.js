import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiService,analyzeLocally} from '../services/aiService.js';
import {createApp,MAX_FILE_BYTES} from '../server.js';

const resume='Demo Candidate. Built a React dashboard using JavaScript and REST API. Used Git and testing.';
const jd='Junior React developer. JavaScript, REST API, Git, Docker and testing.';
test('keyword coverage is deterministic, grounded and distinguishes Java from JavaScript',()=>{
  assert.deepEqual(analyzeLocally(resume,jd),analyzeLocally(resume,jd));
  assert.equal(analyzeLocally('JavaScript only','Java developer').matching_score,0);
  assert.equal(analyzeLocally('Docker','Docker developer').matching_score,100);
  assert.equal(analyzeLocally('sample','รับสมัครเจ้าหน้าที่ทั่วไป').matching_score,null);
});
test('consent is required before any provider request',async()=>{
  let calls=0;
  const ai=createAiService({env:{GEMINI_API_KEY:'test-key'},fetchImpl:async()=>{calls++;throw new Error('not expected');}});
  const result=await ai.analyzeResume(resume,jd);
  assert.equal(calls,0);assert.equal(result.provider,'local');assert.equal(result.is_demo,false);
});
test('unavailable or malformed AI never invents evaluation scores',async()=>{
  for(const response of [new Response('{}',{status:429}),Response.json({candidates:[{content:{parts:[{text:'{"score":999}'}]}}]})]){
    const ai=createAiService({env:{GEMINI_API_KEY:'test-key'},fetchImpl:async()=>response});
    const result=await ai.evaluateAnswer('How did you debug?', 'I checked the logs.',jd,resume,{useAi:true});
    assert.equal(result.provider,'local');assert.equal(result.score,null);assert.ok(result.sample_answer);
  }
});
test('valid provider output is marked and checked against the requested schema',async()=>{
  const result={score:0,feedback:'ยังไม่ตอบคำถาม',coach_tip:'ยกตัวอย่างที่ตรงคำถาม',improved_answer_hint:'บอกวิธีตรวจ',sample_answer:'ผมจะเริ่มจากตรวจ error และ status ครับ'};
  let sent;
  const ai=createAiService({env:{GEMINI_API_KEY:'test-key',GEMINI_MODEL:'test-model'},fetchImpl:async(_url,options)=>{sent=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(result)}]}}]});}});
  const evaluated=await ai.evaluateAnswer('API error?','I do not know',jd,resume,{useAi:true});
  assert.equal(evaluated.provider,'gemini');assert.equal(evaluated.score,0);assert.equal(evaluated.sample_answer,result.sample_answer);
  assert.ok(sent.generationConfig.responseJsonSchema.required.includes('sample_answer'));
  assert.match(evaluated.tone_analysis,/ข้อความ/);
});
test('local practice completes five questions without fictional grades',async()=>{
  const ai=createAiService({env:{}}),{questions}=await ai.generateQuestions(resume,jd,'technical');
  assert.equal(questions.length,5);
  const answers=[];
  for(const q of questions){
    const answer='ในโปรเจกต์ผมตรวจ status และทดสอบแล้ว พบว่าผลยังไม่สมบูรณ์';
    const evaluation=await ai.evaluateAnswer(q.question_th,answer,jd,resume);
    assert.equal(evaluation.score,null);
    answers.push({question:q.question_th,answer,score:evaluation.score,provider:evaluation.provider});
  }
  const summary=await ai.generateSummary(answers,null);
  assert.equal(summary.overall_score,null);assert.equal(summary.grade,'—');
});
test('summary arithmetic uses recorded scores even when AI returns a different scale',async()=>{
 const supplied={overall_score:7.4,grade:'C',overall_feedback:'สรุปจากข้อมูลสมมติ',strengths:['อธิบายขั้นตอน'],improvements:['ฝึกเพิ่ม'],readiness_level:'สำหรับฝึก',next_steps:['ซ้อมอีกครั้ง'],confidence_assessment:'ข้อความเท่านั้น'};
 const ai=createAiService({env:{GEMINI_API_KEY:'test-key'},fetchImpl:async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify(supplied)}]}}]})});
 const answers=[8,9,8,8,4].map(score=>({question:'q',answer:'synthetic',score,provider:'gemini'}));
 const complete=await ai.generateSummary(answers,null,{useAi:true});
 assert.equal(complete.provider,'gemini');assert.equal(complete.overall_score,74);assert.equal(complete.grade,'B');
 const partial=await ai.generateSummary([...answers,{question:'q',answer:'synthetic',score:null,provider:'local'}],null,{useAi:true});
 assert.equal(partial.overall_score,null);assert.equal(partial.grade,'—');
 const zeros=await ai.generateSummary([{question:'q',answer:'synthetic',score:0,provider:'gemini'}],null,{useAi:true});
 assert.equal(zeros.overall_score,0);assert.equal(zeros.grade,'F');
});
test('HTTP workflow validates files, origins, malformed input and saves real answers',async(t)=>{
  let parsed=0;
  const server=createApp({ai:createAiService({env:{}}),pdfParser:async()=>{parsed++;return {text:resume,numpages:1};},env:{}}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const post=(endpoint,body,headers={})=>fetch(base+endpoint,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  await t.test('health and exact CORS origin',async()=>{
    assert.equal((await (await fetch(base+'/health')).json()).ai.configured,false);
    const good=await fetch(base+'/health',{headers:{origin:'https://jobready-frontend-044r.onrender.com'}});
    assert.equal(good.headers.get('access-control-allow-origin'),'https://jobready-frontend-044r.onrender.com');
    assert.equal((await fetch(base+'/health',{headers:{origin:'https://jobready-frontend-044r.onrender.com.attacker.test'}})).status,403);
  });
  await t.test('invalid field types return 400 instead of crashing',async()=>{
    for(const body of [{resume_text:42,jd_text:jd},{resume_text:resume,jd_text:[]},{resume_text:resume,jd_text:jd,use_ai:'true'}])assert.equal((await post('/api/resume/analyze',body)).status,400);
    assert.equal((await post('/api/interview/evaluate',{resume_text:resume,jd_text:jd,question:'',answer:'sample'})).status,400);
  });
  await t.test('valid PDF payload is parsed; disguised and oversized files fail',async()=>{
    async function upload(buffer,name){const body=new FormData();body.append('file',new Blob([buffer],{type:'application/pdf'}),name);return fetch(base+'/api/resume/upload',{method:'POST',body});}
    assert.equal((await upload(Buffer.from('%PDF-1.7\nfixture'),'resume.pdf')).status,200);
    assert.equal(parsed,1);
    assert.equal((await upload(Buffer.from('not a PDF'),'fake.pdf')).status,422);
    assert.equal((await upload(Buffer.from('%PDF-1.7'),'resume.txt')).status,400);
    assert.equal((await upload(Buffer.alloc(MAX_FILE_BYTES+1),'too-big.pdf')).status,413);
    assert.equal(parsed,1);
  });
  await t.test('analysis, questions, feedback and summary form a complete flow',async()=>{
    const context={resume_text:resume,jd_text:jd};
    const analysis=await (await post('/api/resume/analyze',context)).json();assert.equal(analysis.provider,'local');
    const {questions}=await (await post('/api/interview/questions',{...context,mode:'behavioral'})).json();assert.equal(questions.length,5);
    const feedback=await (await post('/api/interview/evaluate',{...context,question:questions[0].question_th,answer:'ในโปรเจกต์ผมตรวจข้อมูลและทดสอบ ผลคือพบจุดผิด'})).json();
    assert.equal(feedback.score,null);assert.ok(feedback.sample_answer);
    const summaryResponse=await post('/api/interview/summary',{questions_and_answers:[{question:questions[0].question_th,answer:'คำตอบจริงที่บันทึก',score:feedback.score,provider:feedback.provider}],resume_analysis:analysis});
    assert.equal(summaryResponse.status,200);assert.equal((await summaryResponse.json()).overall_score,null);
    assert.equal(summaryResponse.headers.get('cache-control'),'no-store');
    assert.equal((await post('/api/interview/summary',{questions_and_answers:[{question:'q',answer:'a',score:999}]})).status,400);
  });
});
