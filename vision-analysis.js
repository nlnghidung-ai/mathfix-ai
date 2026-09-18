/* Cầu nối giữa giao diện và server.mjs. API key chỉ nằm ở PowerShell/server. */
window.HomeworkAnalysisService = {
  async analyze(image) {
    if (location.protocol === 'file:') throw new Error('Hãy mở trang bằng http://localhost:3000/dashboard.html để AI có thể phân tích ảnh.');
    let response;
    try { response = await fetch('/.netlify/functions/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({image}) }); }
    catch { throw new Error('Chưa kết nối được máy chủ AI. Hãy kiểm tra PowerShell vẫn đang hiện “LearnPath AI: http://localhost:3000”.'); }
    const raw = await response.json();
    const analyses = raw.analyses || (raw.errors?.length ? [raw] : []);
    if (!response.ok || !raw.readable || raw.needsRetake || !analyses.length) throw new Error(raw.message || 'AI chưa đọc đủ rõ để kết luận lỗi. Hãy chụp rõ phần đề và bài làm.');
    const levels=[...Array(8).fill('Cơ bản'),...Array(2).fill('Nâng cao')];
    const normalize = (item, index) => {
      const errors = item.errors || [];
      const topic = item.topic || errors[0]?.title || 'Kiến thức cần ôn';
      return {
        title:item.title || `Bài ${index + 1}`, subject:{id:'detected-subject',name:item.subject || raw.subject || 'Toán'}, knowledgePoint:{id:`topic-${index}`,name:topic},
        learningErrors:errors.map((error,errorIndex)=>({
          id:`${index}-${errorIndex}`, position:error.position || `Bước ${errorIndex + 1}`, title:error.title || 'Cần xem lại phép tính', severity:'revisit',
          studentWork:error.studentWork || 'Chưa đọc rõ bước làm', correction:error.expectedWork || error.correction || 'Xem lại lời giải',
          explanation:error.explanation || 'Hãy so sánh lại với dữ kiện đề bài.', tip:error.note || 'Tính lại từng bước trước khi chuyển sang bước tiếp theo.'
        })),
        learningResources:[{id:`video-${index}`,type:'video',title:`Ôn lại: ${topic}`,url:`https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' toán')}`}],
        learningPath:[{step:1,title:`Học lại: ${topic}`,goal:'Xem lại kiến thức và ví dụ cơ bản trước khi luyện tập.'},{step:2,title:'AI tạo 10 bài luyện',goal:'8 câu cơ bản để củng cố nền tảng và 2 câu nâng cao để vận dụng.'},{step:3,title:'AI nhận xét sau luyện tập',goal:'Xem rõ lỗi sai ở cả phần cơ bản và nâng cao.'}],
        generatedExercises:(item.exercises || []).slice(0,10).map((exercise,exerciseIndex)=>({level:levels[exerciseIndex],question:exercise.question,answer:String(exercise.answer)})),
        aiRecommendation:{message:item.improvements?.[0] || `AI đã phát hiện ${errors.length} điểm cần xem lại trong ${item.title || `bài ${index + 1}`}.`,priority:'normal'}
      };
    };
    return { analysisSets:analyses.map(normalize), sourceImage:image };
  },
  async reviewPractice(data) {
    let response;
    try { response = await fetch('/.netlify/functions/review-practice', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); }
    catch { throw new Error('Chưa kết nối được máy chủ AI. Hãy kiểm tra PowerShell vẫn đang mở.'); }
    const raw = await response.json();
    if (!response.ok) throw new Error(raw.message || 'AI chưa thể tổng hợp nhận xét.');
    return raw;
  }
};
