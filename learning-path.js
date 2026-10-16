const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let imageUrl='',originalImageUrl='',cropper=null,cameraStream=null,currentResult=null,currentAnalysis=null,correctCount=0,practiceAttempts=[];
let currentTranscribed=null;

// HÀM CHUYỂN ĐỔI SANG VĂN BẢN GÕ PHÍM THÔNG THƯỜNG (DÀNH CHO Ô NHẬP LIỆU CHỈNH SỬA)
function toPlainText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, 'căn bậc $1($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, 'căn($1)')
    .replace(/\\times/g, '*')
    .replace(/\\div/g, ':')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '*')
    .replace(/\^\{([^}]+)\}/g, '^$1')
    .replace(/_\{([^}]+)\}/g, '_$1')
    .replace(/\$/g, '')
    .replace(/\\/g, '')
    .trim();
}

// BỘ VẼ CÔNG THỨC TOÁN HỌC (CHỈ DÙNG Ở MÀN HÌNH HIỂN THỊ KẾT QUẢ VÀ BÀI TẬP)
function renderMath(target){
  const el = target || document.body;
  const run = () => {
    if (typeof window.katex !== 'undefined') {
      try {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) {
          const parent = walker.currentNode.parentNode;
          if (parent && !['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'PRE', 'CODE'].includes(parent.tagName) && !parent.closest('.katex')) {
            const val = walker.currentNode.nodeValue;
            if (val && (/\$([^$]+)\$/.test(val) || /\\(frac|sqrt|times|div|pm)/.test(val) || /\b[a-zA-Z0-9]\^\{?[0-9a-zA-Z+-]+\}?/.test(val))) {
              textNodes.push(walker.currentNode);
            }
          }
        }

        textNodes.forEach(node => {
          let text = node.nodeValue;
          if (!text) return;

          text = text.replace(/(\\(?:frac\{[^}]+\}\{[^}]+\}|sqrt\{[^}]+\}|sqrt\[\d+\]\{[^}]+\}))/g, '$$$1$$');

          let html = text.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
            try { return window.katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }); }
            catch { return `$$${math}$$`; }
          });

          html = html.replace(/\$([^$]+)\$/g, (_, math) => {
            try { return window.katex.renderToString(math.trim(), { displayMode: false, throwOnError: false }); }
            catch { return `$${math}$`; }
          });

          if (html !== node.nodeValue) {
            const span = document.createElement('span');
            span.innerHTML = html;
            node.parentNode?.replaceChild(span, node);
          }
        });
      } catch (err) {
        console.warn('Lỗi renderMath:', err);
      }
    }
  };

  run();
  setTimeout(run, 150);
  setTimeout(run, 400);
}

function initCropper(src){
  if(cropper){ cropper.destroy(); cropper = null; }
  const preview = $('#preview');
  preview.src = src;
  cropper = new Cropper(preview, {
    viewMode: 1, autoCropArea: 0.95, responsive: true, background: false, movable: true, rotatable: true, scalable: true, zoomable: true
  });
}

function setImage(src){
  imageUrl = src;
  originalImageUrl = src;
  $('#emptyDropLabel').classList.add('hidden');
  $('#previewContainer').classList.remove('hidden');
  $('#analyzeBtn').disabled = false;
  $('#uploadError').classList.add('hidden');
  initCropper(src);
}

function showInputError(message){$('#uploadError').textContent=message;$('#uploadError').classList.remove('hidden')}

$('#imageInput').onchange=e=>{
  const f=e.target.files[0];
  if(!f)return;
  if(!['image/jpeg','image/png'].includes(f.type)||f.size>10*1024*1024){
    showInputError('Hãy chọn ảnh JPG hoặc PNG, dung lượng không quá 10 MB.');
    return;
  }
  const reader=new FileReader();
  reader.onload=()=>setImage(reader.result);
  reader.readAsDataURL(f);
};

$('#rotateLeftBtn').onclick=()=>{ if(cropper) cropper.rotate(-90); };
$('#rotateRightBtn').onclick=()=>{ if(cropper) cropper.rotate(90); };
$('#applyCropBtn').onclick=()=>{
  if(!cropper) return;
  const canvas = cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048 });
  if(canvas){
    const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
    imageUrl = croppedUrl;
    initCropper(croppedUrl);
  }
};
$('#resetCropBtn').onclick=()=>{
  if(originalImageUrl){ imageUrl = originalImageUrl; initCropper(originalImageUrl); }
};
$('#reselectBtn').onclick=()=>{
  if(cropper){ cropper.destroy(); cropper = null; }
  $('#imageInput').value = '';
  $('#previewContainer').classList.add('hidden');
  $('#emptyDropLabel').classList.remove('hidden');
  $('#analyzeBtn').disabled = true;
};

$$('.tab').forEach(t=>t.onclick=async()=>{
  const camera=t.dataset.tab==='camera';
  $$('.tab').forEach(x=>x.classList.toggle('active',x===t));
  $('#uploadMode').classList.toggle('hidden',camera);
  $('#cameraMode').classList.toggle('hidden',!camera);
  if(!camera){
    cameraStream?.getTracks().forEach(track=>track.stop());
    cameraStream=null;
    return;
  }
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    $('#cameraPreview').srcObject=cameraStream;
    $('#cameraMessage').textContent='Canh bài làm vào khung rồi nhấn Chụp ảnh.';
  }catch{
    $('#cameraMessage').textContent='Không thể mở camera. Bạn vẫn có thể chuyển sang Tải ảnh lên.';
  }
});

$('#captureBtn').onclick=()=>{
  const v=$('#cameraPreview'),c=$('#cameraCanvas');
  if(!v.videoWidth)return;
  c.width=v.videoWidth;
  c.height=v.videoHeight;
  c.getContext('2d').drawImage(v,0,0);
  setImage(c.toDataURL('image/jpeg'));
  cameraStream?.getTracks().forEach(t=>t.stop());
  cameraStream=null;
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='upload'));
  $('#uploadMode').classList.remove('hidden');
  $('#cameraMode').classList.add('hidden');
};

// BƯỚC 1: BẤM NÚT ĐỌC BÀI TOÁN -> KIỂM TRA PHẠM VI TOÁN THCS VÀ ĐỔ VÀO 2 Ô TEXTAREA
$('#analyzeBtn').onclick=async()=>{
  if(cropper){
    const canvas = cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048 });
    if(canvas) imageUrl = canvas.toDataURL('image/jpeg', 0.9);
  }
  if(!imageUrl)return;
  
  $('.old-layout').classList.add('hidden');
  $('#confirmPanel').classList.add('hidden');
  $('#loadingPanel').classList.remove('hidden');
  $('#loadingText').textContent = 'Đang đọc nội dung trong ảnh…';
  $('#loadingSubtext').textContent = 'AI đang nhận diện chữ viết và kiểm tra phạm vi môn Toán THCS.';

  try {
    const scanRes = await HomeworkAnalysisService.scan(imageUrl);
    currentTranscribed = scanRes;
    
    // Gán dữ liệu dạng văn bản thông thường (Nếu ảnh không có bài làm, ô bên dưới sẽ rỗng 100%)
    $('#scannedProblem').value = toPlainText(scanRes.problemText || '');
    $('#scannedStudentWork').value = toPlainText(scanRes.studentWorkText || '');
    
    const scopeAlert = $('#outOfScopeAlert');
    const proceedBtn = $('#btnProceedAnalyze');

    if (scanRes.isSupportedScope === false) {
      scopeAlert.classList.remove('hidden');
      $('#scopeAlertMsg').textContent = `${scanRes.scopeReason || 'Nội dung này không thuộc phạm vi môn Toán THCS.'} MathFix AI chỉ hỗ trợ môn Toán cấp THCS (Lớp 6, 7, 8, 9). Không hỗ trợ Toán THPT hay các môn học khác. Bạn vui lòng chọn bài tập Toán THCS phù hợp nhé!`;
      proceedBtn.disabled = true;
      proceedBtn.style.opacity = '0.4';
      proceedBtn.style.cursor = 'not-allowed';
    } else {
      scopeAlert.classList.add('hidden');
      proceedBtn.disabled = false;
      proceedBtn.style.opacity = '1';
      proceedBtn.style.cursor = 'pointer';
    }

    $('#loadingPanel').classList.add('hidden');
    $('#confirmPanel').classList.remove('hidden');
  } catch(error) {
    $('#loadingPanel').classList.add('hidden');
    $('.old-layout').classList.remove('hidden');
    showInputError(error.message || 'Không thể đọc nội dung bài làm.');
  }
};

// BƯỚC 2A: CHỤP LẠI
$('#btnRetakeCamera').onclick=async()=>{
  $('#confirmPanel').classList.add('hidden');
  $('.old-layout').classList.remove('hidden');
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='camera'));
  $('#uploadMode').classList.add('hidden');
  $('#cameraMode').classList.remove('hidden');
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    $('#cameraPreview').srcObject=cameraStream;
    $('#cameraMessage').textContent='Canh bài làm vào khung rồi nhấn Chụp ảnh.';
  }catch{
    $('#cameraMessage').textContent='Không thể mở camera. Bạn có thể chuyển sang Tải ảnh lên.';
  }
};

// BƯỚC 2B: TẢI BÀI KHÁC
$('#btnReupload').onclick=()=>{
  if(cropper){ cropper.destroy(); cropper = null; }
  imageUrl='';
  originalImageUrl='';
  $('#imageInput').value = '';
  $('#previewContainer').classList.add('hidden');
  $('#emptyDropLabel').classList.remove('hidden');
  $('#analyzeBtn').disabled = true;

  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='upload'));
  $('#uploadMode').classList.remove('hidden');
  $('#cameraMode').classList.add('hidden');
  if(cameraStream){
    cameraStream.getTracks().forEach(track=>track.stop());
    cameraStream=null;
  }

  $('#confirmPanel').classList.add('hidden');
  $('.old-layout').classList.remove('hidden');
};

// BƯỚC 2C: TIẾN HÀNH PHÂN TÍCH (LẤY VĂN BẢN TRONG 2 Ô TEXTAREA)
$('#btnProceedAnalyze').onclick=async()=>{
  if ($('#btnProceedAnalyze').disabled) return;

  const editedProblem = $('#scannedProblem').value.trim();
  const editedStudentWork = $('#scannedStudentWork').value.trim();

  currentTranscribed = {
    ...currentTranscribed,
    problemText: editedProblem,
    studentWorkText: editedStudentWork
  };

  $('#confirmPanel').classList.add('hidden');
  $('#loadingPanel').classList.remove('hidden');
  $('#loadingText').textContent = 'Đang phân tích bài toán…';
  $('#loadingSubtext').textContent = 'AI đang kiểm tra tính đúng sai của đề bài và các bước giải.';

  try {
    const result = await HomeworkAnalysisService.analyze(imageUrl, currentTranscribed);
    $('#loadingPanel').classList.add('hidden');
    showResult(result);
    loadPracticeInBackground(result);

    if (window.MathFixAuth?.saveAnalysis) {
      window.MathFixAuth.saveAnalysis(currentTranscribed, result);
    }
  } catch(error) {
    $('#loadingPanel').classList.add('hidden');
    $('#confirmPanel').classList.remove('hidden');
    alert(error.message || 'Có lỗi xảy ra khi phân tích bài làm.');
  }
};

// BƯỚC 3: TẢI NGẦM 4 BÀI TẬP
async function loadPracticeInBackground(result){
  const defaultLevels = ['Dễ hơn', 'Tương đương', 'Tương đương', 'Nâng cao'];
  for(let item of result.analysisSets){
    const res = await HomeworkAnalysisService.generateExercises(item.knowledgePoint.name, item.learningErrors);
    item.generatedExercises = (res.exercises || []).slice(0, 4).map((ex, idx)=>({
      level: ex.level || defaultLevels[idx] || 'Tương đương',
      question: ex.question,
      answer: String(ex.answer),
      solution: ex.solution || ''
    }));
    if(currentAnalysis && currentAnalysis.title === item.title){
      const container = $('#practiceBox');
      if(container) {
        container.innerHTML = practiceMarkup(item.generatedExercises);
        bindPracticeEvents();
        renderMath(container);
      }
    }
  }
}

function showResult(result){
  currentResult=result;
  $('#loadingPanel').classList.add('hidden');
  $('#resultPanel').classList.remove('hidden');
  $('#resultImage').src=imageUrl;

  // 1. KIỂM ĐỊNH ĐỀ BÀI: Nếu đề bài sai thì hiện bảng cảnh báo đỏ
  const invalidBanner = $('#problemInvalidBanner');
  if (result.isProblemValid === false) {
    invalidBanner.classList.remove('hidden');
    $('#problemInvalidReason').textContent = result.problemIssue || 'Đề bài toán có dấu hiệu mâu thuẫn hoặc chưa chuẩn xác dẫn tới bài giải không hợp lệ.';
    $('#problemCorrectionText').textContent = result.problemCorrectionSuggestion || 'Vui lòng kiểm tra lại số liệu của đề bài.';
    renderMath(invalidBanner);
  } else {
    invalidBanner.classList.add('hidden');
  }

  // 2. HƯỚNG DẪN GIẢI MẪU: Nếu học sinh để trống bài làm, hiện khung giải mẫu
  const modelBox = $('#modelSolutionBox');
  const firstAnalysis = result.analysisSets?.[0] || {};
  if (firstAnalysis.modelSolution) {
    modelBox.classList.remove('hidden');
    $('#modelSolutionContent').textContent = firstAnalysis.modelSolution;
    renderMath(modelBox);
  } else {
    modelBox.classList.add('hidden');
  }

  showAnalysis(0);
}

function showAnalysis(index){
  currentAnalysis=currentResult.analysisSets[index];
  correctCount=0;
  practiceAttempts=[];
  const r=currentAnalysis;
  $('#topicLabel').textContent=`${r.subject.name} · ${r.knowledgePoint.name}`;
  $('#recommendation').textContent=r.aiRecommendation.message;
  const sets=currentResult.analysisSets;
  $('#problemNavigator').innerHTML=sets.length>1?`<div class="problem-nav"><span class="problem-nav-label">Ảnh có ${sets.length} bài cần xem lại. Chọn một bài:</span>${sets.map((item,itemIndex)=>`<button class="problem-tab ${itemIndex===index?'active':''}" data-analysis="${itemIndex}">${item.title||`Bài ${itemIndex+1}`}</button>`).join('')}</div>`:'';
  $$('.problem-tab').forEach(button=>button.onclick=()=>showAnalysis(Number(button.dataset.analysis)));
  
  // HIỂN THỊ CÁC THẺ LỖI SAI KÈM NÚT PHẢN BIỆN
  if (r.learningErrors && r.learningErrors.length > 0) {
    $('#errorList').innerHTML=r.learningErrors.map((e, errIdx)=>`
      <article class="error-card" id="error-card-${errIdx}">
        <span class="severity">Cần ôn lại</span>
        <h3>${e.title}</h3>
        <div class="work-compare">
          <div><small>BẠN ĐÃ LÀM</small><b>${e.studentWork}</b></div>
          <div><small>CÁCH BIẾN ĐỔI CHUẨN</small><b>${e.correction}</b></div>
        </div>
        <p><b>Vị trí:</b> ${e.position}. ${e.explanation}</p>
        <div class="tip">💡 ${e.tip}</div>
        
        <!-- HỘP PHẢN BIỆN CỦA HỌC SINH -->
        <div class="recheck-box" id="recheck-box-${errIdx}">
          <button class="btn-recheck-step" data-index="${errIdx}" type="button">🤔 Phản biện (AI chỉ sai rồi)</button>
          
          <!-- KHUNG NHẬP NỘI DUNG PHẢN BIỆN (Mặc định ẩn) -->
          <div class="recheck-input-box hidden" id="recheck-input-box-${errIdx}">
            <label>💬 Nhập lập luận/cách giải thích của bạn:</label>
            <textarea class="recheck-argument-text" id="recheck-text-${errIdx}" placeholder="Ví dụ: Em áp dụng tính chất giao hoán (x+1)(x+3) = (x+3)(x+1) hoặc em biến đổi theo cách..."></textarea>
            <div class="recheck-actions">
              <button class="btn-cancel-recheck" data-index="${errIdx}" type="button">Hủy</button>
              <button class="btn-submit-recheck" data-index="${errIdx}" type="button">Gửi phản biện cho AI</button>
            </div>
          </div>

          <!-- KẾT QUẢ PHÂN ĐỊNH 3 TRƯỜNG HỢP CỦA AI -->
          <div class="recheck-feedback hidden" id="recheck-feedback-${errIdx}"></div>
        </div>
      </article>
    `).join('');
    bindRecheckEvents();
  } else {
    $('#errorList').innerHTML = `
      <article class="error-card" style="border: 2px solid #86efac; background: #f0fdf4;">
        <span class="severity" style="background:#10b981; color:#fff;">✓ Kiến thức chuẩn</span>
        <h3>Phương pháp giải bài toán</h3>
        <p>Bạn hãy theo dõi các bước giải mẫu bên trên và tự luyện tập 4 bài tương tự bên dưới nhé!</p>
      </article>
    `;
  }
  
  renderPath(r);
  renderMath($('#resultPanel'));
}

// BƯỚC XỬ LÝ SỰ KIỆN PHẢN BIỆN 2 CHIỀU
function bindRecheckEvents(){
  // 1. Bấm mở khung gõ phản biện
  $$('.btn-recheck-step').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.dataset.index;
      $(`#recheck-input-box-${idx}`).classList.remove('hidden');
      btn.classList.add('hidden');
    };
  });

  // 2. Bấm hủy phản biện
  $$('.btn-cancel-recheck').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.dataset.index;
      $(`#recheck-input-box-${idx}`).classList.add('hidden');
      $(`.btn-recheck-step[data-index="${idx}"]`).classList.remove('hidden');
    };
  });

  // 3. Gửi lập luận phản biện cho AI
  $$('.btn-submit-recheck').forEach(btn => {
    btn.onclick = async () => {
      const idx = Number(btn.dataset.index);
      const stepError = currentAnalysis.learningErrors[idx];
      const card = $(`#error-card-${idx}`);
      const feedback = $(`#recheck-feedback-${idx}`);
      const inputBox = $(`#recheck-input-box-${idx}`);
      const argumentText = $(`#recheck-text-${idx}`).value.trim();

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

        inputBox.classList.add('hidden');
        feedback.classList.remove('hidden');

        // PHÂN ĐỊNH 3 TRƯỜNG HỢP:
        if (res.verdictType === 'ai_wrong') {
          // Trường hợp 1: AI sai thật, học sinh phản biện đúng
          card.classList.add('acknowledged-correct');
          card.querySelector('.severity').textContent = '✓ Bạn làm đúng';
          feedback.className = 'recheck-feedback ai_wrong';
          feedback.innerHTML = `<strong>🎉 ${res.verdictTitle}:</strong> ${res.explanation}`;
        } else if (res.verdictType === 'both_flawed') {
          // Trường hợp 2: Cả 2 cùng có thiếu sót
          feedback.className = 'recheck-feedback both_flawed';
          feedback.innerHTML = `<strong>💡 ${res.verdictTitle}:</strong> ${res.explanation}`;
        } else {
          // Trường hợp 3: Học sinh hiểu sai, AI giữ vững lập trường
          feedback.className = 'recheck-feedback student_wrong';
          feedback.innerHTML = `<strong>⚠️ ${res.verdictTitle}:</strong> ${res.explanation}`;
        }

        renderMath(feedback);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Gửi phản biện cho AI';
        alert('Không thể thẩm định lại bước này. Vui lòng thử lại.');
      }
    };
  });
}

function renderPath(r){
  $('#pathSteps').innerHTML=r.learningPath.map((s,i)=>`<article class="path-step ${i?'':'active'}" data-step="${s.step}">
    <p class="step-tag">BƯỚC ${s.step}</p>
    <h3>${s.title}</h3>
    <p>${s.goal}</p>
    ${i===0?`<a class="resource" target="_blank" rel="noopener" href="${r.learningResources[0].url}">▶ ${r.learningResources[0].title}</a><button class="btn next-step">Đã học lý thuyết →</button>`:''}
    ${i===1?`<div id="practiceBox">${r.generatedExercises?.length ? practiceMarkup(r.generatedExercises) : '<div class="ai-created">✨ AI đang tạo 4 bài luyện tập phù hợp từ lỗi của bạn...</div>'}</div>`:''}
    ${i===2?`<div id="practiceSummary" class="summary-card">Hoàn thành các bài luyện tự luận để nhận xét kết quả.</div><button class="btn restart">Tạo phân tích mới</button>`:''}
  </article>`).join('');
  $('.next-step').onclick=()=>goStep(2);
  bindPracticeEvents();
  $('.restart').onclick=()=>location.reload();
  renderMath($('#pathSteps'));
}

// BỘ GIAO DIỆN HIỂN THỊ 4 BÀI TẬP VỚI Ô TEXTAREA NHẬP LỜI GIẢI TỰ LUẬN 2-4 DÒNG
function practiceMarkup(items){
  const levels=['Dễ hơn','Tương đương','Nâng cao'];
  const classes={'Dễ hơn':'easier','Tương đương':'basic','Nâng cao':'advanced'};
  let number=0;
  return `<div class="ai-created">✨ AI đã tạo 4 bài luyện tập tự luận. Bạn hãy nhập các bước giải biến đổi (gõ tự nhiên bằng bàn phím) để AI chấm từng bước nhé:</div>
  ${levels.map(level=>({level,items:items.filter(x=>x.level===level)})).filter(group=>group.items.length).map(group=>`
    <section class="practice-level-group ${classes[group.level]}">
      <h4>${group.level} · ${group.items.length} câu</h4>
      ${group.items.map(x=>{
        number++;
        return `
          <div class="practice-question" data-level="${x.level}" data-question="${encodeURIComponent(x.question)}" data-solution="${encodeURIComponent(x.solution||'')}" data-index="${number-1}">
            <label>
              <span class="level-tag ${classes[group.level]}">${group.level}</span>
              <strong class="question-number">Câu ${number}:</strong>
              <span class="question-text">${x.question.replace(/^\s*Câu\s*\d+\s*[:.)-]?\s*/i,'')}</span>
            </label>
            <div class="practice-solution-box">
              <textarea class="practice-steps-textarea" placeholder="Gõ các bước giải của bạn vào đây (khoảng 2-4 dòng, gõ phím bình thường không cần gõ mã)..." rows="3"></textarea>
              <button class="btn check-answer" type="button" style="align-self: flex-start; padding: 7px 16px; font-size: 13px;">Nộp bài giải</button>
            </div>
            <div class="practice-grade-result hidden"></div>
          </div>
        `;
      }).join('')}
    </section>
  `).join('')}
  <button id="finishPractice" class="btn" disabled>Hoàn thành bài luyện →</button>`;
}

// XỬ LÝ CHẤM TỰ LUẬN TỪNG BƯỚC BẰNG AI KHI HỌC SINH NỘP BÀI
function bindPracticeEvents(){
  $$('.check-answer').forEach(btn => {
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
          <div style="margin-top:4px;">${gradeRes.feedback || ''}</div>
        `;
        renderMath(resultBox);

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

        if ($$('.practice-question[data-done="yes"]').length === currentAnalysis.generatedExercises.length) {
          $('#finishPractice').disabled = false;
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
        <p class="review-question">${escapeHtml(cleanQuestion)}</p>
        <p><strong>Bài làm của bạn:</strong></p>
        <pre style="white-space:pre-wrap; background:#fff; padding:8px 10px; border-radius:6px; font-family:inherit;">${escapeHtml(attempt.submittedAnswer)}</pre>
        <p class="solution-label"><strong>Gợi ý biến đổi chuẩn:</strong> ${escapeHtml(attempt.correctAnswer)}</p>
      </article>
    `;
  }).join('');
  const fallback={today:wrong.length?`Làm lại ${wrong.length} câu sai, ghi rõ từng phép tính.`:'Làm thêm câu cùng dạng để duy trì kết quả tốt.',tomorrow:`Xem trước kiến thức ${currentAnalysis.knowledgePoint.name}.`,review:'Ôn lại các bước tính đã sai trước khi làm bài mới.'};
  const planner={...fallback,...(feedback.studyPlanner||{})};
  summary.innerHTML=`<b>Kết quả luyện tập: ${correctCount}/${total} bài đạt điểm tuyệt đối</b><p>${escapeHtml(feedback.summary)}</p>${errors?`<div class="review-mistakes">${errors}</div>`:''}<section class="study-planner"><p class="planner-kicker">STUDY PLANNER</p><h4>Kế hoạch ôn tập của bạn</h4><div><b>📝 BTVN hôm nay</b><span>${escapeHtml(planner.today)}</span></div><div><b>📖 Xem trước ngày mai</b><span>${escapeHtml(planner.tomorrow)}</span></div><div><b>💡 Ôn bài cũ + lỗi còn hổng</b><span>${escapeHtml(planner.review)}</span></div></section>`;
  renderMath(summary);
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
  const current=$('.path-step.active'),next=$(`.path-step[data-step="${step}"]`);
  current.classList.remove('active');
  next.classList.add('active');
  $$('.path-progress i').forEach((item,index)=>item.classList.toggle('active',index<step));
  renderMath(next);
}
