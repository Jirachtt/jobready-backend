const KEYS=['resumeText','jdText','resumeAnalysis','interviewAnswers','dashboardSummary','interviewSession','useAi'];
export function readText(key,fallback=''){try{return sessionStorage.getItem(key)??fallback;}catch{return fallback;}}
export function readJson(key,fallback=null){try{return JSON.parse(readText(key))??fallback;}catch{return fallback;}}
export function save(key,value){try{sessionStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));}catch{/* UI remains usable if storage is unavailable. */}}
export function remove(key){try{sessionStorage.removeItem(key);}catch{/* no persistence */}}
export function clearSession(){KEYS.forEach(remove);}
export function clearPractice(){['interviewAnswers','dashboardSummary','interviewSession'].forEach(remove);}
