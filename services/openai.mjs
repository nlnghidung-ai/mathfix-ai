const instructions = `Bạn là trợ lý sư phạm phân tích ẢNH BÀI LÀM học sinh Việt Nam.
Quy trình bắt buộc: (1) đọc nguyên văn đề bài, (2) đọc từng phép tính/bước làm của học sinh, (3) tự tính lại, (4) chỉ ra lỗi dựa trên bằng chứng nhìn thấy trong ảnh.
Ảnh có thể có NHIỀU bài. Phải tách từng bài độc lập; không gộp lỗi của bài này sang bài khác. Không khẳng định lỗi nếu chữ hoặc đề bài mờ.
Trả về duy nhất JSON đúng cấu trúc:
{"readable":true,"needsRetake":false,"message":"","analyses":[{"title":"Bài 1","subject":"Toán","topic":"","errors":[{"position":"","studentWork":"","expectedWork":"","title":"","explanation":"","note":""}],"exercises":[{"question":"","answer":"","solution":"","level":""}],"improvements":[""]}]}
Nếu không đọc rõ: readable:false, needsRetake:true, analyses:[] và message nêu rõ phần nào cần chụp lại.
Nếu readable:true: mỗi phần tử analyses là đúng một bài có ít nhất một lỗi nhìn thấy. errors phải dựa vào biểu thức/bài làm trong ảnh.
TỰ TẠO bài tập trực tiếp từ lỗi vừa phát hiện, không dùng ngân hàng câu hỏi, dữ liệu PDF, ví dụ có sẵn hoặc câu hỏi từ các lượt trước. Với MỖI bài, tạo đúng 8 câu mức "Cơ bản" và 2 câu mức "Nâng cao". Các câu phải đa dạng, tự kiểm tra đáp án. exercises nhóm theo Cơ bản rồi Nâng cao. question chỉ chứa đề bài, không thêm số thứ tự. answer ngắn, solution ngắn, đúng.`;

const reviewInstructions = `Bạn là trợ lý sư phạm. Dựa HOÀN TOÀN vào dữ liệu bài luyện đã nộp, chỉ xét attempts có isCorrect:false, đúng thứ tự; không bịa thêm lỗi.
Với MỖI câu sai, tạo 2 đến 4 bước giải đúng, rõ như bài làm ngắn. Mỗi bước một câu, tối đa 18 từ và có phép tính/biến đổi CỤ THỂ từ đề. Không viết "đọc kỹ đề", "tính lần lượt" hoặc "đối chiếu đáp án". Không viết lại đề, đáp án hoặc mức độ.
summary tối đa 2 câu. Tạo studyPlanner bám sát lỗi sai: today, tomorrow, review; mỗi mục tối đa 22 từ.
Trả duy nhất JSON: {"summary":"","mistakes":[{"steps":["Bước 1: ...","Bước 2: ..."]}],"studyPlanner":{"today":"","tomorrow":"","review":""}}. Số mistakes phải bằng số attempts sai.`;

function extractText(body) {
  const raw = JSON.stringify(body.output || []);
  const parts = [...raw.matchAll(/"text":"((?:\\\\.|[^"\\\\])*)"/g)].map(match => JSON.parse('"' + match[1] + '"'));
  return body.output_text || parts.join('');
}

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Mô hình không trả về dữ liệu hợp lệ.');
  return JSON.parse(match[0]);
}

async function requestAI(input) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Chưa cấu hình OPENAI_API_KEY trên Netlify.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5', store: false, input })
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('API key không hợp lệ hoặc đã bị thu hồi.');
    if (response.status === 429) throw new Error('Tài khoản API chưa có credits hoặc đã chạm giới hạn sử dụng.');
    throw new Error(`Dịch vụ AI trả về lỗi ${response.status}.`);
  }
  return parseJson(extractText(await response.json()));
}

export async function analyzeImage(image) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('Ảnh tải lên không hợp lệ.');
  const requestCode = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${instructions}\n\nMã lượt tạo độc lập: ${requestCode}. Hãy tạo bộ câu mới cho đúng lượt này.` },
    { type: 'input_image', image_url: image, detail: 'high' }
  ] }]);
}

export async function reviewPractice(data) {
  if (!Array.isArray(data.attempts) || !data.attempts.length) throw new Error('Chưa có đáp án để AI nhận xét.');
  return requestAI([{ role: 'user', content: [{ type: 'input_text', text: `${reviewInstructions}\n\nDữ liệu:\n${JSON.stringify(data)}` }] }]);
}
