// THAY 2 GIÁ TRỊ CỦA BẠN VÀO ĐÂY:
const SUPABASE_URL = 'https://bggdzacrmbwflyogmrck.supabase.co/auth/v1/callback'; // Dán Project URL của bạn
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ2R6YWNybWJ3Zmx5b2dtcmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzc2NjUsImV4cCI6MjEwNzY1MzY2NX0.nX-hi_bOEO0Pba72B9noGUKHx5dvUw9uuXIcPD_rjgw'; // Dán anon / public key của bạn

// Khởi tạo Supabase client
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;

// Khởi tạo trạng thái đăng nhập
async function initAuth() {
  if (!supabaseClient) return;

  // Lấy thông tin user hiện tại
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;
  updateAuthUI(user);

  // Lắng nghe thay đổi trạng thái đăng nhập (đăng nhập/đăng xuất)
  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI(currentUser);
  });
}

// Cập nhật giao diện thanh menu theo trạng thái đăng nhập
function updateAuthUI(user) {
  const authContainer = document.getElementById('authNavArea');
  if (!authContainer) return;

  if (user) {
    // Đã đăng nhập: Hiện Avatar + Tên + Nút Lịch sử + Nút Đăng xuất
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const avatar = user.user_metadata?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp';

    authContainer.innerHTML = `
      <div class="user-profile-nav">
        <button id="btnOpenHistory" class="btn-history-nav" title="Xem lịch sử học tập">📜 Lịch sử</button>
        <div class="user-pill">
          <img src="${avatar}" alt="Avatar" class="user-avatar">
          <span class="user-name">${name}</span>
        </div>
        <button id="btnLogout" class="btn-logout-nav" title="Đăng xuất">Thoát</button>
      </div>
    `;

    document.getElementById('btnOpenHistory').onclick = openHistoryModal;
    document.getElementById('btnLogout').onclick = async () => {
      await supabaseClient.auth.signOut();
      location.reload();
    };
  } else {
    // Chưa đăng nhập: Hiện nút "Đăng nhập Google"
    authContainer.innerHTML = `
      <button id="btnGoogleLogin" class="btn-google-login">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.43 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.24 0 10.07 0 12s.45 3.76 1.25 5.41l4.03-3.13z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/></svg>
        Đăng nhập
      </button>
    `;

    document.getElementById('btnGoogleLogin').onclick = () => {
      supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard.html'
        }
      });
    };
  }
}

// ==================== LƯU LỊCH SỬ TỰ ĐỘNG ====================

// 1. Tự động lưu bài phân tích
async function saveAnalysisHistory(transcribed, result) {
  if (!supabaseClient || !currentUser) return;
  try {
    await supabaseClient.from('analysis_history').insert({
      user_id: currentUser.id,
      problem_text: transcribed?.problemText || '',
      student_work_text: transcribed?.studentWorkText || '',
      analysis_result: result
    });
  } catch (err) {
    console.warn('Lỗi lưu lịch sử phân tích:', err);
  }
}

// 2. Tự động lưu điểm làm bài luyện tập
async function savePracticeHistory(topic, score, total, attempts) {
  if (!supabaseClient || !currentUser) return;
  try {
    await supabaseClient.from('practice_history').insert({
      user_id: currentUser.id,
      topic: topic || 'Đại số',
      score: score,
      total_questions: total,
      attempts: attempts
    });
  } catch (err) {
    console.warn('Lỗi lưu lịch sử luyện tập:', err);
  }
}

// ==================== MÀN HÌNH LỊCH SỬ HỌC TẬP ====================

async function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  loadHistoryTab('analysis');
}

async function loadHistoryTab(type) {
  const listContainer = document.getElementById('historyListContent');
  listContainer.innerHTML = '<div class="history-loading">Đang tải lịch sử...</div>';

  if (!supabaseClient || !currentUser) return;

  if (type === 'analysis') {
    const { data, error } = await supabaseClient
      .from('analysis_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data || !data.length) {
      listContainer.innerHTML = '<div class="history-empty">Bạn chưa có bài phân tích nào được lưu.</div>';
      return;
    }

    listContainer.innerHTML = data.map(item => {
      const date = new Date(item.created_at).toLocaleString('vi-VN');
      const topic = item.analysis_result?.analysisSets?.[0]?.knowledgePoint?.name || 'Bài toán';
      const errorsCount = item.analysis_result?.analysisSets?.[0]?.learningErrors?.length || 0;
      return `
        <div class="history-item">
          <div class="history-item-head">
            <b>${topic}</b>
            <small>${date}</small>
          </div>
          <p class="history-item-problem"><strong>Đề bài:</strong> ${item.problem_text || 'Chưa lưu đề bài'}</p>
          <div class="history-item-badge ${errorsCount ? 'warn' : 'good'}">
            ${errorsCount ? `Cần xem lại ${errorsCount} lỗi` : 'Làm chính xác'}
          </div>
        </div>
      `;
    }).join('');
  } else {
    const { data, error } = await supabaseClient
      .from('practice_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data || !data.length) {
      listContainer.innerHTML = '<div class="history-empty">Bạn chưa có bài luyện tập nào được lưu.</div>';
      return;
    }

    listContainer.innerHTML = data.map(item => {
      const date = new Date(item.created_at).toLocaleString('vi-VN');
      return `
        <div class="history-item">
          <div class="history-item-head">
            <b>Chủ đề: ${item.topic}</b>
            <small>${date}</small>
          </div>
          <div class="history-practice-score">
            Điểm đạt được: <strong>${item.score}/${item.total_questions} câu đúng</strong>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Xuất các hàm để learning-path.js gọi
window.MathFixAuth = {
  saveAnalysis: saveAnalysisHistory,
  savePractice: savePracticeHistory
};

// Chạy khởi tạo khi trang tải
document.addEventListener('DOMContentLoaded', initAuth);
