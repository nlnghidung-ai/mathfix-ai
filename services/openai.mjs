// Chỉ thị 0: Đọc nguyên văn nội dung bài toán từ ảnh
const scanInstructions = `Bạn là trợ lý đọc ảnh bài làm học sinh Việt Nam. Hãy đọc trung thực nguyên văn:
1. Đề bài bài toán trong ảnh.
2. Từng bước giải hoặc bài làm của học sinh trong ảnh.
Không giải bài, không nhận xét đúng sai ở bước này.
QUY TẮC HIỂN THỊ TOÁN HỌC: Mọi biểu thức toán học (phân số, căn bậc, lũy thừa, số mũ, phương trình) hãy viết dưới dạng LaTeX kẹp giữa cặp dấu $, ví dụ: $x^{12}$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\sqrt[3]{x}$.
QUY TẮC NGÔN NGỮ: Toàn bộ nội dung trả về (problemText, studentWorkText, message) BẮT BUỘC 100% BẰNG TIẾNG VIỆT.
Trả về duy nhất JSON đúng cấu trúc:
{"readable":true,"needsRetake":false,"problemText":"Nguyên văn đề bài đọc được","studentWorkText":"Nguyên văn bài làm của học sinh","message":""}
Nếu ảnh quá mờ không đọc được: readable:false, needsRetake:true, message:"Ảnh quá mờ hoặc thiếu sáng, hãy chụp lại."`;

// Chỉ thị 1: Phân tích bài làm và tìm lỗi sai
const analyzeInstructions = `Bạn là trợ lý sư phạm phân tích ẢNH BÀI LÀM học sinh Việt Nam.
Quy trình bắt buộc: (1) đọc đề bài, (2) đọc từng phép tính/bước làm của học sinh, (3) tự tính lại, (4) chỉ ra lỗi dựa trên bằng chứng nhìn thấy trong ảnh.
Ảnh có thể có NHIỀU bài. Phải tách từng bài độc lập; không gộp lỗi của bài này sang bài khác.
Chỉ tập trung phát hiện lỗi và kiến thức cần ôn, KHÔNG tự tạo bài tập.

QUY TẮC HIỂN THỊ TOÁN HỌC BẮT BUỘC:
Mọi công thức, biểu thức toán học (lũy thừa, căn thức, phân số, phương trình, số mũ) BẮT BUỘC viết dưới dạng LaTeX chuẩn kẹp giữa cặp dấu $, ví dụ: $x^2$, $n^{12}$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\sqrt[3]{x}$. Tuyệt đối không viết thô x^2 hay a/b.

QUY TẮC NGÔN NGỮ BẮT BUỘC:
TOÀN BỘ các trường văn bản trong JSON (gồm title, topic, position, expectedWork, explanation, note, improvements) BẮT BUỘC 100% PHẢI VIẾT BẰNG TIẾNG VIỆT, tuyệt đối KHÔNG được dùng tiếng Anh.
- expectedWork: Cách làm đúng / phép tính đúng kèm công thức LaTeX $...$.
- explanation: Lời giải thích vì sao sai và cách sửa bằng tiếng Việt dễ hiểu kèm công thức $...$.
- note: Mẹo nhỏ hoặc lưu ý ngắn gọn bằng tiếng Việt giúp học sinh tránh lặp lại lỗi.

Trả về duy nhất JSON đúng cấu trúc:
{"readable":true,"needsRetake":false,"message":"","analyses":[{"title":"Bài 1","subject":"Toán","topic":"","errors":[{"position":"Bước 1","studentWork":"","expectedWork":"","title":"","explanation":"","note":""}],"improvements":[""]}]}
Nếu không đọc rõ: readable:false, needsRetake:true, analyses:[] và message nêu rõ bằng tiếng Việt phần nào cần chụp lại.
Nếu readable:true: mỗi phần tử analyses là đúng một bài có ít nhất một lỗi nhìn thấy.`;

// Chỉ thị 1.5: Thẩm định lại bước giải khi học sinh bấm "AI chỉ sai rồi"
const recheckInstructions = `Bạn là chuyên gia thẩm định sư phạm Toán học.
Học sinh phản hồi rằng: "AI chỉ sai rồi" ở một bước giải mà AI trước đó đã báo lỗi.
Nhiệm vụ của bạn: Hãy bình tĩnh, đặt giả định học sinh có thể làm đúng (ví dụ làm cách khác, biến đổi tắt, hoặc cách hiểu tương đương). Hãy tự giải lại và kiểm tra độc lập từng phép tính:
- Nếu học sinh LÀM ĐÚNG (AI trước đó bắt lỗi sai oan): Hãy thừa nhận, gửi lời xin lỗi và khen ngợi cách làm hợp lý của học sinh.
- Nếu học sinh THỰC SỰ LÀM SAI: Hãy giải thích lại thật ân cần, chi tiết từng phép tính để học sinh hiểu rõ vì sao bước đó chưa đúng.
QUY TẮC: Mọi công thức toán kẹp giữa $, toàn bộ lời giải thích bằng 100% TIẾNG VIỆT.
Trả về duy nhất JSON đúng cấu trúc:
{
  "isStudentCorrect": true hoặc false,
  "verdictTitle": "Học sinh làm đúng" hoặc "Bước này vẫn có lỗi sai",
  "explanation": "Lời giải thích chi tiết, thấu đáo và hòa nhã bằng tiếng Việt..."
}`;

// Chỉ thị 2: Sinh ĐÚNG 4 bài luyện tập từ lỗi sai
const exerciseInstructions = `Bạn là trợ lý sư phạm Toán. Dựa vào chủ đề và các lỗi học sinh vừa mắc phải, hãy TỰ TẠO bộ luyện tập gồm ĐÚNG 4 câu bám sát dạng toán và lỗi này để học sinh củng cố kiến thức:
- Câu 1 (level: "Dễ hơn"): Dạng bài đơn giản hơn một chút để củng cố lý thuyết và quy tắc tính.
- Câu 2 và Câu 3 (level: "Tương đương"): Cùng mức độ với bài làm trong ảnh để rèn luyện lại cách giải.
- Câu 4 (level: "Nâng cao"): Mở rộng thêm một chút để vận dụng.
QUY TẮC:
- Mọi công thức toán trong question và solution BẮT BUỘC dùng định dạng LaTeX kẹp giữa cặp dấu $, ví dụ: $\\frac{1}{2}$, $x^3$, $\\sqrt{2x + 1}$.
- TOÀN BỘ đề bài (question) và lời giải (solution) BẮT BUỘC 100% BẰNG TIẾNG VIỆT.
- question: chỉ chứa nội dung đề bài, KHÔNG ghi tiền tố "Câu 1:" hay "Bài 1:".
- answer: đáp án ngắn gọn (chỉ số nguyên, phân số dạng a/b, hoặc biểu thức rút gọn), không giải thích dài dòng ở trường answer.
- solution: lời giải ngắn gọn 1-2 dòng bằng tiếng Việt có công thức $.
- level: nhận đúng 1 trong 3 giá trị: "Dễ hơn", "Tương đương", "Nâng cao".
Trả về DUY NHẤT JSON đúng cấu trúc:
{"exercises":[{"level":"Dễ hơn","question":"","answer":"","solution":""}]}`;

// Chỉ thị 3: Nhận xét sau bài luyện tập
const reviewInstructions = `Bạn là trợ lý sư phạm. Dựa HOÀN TOÀN vào dữ liệu bài luyện đã nộp, chỉ xét attempts có isCorrect:false, đúng thứ tự; không bịa thêm lỗi.
QUY TẮC: Mọi công thức toán dùng $...$, toàn bộ nhận xét, các bước giải mẫu và kế hoạch học tập (studyPlanner) BẮT BUỘC 100% BẰNG TIẾNG VIỆT.
Với MỖI câu sai, tạo 2 đến 4 bước giải đúng, rõ như bài làm ngắn. Mỗi bước một câu, tối đa 18 từ.
summary tối đa 2 câu bằng tiếng Việt. Tạo studyPlanner bám sát lỗi sai: today, tomorrow, review; mỗi mục tối đa 22 từ bằng tiếng Việt.
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

// BỘ TỰ ĐỘNG SỬA VÀ VÁ TẤT CẢ LỖI JSON
function repairJson(jsonStr) {
  let str = jsonStr.trim();
  str = str.replace(/\}\s*\{/g, '},{');
  str = str.replace(/\]\s*\[/g, '],[');
  str = str.replace(/,\s*([\}\]])/g, '$1');

  let result = '';
  let inString = false;
  let i = 0;
  const stack = [];

  while (i < str.length) {
    const char = str[i];
    if (!inString) {
      if (char === '"') inString = true;
      else if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        const top = stack[stack.length - 1];
        if ((char === '}' && top === '{') || (char === ']' && top === '[')) stack.pop();
      }
      result += char;
      i++;
    } else {
      if (char === '"') {
        const lookahead = str.slice(i + 1, i + 15).trimStart();
        if (lookahead.length === 0 || /^[,}\]:]/.test(lookahead)) {
          inString = false;
          result += char;
          i++;
        } else {
          result += "'";
          i++;
        }
      } else if (char === '\\') {
        const next = str[i + 1];
        if (!next) {
          result += '\\\\';
          i++;
        } else if (next === '"' || next === '\\' || next === '/') {
          result += '\\' + next;
          i += 2;
        } else if (next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't') {
          const afterNext = str[i + 2];
          if (afterNext && /[a-zA-Z]/.test(afterNext)) {
            result += '\\\\' + next;
            i += 2;
          } else {
            result += '\\' + next;
            i += 2;
          }
        } else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(str.slice(i + 2, i + 6))) {
          result += str.slice(i, i + 6);
          i += 6;
        } else {
          result += '\\\\' + next;
          i += 2;
        }
      } else if (char === '\n') {
        result += '\\n';
        i++;
      } else if (char === '\r') {
        i++;
      } else if (char === '\t') {
        result += '\\t';
        i++;
      } else {
        result += char;
        i++;
      }
    }
  }

  if (inString) result += '"';
  result = result.replace(/,\s*$/, '');
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === '{') result += '}';
    else if (open === '[') result += ']';
  }

  return result;
}

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Mô hình không trả về dữ liệu hợp lệ.');
  const cleaned = repairJson(match[0]);
  return JSON.parse(cleaned);
}

async function requestAI(input) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Chưa cấu hình OPENAI_API_KEY trên Netlify.');
  
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  
  const payload = {
    model: model,
    store: false,
    input: input,
    max_output_tokens: 4096
  };

  if (model.includes('gpt-5') && !model.includes('nano')) {
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

// BƯỚC 0: Quét nhanh nội dung bài toán
export async function scanImage(image) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('Ảnh tải lên không hợp lệ.');
  const requestCode = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${scanInstructions}\n\nMã phiên: ${requestCode}.` },
    { type: 'input_image', image_url: image, detail: 'high' }
  ] }]);
}

// BƯỚC 1: Phân tích bài làm và tìm lỗi sai
export async function analyzeImage(image, transcribed) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('Ảnh tải lên không hợp lệ.');
  const requestCode = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const contextNote = transcribed ? `\nNội dung học sinh đã kiểm tra và xác nhận:\n- Đề bài: ${transcribed.problemText}\n- Bài làm: ${transcribed.studentWorkText}\n` : '';
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${analyzeInstructions}${contextNote}\nMã phiên: ${requestCode}.` },
    { type: 'input_image', image_url: image, detail: 'high' }
  ] }]);
}

// BƯỚC 1.5: Thẩm định lại bước giải khi người dùng bấm "AI chỉ sai rồi"
export async function recheckStep(data) {
  const { problemText, stepError } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${recheckInstructions}\n\nDỮ LIỆU ĐỐI CHIẾU:\n- Đề bài: ${problemText || 'Đại số'}\n- Bước học sinh làm: ${stepError.studentWork}\n- Lỗi AI từng phán đoán: ${stepError.title}\n- Giải thích cũ của AI: ${stepError.explanation}\n\nHãy suy nghĩ lại cẩn thận và đưa ra kết luận công tâm nhất.` }
  ] }]);
}

// BƯỚC 2: Sinh 4 bài luyện tập từ lỗi sai
export async function generateExercises(data) {
  const { topic, errors } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${exerciseInstructions}\n\nChủ đề: ${topic || 'Đại số'}\nCác lỗi học sinh mắc: ${JSON.stringify(errors || [])}` }
  ] }]);
}

// BƯỚC 3: Nhận xét sau bài luyện tập
export async function reviewPractice(data) {
  if (!Array.isArray(data.attempts) || !data.attempts.length) throw new Error('Chưa có đáp án để AI nhận xét.');
  return requestAI([{ role: 'user', content: [{ type: 'input_text', text: `${reviewInstructions}\n\nDữ liệu:\n${JSON.stringify(data)}` }] }]);
}
