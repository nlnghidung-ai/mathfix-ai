import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.ts':'text/plain; charset=utf-8' };
const instructions = `Bạn là trợ lý sư phạm phân tích ẢNH BÀI LÀM học sinh Việt Nam.
Quy trình bắt buộc: (1) đọc nguyên văn đề bài, (2) đọc từng phép tính/bước làm của học sinh, (3) tự tính lại, (4) chỉ ra lỗi dựa trên bằng chứng nhìn thấy trong ảnh.
Ảnh có thể có NHIỀU bài (ví dụ bài 4, bài 5). Phải tách từng bài độc lập; không gộp lỗi của bài này sang bài khác. Không được dùng ví dụ có sẵn, không được suy đoán “chuyển vế” khi bài là phép tính tiểu học, và không được khẳng định lỗi nếu chữ hoặc đề bài mờ.
Trả về duy nhất JSON đúng cấu trúc:
{"readable":true,"needsRetake":false,"message":"","analyses":[{"title":"Bài 1","subject":"Toán","topic":"","errors":[{"position":"","studentWork":"","expectedWork":"","title":"","explanation":"","note":""}],"exercises":[{"question":"","answer":"","solution":"","level":""}],"improvements":[""]}]}
Nếu không đọc rõ: readable:false, needsRetake:true, analyses:[] và message nêu rõ phần nào cần chụp lại.
Nếu readable:true: mỗi phần tử analyses là đúng một bài có ít nhất một lỗi nhìn thấy. errors phải dựa vào biểu thức/bài làm trong ảnh. Xác định chủ đề dựa trên bằng chứng rõ ràng trong ảnh; nếu không rõ thì dùng chủ đề tổng quát, không đoán.
TỰ TẠO bài tập trực tiếp từ lỗi vừa phát hiện, không dùng ngân hàng câu hỏi, dữ liệu PDF, ví dụ có sẵn hoặc câu hỏi từ các lượt trước. Với MỖI bài, tạo đúng 8 câu mức "Cơ bản" để củng cố đúng quy tắc/bước sai và 2 câu mức "Nâng cao" để vận dụng cùng kiến thức qua nhiều bước. Các câu phải cùng chủ đề nhưng có số liệu, biểu thức hoặc bối cảnh đa dạng; luôn tự kiểm tra đáp án trước khi trả về. exercises phải được nhóm theo thứ tự Cơ bản rồi Nâng cao; mỗi exercise.level chỉ được là "Cơ bản" hoặc "Nâng cao". question chỉ chứa nguyên văn đề bài, tuyệt đối không thêm số thứ tự, không thêm "Câu 1", "1)" hoặc ký hiệu đánh số. answer là đáp án ngắn có thể so sánh; lời giải ngắn, đúng.`;
const reviewInstructions = `Bạn là trợ lý sư phạm. Dựa HOÀN TOÀN vào dữ liệu bài luyện đã nộp, hãy viết hướng dẫn sửa bài cho học sinh THCS. Chỉ xét các attempts có isCorrect:false, đúng thứ tự xuất hiện; không bịa thêm lỗi.
Với MỖI câu sai, tạo 2 đến 4 bước giải đúng, rõ như một bài làm ngắn. Mỗi bước chỉ một câu, tối đa 18 từ và phải có phép tính/biến đổi CỤ THỂ từ đề bài (ví dụ: "5 + 5 = 10, viết 0 nhớ 1"). Tuyệt đối không viết các câu chung chung như "đọc kỹ đề", "tính lần lượt" hoặc "đối chiếu đáp án". Không viết lại đề, đáp án hoặc mức độ vì giao diện đã có sẵn các dữ liệu đó.
summary tối đa 2 câu, gọn nhưng nêu được dạng lỗi chính. Sau đó tạo studyPlanner bám sát các lỗi sai: today là bài cần làm hôm nay, tomorrow là nội dung xem trước ngày mai, review là kiến thức/lỗi cần ôn lại. Mỗi mục tối đa 22 từ, rõ việc cần làm, giọng động viên.
Trả duy nhất JSON: {"summary":"","mistakes":[{"steps":["Bước 1: ...","Bước 2: ..."]}],"studyPlanner":{"today":"","tomorrow":"","review":""}}. Số mistakes phải bằng số attempts sai.`;
function extractText(body) { const raw = JSON.stringify(body.output || []); const parts = [...raw.matchAll(/"text":"((?:\\.|[^"\\])*)"/g)].map(m => JSON.parse('"' + m[1] + '"')); return body.output_text || parts.join(''); }
function parseJson(text) { const match = text.match(/\{[\s\S]*\}/); if (!match) throw new Error('Mô hình không trả về dữ liệu JSON hợp lệ.'); return JSON.parse(match[0]); }
async function analyze(image) {
  if (!process.env.OPENAI_API_KEY) return { readable:false, needsRetake:true, message:'Chưa cấu hình OPENAI_API_KEY nên AI chưa thể đọc bài làm. Hệ thống sẽ không đoán lỗi.', errors:[], exercises:[] };
  const requestCode=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const response = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ model:process.env.OPENAI_MODEL || 'gpt-5', store:false, input:[{ role:'user', content:[{type:'input_text',text:`${instructions}\n\nMã lượt tạo độc lập: ${requestCode}. Hãy tạo bộ câu mới cho đúng lượt này.`},{type:'input_image',image_url:image,detail:'high'}] }] }) });
  if (!response.ok) {
    if (response.status === 401) throw new Error('API key không hợp lệ hoặc đã bị thu hồi. Hãy tạo key mới và khởi động lại máy chủ.');
    if (response.status === 429) throw new Error('Tài khoản API chưa có credits hoặc đã chạm giới hạn sử dụng. Hãy vào Billing trên OpenAI Platform để kiểm tra.');
    if (response.status === 403) throw new Error('API key chưa có quyền dùng mô hình này. Hãy kiểm tra quyền của key trong OpenAI Platform.');
    throw new Error(`Dịch vụ AI trả về lỗi ${response.status}. Hãy kiểm tra Billing và API key trên OpenAI Platform.`);
  }
  return parseJson(extractText(await response.json()));
}
async function reviewPractice(data, prompt = reviewInstructions) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Chưa cấu hình OPENAI_API_KEY nên AI chưa thể nhận xét bài luyện.');
  const response = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ model:process.env.OPENAI_MODEL || 'gpt-5', store:false, input:[{ role:'user', content:[{type:'input_text',text:`${prompt}\n\nDữ liệu:\n${JSON.stringify(data)}`}]}] }) });
  if (!response.ok) { if (response.status === 429) throw new Error('Tài khoản API chưa có credits hoặc đã chạm giới hạn sử dụng.'); if (response.status === 401) throw new Error('API key không hợp lệ hoặc đã bị thu hồi.'); throw new Error(`Dịch vụ AI trả về lỗi ${response.status}.`); }
  return parseJson(extractText(await response.json()));
}
createServer(async (req,res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body=''; for await (const part of req) body += part;
    try { const { image } = JSON.parse(body); if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('Ảnh tải lên không hợp lệ.'); const data = await analyze(image); res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(data)); }
    catch (error) { res.writeHead(400,{'Content-Type':'application/json'}); res.end(JSON.stringify({ readable:false,needsRetake:true,message:error.message,errors:[],exercises:[] })); }
    return;
  }
  if (req.method === 'POST' && req.url === '/api/review-practice') {
    let body=''; for await (const part of req) body += part;
    try { const data=JSON.parse(body); if (!Array.isArray(data.attempts) || !data.attempts.length) throw new Error('Chưa có đáp án để AI nhận xét.'); const result=await reviewPractice(data); res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(result)); }
    catch (error) { res.writeHead(400,{'Content-Type':'application/json'}); res.end(JSON.stringify({message:error.message})); }
    return;
  }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const safe = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^([.][.][\\/])+/, '');
  try { const data = await readFile(join(root,safe)); res.writeHead(200,{'Content-Type':mime[extname(safe)] || 'application/octet-stream'}); res.end(data); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(port,'0.0.0.0',() => console.log(`MATHFIX AI: http://localhost:${port}`));
