// THAY 2 GIÁ TRỊ CỦA BẠN VÀO ĐÂY:
const SUPABASE_URL = 'https://bggdzacrmbwflyogmrck.supabase.co'; // Dán Project URL của bạn
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ2R6YWNybWJ3Zmx5b2dtcmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzc2NjUsImV4cCI6MjEwNzY1MzY2NX0.nX-hi_bOEO0Pba72B9noGUKHx5dvUw9uuXIcPD_rjgw'; // Dán anon / public key của bạn

let _supabaseClient = null;
let currentUser = null;

function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return _supabaseClient;
  }
  return null;
}

// BẬT / ĐÓNG MODAL ĐĂNG NHẬP
window.openLoginModal = function() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.remove('hidden');
};
window.closeLoginModal = function() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.add('hidden');
};

// 1. ĐĂNG NHẬP GOOGLE
window.loginWithGoogle = async function() {
  const client = getSupabaseClient();
  if (!client) {
    alert('Đang kết nối tài khoản, bạn bấm lại sau 2 giây nhé!');
    return;
  }
  try {
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard.html'
      }
    });
  } catch (err) {
    alert('Lỗi đăng nhập Google: ' + err.message);
  }
};

// 2. ĐĂNG NHẬP BẰNG EMAIL & MẬT KHẨU
window.loginWithEmail = async function(e) {
  if (e) e.preventDefault();
  const client = getSupabaseClient();
  const email = document.getElementById('authEmail')?.value.trim();
  const password = document.getElementById('authPassword')?.value;
  const btn = document.getElementById('btnSubmitEmailAuth');

  if (!email || !password) {
    alert('Vui lòng nhập đầy đủ Email và Mật khẩu.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang xử lý…';
  }

  try {
    const isRegister = window._authMode === 'register';
    if (isRegister) {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      alert('Đăng ký thành công! Đang chuyển vào phòng học...');
      closeLoginModal();
      location.reload();
    } else {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      closeLoginModal();
      location.reload();
    }
  } catch (err) {
    alert('Lỗi: ' + (err.message || 'Không thể đăng nhập. Vui lòng kiểm tra lại.'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = window._authMode === 'register' ? 'Đăng ký tài khoản' : 'Đăng nhập';
    }
  }
};

window.setAuthMode = function(mode) {
  window._authMode = mode;
  const isReg = mode === 'register';
  document.getElementById('tabLogin')?.classList.toggle('active', !isReg);
  document.getElementById('tabRegister')?.classList.toggle('active', isReg);
  const submitBtn = document.getElementById('btnSubmitEmailAuth');
  if (submitBtn) submitBtn.textContent = isReg ? 'Đăng ký tài khoản' : 'Đăng nhập';
};

window.logoutMathFix = async function() {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
  location.reload();
};

window.toggleUserMenu = function(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('userDropdownMenu');
  if (dropdown) dropdown.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdownMenu');
  const trigger = document.getElementById('avatarTriggerBtn');
  if (dropdown && !dropdown.classList.contains('hidden') && trigger && !trigger.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

// CẬP NHẬT GIAO DIỆN NAVBAR
function updateAuthUI(user) {
  const containers = [document.getElementById('authNavArea'), document.getElementById('homeAuthArea')];
  
  // Tự động ẩn/hiện nút "Giới thiệu" trên thanh tiêu đề: Khi đã đăng nhập thì ẩn đi cho gọn
  const navAboutLinks = [document.getElementById('navAboutLink'), document.getElementById('homeAboutLink')];
  navAboutLinks.forEach(link => {
    if (link) {
      if (user) link.classList.add('hidden');
      else link.classList.remove('hidden');
    }
  });

  containers.forEach(container => {
    if (!container) return;

    if (user) {
      // ĐÃ ĐĂNG NHẬP: CHỈ HIỆN DUY NHẤT AVATAR TRÒN CÓ MENU ĐỔ XUỐNG
      const name = user.user_metadata?.full_name || user.email.split('@')[0];
      const email = user.email || '';
      const avatar = user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

      container.innerHTML = `
        <div class="avatar-dropdown-wrapper">
          <button id="avatarTriggerBtn" class="avatar-trigger-btn" type="button" onclick="toggleUserMenu(event)" title="Tài khoản: ${name}">
            <img src="${avatar}" alt="Avatar" class="user-avatar-circle" referrerpolicy="no-referrer">
          </button>
          
          <div id="userDropdownMenu" class="user-dropdown-menu hidden" onclick="event.stopPropagation()">
            <div class="user-menu-header">
              <b class="user-menu-name">${name}</b>
              <small class="user-menu-email">${email}</small>
            </div>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item" type="button" onclick="toggleUserMenu(); openHistoryModal();">
              <span>📜</span> Lịch sử học tập
            </button>
            <a href="about.html" class="user-menu-item">
              <span>🏆</span> Giới thiệu dự án
            </a>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item text-danger" type="button" onclick="logoutMathFix()">
              <span>🚪</span> Thoát
            </button>
          </div>
        </div>
      `;
    } else {
      // CHƯA ĐĂNG NHẬP: HIỆN NÚT MỞ BẢNG ĐĂNG NHẬP
      container.innerHTML = `
        <button class="btn-open-login" type="button" onclick="openLoginModal()">
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.43 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.24 0 10.07 0 12s.45 3.76 1.25 5.41l4.03-3.13z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/></svg>
          Đăng nhập
        </button>
      `;
    }
  });
}

// ==================== TỰ ĐỘNG TẠO KHUNG LỊCH SỬ CHO TẤT CẢ CÁC TRANG ====================
function ensureHistoryModalDOM() {
  if (document.getElementById('historyModal')) return;

  const modal = document.createElement('div');
  modal.id = 'historyModal';
  modal.className = 'history-modal hidden';
  modal.innerHTML = `
    <div class="history-modal-box">
      <div class="history-modal-head">
        <h3>📜 Lịch sử học tập của bạn</h3>
        <button id="btnCloseHistoryModal" class="btn-close-modal" type="button" onclick="document.getElementById('historyModal').classList.add('hidden')">✕</button>
      </div>
      <div class="history-tabs">
        <button class="history-tab-btn active" data-type="analysis" type="button">📝 Bài đã phân tích</button>
        <button class="history-tab-btn" data-type="practice" type="button">📚 Bài đã luyện tập</button>
      </div>
      <div id="historyListContent" class="history-list">
        <div class="history-loading">Đang tải lịch sử...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll('.history-tab-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.history-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadHistoryTab(btn.dataset.type);
    };
  });
}

// BẬT MODAL LỊCH SỬ (DÙNG ĐƯỢC Ở MỌI TRANG: DASHBOARD, INDEX, ABOUT...)
window.openHistoryModal = async function() {
  ensureHistoryModalDOM();
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.classList.remove('hidden');
    loadHistoryTab('analysis');
  }
};

window.loadHistoryTab = async function(type) {
  const listContainer = document.getElementById('historyListContent');
  if (!listContainer) return;
  listContainer.innerHTML = '<div class="history-loading">Đang tải lịch sử...</div>';

  const client = getSupabaseClient();
  if (!client || !currentUser) return;

  if (type === 'analysis') {
    const { data, error } = await client
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
      const topic = item.analysis_result?.analysisSets?.[0]?.knowledgePoint?.name || 'Toán THCS';
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
    const { data, error } = await client
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
};

// ==================== TỰ ĐỘNG LƯU DỮ LIỆU ====================

async function saveAnalysisHistory(transcribed, result) {
  const client = getSupabaseClient();
  if (!client || !currentUser) return;
  try {
    await client.from('analysis_history').insert({
      user_id: currentUser.id,
      problem_text: transcribed?.problemText || '',
      student_work_text: transcribed?.studentWorkText || '',
      analysis_result: result
    });
  } catch (err) {
    console.warn('Lỗi lưu lịch sử phân tích:', err);
  }
}

async function savePracticeHistory(topic, score, total, attempts) {
  const client = getSupabaseClient();
  if (!client || !currentUser) return;
  try {
    await client.from('practice_history').insert({
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

window.MathFixAuth = {
  saveAnalysis: saveAnalysisHistory,
  savePractice: savePracticeHistory
};

async function initAuth() {
  let client = getSupabaseClient();
  if (!client) {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 150));
      client = getSupabaseClient();
      if (client) break;
    }
  }
  if (!client) return;

  client.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI(currentUser);
    if (event === 'SIGNED_IN' && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  });

  try {
    const { data: { session } } = await client.auth.getSession();
    currentUser = session?.user || null;
    updateAuthUI(currentUser);
  } catch (e) {
    updateAuthUI(null);
  }
}

initAuth();
