const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let imageUrl='',originalImageUrl='',cropper=null,cameraStream=null,currentResult=null,currentAnalysis=null,correctCount=0,practiceAttempts=[];
let currentTranscribed=null;

// HÀM AN TOÀN ĐỂ GÁN SỰ KIỆN CHO PHẦN TỬ (CHỐNG LỖI LÀM ĐƠ TRANG WEB)
function on(selector, event, handler) {
  const el = document.querySelector(selector);
  if (el) el[event] = handler;
}

// HÀM CHUYỂN ĐỔI SANG VĂN BẢN GÕ PHÍM THÔNG THƯỜNG (DÀNH CHO Ô NHẬP LIỆU CHỈNH SỬA)
function toPlainText(str) {
  if (!str) return '';
  let s = String(str);

  s = s.replace(/\$([^\$]+)\$/g, (_, math) => {
    return math
      .replace(/\\(?:neq|ne)\b/g, ' ≠ ')
      .replace(/\\le(?:q)?\b/g, ' ≤ ')
      .replace(/\\ge(?:q)?\b/g, ' ≥ ')
      .replace(/\\approx\b/g, ' ≈ ')
      .replace(/\\(?:frac|dfrac|tfrac)\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
      .replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, 'căn bậc $1($2)')
      .replace(/\\sqrt\{([^}]+)\}/g, 'căn($1)')
      .replace(/\\times/g, '*')
      .replace(/\\div/g, ':')
      .replace(/\\pm/g, '±')
      .replace(/\\cdot/g, '*')
      .replace(/\^\{([^}]+)\}/g, '^$1')
      .replace(/_\{([^}]+)\}/g, '_$1')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\/g, '');
  });

  s = s.replace(/\\(?:neq|ne)\b/g, ' ≠ ')
       .replace(/\\(?:frac|dfrac|tfrac)\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
       .replace(/\\sqrt\{([^}]+)\}/g, 'căn($1)')
       .replace(/\\text\{([^}]+)\}/g, '$1')
       .replace(/\\n/g, '\n');
  return s.trim();
}

// BỘ CHUYỂN ĐỔI TOÁN HỌC TRỰC TIẾP SANG KATEX HTML (MỘT CHIỀU DUY NHẤT)
function formatMathHTML(rawStr) {
  if (!rawStr) return '';
  let str = String(rawStr);

  str = str.replace(/\\n/g, '\n');
  str = str.replace(/(^|[^\$\\])\\(?:ne|neq)\b/g, '$1 ≠ ');

  if (typeof window.katex === 'undefined') {
    return str;
  }

  // Render các khối $$...$$
  str = str.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return window.katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return tex;
    }
  });

  // Render các khối $...$
  str = str.replace(/\$([^\$\n]+?)\$/g, (fullMatch, tex) => {
    const trimmed = tex.trim();
    if (/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(trimmed)) {
      return trimmed;
    }
    try {
      return window.katex.renderToString(trimmed, { displayMode: false, throwOnError: false });
    } catch {
      return fullMatch;
    }
  });

  // Render các lệnh LaTeX đứng trơ trọi (\dfrac, \sqrt)
  str = str.replace(/(\\(?:dfrac|frac)\{[^{}]+\}\{[^{}]+\})/g, (_, tex) => {
    try {
      return window.katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return tex;
    }
  });

  str = str.replace(/(\\sqrt(?:\[\d+\])?\{[^{}]+\})/g, (_, tex) => {
    try {
      return window.katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return tex;
    }
  });

  str = str.replace(/\b([a-zA-Z0-9]+)\^([0-9]+)\b/g, '$1<sup>$2</sup>');

  return str;
}

// HÀM CHUYỂN NHANH VỀ MÀN HÌNH CHỤP / TẢI ẢNH MỚI
window.goToUploadScreen = function() {
  $('#resultPanel')?.classList.add('hidden');
  $('#confirmPanel')?.classList.add('hidden');
  $('#loadingPanel')?.classList.add('hidden');
  $('.old-layout')?.classList.remove('hidden');

  if (cropper) { cropper.destroy(); cropper = null; }
  imageUrl = '';
  originalImageUrl = '';
  const fileInp = $('#imageInput');
  if (fileInp) fileInp.value = '';
  $('#previewContainer')?.classList.add('hidden');
  $('#emptyDropLabel')?.classList.remove('hidden');
  const analyzeBtn = $('#analyzeBtn');
  if (analyzeBtn) analyzeBtn.disabled = true;

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function initCropper(src){
  if(cropper){ cropper.destroy(); cropper = null; }
  const preview = $('#preview');
  if (!preview) return;
  preview.src = src;
  if (typeof Cropper !== 'undefined') {
    cropper = new Cropper(preview, {
      viewMode: 1, autoCropArea: 0.95, responsive: true, background: false, movable: true, rotatable: true, scalable: true, zoomable: true
    });
  }
}

function setImage(src){
  imageUrl = src;
  originalImageUrl = src;
  $('#emptyDropLabel')?.classList.add('hidden');
  $('#previewContainer')?.classList.remove('hidden');
  const analyzeBtn = $('#analyzeBtn');
  if (analyzeBtn) analyzeBtn.disabled = false;
  $('#uploadError')?.classList.add('hidden');
  initCropper(src);
}

function showInputError(message){
  const errEl = $('#uploadError');
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.remove('hidden');
  }
}

// BỘ KHỞI TẠO VÀ GÁN SỰ KIỆN AN TOÀN CHO TOÀN BỘ TRANG WEB
function initLearningApp() {
  const imageInput = $('#imageInput');
  const dropZone = $('#emptyDropLabel');

  if (imageInput) {
    imageInput.onchange = e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!['image/jpeg', 'image/png'].includes(f.type) || f.size > 10 * 1024 * 1024) {
        showInputError('Hãy chọn ảnh JPG hoặc PNG, dung lượng không quá 10 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result);
      reader.readAsDataURL(f);
    };
  }

  if (dropZone) {
    dropZone.onclick = e => {
      if (e.target !== imageInput && imageInput) {
        imageInput.click();
      }
    };

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      }, false);
    });

    dropZone.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      const f = dt.files && dt.files[0];
      if (f) {
        if (!['image/jpeg', 'image/png'].includes(f.type) || f.size > 10 * 1024 * 1024) {
          showInputError('Hãy chọn ảnh JPG hoặc PNG, dung lượng không quá 10 MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.readAsDataURL(f);
      }
    }, false);
  }

  on('#rotateLeftBtn', 'onclick', () => { if (cropper) cropper.rotate(-90); });
  on('#rotateRightBtn', 'onclick', () => { if (cropper) cropper.rotate(90); });
  on('#applyCropBtn', 'onclick', () => {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048 });
    if (canvas) {
      const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
      imageUrl = croppedUrl;
      initCropper(croppedUrl);
    }
  });
  on('#resetCropBtn', 'onclick', () => {
    if (originalImageUrl) { imageUrl = originalImageUrl; initCropper(originalImageUrl); }
  });
  on('#reselectBtn', 'onclick', () => {
    if (cropper) { cropper.destroy(); cropper = null; }
    if (imageInput) imageInput.value = '';
    $('#previewContainer')?.classList.add('hidden');
    $('#emptyDropLabel')?.classList.remove('hidden');
    const aBtn = $('#analyzeBtn');
    if (aBtn) aBtn.disabled = true;
  });

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => {
    t.onclick = async () => {
      const isCamera = t.dataset.tab === 'camera';
      tabs.forEach(x => x.classList.toggle('active', x === t));

      $('#uploadMode')?.classList.toggle('hidden', isCamera);
      $('#cameraMode')?.classList.toggle('hidden', !isCamera);

      if (!isCamera) {
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          cameraStream = null;
        }
        return;
      }

      const camMsg = $('#cameraMessage');
      const camVid = $('#cameraPreview');
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Trình duyệt chưa hỗ trợ camera.');
        }
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
        if (camVid) camVid.srcObject = cameraStream;
        if (camMsg) camMsg.textContent = 'Canh bài làm vào khung rồi nhấn Chụp ảnh.';
      } catch (err) {
        console.warn('Lỗi mở camera:', err);
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (camVid) camVid.srcObject = cameraStream;
          if (camMsg) camMsg.textContent = 'Canh bài làm vào khung rồi nhấn Chụp ảnh.';
        } catch (e2) {
          if (camMsg) camMsg.textContent = 'Không thể mở camera. Bạn có thể chọn Tải ảnh lên.';
        }
      }
    };
  });

  on('#captureBtn', 'onclick', () => {
    const v = $('#cameraPreview');
    const c = $('#cameraCanvas');
    if (!v || !v.videoWidth || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    setImage(c.toDataURL('image/jpeg'));

    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === 'upload'));
    $('#uploadMode')?.classList.remove('hidden');
    $('#cameraMode')?.classList.add('hidden');
  });

  on('#btnRetakeCamera', 'onclick', async () => {
    $('#confirmPanel')?.classList.add('hidden');
    $('.old-layout')?.classList.remove('hidden');

    const camTab = document.querySelector('.tab[data-tab="camera"]');
    if (camTab) camTab.click();
  });

  on('#btnReupload', 'onclick', () => {
    goToUploadScreen();
  });

  on('#analyzeBtn', 'onclick', async () => {
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048 });
      if (canvas) imageUrl = canvas.toDataURL('image/jpeg', 0.9);
    }
    if (!imageUrl) return;

    $('.old-layout')?.classList.add('hidden');
    $('#confirmPanel')?.classList.add('hidden');
    $('#loadingPanel')?.classList.remove('hidden');
    const loadTxt = $('#loadingText');
    const loadSub = $('#loadingSubtext');
    if (loadTxt) loadTxt.textContent = 'Đang đọc nội dung trong ảnh…';
    if (loadSub) loadSub.textContent = 'AI đang nhận diện chữ viết và kiểm tra phạm vi môn Toán THCS.';

    try {
      const scanRes = await HomeworkAnalysisService.scan(imageUrl);
      currentTranscribed = scanRes;

      const pBox = $('#scannedProblem');
      const wBox = $('#scannedStudentWork');
      if (pBox) pBox.value = toPlainText(scanRes.problemText || '');
      if (wBox) wBox.value = toPlainText(scanRes.studentWorkText || '');

      const scopeAlert = $('#outOfScopeAlert');
      const proceedBtn = $('#btnProceedAnalyze');

      if (scanRes.isSupportedScope === false) {
        scopeAlert?.classList.remove('hidden');
        const alertMsg = $('#scopeAlertMsg');
        if (alertMsg) alertMsg.textContent = `${scanRes.scopeReason || 'Nội dung này không thuộc phạm vi môn Toán THCS.'} MathFix AI chỉ hỗ trợ môn Toán cấp THCS (Lớp 6, 7, 8, 9). Không hỗ trợ Toán THPT hay các môn học khác. Bạn vui lòng chọn bài tập Toán THCS phù hợp nhé!`;
        if (proceedBtn) {
          proceedBtn.disabled = true;
          proceedBtn.style.opacity = '0.4';
          proceedBtn.style.cursor = 'not-allowed';
        }
      } else {
        scopeAlert?.classList.add('hidden');
        if (proceedBtn) {
          proceedBtn.disabled = false;
          proceedBtn.style.opacity = '1';
          proceedBtn.style.cursor = 'pointer';
        }
      }

      $('#loadingPanel')?.classList.add('hidden');
      $('#confirmPanel')?.classList.remove('hidden');
    } catch (error) {
      $('#loadingPanel')?.classList.add('hidden');
      $('.old-layout')?.classList.remove('hidden');
      showInputError(error.message || 'Không thể đọc nội dung bài làm.');
    }
  });

  on('#btnProceedAnalyze', 'onclick', async () => {
    const proceedBtn = $('#btnProceedAnalyze');
    if (proceedBtn && proceedBtn.disabled) return;

    const editedProblem = $('#scannedProblem')?.value.trim() || '';
    const editedStudentWork = $('#scannedStudentWork')?.value.trim() || '';

    currentTranscribed = {
      ...currentTranscribed,
      problemText: editedProblem,
      studentWorkText: editedStudentWork
    };

    $('#confirmPanel')?.classList.add('hidden');
    $('#loadingPanel')?.classList.remove('hidden');
    const loadTxt = $('#loadingText');
    const loadSub = $('#loadingSubtext');
    if (loadTxt) loadTxt.textContent = 'Đang phân tích bài toán…';
    if (loadSub) loadSub.textContent = 'AI đang kiểm tra tính đúng sai của đề bài và các bước giải.';

    try {
      const result = await HomeworkAnalysisService.analyze(imageUrl, currentTranscribed);
      $('#loadingPanel')?.classList.add('hidden');
      showResult(result);
      loadPracticeInBackground(result);

      if (window.MathFixAuth?.saveAnalysis) {
        window.MathFixAuth.saveAnalysis(currentTranscribed, result);
      }
    } catch (error) {
      $('#loadingPanel')?.classList.add('hidden');
      $('#confirmPanel')?.classList.remove('hidden');
      alert(error.message || 'Có lỗi xảy ra khi phân tích bài làm.');
    }
  });
}

// BƯỚC 3: TẢI NGẦM 4 BÀI TẬP
async function loadPracticeInBackground(result){
  const defaultLevels = ['Dễ hơn', 'Tương đương', 'Tương đương', 'Nâng cao'];
  for(let item of result.analysisSets){
    try {
      const topic = item.knowledgePoint?.name || item.topic || 'Toán THCS';
      const errors = item.learningErrors || [];
      const res = await HomeworkAnalysisService.generateExercises(topic, errors);
      
      const rawList = res.exercises || (Array.isArray(res) ? res : []);
      item.generatedExercises = rawList.slice(0, 4).map((ex, idx)=>({
        level: ex.level || defaultLevels[idx] || 'Tương đương',
        question: ex.question || 'Bài tập rèn luyện',
        answer: String(ex.answer || ''),
        solution: ex.solution || ''
      }));

      const container = $('#practiceBox');
      if (container && item.generatedExercises.length) {
        container.innerHTML = practiceMarkup(item.generatedExercises);
        bindPracticeEvents();
      }
    } catch (err) {
      console.warn('Lỗi nạp bài luyện tập:', err);
    }
  }
}

function showResult(result){
  currentResult=result;
  $('#loadingPanel')?.classList.add('hidden');
  $('#resultPanel')?.classList.remove('hidden');
  const resImg = $('#resultImage');
  if (resImg) resImg.src = imageUrl;

  // CHỈ HIỆN NÚT "PHÂN TÍCH BÀI" KHI ĐÃ VÀO TRANG KẾT QUẢ
  const navBtn = $('#navNewAnalyzeBtn');
  if (navBtn) navBtn.classList.remove('hidden');

  // 1. KIỂM ĐỊNH ĐỀ BÀI (DÙNG FORMATMATHHTML CHUẨN XÁC)
  const invalidBanner = $('#problemInvalidBanner');
  if (result.isProblemValid === false) {
    invalidBanner?.classList.remove('hidden');
    const pReason = $('#problemInvalidReason');
    const pCorr = $('#problemCorrectionText');
    if (pReason) pReason.innerHTML = formatMathHTML(result.problemIssue || 'Đề bài toán có dấu hiệu mâu thuẫn hoặc chưa chuẩn xác.');
    if (pCorr) pCorr.innerHTML = formatMathHTML(result.problemCorrectionSuggestion || 'Vui lòng kiểm tra lại số liệu của đề bài.');
  } else {
    invalidBanner?.classList.add('hidden');
  }

  // 2. HƯỚNG DẪN GIẢI MẪU
  const modelBox = $('#modelSolutionBox');
  const modelContent = $('#modelSolutionContent');
  const toggleBtn = $('#toggleSolutionBtn');
  const headerToggle = $('#modelSolutionHeaderToggle');
  const firstAnalysis = result.analysisSets?.[0] || {};

  if (firstAnalysis.modelSolution) {
    modelBox?.classList.remove('hidden');
    if (modelContent) modelContent.innerHTML = formatMathHTML(firstAnalysis.modelSolution);
    modelContent?.classList.add('hidden');
    if (toggleBtn) toggleBtn.textContent = '👁️ Xem lời giải ▼';

    const handleToggle = () => {
      const isHidden = modelContent?.classList.contains('hidden');
      if (isHidden) {
        modelContent?.classList.remove('hidden');
        if (toggleBtn) toggleBtn.textContent = 'Ẩn lời giải ▲';
      } else {
        modelContent?.classList.add('hidden');
        if (toggleBtn) toggleBtn.textContent = '👁️ Xem lời giải ▼';
      }
    };

    if (toggleBtn) toggleBtn.onclick = (e) => { e.stopPropagation(); handleToggle(); };
    if (headerToggle) headerToggle.onclick = handleToggle;
  } else {
    modelBox?.classList.add('hidden');
  }

  showAnalysis(0);
}

function showAnalysis(index){
  currentAnalysis=currentResult.analysisSets[index];
  correctCount=0;
  practiceAttempts=[];
  const r=currentAnalysis;
  const topicLbl = $('#topicLabel');
  const recTxt = $('#recommendation');
  if (topicLbl) topicLbl.innerHTML = formatMathHTML(`${r.subject.name} · ${r.knowledgePoint.name}`);
  if (recTxt) recTxt.innerHTML = formatMathHTML(r.aiRecommendation.message);
  
  const sets=currentResult.analysisSets;
  const pNav = $('#problemNavigator');
  if (pNav) {
    pNav.innerHTML=sets.length>1?`<div class="problem-nav"><span class="problem-nav-label">Ảnh có ${sets.length} bài cần xem lại. Chọn một bài:</span>${sets.map((item,itemIndex)=>`<button class="problem-tab ${itemIndex===index?'active':''}" data-analysis="${itemIndex}">${item.title||`Bài ${itemIndex+1}`}</button>`).join('')}</div>`:'';
    document.querySelectorAll('.problem-tab').forEach(button=>button.onclick=()=>showAnalysis(Number(button.dataset.analysis)));
  }
  
  // HIỂN THỊ CÁC THẺ LỖI SAI (ÁP DỤNG FORMATMATHHTML CHO TOÀN BỘ)
  const errList = $('#errorList');
  if (errList) {
    if (r.learningErrors && r.learningErrors.length > 0) {
      errList.innerHTML=r.learningErrors.map((e, errIdx)=>`
        <article class="error-card" id="error-card-${errIdx}">
          <span class="severity">Cần ôn lại</span>
          <h3>${formatMathHTML(e.title)}</h3>
          <div class="work-compare">
            <div><small>BẠN ĐÃ LÀM</small><b>${formatMathHTML(e.studentWork)}</b></div>
            <div><small>CÁCH BIẾN ĐỔI CHUẨN</small><b>${formatMathHTML(e.correction)}</b></div>
          </div>
          <p><b>Vị trí:</b> ${e.position}. ${formatMathHTML(e.explanation)}</p>
          <div class="tip">💡 ${formatMathHTML(e.tip)}</div>
          
          <div class="recheck-box" id="recheck-box-${errIdx}">
            <button class="btn-recheck-step" data-index="${errIdx}" type="button">🤔 Phản biện (AI chỉ sai rồi)</button>
            
            <div class="recheck-input-box hidden" id="recheck-input-box-${errIdx}">
              <label>💬 Nhập lập luận/cách giải thích của bạn:</label>
              <textarea class="recheck-argument-text" id="recheck-text-${errIdx}" placeholder="Ví dụ: Em áp dụng tính chất giao hoán (x+1)(x+3) = (x+3)(x+1) hoặc em biến đổi theo cách..."></textarea>
              <div class="recheck-actions">
                <button class="btn-cancel-recheck" data-index="${errIdx}" type="button">Hủy</button>
                <button class="btn-submit-recheck" data-index="${errIdx}" type="button">Gửi phản biện cho AI</button>
              </div>
            </div>

            <div class="recheck-feedback hidden" id="recheck-feedback-${errIdx}"></div>
          </div>
        </article>
      `).join('');
      bindRecheckEvents();
    } else {
      errList.innerHTML = `
        <article class="error-card" style="border: 2px solid #86efac; background: #f0fdf4;">
          <span class="severity" style="background:#10b981; color:#fff;">✓ Kiến thức chuẩn</span>
          <h3>Phương pháp giải bài toán</h3>
          <p>Bạn hãy bấm vào nút "Xem lời giải" ở khung phía trên để xem bài giải chi tiết, sau đó tự làm 4 bài luyện tập bên dưới nhé!</p>
        </article>
      `;
    }
  }
  
  renderPath(r);
}

function bindRecheckEvents(){
  document.querySelectorAll('.btn-recheck-step').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.dataset.index;
      $(`#recheck-input-box-${idx}`)?.classList.remove('hidden');
      btn.classList.add('hidden');
    };
  });

  document.querySelectorAll('.btn-cancel-recheck').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.dataset.index;
      $(`#recheck-input-box-${idx}`)?.classList.add('hidden');
      $(`.btn-recheck-step[data-index="${idx}"]`)?.classList.remove('hidden');
    };
  });

  document.querySelectorAll('.btn-submit-recheck').forEach(btn => {
    btn.onclick = async () => {
      const idx = Number(btn.dataset.index);
      const stepError = currentAnalysis.learningErrors[idx];
      const card = $(`#error-card-${idx}`);
      const feedback = $(`#recheck-feedback-${idx}`);
      const inputBox = $(`#recheck-input-box-${idx}`);
      const argumentText = $(`#recheck-text-${idx}`)?.value.trim();

      if (!argumentText) {
        alert('Vui lòng nhập lập luận hoặc lý do vì sao bạn cho rằng bước này bạn làm đúng.');
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳ AI đang suy nghĩ và đối chiếu lập luận…';

      try {
        const res = await HomeworkAnalysisService.recheckStep({
          problemText: currentTranscribed?.problemText || '',
          stepError: stepError,
          studentArgument: argumentText
        });

        inputBox?.classList.add('hidden');
        feedback?.classList.remove('hidden');

        if (res.verdictType === 'ai_wrong') {
          card?.classList.add('acknowledged-correct');
          const sev = card?.querySelector('.severity');
          if (sev) sev.textContent = '✓ Bạn làm đúng';
          if (feedback) {
            feedback.className = 'recheck-feedback ai_wrong';
            feedback.innerHTML = `<strong>🎉 ${res.verdictTitle}:</strong> ${formatMathHTML(res.explanation)}`;
          }
        } else if (res.verdictType === 'both_flawed') {
          if (feedback) {
            feedback.className = 'recheck-feedback both_flawed';
            feedback.innerHTML = `<strong>💡 ${res.verdictTitle}:</strong> ${formatMathHTML(res.explanation)}`;
          }
        } else {
          if (feedback) {
            feedback.className = 'recheck-feedback student_wrong';
            feedback.innerHTML = `<strong>⚠️ ${res.verdictTitle}:</strong> ${formatMathHTML(res.explanation)}`;
          }
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Gửi phản biện cho AI';
        alert('Không thể thẩm định lại bước này. Vui lòng thử lại.');
      }
    };
  });
}

function renderPath(r){
  const topicName = r.knowledgePoint?.name || r.topic || 'Toán THCS';
  const videoUrl = r.learningResources?.[0]?.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + ' toán THCS')}`;

  const pathStepsEl = $('#pathSteps');
  if (!pathStepsEl) return;

  pathStepsEl.innerHTML = r.learningPath.map((s, i) => `<article class="path-step ${i ? '' : 'active'}" data-step="${s.step}">
    <p class="step-tag">BƯỚC ${s.step}</p>
    <h3>${s.title}</h3>
    <p>${formatMathHTML(s.goal)}</p>
    ${i === 0 ? `
      <div class="theory-actions">
        <a class="resource-video-btn" target="_blank" rel="noopener" href="${videoUrl}">
          <span class="yt-icon">▶</span>
          <div class="yt-info">
            <b>Xem bài giảng YouTube về chuyên đề này</b>
            <small>Chủ đề: ${topicName}</small>
          </div>
        </a>
        <button class="btn next-step" type="button">Luyện tập luôn (4 bài) →</button>
      </div>
    ` : ''}
    ${i === 1 ? `<div id="practiceBox">${r.generatedExercises?.length ? practiceMarkup(r.generatedExercises) : '<div class="ai-created">⏳ Đang tạo 4 bài luyện tập thích ứng từ lỗi của bạn...</div>'}</div>` : ''}
    ${i === 2 ? `<div id="practiceSummary" class="summary-card">Hoàn thành các bài luyện tự luận để nhận xét kết quả.</div><button class="btn restart" type="button">Tạo phân tích mới</button>` : ''}
  </article>`).join('');
  
  const nextBtn = document.querySelector('.next-step');
  if (nextBtn) {
    nextBtn.onclick = () => {
      goStep(2);
    };
  }

  bindPracticeEvents();
  const restartBtn = document.querySelector('.restart');
  if (restartBtn) restartBtn.onclick = () => location.reload();
}

function practiceMarkup(items){
  if (!items || !items.length) {
    return '<div class="ai-created">Chưa có bài luyện tập nào được nạp.</div>';
  }
  const classes = { 'Dễ hơn': 'easier', 'Tương đương': 'basic', 'Nâng cao': 'advanced' };
  
  return `
    <div class="ai-created">✨ AI đã tạo 4 bài luyện tập tự luận. Bạn hãy nhập các bước giải biến đổi (gõ tự nhiên bằng bàn phím) để AI chấm từng bước nhé:</div>
    <div class="practice-questions-list">
      ${items.map((x, idx) => {
        const num = idx + 1;
        const lvl = x.level || (idx === 0 ? 'Dễ hơn' : idx === 3 ? 'Nâng cao' : 'Tương đương');
        const cls = classes[lvl] || 'basic';
        return `
          <div class="practice-question" data-level="${lvl}" data-question="${encodeURIComponent(x.question)}" data-solution="${encodeURIComponent(x.solution || '')}" data-index="${idx}">
            <label>
              <span class="level-tag ${cls}">${lvl}</span>
              <strong class="question-number">Câu ${num}:</strong>
              <span class="question-text">${formatMathHTML(x.question.replace(/^\s*Câu\s*\d+\s*[:.)-]?\s*/i, ''))}</span>
            </label>
            <div class="practice-solution-box">
              <textarea class="practice-steps-textarea" placeholder="Gõ các bước giải của bạn vào đây (khoảng 2-4 dòng, gõ phím bình thường)..." rows="3"></textarea>
              <button class="btn check-answer" type="button" style="align-self: flex-start; padding: 7px 16px; font-size: 13px;">Nộp bài giải</button>
            </div>
            <div class="practice-grade-result hidden"></div>
          </div>
        `;
      }).join('')}
    </div>
    <button id="finishPractice" class="btn" disabled>Hoàn thành bài luyện →</button>
  `;
}

function bindPracticeEvents(){
  document.querySelectorAll('.check-answer').forEach(btn => {
    btn.onclick = async (event) => {
      const box = event.currentTarget.closest('.practice-question');
      const textarea = box.querySelector('.practice-steps-textarea');
      const resultBox = box.querySelector('.practice-grade-result');
      const stepsText = textarea.value.trim();

      if (!stepsText) {
        alert('Vui lòng nhập các bước giải của bạn trước khi nộp bài.');
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳ AI đang chấm từng bước…';
      textarea.disabled = true;

      const questionText = decodeURIComponent(box.dataset.question);
      const solutionText = decodeURIComponent(box.dataset.solution);

      try {
        const gradeRes = await HomeworkAnalysisService.gradePractice({
          question: questionText,
          studentSteps: stepsText,
          solution: solutionText
        });

        box.dataset.done = 'yes';
        resultBox.classList.remove('hidden');

        const isOk = gradeRes.isCorrect === true;
        resultBox.className = `practice-grade-result ${isOk ? 'correct' : (gradeRes.score >= 5 ? 'partial' : 'wrong')}`;
        resultBox.innerHTML = `
          <div><strong>Điểm: ${gradeRes.score || (isOk ? '10/10' : '0/10')} · ${gradeRes.verdict || ''}</strong></div>
          <div style="margin-top:4px;">${formatMathHTML(gradeRes.feedback || '')}</div>
        `;

        btn.textContent = isOk ? '✓ Đã hoàn thành' : 'Đã chấm bài';

        practiceAttempts.push({
          question: questionText,
          level: box.dataset.level,
          submittedAnswer: stepsText,
          correctAnswer: solutionText,
          isCorrect: isOk,
          score: gradeRes.score
        });

        if (isOk) correctCount++;

        if (document.querySelectorAll('.practice-question[data-done="yes"]').length === currentAnalysis.generatedExercises.length) {
          const finBtn = $('#finishPractice');
          if (finBtn) finBtn.disabled = false;
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Nộp bài giải';
        textarea.disabled = false;
        alert('Lỗi chấm bài: ' + err.message);
      }
    };
  });
}

const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function demoReview(){
  const wrong=practiceAttempts.filter(x=>!x.isCorrect);
  return {
    summary: wrong.length ? `Bạn có ${wrong.length} câu cần lưu ý về bước giải hoặc phép tính.` : 'Bạn đã giải rất tốt và đầy đủ các bước biến đổi.',
    mistakes: wrong.map(x=>({steps:[`Đề bài: ${x.question}`, `Lời giải chuẩn: ${x.correctAnswer}`]})),
    studyPlanner:{
      today: wrong.length ? `Làm lại ${wrong.length} bài chưa đạt điểm tối đa, chú ý không làm tắt bước.` : 'Làm thêm các bài toán cùng chủ đề để rèn luyện tốc độ.',
      tomorrow: `Ôn tiếp kiến thức ${currentAnalysis.knowledgePoint.name}.`,
      review: 'Xem lại các quy tắc biến đổi và công thức toán THCS đã dùng.'
    }
  };
}

function renderReview(summary,feedback,total){
  const wrong=practiceAttempts.filter(x=>!x.isCorrect);
  const errors=wrong.map((attempt,index)=>{
    const cleanQuestion=attempt.question.replace(/^(?:Dễ hơn|Tương đương|Nâng cao)\s*/i,'');
    return `
      <article class="review-mistake">
        <b>Câu ${index+1} cần xem lại</b>
        <p class="review-question">${formatMathHTML(cleanQuestion)}</p>
        <p><strong>Bài làm của bạn:</strong></p>
        <pre style="white-space:pre-wrap; background:#fff; padding:8px 10px; border-radius:6px; font-family:inherit;">${escapeHtml(attempt.submittedAnswer)}</pre>
        <p class="solution-label"><strong>Gợi ý biến đổi chuẩn:</strong> ${formatMathHTML(attempt.correctAnswer)}</p>
      </article>
    `;
  }).join('');
  const fallback={today:wrong.length?`Làm lại ${wrong.length} câu sai, ghi rõ từng phép tính.`:'Làm thêm câu cùng dạng để duy trì kết quả tốt.',tomorrow:`Xem trước kiến thức ${currentAnalysis.knowledgePoint.name}.`,review:'Ôn lại các bước tính đã sai trước khi làm bài mới.'};
  const planner={...fallback,...(feedback.studyPlanner||{})};
  summary.innerHTML=`<b>Kết quả luyện tập: ${correctCount}/${total} bài đạt điểm tuyệt đối</b><p>${formatMathHTML(feedback.summary)}</p>${errors?`<div class="review-mistakes">${errors}</div>`:''}<section class="study-planner"><p class="planner-kicker">STUDY PLANNER</p><h4>Kế hoạch ôn tập của bạn</h4><div><b>📝 BTVN hôm nay</b><span>${formatMathHTML(planner.today)}</span></div><div><b>📖 Xem trước ngày mai</b><span>${formatMathHTML(planner.tomorrow)}</span></div><div><b>💡 Ôn bài cũ + lỗi còn hổng</b><span>${formatMathHTML(planner.review)}</span></div></section>`;
}

document.addEventListener('click',async event=>{
  if(event.target.id==='finishPractice'){
    const summary=$('#practiceSummary'),total=currentAnalysis.generatedExercises.length;
    goStep(3);
    summary.textContent='AI đang tổng hợp các bài tự luận và đưa nhận xét…';
    try{
      const feedback=window.LEARNING_DEMO_MODE?demoReview():await HomeworkAnalysisService.reviewPractice({topic:currentAnalysis.knowledgePoint.name,detectedErrors:currentAnalysis.learningErrors,attempts:practiceAttempts});
      renderReview(summary,feedback,total);

      if (window.MathFixAuth?.savePractice) {
        window.MathFixAuth.savePractice(currentAnalysis.knowledgePoint.name, correctCount, total, practiceAttempts);
      }
    }catch(error){
      summary.textContent=`Bạn hoàn thành ${correctCount}/${total} bài. AI chưa thể tạo nhận xét chi tiết: ${error.message}`;
    }
  }
});

function goStep(step){
  const current=document.querySelector('.path-step.active'),next=document.querySelector(`.path-step[data-step="${step}"]`);
  current?.classList.remove('active');
  next?.classList.add('active');
  document.querySelectorAll('.path-progress i').forEach((item,index)=>item.classList.toggle('active',index<step));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLearningApp);
} else {
  initLearningApp();
}
