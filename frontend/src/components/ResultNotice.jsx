export default function ResultNotice({result}) {
  if(!result)return null;
  return <div className="result-notice" role="status"><strong>{result.provider==='gemini'?'คำแนะนำจาก AI':'เครื่องมือพื้นฐานจากข้อความ'}</strong><p>{result.notice}</p></div>;
}
