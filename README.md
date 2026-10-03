# LearnPath AI — Demo cá nhân hóa lộ trình học tập

Đây là bản demo giao diện kèm máy chủ phân tích ảnh. Hệ thống không còn tự gán một lỗi Toán cố định khi chưa đọc được nội dung trong ảnh.

Chạy `node server.mjs`, rồi mở `http://localhost:3000`. Dashboard chỉ hỗ trợ tải ảnh JPG/PNG. Nếu máy chủ AI chưa được cấu hình hoặc ảnh không đọc rõ, website sẽ yêu cầu ảnh tốt hơn và không đưa ra kết luận sai.

## Kết nối mô hình thật

`models.ts` là hợp đồng dữ liệu nghiệp vụ gồm `Student`, `Subject`, `KnowledgePoint`, `Assessment`, `LearningError`, `LearningPath`, `LearningResource` và `AIRecommendation`.

Máy chủ trong `server.mjs` gửi ảnh tới Responses API qua biến môi trường `OPENAI_API_KEY`; khóa không được đưa vào trình duyệt. Có thể chọn model bằng `OPENAI_MODEL`. API yêu cầu mô hình trả về môn học, chủ đề, lỗi chỉ khi đọc chắc nội dung, ước lượng khối lớp có giải thích, và 5 bài luyện phù hợp. Phần giao diện khóa đáp án sau lần kiểm tra đầu tiên và dùng kết quả đó để tổng hợp nhận xét ở bước 3.
