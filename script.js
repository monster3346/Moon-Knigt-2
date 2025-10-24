/********************************************************************
 * QuizFromFile – đọc PDF/DOCX, nhận diện câu hỏi, thi trực tuyến
 ********************************************************************/
const fileInput   = document.getElementById('fileInput');
const quizArea    = document.getElementById('quizArea');
const palette     = document.getElementById('questionPalette');
const progressFill= document.getElementById('progressFill');
const timerEl     = document.getElementById('timer');
const prevBtn     = document.getElementById('prevBtn');
const nextBtn     = document.getElementById('nextBtn');
const finishBtn   = document.getElementById('finishBtn');

let questions=[], currentQ=0, mode='practice', userAns=[], startTime, timerId;

/* 1. Đọc file PDF / DOCX */
fileInput.addEventListener('change', async e=>{
  const file=e.target.files[0]; if(!file)return;
  const ext=file.name.split('.').pop().toLowerCase();
  let text='';
  if(ext==='pdf'){
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      text+=(await page.getTextContent()).items.map(it=>it.str).join(' ')+' ';
    }
  }else if(ext==='docx'){
    const res=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
    text=res.value;
  }else{alert('Chỉ hỗ trợ .pdf hoặc .docx');return;}
  parseQuestions(text);
});

/* 2. Parser câu hỏi */
function parseQuestions(raw){
  questions=[];
  const blocks=raw.split(/\n\s*\n/);
  let buf=null;
  blocks.forEach(b=>{
    b=b.trim(); if(!b)return;
    if(/^Câu\s+\d+[:.]/i.test(b)){
      if(buf)questions.push(buf);
      buf={q:b,choices:[],correct:null};
    }else if(/^[A-D][.)]\s*/.test(b)){
      buf.choices.push(b.replace(/^[A-D][.)]\s*/,''));
    }else if(/^Đáp án\s*[:]?\s*([A-D])/i.test(b)){
      buf.correct=b.match(/([A-D])/i)[1].toUpperCase();
    }
  });
  if(buf && buf.correct)questions.push(buf);
  if(!questions.length){alert('Không tìm thấy câu hỏi nào');return;}
  initQuiz();
}

/* 3. Khởi tạo quiz */
function initQuiz(){
  userAns=Array(questions.length).fill(null);
  currentQ=0;
  renderPalette();
  renderQuestion();
  updateProgress();
  startTimer();
}

/* 4. Render */
function renderPalette(){
  palette.innerHTML='';
  questions.forEach((q,i)=>{
    const btn=document.createElement('button');
    btn.textContent=`Câu ${i+1}`;
    btn.className=userAns[i]?'ans':'';
    btn.onclick=()=>{currentQ=i; renderQuestion();};
    palette.appendChild(btn);
  });
}
function renderQuestion(){
  quizArea.innerHTML='';
  const q=questions[currentQ];
  const box=document.createElement('div'); box.className='qBox active';
  box.innerHTML=`<h3>${q.q}</h3>`;
  q.choices.forEach((ch,i)=>{
    const idx=['A','B','C','D'][i];
    const div=document.createElement('label'); div.className='choice';
    div.textContent=`${idx}. ${ch}`;
    div.dataset.idx=idx;
    if(userAns[currentQ]===idx){
      div.classList.add(idx===q.correct?'correct':'wrong');
    }
    if(mode==='practice' || !userAns[currentQ]){
      div.onclick=()=>selectChoice(idx);
    }
    box.appendChild(div);
  });
  if(userAns[currentQ] && userAns[currentQ]!==q.correct){
    const note=document.createElement('div'); note.className='correctAns';
    note.textContent=`Đáp án đúng: ${q.correct}`;
    box.appendChild(note);
  }
  quizArea.appendChild(box);
  document.querySelectorAll('#sidebar button').forEach((b,i)=>b.classList.toggle('current',i===currentQ));
}
function selectChoice(idx){
  userAns[currentQ]=idx;
  renderQuestion();
  updateProgress();
  if(mode==='exam') autoNext();
}
function autoNext(){if(currentQ<questions.length-1){currentQ++;renderQuestion();}}
function updateProgress(){
  const done=userAns.filter(Boolean).length;
  const percent=Math.round(done/questions.length*100);
  progressFill.style.width=percent+'%';
  document.getElementById('title').textContent=`Quiz – ${percent}%`;
}

/* 5. Điều khiển & mode */
document.querySelectorAll('input[name="mode"]').forEach(r=>r.onchange=e=>{
  mode=e.target.value;
  finishBtn.style.display=mode==='exam'?'inline-block':'none';
  initQuiz();
});
prevBtn.onclick =()=>{if(currentQ>0){currentQ--;renderQuestion();}};
nextBtn.onclick =()=>{if(currentQ<questions.length-1){currentQ++;renderQuestion();}};
finishBtn.onclick=finishExam;

/* 6. Phím tắt */
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft') prevBtn.click();
  if(e.key==='ArrowRight') nextBtn.click();
});

/* 7. Timer */
function startTimer(){
  clearInterval(timerId);
  startTime=Date.now();
  timerId=setInterval(()=>{
    const s=Math.floor((Date.now()-startTime)/1000);
    const m=String(Math.floor(s/60)).padStart(2,0);
    const sec=String(s%60).padStart(2,0);
    timerEl.textContent=`${m}:${sec}`;
  },1000);
}

/* 8. Nộp bài */
function finishExam(){
  clearInterval(timerId);
  let right=userAns.filter((a,i)=>a===questions[i].correct).length;
  alert(`Kết thúc! Đúng ${right}/${questions.length} – ${Math.round(right/questions.length*100)}%`);
}
