/* Cầu nối giữa giao diện và server / Netlify functions */
window.HomeworkAnalysisService = {
  // Giai đoạn 1: Gửi ảnh để AI đọc và phát hiện lỗi sai
  async analyze(image) {
    if (location.protocol === 'file:') {
      throw new Error('Hãy mở trang bằng server cục bộ hoặc qua Netlify để AI phân tích ảnh.');
    }

    let response;
    const endpoint = location.hostname === 'localhost' ? '/api/analyze' : '/.netlify/functions/analyze';
    
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      });
    } catch {
      throw new Error('Chưa kết nối được máy chủ AI. Hãy kiểm tra kết nối mạng hoặc server.');
    }

    // Đọc text an toàn trước khi parse JSON để bắt lỗi nếu Netlify trả về trang HTML 504 Timeout
    const textData = await response.text();
    let raw;
    try {
      raw = JSON.parse(textData);
    } catch {
      if (response.status === 504 || textData.includes('504 Gateway') || textData.includes('Time-out')) {
        throw new Error('AI xử lý vượt quá thời gian cho phép của Netlify (Timeout 504). Hãy thử chuyển sang model gpt-5-mini hoặc cắt gọn ảnh hơn.');
      }
      throw new Error(`Máy chủ AI phản hồi không hợp lệ (Mã lỗi ${response.status}). Vui lòng thử lại.`);
    }

    const analyses = raw.analyses || (raw.errors?.length ? [raw] : []);
    if (!response.ok || !raw.readable || raw.needsRetake || !analyses.length) {
      throw new Error(raw.message || 'AI chưa đọc đủ rõ để kết luận lỗi. Hãy chụp rõ phần đề và bài làm.');
    }

    const levels = [...Array(8).fill('Cơ bản'), ...Array(2).fill('Nâng cao')];
    const normalize = (item, index) => {
      const errors = item.errors || [];
      const topic = item.topic || errors[0]?.title || 'Kiến thức cần ôn';
      return {
        title: item.title || `Bài ${index + 1}`,
        subject: { id: 'detected-subject', name: item.subject || raw.subject || 'Toán' },
        knowledgePoint: { id: `topic-${index}`, name: topic },
        learningErrors: errors.map((error, errorIndex) => ({
          id: `${index}-${errorIndex}`,
          position: error.position || `Bước ${errorIndex + 1}`,
          title: error.title || 'Cần xem lại phép tính',
          severity: 'revisit',
          studentWork: error.studentWork || 'Chưa đọc rõ bước làm',
          correction: error.expectedWork || error.correction || 'Xem lại lời giải',
          explanation: error.explanation || 'Hãy so sánh lại với dữ kiện đề bài.',
          tip: error.note || 'Tính lại từng bước trước khi chuyển sang bước tiếp theo.'
        })),
        learningResources: [{
          id: `video-${index}`,
          type: 'video',
          title: `Ôn lại: ${topic}`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' toán')}`
        }],
        learningPath: [
          { step: 1, title: `Học lại: ${topic}`, goal: 'Xem lại kiến thức và ví dụ cơ bản trước khi luyện tập.' },
          { step: 2, title: 'AI tạo 10 bài luyện', goal: '8 câu cơ bản để củng cố nền tảng và 2 câu nâng cao để vận dụng.' },
          { step: 3, title: 'AI nhận xét sau luyện tập', goal: 'Xem rõ lỗi sai ở cả phần cơ bản và nâng cao.' }
        ],
        generatedExercises: (item.exercises || []).slice(0, 10).map((exercise, exerciseIndex) => ({
          level: levels[exerciseIndex] || 'Cơ bản',
          question: exercise.question,
          answer: String(exercise.answer)
        })),
        aiRecommendation: {
          message: item.improvements?.[0] || `AI đã phát hiện ${errors.length} điểm cần xem lại trong ${item.title || `bài ${index + 1}`}.`,
          priority: 'normal'
        }
      };
    };

    return { analysisSets: analyses.map(normalize), sourceImage: image };
  },

  // Giai đoạn 2: Gọi ngầm để sinh 10 bài tập từ lỗi sai (Text thuần, không gửi ảnh)
  async generateExercises(topic, errors) {
    const endpoint = location.hostname === 'localhost' ? '/api/generate-exercises' : '/.netlify/functions/generate-exercises';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, errors })
      });
      const textData = await res.text();
      return JSON.parse(textData);
    } catch {
      return { exercises: [] };
    }
  },

  // Giai đoạn 3: Tổng hợp và nhận xét kết quả làm bài của học sinh
  async reviewPractice(data) {
    let response;
    const endpoint = location.hostname === 'localhost' ? '/api/review-practice' : '/.netlify/functions/review-practice';
    
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch {
      throw new Error('Chưa kết nối được máy chủ AI.');
    }

    const textData = await response.text();
    let raw;
    try {
      raw = JSON.parse(textData);
    } catch {
      if (response.status === 504 || textData.includes('504 Gateway')) {
        throw new Error('Hết thời gian chờ phản hồi nhận xét từ AI (Timeout 504).');
      }
      throw new Error(`AI phản hồi không hợp lệ (Mã lỗi ${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(raw.message || 'AI chưa thể tổng hợp nhận xét.');
    }
    return raw;
  }
};
