// Chỉ thị 1: Đọc ảnh & Tìm lỗi sai (Vision) - Viết công thức toán tự nhiên, KHÔNG dùng $...$
const analyzeInstructions = `Bạn là trợ lý sư phạm phân tích ẢNH BÀI LÀM học sinh Việt Nam.
Quy trình bắt buộc: (1) đọc nguyên văn đề bài, (2) đọc từng phép tính/bước làm của học sinh, (3) tự tính lại, (4) chỉ ra lỗi dựa trên bằng chứng nhìn thấy trong ảnh.
Ảnh có thể có NHIỀU bài. Phải tách từng bài độc lập; không gộp lỗi của bài này sang bài khác. Không khẳng định lỗi nếu chữ hoặc đề bài mờ.
Chỉ tập trung phát hiện lỗi và kiến thức cần ôn, KHÔNG tự tạo bài tập ở bước này.
Các công thức toán học hãy trình bày tự nhiên, dễ đọc, KHÔNG cần kẹp giữa cặp dấu $.

Trả về duy nhất JSON đúng cấu trúc:
{"readable":true,"needsRetake":false,"message":"","analyses":[{"title":"Bài 1","subject":"Toán","topic":"","errors":[{"position":"","studentWork":"","expectedWork":"","title":"","explanation":"","note":""}],"improvements":[""]}]}
Nếu không đọc rõ: readable:false, needsRetake:true, analyses:[] và message nêu rõ phần nào cần chụp lại.
Nếu readable:true: mỗi phần tử analyses là đúng một bài có ít nhất một lỗi nhìn thấy. errors phải dựa vào biểu thức/bài làm trong ảnh.`;

// Chỉ thị 2: Sinh 10 bài luyện tập từ lỗi sai
const exerciseInstructions = `Bạn là trợ lý sư phạm Toán. Dựa vào chủ đề và các lỗi học sinh vừa mắc phải, hãy TỰ TẠO bộ luyện tập gồm đúng 8 câu mức "Cơ bản" và 2 câu mức "Nâng cao" bám sát dạng toán và lỗi này để học sinh củng cố kiến thức.
- 8 câu đầu mức "Cơ bản" (rèn quy tắc, tính toán nền tảng).
- 2 câu sau mức "Nâng cao" (vận dụng, phân tích).
- Các câu hỏi phải đa dạng, tự kiểm tra đáp án.
- question: chỉ chứa nội dung đề bài, KHÔNG ghi tiền tố "Câu 1:" hay "Bài 1:". Trình bày tự nhiên, KHÔNG kẹp dấu $.
- answer: đáp án ngắn gọn (chỉ số nguyên, phân số dạng a/b hoặc biểu thức rút gọn), không giải thích dài dòng ở trường answer.
- solution: lời giải ngắn gọn 1-2 dòng.

Trả về DUY NHẤT JSON đúng cấu trúc:
{"exercises":[{"level":"Cơ bản","question":"","answer":"","solution":""}]}`;

// Chỉ thị 3: Nhận xét sau bài luyện tập
const reviewInstructions = `Bạn là trợ lý sư phạm. Dựa HOÀN TOÀN vào dữ liệu bài luyện đã nộp, chỉ xét attempts có isCorrect:false, đúng thứ tự; không bịa thêm lỗi.
Với MỖI câu sai, tạo 2 đến 4 bước giải đúng, rõ như bài làm ngắn. Mỗi bước một câu, tối đa 18 từ. Không viết lại đề, đáp án hoặc mức độ.
summary tối đa 2 câu. Tạo studyPlanner bám sát lỗi sai: today, tomorrow, review; mỗi mục tối đa 22 từ.
Trả duy nhất JSON: {"summary":"","mistakes":[{"steps":["Bước 1: ...","Bước 2: ..."]}],"studyPlanner":{"today":"","tomorrow":"","review":""}}. Số mistakes phải bằng số attempts sai.`;

function extractText(body) {
  if (body.status === 'incomplete') throw new Error('AI chưa hoàn tất phản hồi. Hãy thử lại với ảnh chỉ chứa một bài.');
  if (body.error) throw new Error('Dịch vụ AI không hoàn tất yêu cầu. Hãy thử lại.');
  if (typeof body.output_text === 'string' && body.output_text.trim()) return body.output_text;
  const parts = [];
  for (const item of body.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'refusal') throw new Error('AI từ chối xử lý nội dung này. Hãy thử ảnh bài Toán khác.');
      if (content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  if (!parts.length) throw new Error('AI trả về phản hồi không có nội dung văn bản. Hãy thử lại.');
  return parts.join('');
}

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Mô hình không trả về dữ liệu hợp lệ.');
  try {
    return JSON.parse(match[0]);
  } catch {
    // Dự phòng tự động sửa nếu có ký tự gạch chéo ngược đơn
    const safeStr = match[0].replace(/\\([a-zA-Z])/g, '\\\\$1');
    return JSON.parse(safeStr);
  }
}

async function requestAI(input) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Chưa cấu hình OPENAI_API_KEY trên Netlify.');
  
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  
  const payload = {
    model: model,
    store: false,
    input: input
  };

  if (model.includes('gpt-5') || model.includes('o1') || model.includes('o3')) {
    payload.reasoning = { effort: 'minimal' };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('API key không hợp lệ hoặc đã bị thu hồi.');
    if (response.status === 429) throw new Error('Tài khoản API chưa có credits hoặc đã chạm giới hạn sử dụng.');
    throw new Error(`Dịch vụ AI trả về mã lỗi: ${response.status}.`);
  }
  return parseJson(extractText(await response.json()));
}

// BƯỚC 1: Đọc ảnh & Tìm lỗi sai (Vision)
export async function analyzeImage(image) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('Ảnh tải lên không hợp lệ.');
  const requestCode = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${analyzeInstructions}\n\nMã phiên: ${requestCode}.` },
    { type: 'input_image', image_url: image, detail: 'high' }
  ] }]);
}

// BƯỚC 2: Sinh 10 bài luyện tập từ chủ đề & lỗi sai (Text thuần)
export async function generateExercises(data) {
  const { topic, errors } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${exerciseInstructions}\n\nChủ đề: ${topic || 'Đại số'}\nCác lỗi học sinh mắc: ${JSON.stringify(errors || [])}` }
  ] }]);
}

// BƯỚC 3: Nhận xét kết quả bài tập
export async function reviewPractice(data) {
  if (!Array.isArray(data.attempts) || !data.attempts.length) throw new Error('Chưa có đáp án để AI nhận xét.');
  return requestAI([{ role: 'user', content: [{ type: 'input_text', text: `${reviewInstructions}\n\nDữ liệu:\n${JSON.stringify(data)}` }] }]);
}
