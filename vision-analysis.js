/* Cầu nối giữa giao diện và Netlify functions */
window.HomeworkAnalysisService = {
  // Giai đoạn 0: Quét chữ nhanh để học sinh kiểm tra
  async scan(image) {
    const endpoint = location.hostname === 'localhost' ? '/api/analyze' : '/.netlify/functions/analyze';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'scan', image })
    });
    const textData = await response.text();
    let raw;
    try { raw = JSON.parse(textData); }
    catch { throw new Error('Máy chủ phản hồi không đúng định dạng khi quét ảnh.'); }
    if (!response.ok || !raw.readable || raw.needsRetake) {
      throw new Error(raw.message || 'AI chưa đọc rõ được nội dung. Hãy chụp lại ở nơi đủ sáng và rõ nét hơn nhé.');
    }
    return raw;
  },

  // Giai đoạn 1: Phân tích lỗi sai
  async analyze(image, transcribed) {
    if (location.protocol === 'file:') throw new Error('Hãy mở trang bằng server cục bộ hoặc qua Netlify để AI có thể phân tích ảnh.');
    let response;
    const endpoint = location.hostname === 'localhost' ? '/api/analyze' : '/.netlify/functions/analyze';
    try { 
      response = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ action: 'analyze', image, transcribed }) 
      }); 
    } catch { 
      throw new Error('Chưa kết nối được máy chủ AI.'); 
    }
    
    const textData = await response.text();
    let raw;
    try { raw = JSON.parse(textData); }
    catch { throw new Error('Máy chủ phản hồi không đúng định dạng khi phân tích ảnh.'); }

    const analyses = raw.analyses || (raw.errors?.length ? [raw] : []);
    if (!response.ok || !raw.readable || raw.needsRetake || !analyses.length) {
      throw new Error(raw.message || 'AI chưa đọc đủ rõ để kết luận lỗi. Hãy chụp rõ phần đề và bài làm.');
    }
    
    const normalize = (item, index) => {
      const errors = item.errors || [];
      const topic = item.topic || errors[0]?.title || 'Kiến thức cần ôn';
      return {
        title: item.title || `Bài ${index + 1}`,
        subject: { id: 'detected-subject', name: item.subject || raw.subject || 'Toán' },
        knowledgePoint: { id: `topic-${index}`, name: topic },
        learningErrors: errors.map((error, errorIndex) => ({
          id: `${index}-${errorIndex}`, position: error.position || `Bước ${errorIndex + 1}`, title: error.title || 'Cần xem lại phép tính', severity: 'revisit',
          studentWork: error.studentWork || 'Chưa đọc rõ bước làm', correction: error.expectedWork || error.correction || 'Xem lại lời giải',
          explanation: error.explanation || 'Hãy so sánh lại với dữ kiện đề bài.', tip: error.note || 'Tính lại từng bước trước khi chuyển sang bước tiếp theo.'
        })),
        learningResources: [{ id: `video-${index}`, type: 'video', title: `Ôn lại: ${topic}`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' toán')}` }],
        learningPath: [
          { step: 1, title: `Học lại: ${topic}`, goal: 'Xem lại kiến thức và ví dụ cơ bản trước khi luyện tập.' },
          { step: 2, title: 'AI tạo 4 bài luyện', goal: '1 câu dễ hơn, 2 câu cùng mức độ và 1 câu nâng cao.' },
          { step: 3, title: 'AI nhận xét sau luyện tập', goal: 'Xem rõ lỗi sai và hoàn thiện kiến thức.' }
        ],
        generatedExercises: [],
        aiRecommendation: { message: item.improvements?.[0] || `AI đã phát hiện ${errors.length} điểm cần xem lại trong ${item.title || `bài ${index + 1}`}.`, priority: 'normal' }
      };
    };
    return { analysisSets: analyses.map(normalize), sourceImage: image };
  },

  // Giai đoạn 1.5: Yêu cầu AI suy nghĩ và thẩm định lại một bước bị nghi ngờ
  async recheckStep(data) {
    const endpoint = location.hostname === 'localhost' ? '/api/analyze' : '/.netlify/functions/analyze';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recheck', data })
    });
    const textData = await response.text();
    try {
      return JSON.parse(textData);
    } catch {
      throw new Error('Không thể thẩm định lại bước này.');
    }
  },

  // Giai đoạn 2: Tạo bài tập
  async generateExercises(topic, errors) {
    const endpoint = location.hostname === 'localhost' ? '/api/generate-exercises' : '/.netlify/functions/generate-exercises';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, errors })
      });
      return await res.json();
    } catch {
      return { exercises: [] };
    }
  },

  // Giai đoạn 3: Nhận xét kết quả
  async reviewPractice(data) {
    const endpoint = location.hostname === 'localhost' ? '/api/review-practice' : '/.netlify/functions/review-practice';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  }
};
