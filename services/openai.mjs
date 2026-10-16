// Chỉ thị 0: Đọc nội dung & KIỂM ĐỊNH PHẠM VI (MÔN TOÁN THCS LỚP 6, 7, 8, 9 - GDPT 2018)
const scanInstructions = `Bạn là trợ lý đọc ảnh bài tập cho dự án MathFix AI.
NHIỆM VỤ 1: ĐỌC NỘI DUNG TRONG ẢNH (BẮT BUỘC TRUNG THỰC TUYỆT ĐỐI):
- problemText: Nguyên văn đề bài bài toán nhìn thấy trong ảnh.
- studentWorkText: Nguyên văn phần bài làm/chữ viết tay thực tế của học sinh nhìn thấy trong ảnh.

ĐẶC BIỆT LƯU Ý VỀ studentWorkText (CHỐNG TỰ BỊA LỜI GIẢI):
- studentWorkText CHỈ ĐƯỢC CHÉP LẠI bài làm do học sinh viết thực tế trong ảnh.
- Nếu ảnh CHỈ CÓ ĐỀ BÀI mà KHÔNG CÓ BÀI LÀM: BẮT BUỘC trả về studentWorkText là chuỗi rỗng: ""
- TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý GIẢI TOÁN, KHÔNG ĐƯỢC TỰ ĐIỀN LỜI GIẢI CỦA AI VÀO studentWorkText Ở BƯỚC NÀY!

NHIỆM VỤ 2: KIỂM ĐỊNH PHẠM VI (CHỈ CHẤP NHẬN MÔN TOÁN THCS LỚP 6, 7, 8, 9 - GDPT 2018):
- ĐƯỢC CHẤP NHẬN (isSupportedScope: true): MÔN TOÁN THCS (Lớp 6, 7, 8, 9) gồm cả ĐẠI SỐ và HÌNH HỌC theo Chương trình GDPT 2018 Việt Nam.
- TỪ CHỐI NGAY LẬP TỨC (isSupportedScope: false):
  + Các môn học khác: Tiếng Anh, Ngữ văn, Lịch sử, Địa lý, Vật lý, Hóa học, Sinh học, Tin học, GDCD...
  + Toán ngoài cấp THCS: Toán Cấp 3 THPT (Lớp 10, 11, 12), Toán Đại học, Toán Tiểu học.
Nếu ngoài phạm vi, hãy ghi rõ lý do lịch sự tại scopeReason.

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

// Chỉ thị 1: Phân tích bài làm (RÀO CHẮN SƯ PHẠM CẤP 2 - CẤM TUYỆT ĐỐI KIẾN THỨC CẤP 3)
const analyzeInstructions = `Bạn là chuyên gia sư phạm môn TOÁN THCS (Lớp 6, 7, 8, 9 - Cả Đại số và Hình học) theo Chương trình GDPT 2018 Việt Nam.
Dữ liệu đầu vào gồm Đề bài và Bài làm của học sinh (nếu có).

RÀO CHẮN SƯ PHẠM CẤP 2 BẮT BUỘC (TUYỆT ĐỐI CẤM KIẾN THỨC CẤP 3 THPT):
1. Mọi lời giải, phân tích, cách làm đúng (expectedWork) và giải thích (explanation) CHỈ ĐƯỢC PHÉP dùng kiến thức Toán THCS (Lớp 6, 7, 8, 9).
2. CẤM TUYỆT ĐỐI nhắc đến hay sử dụng: Giới hạn (lim, \\lim), Đạo hàm, Tích phân, Khảo sát hàm số, Tiệm cận, Số phức, Vector không gian Oxyz.
3. QUY TẮC XỬ LÝ PHÂN THỨC KHÔNG XÁC ĐỊNH (MẪU SỐ BẰNG 0):
   - Chuẩn THCS chỉ kết luận duy nhất: "Tại x = 1 (hoặc giá trị làm mẫu bằng 0), giá trị của phân thức không xác định (do mẫu thức bằng 0)." DỪNG LẠI TẠI ĐÓ.
   - TUYỆT ĐỐI KHÔNG mở rộng sang "nếu cần giá trị gần x = 1 thì tính lim...", KHÔNG được đưa khái niệm giới hạn vào bài giải!

QUY TRÌNH PHÂN TÍCH:
VIỆC 1: KIỂM TRA ĐỀ BÀI:
- Tự giải bài toán để kiểm tra xem đề bài có bị sai, mâu thuẫn dữ kiện, thiếu điều kiện hoặc vô lý không.
- Nếu đề bài SAI hoặc KHÔNG XÁC ĐỊNH: 
  + isProblemValid: false
  + problemIssue: Nêu rõ lỗi của đề bài (ví dụ: mẫu số bằng 0 làm phân thức không xác định).
  + problemCorrectionSuggestion: GỢI Ý CHUẨN THCS: Chỉ gợi ý thêm điều kiện (ví dụ: thêm điều kiện $x \\ne 1$) hoặc tính tại giá trị xác định khác (ví dụ: tính giá trị tại $x = 2$). TUYỆT ĐỐI KHÔNG gợi ý tính lim/giới hạn!
- Nếu đề bài ĐÚNG: isProblemValid: true.

VIỆC 2: PHÂN TÍCH BÀI LÀM:
TRƯỜNG HỢP A - Học sinh CÓ bài làm:
- Soi từng bước giải theo chuẩn sư phạm Toán THCS GDPT 2018.
- LÀM TẮT / BỎ BƯỚC: Nếu học sinh làm tắt, chỉ rõ: "Thiếu bước: ..." ngắn gọn.
- TÍNH GIAO HOÁN & ĐỒNG NHẤT: Công nhận là ĐÚNG nếu biến đổi tương đương (ví dụ (x+2)(x+3) = (x+3)(x+2)).
- expectedWork: Ghi ngắn gọn các bước biến đổi chuẩn THCS (Bước 1: ...\\nBước 2: ...). Tuyệt đối không có lim/giới hạn.
- explanation: Tối đa 1-2 câu ngắn gọn, chỉ thẳng vào lỗi sai hoặc bước thiếu.

TRƯỜNG HỢP B - Học sinh KHÔNG CÓ bài làm (studentWorkText để trống):
- Cung cấp Lời giải mẫu chi tiết từng bước chuẩn THCS tại modelSolution dạng gạch đầu dòng rõ ràng:
  "Bước 1: ...\\nBước 2: ...\\nBước 3: ...\\nKết luận: ..."

QUY TẮC DÙNG DẤU $:
- CHỈ kẹp các ký hiệu toán học thuần túy vào giữa cặp dấu $ (ví dụ: $Q = \\frac{x^2-1}{x-1}$, $x \\ne 1$, $x = 1$).
- TUYỆT ĐỐI KHÔNG kẹp từ ngữ tiếng Việt vào trong dấu $.

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
          "expectedWork": "Các bước biến đổi chuẩn THCS (không có lim/đạo hàm)",
          "title": "Tên lỗi hoặc 'Thiếu bước biến đổi'",
          "explanation": "Giải thích ngắn gọn 1-2 câu",
          "note": "Lời khuyên ngắn gọn"
        }
      ],
      "improvements": ["Lời khuyên ngắn gọn"]
    }
  ]
}`;

// Chỉ thị 1.5: Thẩm định phản biện của học sinh (CHỈ DÙNG KIẾN THỨC THCS)
const recheckInstructions = `Bạn là chuyên gia thẩm định sư phạm Toán học công tâm.
Học sinh phản hồi "AI sai rồi" kèm lý do phản biện.
Nhiệm vụ: Đánh giá ngắn gọn, dứt khoát theo chuẩn Toán THCS GDPT 2018 (Tuyệt đối không dùng kiến thức cấp 3 THPT để thẩm định):
1. verdictType = "ai_wrong": Học sinh phản biện ĐÚNG. Thừa nhận sai sót, xin lỗi và biểu dương ngắn gọn.
2. verdictType = "student_wrong": Học sinh HIỂU SAI. Giải thích ngắn gọn (tối đa 2 câu) chỉ rõ vì sao lập luận đó chưa đúng bản chất toán học THCS.
3. verdictType = "both_flawed": CẢ HAI CÙNG CÓ THIẾU SÓT. Nêu ngắn gọn điểm thiếu sót của từng bên.

QUY TẮC: Mọi công thức toán kẹp $, toàn bộ văn bản 100% TIẾNG VIỆT, tối đa 2-3 câu ngắn gọn. Không kẹp chữ tiếng Việt vào dấu $. Không dùng lim hay kiến thức cấp 3.
Trả về duy nhất JSON:
{
  "verdictType": "ai_wrong" hoặc "student_wrong" hoặc "both_flawed",
  "verdictTitle": "AI nhận định nhầm - Bạn làm đúng" hoặc "AI giữ nhận định - Bước này chưa đúng" hoặc "Cả hai bên cùng có điểm thiếu sót",
  "explanation": "Lời giải thích ngắn gọn 1-2 câu chuẩn THCS..."
}`;

// Chỉ thị 2: Sinh 4 bài luyện tập (CHỈ DÙNG KIẾN THỨC TOÁN THCS)
const exerciseInstructions = `Bạn là trợ lý sư phạm Toán. Dựa vào chủ đề Toán THCS và nội dung bài toán, hãy TỰ TẠO ĐÚNG 4 câu ngắn gọn trong phạm vi Toán THCS Lớp 6-9:
- Câu 1 (level: "Dễ hơn"): Củng cố lý thuyết và quy tắc cơ bản.
- Câu 2 và Câu 3 (level: "Tương đương"): Cùng mức độ bài học sinh vừa làm.
- Câu 4 (level: "Nâng cao"): Vận dụng nâng cao THCS.
QUY TẮC:
- Mọi công thức toán trong question và solution kẹp giữa cặp dấu $. Không kẹp chữ tiếng Việt vào dấu $.
- question: chỉ chứa đề bài, KHÔNG ghi tiền tố 'Câu 1:' hay 'Bài 1:'.
- solution: chỉ ghi các bước biến đổi chính chuẩn THCS (Bước 1: ...\\nBước 2: ...) và đáp số. Tuyệt đối không dùng lim/cấp 3.
- answer: đáp số rút gọn cuối cùng.
- level: nhận đúng 1 trong 3 giá trị: "Dễ hơn", "Tương đương", "Nâng cao".
Trả về duy nhất JSON:
{"exercises":[{"level":"Dễ hơn","question":"","answer":"","solution":""}]}`;

// Chỉ thị 2.5: Chấm bài giải tự luận từng bước (CHUẨN TOÁN THCS)
const gradePracticeInstructions = `Bạn là giáo viên chấm thi Toán THCS.
Học sinh nộp bài giải tự luận 2-4 dòng.
Nhiệm vụ: Chấm ngắn gọn, chính xác theo chuẩn kiến thức THCS GDPT 2018:
1. Đánh giá từng bước biến đổi có đúng bản chất toán học không (tính giao hoán a*b=b*a, phân phối...).
2. Chỉ rõ nếu học sinh làm tắt hoặc bỏ bước.
3. Nhận xét CỰC KỲ NGẮN GỌN (tối đa 2 câu): Đi thẳng vào bước nào đúng, bước nào sai hoặc thiếu bước nào.
QUY TẮC: Toàn bộ nhận xét bằng 100% TIẾNG VIỆT, công thức toán kẹp giữa $. Tuyệt đối không dùng kiến thức cấp 3.
Trả về duy nhất JSON:
{
  "isCorrect": true hoặc false,
  "score": "Điểm từ 0 đến 10",
  "verdict": "Đúng và đủ bước" hoặc "Đúng nhưng làm tắt" hoặc "Sai ở bước biến đổi",
  "feedback": "Nhận xét ngắn gọn 1-2 câu chỉ thẳng vào các bước..."
}`;

// Chỉ thị 3: Nhận xét sau bài luyện tập
const reviewInstructions = `Bạn là trợ lý sư phạm. Tổng hợp kết quả ngắn gọn 100% TIẾNG VIỆT chuẩn THCS.
summary: Đúng 1 câu ngắn gọn. studyPlanner: Mỗi mục tối đa 12 từ ngắn gọn.
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

// BỘ TỰ ĐỘNG VÁ LỖI JSON
function repairJson(jsonStr) {
  let str = jsonStr.trim();
  let result = '';
  let inString = false;
  let i = 0;
  const stack = [];

  const isMathCommand = (cmdPrefix) => {
    return /^(?:ne|neq|notin|nabla|natural|nless|nleq|ngtr|ngeq|nmid|nparallel|frac|dfrac|tfrac|forall|flat|fbox|times|theta|tau|tan|text|top|to|therefore|triangle|tilde|right|rho|rangle|rightarrow|Rightarrow|beta|bar|binom|bullet|bmod|mathbf|mathbb|bot)\b/.test(cmdPrefix);
  };

  while (i < str.length) {
    const char = str[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += char;
        i++;
      } else if (char === '{' || char === '[') {
        stack.push(char);
        result += char;
        i++;
      } else if (char === '}' || char === ']') {
        const top = stack[stack.length - 1];
        if ((char === '}' && top === '{') || (char === ']' && top === '[')) stack.pop();
        result += char;
        i++;

        const rest = str.slice(i).trimStart();
        if (rest.startsWith('{') || rest.startsWith('[')) {
          const nextNonSpace = str.slice(i).search(/\S/);
          if (nextNonSpace !== -1 && (str[i + nextNonSpace] === '{' || str[i + nextNonSpace] === '[')) {
            result += ',';
          }
        }
      } else {
        result += char;
        i++;
      }
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
          const cmdCandidate = str.slice(i + 1, i + 15);
          if (isMathCommand(cmdCandidate)) {
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

export async function scanImage(image) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('Ảnh tải lên không hợp lệ.');
  const requestCode = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${scanInstructions}\n\nMã phiên: ${requestCode}.` },
    { type: 'input_image', image_url: image, detail: 'high' }
  ] }]);
}

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

export async function recheckStep(data) {
  const { problemText, stepError, studentArgument } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${recheckInstructions}\n\nDỮ LIỆU ĐỐI CHIẾU:\n- Đề bài: ${problemText || 'Toán THCS'}\n- Bước học sinh làm: ${stepError.studentWork}\n- Nhận định ban đầu của AI: ${stepError.title} (${stepError.explanation})\n- LẬP LUẬN PHẢN BIỆN CỦA HỌC SINH:\n"${studentArgument || 'Học sinh cho rằng bước này làm đúng.'}"\n\nHãy suy nghĩ khách quan, đánh giá theo bản chất toán học THCS và phân định công tâm, ngắn gọn. Tuyệt đối không dùng lim hay kiến thức cấp 3.` }
  ] }]);
}

export async function generateExercises(data) {
  const { topic, errors } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${exerciseInstructions}\n\nChủ đề: ${topic || 'Toán THCS'}\nNội dung cần ôn tập: ${JSON.stringify(errors || [])}` }
  ] }]);
}

export async function gradePractice(data) {
  const { question, studentSteps, solution } = data;
  return requestAI([{ role: 'user', content: [
    { type: 'input_text', text: `${gradePracticeInstructions}\n\nDỮ LIỆU CHẤM BÀI:\n- Đề bài: ${question}\n- Lời giải mẫu chuẩn: ${solution}\n- Bài làm tự luận học sinh gõ vào:\n${studentSteps}\n\nHãy phân tích và nhận xét từng bước biến đổi cực kỳ ngắn gọn theo chuẩn Toán THCS.` }
  ] }]);
}

export async function reviewPractice(data) {
  if (!Array.isArray(data.attempts) || !data.attempts.length) throw new Error('Chưa có đáp án để AI nhận xét.');
  return requestAI([{ role: 'user', content: [{ type: 'input_text', text: `${reviewInstructions}\n\nDữ liệu:\n${JSON.stringify(data)}` }] }]);
}
