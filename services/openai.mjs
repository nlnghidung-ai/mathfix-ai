// Chỉ thị 0: Đọc nội dung & KIỂM ĐỊNH PHẠM VI (MÔN TOÁN THCS LỚP 6, 7, 8, 9 - GDPT 2018)
const scanInstructions = `Bạn là trợ lý đọc ảnh bài tập cho dự án MathFix AI.
NHIỆM VỤ 1: ĐỌC NỘI DUNG TRONG ẢNH (BẮT BUỘC TRUNG THỰC TUYỆT ĐỐI):
- problemText: Nguyên văn đề bài bài toán nhìn thấy trong ảnh.
- studentWorkText: Nguyên văn phần bài làm/chữ viết tay thực tế của học sinh nhìn thấy trong ảnh.

ĐẶC BIỆT LƯU Ý VỀ studentWorkText (CHỐNG TỰ BỊA LỜI GIẢI):
- studentWorkText CHỈ ĐƯỢC CHÉP LẠI bài làm do học sinh viết thực tế trong ảnh.
- Nếu ảnh CHỈ CÓ ĐỀ BÀI (in trong sách giáo khoa, đề thi, tài liệu) mà KHÔNG CÓ BÀI LÀM:
  BẮT BUỘC trả về studentWorkText là chuỗi rỗng: ""
  TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý GIẢI TOÁN, KHÔNG ĐƯỢC TỰ ĐIỀN LỜI GIẢI CỦA AI VÀO studentWorkText Ở BƯỚC NÀY!

NHIỆM VỤ 2: KIỂM ĐỊNH PHẠM VI (CHỈ CHẤP NHẬN MÔN TOÁN THCS LỚP 6, 7, 8, 9 - GDPT 2018):
- ĐƯỢC CHẤP NHẬN (isSupportedScope: true): MÔN TOÁN THCS (Lớp 6, 7, 8, 9) gồm cả ĐẠI SỐ và HÌNH HỌC theo Chương trình GDPT 2018 Việt Nam.
- TỪ CHỐI NGAY LẬP TỨC (isSupportedScope: false):
  + Các môn học khác: Tiếng Anh, Ngữ văn, Lịch sử, Địa lý, Vật lý, Hóa học, Sinh học, Tin học, GDCD...
  + Toán ngoài cấp THCS: Toán Cấp 3 THPT (Lớp 10, 11, 12, Đạo hàm, Tích phân, Hình không gian Oxyz, v.v.), Toán Đại học, Toán Tiểu học (Lớp 1-5).
  + Toán mẹo/đố vui dân gian ngoài chương trình GDPT.
Nếu ngoài phạm vi, hãy ghi rõ lý do lịch sự tại scopeReason (Ví dụ: "Đây là bài tập môn Tiếng Anh..." hoặc "Đây là bài toán thuộc cấp THPT (Lớp 10-12)...").

QUY TẮC HIỂN THỊ: Viết bằng văn bản gõ phím thông thường (x^2, a/b, căn(x)...). Tuyệt đối không dùng mã LaTeX hay dấu $ ở bước này.
QUY TẮC NGÔN NGỮ: Toàn bộ nội dung BẮT BUỘC 100% TIẾNG VIỆT.

Trả về duy nhất JSON đúng cấu trúc:
{
  "readable": true,
  "needsRetake": false,
  "isSupportedScope": true hoặc false,
  "scopeReason": "Lý do nếu ngoài phạm vi Toán THCS...",
  "problemText": "Nguyên văn đề bài",
  "studentWorkText": "Nguyên văn bài làm thực tế trong ảnh (nếu không có bài làm thì bắt buộc để chuỗi rỗng "")",
  "message": ""
}
Nếu ảnh quá mờ: readable:false, needsRetake:true, message:"Ảnh quá mờ hoặc thiếu sáng, hãy chụp lại."`;

// Chỉ thị 1: Phân tích bài làm (Kiểm tra đề + Soi bước giải Toán THCS GDPT 2018)
const analyzeInstructions = `Bạn là chuyên gia sư phạm môn TOÁN THCS (Lớp 6, 7, 8, 9 - Cả Đại số và Hình học) theo Chương trình GDPT 2018 Việt Nam.
Dữ liệu đầu vào gồm Đề bài và Bài làm của học sinh (nếu có).

QUY TRÌNH PHÂN TÍCH:
VIỆC 1: KIỂM TRA TÍNH ĐÚNG/SAI CỦA ĐỀ BÀI:
- Tự giải bài toán để kiểm tra xem đề bài có bị sai, mâu thuẫn dữ kiện, thiếu điều kiện hoặc vô lý/vô nghiệm do lỗi ra đề không.
- Nếu đề bài SAI: isProblemValid: false, problemIssue: "Nêu rõ lỗi sai của đề bài...", problemCorrectionSuggestion: "Gợi ý sửa lại đề cho chuẩn xác...".
- Nếu đề bài ĐÚNG: isProblemValid: true.

VIỆC 2: PHÂN TÍCH BÀI LÀM:
TRƯỜNG HỢP A - Học sinh CÓ bài làm (studentWorkText không rỗng):
- Soi từng bước giải theo chuẩn sư phạm Toán THCS GDPT 2018.
- LÀM TẮT / BỎ BƯỚC: Nếu học sinh tính đúng nhưng làm tắt, nhảy cóc bước biến đổi/chứng minh quan trọng, hãy chỉ rõ bước thiếu và hướng dẫn bổ sung.
- TÍNH GIAO HOÁN & ĐỒNG NHẤT: Tuyệt đối KHÔNG bắt bẻ thứ tự trình bày nếu đúng bản chất toán học (ví dụ: (x+2)(x+3) và (x+3)(x+2) là HOÀN TOÀN ĐÚNG; chứng minh tam giác đồng dạng theo thứ tự đỉnh tương ứng; các góc/đoạn thẳng viết đổi vị trí nhưng cùng đối tượng là đúng).

TRƯỜNG HỢP B - Học sinh KHÔNG CÓ bài làm (studentWorkText để trống):
- Học sinh gửi đề bài để xin hướng dẫn giải.
- AI cung cấp Lời giải mẫu chi tiết từng bước chuẩn GDPT 2018.
- Trong analyses[0]:
  + title: "Hướng dẫn giải chi tiết bài toán"
  + topic: "Tên chủ đề bài toán"
  + errors: [] (để mảng rỗng)
  + modelSolution: "Lời giải mẫu chi tiết từng bước chuẩn mực..."
  + improvements: ["Đọc kỹ phương pháp giải mẫu và rèn luyện 4 bài tập tương tự bên dưới nhé!"]

QUY TẮC HIỂN THỊ TOÁN HỌC: Mọi công thức toán ở kết quả phân tích kẹp giữa cặp dấu $, ví dụ: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\widehat{ABC}$, $AB^2 = AC^2 + BC^2$.
QUY TẮC NGÔN NGỮ: Toàn bộ nội dung BẮT BUỘC 100% TIẾNG VIỆT.

Trả về duy nhất JSON đúng cấu trúc:
{
  "readable": true,
  "needsRetake": false,
  "isProblemValid": true hoặc false,
  "problemIssue": "",
  "problemCorrectionSuggestion": "",
  "message": "",
  "analyses": [
    {
      "title": "Bài 1",
      "subject": "Toán THCS",
      "topic": "Tên chủ đề bài học",
      "modelSolution": "",
      "errors": [
        {
          "position": "Bước 2",
          "studentWork": "Phép tính học sinh làm",
          "expectedWork": "Cách biến đổi đầy đủ, đúng chuẩn",
          "title": "Tên lỗi hoặc 'Làm tắt/Bỏ bước biến đổi'",
          "explanation": "Giải thích chi tiết",
          "note": "Lời khuyên ghi nhớ"
        }
      ],
      "improvements": ["Lời khuyên tổng thể"]
    }
  ]
}`;

// Chỉ thị 1.5: Thẩm định lại bước giải ("AI chỉ sai rồi")
const recheckInstructions = `Bạn là chuyên gia thẩm định sư phạm Toán học (chuyên sâu Toán THCS).
Học sinh phản hồi: "AI chỉ sai rồi".
Nhiệm vụ: Hãy suy nghĩ độc lập, kiểm tra lại tính giao hoán, các phép biến đổi tương đương hoặc cách giải khác của học sinh:
- Nếu học sinh LÀM ĐÚNG (kể cả đổi trật tự thừa số hoặc làm cách khác hợp lệ): Hãy thừa nhận, gửi lời xin lỗi và khen ngợi học sinh.
- Nếu học sinh THỰC SỰ LÀM SAI hoặc BỎ BƯỚC CỐT LÕI: Hãy giải thích cặn kẽ, nhẹ nhàng bằng tiếng Việt.
QUY TẮC: Mọi công thức toán kẹp $, toàn bộ văn bản 100% TIẾNG VIỆT.
Trả về duy nhất JSON:
{
  "isStudentCorrect": true hoặc false,
  "verdictTitle": "Học sinh làm đúng" hoặc "Bước này chưa chính xác",
  "explanation": "Lời giải thích thấu đáo, công tâm..."
}`;

// Chỉ thị 2: Sinh 4 bài luyện tập (Toán THCS lớp 6, 7, 8, 9)
const exerciseInstructions = `Bạn là trợ lý sư phạm Toán. Dựa vào chủ đề Toán THCS và nội dung bài toán, hãy TỰ TẠO ĐÚNG 4 câu:
- Câu 1 (level: "Dễ hơn"): Củng cố lý thuyết và quy tắc cơ bản.
- Câu 2 và Câu 3 (level: "Tương đương"): Cùng mức độ bài học sinh vừa làm.
- Câu 4 (level: "Nâng cao"): Vận dụng nâng cao.
QUY TẮC:
- Mọi công thức toán trong question và solution kẹp giữa cặp dấu $.
- question: chỉ chứa đề bài, KHÔNG ghi tiền tố 'Câu 1:' hay 'Bài 1:'.
- solution: gợi ý các bước giải chuẩn mực 2-4 dòng để đối chiếu.
- answer: đáp số rút gọn cuối cùng.
- level: nhận đúng 1 trong 3 giá trị: "Dễ hơn", "Tương đương", "Nâng cao".
Trả về duy nhất JSON:
{"exercises":[{"level":"Dễ hơn","question":"","answer":"","solution":""}]}`;

// Chỉ thị 2.5: Chấm bài giải tự luận từng bước của học sinh
const gradePracticeInstructions = `Bạn là giáo viên chấm bài thi Toán THCS.
Học sinh nộp các bước giải tự luận (gõ bằng bàn phím thông thường, không dùng mã LaTeX, có thể viết liền hoặc xuống dòng).
Nhiệm vụ: Đọc và chấm toàn bộ các bước biến đổi của học sinh:
1. Đánh giá từng bước biến đổi có đúng quy tắc toán học không (tôn trọng tính giao hoán a*b=b*a, a+b=b+a).
2. Kiểm tra xem học sinh có làm tắt/nhảy cóc bước cốt lõi không.
3. Kiểm tra đáp số cuối cùng.
QUY TẮC: Toàn bộ nhận xét bằng 100% TIẾNG VIỆT, công thức toán trong nhận xét kẹp giữa $.
Trả về duy nhất JSON:
{
  "isCorrect": true hoặc false,
  "score": "Điểm từ 0 đến 10",
  "verdict": "Làm đúng và đủ bước" hoặc "Đáp số đúng nhưng làm tắt" hoặc "Chưa chính xác ở bước biến đổi",
  "feedback": "Nhận xét chi tiết từng bước học sinh đã làm..."
}`;

// Chỉ thị 3: Nhận xét sau bài luyện tập
const reviewInstructions = `Bạn là trợ lý sư phạm. Dựa trên toàn bộ kết quả nộp bài luyện tập, tổng hợp nhận xét 100% BẰNG TIẾNG VIỆT.
summary tối đa 2 câu. Tạo studyPlanner: today, tomorrow, review; mỗi mục tối đa 22 từ.
Trả duy nhất JSON: {"summary":"","mistakes":[{"steps":["Bước 1: ...","Bước 2: ..."]}],"studyPlanner":{"today":"","tomorrow":"","review":""}}.`;

function extractText(body) {
  if (body.status === 'incomplete') throw new Error('AI chưa hoàn tất phản hồi. Hãy thử lại với bài ngắn hơn.');
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

// BƯỚC 0: Quét chữ và kiểm định Toán THCS lớp 6, 7, 8, 9
export async function scanImage(image) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('Ảnh tải lên không hợp lệ.');
  const requestCode = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${scanInstructions}\n\nMã phiên: ${requestCode}.` },
    { type: 'input_image', image_url: image, detail: 'high' }
  ] }]);
}

// BƯỚC 1: Phân tích bài làm (Bao gồm trường hợp không có bài làm -> Hướng dẫn giải mẫu)
export async function analyzeImage(image, transcribed) {
  const requestCode = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hasWork = transcribed?.studentWorkText && transcribed.studentWorkText.trim().length > 0;
  
  const contextNote = `\nNỘI DUNG ĐÃ ĐỐI CHIẾU:\n- Đề bài: ${transcribed?.problemText || ''}\n- Bài làm học sinh: ${hasWork ? transcribed.studentWorkText : '(Học sinh chưa có bài làm, chỉ gửi đề bài để xin hướng dẫn giải mẫu)'}\n`;
  
  const userContent = [{ type: 'input_text', text: `${analyzeInstructions}${contextNote}\nMã phiên: ${requestCode}.` }];
  if (typeof image === 'string' && image.startsWith('data:image/')) {
    userContent.push({ type: 'input_image', image_url: image, detail: 'high' });
  }

  return requestAI([{ role: 'user', content: userContent }]);
}

// BƯỚC 1.5: Thẩm định lại bước giải ("AI chỉ sai rồi")
export async function recheckStep(data) {
  const { problemText, stepError } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${recheckInstructions}\n\nDỮ LIỆU ĐỐI CHIẾU:\n- Đề bài: ${problemText || 'Toán THCS'}\n- Bước học sinh làm: ${stepError.studentWork}\n- Lỗi AI từng phán đoán: ${stepError.title}\n- Giải thích cũ của AI: ${stepError.explanation}\n\nHãy suy nghĩ lại cẩn thận, xem xét tính giao hoán và đưa ra kết luận công tâm nhất.` }
  ] }]);
}

// BƯỚC 2: Sinh 4 bài luyện tập
export async function generateExercises(data) {
  const { topic, errors } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${exerciseInstructions}\n\nChủ đề: ${topic || 'Toán THCS'}\nNội dung cần ôn tập: ${JSON.stringify(errors || [])}` }
  ] }]);
}

// BƯỚC 2.5: Chấm bài giải tự luận từng bước của học sinh
export async function gradePractice(data) {
  const { question, studentSteps, solution } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${gradePracticeInstructions}\n\nDỮ LIỆU CHẤM BÀI:\n- Đề bài: ${question}\n- Lời giải mẫu chuẩn: ${solution}\n- Bài làm tự luận học sinh gõ vào:\n${studentSteps}\n\nHãy phân tích và nhận xét từng bước biến đổi.` }
  ] }]);
}

// BƯỚC 3: Nhận xét sau bài luyện tập
export async function reviewPractice(data) {
  if (!Array.isArray(data.attempts) || !data.attempts.length) throw new Error('Chưa có đáp án để AI nhận xét.');
  return requestAI([{ role: 'user', content: [{ type: 'input_text', text: `${reviewInstructions}\n\nDữ liệu:\n${JSON.stringify(data)}` }] }]);
}
