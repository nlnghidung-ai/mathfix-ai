const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let imageUrl='',originalImageUrl='',cropper=null,cameraStream=null,currentResult=null,currentAnalysis=null,correctCount=0,practiceAttempts=[];
let currentTranscribed=null;

// HÀM VẼ CÔNG THỨC TOÁN HỌC CHUẨN MỰC (QUÉT KÉP TỰ ĐỘNG)
function renderMath(target){
  const el = target || document.body;
  const run = () => {
    if (typeof window.renderMathInElement === 'function') {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (e) {}
    }
    if (typeof window.katex !== 'undefined') {
      try {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) {
          const parent = walker.currentNode.parentNode;
          if (parent && !['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE'].includes(parent.tagName) && !parent.closest('.katex')) {
            if (/\$([^$]+)\$/.test(walker.currentNode.nodeValue)) {
              textNodes.push(walker.currentNode);
            }
          }
        }
        textNodes.forEach(node => {
          const text = node.nodeValue;
          if (!text || !text.includes('$')) return;
          const span = document.createElement('span');
          span.innerHTML = text.replace(/\$([^$]+)\$/g, (_, math) => {
            try {
              return window.katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
            } catch {
              return `$${math}$`;
            }
          });
          node.parentNode?.replaceChild(span, node);
        });
      } catch (e) {}
    }
  };

  run();
  setTimeout(run, 150);
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

// BƯỚC 1: BẤM NÚT ĐỌC NỘI DUNG BÀI TOÁN
$('#analyzeBtn').onclick=async()=>{
  if(cropper){
    const canvas = cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048 });
    if(canvas) imageUrl = canvas.toDataURL('image/jpeg', 0.9);
  }
  if(!imageUrl)return;
  
  $('.old-layout').classList.add('hidden');
  $('#confirmPanel').classList.add('hidden');
  $('#loadingPanel').classList.remove('hidden');
  $('#loadingText').textContent = 'Đang đọc bài toán trong ảnh…';
  $('#loadingSubtext').textContent = 'AI đang nhận diện đề bài và các bước giải.';

  try {
    const scanRes = await HomeworkAnalysisService.scan(imageUrl);
    currentTranscribed = scanRes;
    
    $('#scannedProblem').textContent = scanRes.problemText || 'Không phát hiện rõ nội dung đề bài.';
    $('#scannedStudentWork').textContent = scanRes.studentWorkText || 'Không phát hiện rõ nội dung bài làm.';
    
    $('#loadingPanel').classList.add('hidden');
    $('#confirmPanel').classList.remove('hidden');
    renderMath($('#confirmPanel'));
  } catch(error) {
    $('#loadingPanel').classList.add('hidden');
    $('.old-layout').classList.remove('hidden');
    showInputError(error.message || 'Không thể đọc nội dung bài làm.');
  }
};

// BƯỚC 2A: NGƯỜI DÙNG BẤM "CHỤP LẠI"
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

// BƯỚC 2B: NGƯỜI DÙNG BẤM "TẢI LẠI ẢNH"
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

// BƯỚC 2C: NGƯỜI DÙNG XÁC NHẬN "TIẾP TỤC PHÂN TÍCH"
$('#btnProceedAnalyze').onclick=async()=>{
  $('#confirmPanel').classList.add('hidden');
  $('#loadingPanel').classList.remove('hidden');
  $('#loadingText').textContent = 'Đang phân tích bài toán…';
  $('#loadingSubtext').textContent = 'AI đang kiểm tra các phép tính và tìm lỗi sai.';

  try {
    const result = await HomeworkAnalysisService.analyze(imageUrl, currentTranscribed);
    $('#loadingPanel').classList.add('hidden');
    showResult(result);
    loadPracticeInBackground(result);

    // [TỰ ĐỘNG LƯU VÀO DATABASE]: Lưu bài phân tích nếu học sinh đã đăng nhập
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
      answer: String(ex.answer)
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
  
  $('#errorList').innerHTML=r.learningErrors.map((e, errIdx)=>`
    <article class="error-card" id="error-card-${errIdx}">
      <span class="severity">Cần ôn lại</span>
      <h3>${e.title}</h3>
      <div class="work-compare">
        <div><small>BẠN ĐÃ LÀM</small><b>${e.studentWork}</b></div>
        <div><small>CÁCH ĐÚNG</small><b>${e.correction}</b></div>
      </div>
      <p><b>Vị trí:</b> ${e.position}. ${e.explanation}</p>
      <div class="tip">💡 ${e.tip}</div>
      <div class="recheck-box">
        <button class="btn-recheck-step" data-index="${errIdx}" type="button">🤔 AI chỉ sai rồi (Kiểm tra lại)</button>
        <div class="recheck-feedback hidden" id="recheck-feedback-${errIdx}"></div>
      </div>
    </article>
  `).join('');
  
  bindRecheckEvents();
  renderPath(r);
  renderMath($('#resultPanel'));
}

function bindRecheckEvents(){
  $$('.btn-recheck-step').forEach(btn => {
    btn.onclick = async () => {
      const idx = Number(btn.dataset.index);
      const stepError = currentAnalysis.learningErrors[idx];
      const card = $(`#error-card-${idx}`);
      const feedback = $(`#recheck-feedback-${idx}`);
      
      btn.disabled = true;
      btn.textContent = '⏳ AI đang suy nghĩ và tính lại…';

      try {
        const res = await HomeworkAnalysisService.recheckStep({
          problemText: currentTranscribed?.problemText || '',
          stepError: stepError
        });

        feedback.classList.remove('hidden');

        if (res.isStudentCorrect) {
          card.classList.add('acknowledged-correct');
          card.querySelector('.severity').textContent = '✓ Bạn làm đúng';
          btn.textContent = '✓ AI đã xác nhận bạn làm đúng';
          feedback.className = 'recheck-feedback correct';
          feedback.innerHTML = `<strong>🎉 ${res.verdictTitle}:</strong> ${res.explanation}`;
        } else {
          btn.textContent = 'Đã kiểm tra lại';
          feedback.className = 'recheck-feedback wrong';
          feedback.innerHTML = `<strong>⚠️ ${res.verdictTitle}:</strong> ${res.explanation}`;
        }
        renderMath(feedback);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '🤔 AI chỉ sai rồi (Kiểm tra lại)';
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
    ${i===2?`<div id="practiceSummary" class="summary-card">Hoàn thành các bài luyện để nhận xét kết quả.</div><button class="btn restart">Tạo phân tích mới</button>`:''}
  </article>`).join('');
  $('.next-step').onclick=()=>goStep(2);
  bindPracticeEvents();
  $('.restart').onclick=()=>location.reload();
  renderMath($('#pathSteps'));
}

function bindPracticeEvents(){
  $$('.check-answer').forEach(b=>b.onclick=checkAnswer);
}

function practiceMarkup(items){
  const levels=['Dễ hơn','Tương đương','Nâng cao'];
  const classes={'Dễ hơn':'easier','Tương đương':'basic','Nâng cao':'advanced'};
  let number=0;
  return `<div class="ai-created">✨ AI đã tạo 4 bài luyện tập: 1 câu dễ hơn, 2 câu cùng mức độ và 1 câu nâng cao.</div>${levels.map(level=>({level,items:items.filter(x=>x.level===level)})).filter(group=>group.items.length).map(group=>`<section class="practice-level-group ${classes[group.level]}"><h4>${group.level} · ${group.items.length} câu</h4>${group.items.map(x=>{number++;return `<div class="practice-question" data-level="${x.level}" data-answer="${x.answer}"><label><span class="level-tag ${classes[group.level]}">${group.level}</span><strong class="question-number">Câu ${number}:</strong><span class="question-text">${x.question.replace(/^\s*Câu\s*\d+\s*[:.)-]?\s*/i,'')}</span></label><div class="practice-row"><input placeholder="Nhập đáp án"><button class="check-answer">Nộp đáp án</button></div><p class="answer-feedback hidden"></p></div>`}).join('')}</section>`).join('')}<button id="finishPractice" class="btn" disabled>Hoàn thành bài luyện →</button>`;
}

function normalizeAnswer(value){return String(value||'').trim().toLowerCase().replace(/[–—−]/g,'-').replace(/[×·]/g,'*').replace(/:/g,'/').replace(/,/g,'.').replace(/\s+/g,'')}
function numericValue(value){const expression=normalizeAnswer(value).replace(/\^/g,'**');if(!expression||!/^[0-9+*/().%*-]+$/.test(expression))return null;try{const result=Function(`"use strict";return (${expression})`)();return Number.isFinite(result)?result:null}catch{return null}}
function productFactors(value){const text=normalizeAnswer(value);const factors=[];let start=0,depth=0;for(let index=0;index<text.length;index++){const char=text[index];if(char==='('){if(depth===0&&index>start){factors.push(text.slice(start,index));start=index}depth++}else if(char===')')depth--;else if(char==='*'&&depth===0){factors.push(text.slice(start,index));start=index+1}}factors.push(text.slice(start));return factors.filter(Boolean).map(item=>item.replace(/^\((.*)\)$/,'$1')).sort()}
function answersEquivalent(submitted,expected){const actual=normalizeAnswer(submitted),answer=normalizeAnswer(expected);if(!actual||!answer)return false;if(actual===answer)return true;const actualNumber=numericValue(actual),answerNumber=numericValue(answer);if(actualNumber!==null&&answerNumber!==null)return Math.abs(actualNumber-answerNumber)<1e-9;const actualFactors=productFactors(actual),answerFactors=productFactors(answer);return actualFactors.length>1&&actualFactors.length===answerFactors.length&&actualFactors.every((factor,index)=>factor===answerFactors[index])}

function checkAnswer(event){
  const box=event.currentTarget.closest('.practice-question'),input=box.querySelector('input'),note=box.querySelector('.answer-feedback');
  if(box.dataset.done)return;
  const ok=answersEquivalent(input.value,box.dataset.answer);
  box.dataset.done='yes';input.disabled=true;event.currentTarget.disabled=true;
  note.textContent=ok?'✓ Đúng rồi!':`Chưa đúng. Đáp án là ${box.dataset.answer}.`;
  note.className=`answer-feedback ${ok?'correct':'incorrect'}`;
  const questionNumber=box.querySelector('.question-number')?.textContent.trim()||'';
  const questionText=box.querySelector('.question-text')?.textContent.trim()||'';
  practiceAttempts.push({question:`${questionNumber} ${questionText}`.trim(),level:box.dataset.level,submittedAnswer:input.value.trim(),correctAnswer:box.dataset.answer,isCorrect:ok});
  if(ok)correctCount++;
  if($$('.practice-question[data-done="yes"]').length===currentAnalysis.generatedExercises.length)$('#finishPractice').disabled=false;
}

const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function demoReview(){
  const wrong=practiceAttempts.filter(x=>!x.isCorrect);
  return {summary:wrong.length?`Bạn có ${wrong.length} câu cần xem lại.`:'Bạn đã hoàn thành rất tốt cả phần cơ bản lẫn nâng cao.',mistakes:wrong.map(x=>({steps:[`Bước 1: Thực hiện phép tính ${x.question.replace(/^Câu\s*\d+\s*:\s*/i,'')}.`,`Bước 2: Kết quả đúng là ${x.correctAnswer}.`]})),studyPlanner:{today:wrong.length?`Làm lại ${wrong.length} câu sai, ghi rõ từng phép tính.`:'Làm thêm câu cùng dạng để duy trì kết quả tốt.',tomorrow:`Xem trước kiến thức ${currentAnalysis.knowledgePoint.name}.`,review:'Ôn lại các bước tính đã sai trước khi làm bài mới.'}};
}

function renderReview(summary,feedback,total){
  const wrong=practiceAttempts.filter(x=>!x.isCorrect);
  const errors=wrong.map((attempt,index)=>{
    const aiItem=(feedback.mistakes||[])[index]||{};
    const cleanQuestion=attempt.question.replace(/^(?:Dễ hơn|Tương đương|Nâng cao)\s*/i,'');
    const steps=(aiItem.steps||[`Bước 1: Thực hiện phép tính ${cleanQuestion.replace(/^Câu\s*\d+\s*:\s*/i,'')}.`,`Bước 2: Kết quả đúng là ${attempt.correctAnswer}.`]).slice(0,4).map(step=>`<li>${escapeHtml(step)}</li>`).join('');
    return `<article class="review-mistake"><b>Câu sai ${index+1}</b><p class="review-question">${escapeHtml(cleanQuestion)}</p><p>Bạn làm: <s>${escapeHtml(attempt.submittedAnswer||'Chưa nhập')}</s></p><p>Đáp án đúng: <b>${escapeHtml(attempt.correctAnswer)}</b></p><p class="solution-label">Cách làm:</p><ol>${steps}</ol></article>`;
  }).join('');
  const fallback={today:wrong.length?`Làm lại ${wrong.length} câu sai, ghi rõ từng phép tính.`:'Làm thêm câu cùng dạng để duy trì kết quả tốt.',tomorrow:`Xem trước kiến thức ${currentAnalysis.knowledgePoint.name}.`,review:'Ôn lại các bước tính đã sai trước khi làm bài mới.'};
  const planner={...fallback,...(feedback.studyPlanner||{})};
  summary.innerHTML=`<b>Kết quả: ${correctCount}/${total} câu đúng</b><p>${escapeHtml(feedback.summary)}</p>${errors?`<div class="review-mistakes">${errors}</div>`:''}<section class="study-planner"><p class="planner-kicker">STUDY PLANNER</p><h4>Kế hoạch ôn tập của bạn</h4><div><b>📝 BTVN hôm nay</b><span>${escapeHtml(planner.today)}</span></div><div><b>📖 Xem trước ngày mai</b><span>${escapeHtml(planner.tomorrow)}</span></div><div><b>💡 Ôn bài cũ + lỗi còn hổng</b><span>${escapeHtml(planner.review)}</span></div></section>`;
  renderMath(summary);
}

document.addEventListener('click',async event=>{
  if(event.target.id==='finishPractice'){
    const summary=$('#practiceSummary'),total=currentAnalysis.generatedExercises.length;
    goStep(3);
    summary.textContent='AI đang tổng hợp các câu sai và đưa nhận xét…';
    try{
      const feedback=window.LEARNING_DEMO_MODE?demoReview():await HomeworkAnalysisService.reviewPractice({topic:currentAnalysis.knowledgePoint.name,detectedErrors:currentAnalysis.learningErrors,attempts:practiceAttempts});
      renderReview(summary,feedback,total);

      // [TỰ ĐỘNG LƯU VÀO DATABASE]: Lưu kết quả bài tập nếu học sinh đã đăng nhập
      if (window.MathFixAuth?.savePractice) {
        window.MathFixAuth.savePractice(currentAnalysis.knowledgePoint.name, correctCount, total, practiceAttempts);
      }
    }catch(error){
      summary.textContent=`Bạn làm đúng ${correctCount}/${total} câu. AI chưa thể tạo nhận xét chi tiết: ${error.message}`;
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
