document.querySelector('#finishExercises').addEventListener('click', () => {
  const attempted = document.querySelectorAll('.exercise-card.done,.exercise-card.attempted').length;
  if (attempted < 5) return;
  const right = document.querySelectorAll('.exercise-card.done').length;
  const challenge = document.querySelector('.challenge-box');
  const strengths = right >= 4 ? 'Bạn xử lý tốt các bài chuyển vế cơ bản và có thể giữ sự tập trung đến những bài cuối.' : right >= 2 ? 'Bạn đã nhận ra được một phần quy tắc chuyển vế và có nền tảng để tiếp tục luyện.' : 'Bạn đã chủ động thử cả 5 bài; đây là điểm khởi đầu tốt để xác định phần cần ôn.';
  const improvements = right >= 4 ? 'Điểm cần duy trì là kiểm tra dấu và ghi từng bước, nhất là khi có ẩn ở hai vế.' : 'Bạn nên xem lại quy tắc đổi dấu, rồi giải chậm từng dòng trước khi làm bài mới.';
  challenge.innerHTML = `<h4>Nhận xét sau 5 bài luyện tập</h4><p><b>Điểm mạnh:</b> ${strengths}</p><p><b>Cần cải thiện:</b> ${improvements}</p><p style="margin-top:13px;padding-top:11px;border-top:1px solid #efdcbf;font-size:11px;color:#8b7357">AI ghi nhận ${right}/5 đáp án đúng ở lần nộp đầu. Kết quả này giúp bạn chọn phần ôn tiếp theo, không phải xếp hạng năng lực.</p>`;
});
