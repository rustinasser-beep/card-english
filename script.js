/* ========== script.js ========== */
(function() {
  // الحالة
  let vocabulary = [];
  let currentIndex = 0;
  let isFlipped = false;
  let currentMode = 'cards';       // 'cards' | 'test'
  let testSubMode = 'writing';     // 'writing' | 'choice'
  let currentFilter = 'all';       // 'all' | 'due'
  let filteredVocab = [];

  // عناصر DOM
  const aboutBtn = document.getElementById('aboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const closeModal = document.getElementById('closeModal');
  const darkToggle = document.getElementById('darkToggle');

  const flashcard = document.getElementById('flashcard');
  const cardFront = document.getElementById('cardFront');
  const cardBack = document.getElementById('cardBack');
  const wordStatus = document.getElementById('wordStatus');

  const testArea = document.getElementById('testArea');
  const testFlashcard = document.getElementById('testFlashcard');
  const testCardFront = document.getElementById('testCardFront');
  const testWordStatus = document.getElementById('testWordStatus');
  const guessInput = document.getElementById('guessInput');
  const optionsGrid = document.getElementById('optionsGrid');
  const testFeedback = document.getElementById('testFeedback');

  const totalWordsSpan = document.getElementById('totalWords');
  const learnedCountSpan = document.getElementById('learnedCount');
  const difficultCountSpan = document.getElementById('difficultCount');
  const remainingCountSpan = document.getElementById('remainingCount');

  const cardModeBtn = document.getElementById('cardModeBtn');
  const testModeBtn = document.getElementById('testModeBtn');
  const typeWritingBtn = document.getElementById('typeWritingBtn');
  const typeChoiceBtn = document.getElementById('typeChoiceBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const flipBtn = document.getElementById('flipBtn');
  const checkBtn = document.getElementById('checkBtn');
  const skipBtn = document.getElementById('skipBtn');
  const markDifficultBtn = document.getElementById('markDifficultBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const focusDifficultBtn = document.getElementById('focusDifficultBtn');
  const dueReviewBtn = document.getElementById('dueReviewBtn');
  const resetProgressBtn = document.getElementById('resetProgressBtn');
  const resetBtn = document.getElementById('resetBtn');

  // مودال عني
  aboutBtn.addEventListener('click', () => aboutModal.style.display = 'flex');
  closeModal.addEventListener('click', () => aboutModal.style.display = 'none');
  window.addEventListener('click', e => { if (e.target === aboutModal) aboutModal.style.display = 'none'; });

  // الوضع الداكن
  darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    darkToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    saveState();
  });

  // تخزين واسترجاع
  function saveState() {
    const state = {
      vocabulary, currentIndex, currentMode, testSubMode, currentFilter,
      dark: document.body.classList.contains('dark')
    };
    localStorage.setItem('flashcards_v2', JSON.stringify(state));
  }

  function loadState() {
    const saved = localStorage.getItem('flashcards_v2');
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      vocabulary = state.vocabulary || [];
      currentIndex = state.currentIndex || 0;
      currentMode = state.currentMode || 'cards';
      testSubMode = state.testSubMode || 'writing';
      currentFilter = state.currentFilter || 'all';
      if (state.dark) {
        document.body.classList.add('dark');
        darkToggle.textContent = '☀️';
      }
      applyFilter();
      updateUIForMode();
      updateCardDisplay();
    } catch(e) { console.warn('بيانات قديمة'); }
  }

  // الفلترة
  function applyFilter() {
    if (currentFilter === 'due') {
      const now = Date.now();
      filteredVocab = vocabulary.filter(w => !w.due || w.due <= now);
    } else {
      filteredVocab = [...vocabulary];
    }
    if (currentIndex >= filteredVocab.length) currentIndex = Math.max(0, filteredVocab.length - 1);
  }

  function getActiveList() { return currentFilter === 'due' ? filteredVocab : vocabulary; }
  function getActiveWord() {
    const list = getActiveList();
    return list.length > 0 ? list[Math.min(currentIndex, list.length - 1)] : null;
  }

  function updateStats() {
    const counts = { total: vocabulary.length, learned: 0, difficult: 0, remaining: 0 };
    vocabulary.forEach(w => {
      if (w.status === 'learned') counts.learned++;
      else if (w.status === 'difficult') counts.difficult++;
      else counts.remaining++;
    });
    totalWordsSpan.textContent = counts.total;
    learnedCountSpan.textContent = counts.learned;
    difficultCountSpan.textContent = counts.difficult;
    remainingCountSpan.textContent = counts.remaining;
  }

  function updateCardDisplay() {
    const word = getActiveWord();
    if (!word) {
      cardFront.textContent = '📂 ارفع ملفاً للبدء';
      cardBack.textContent = 'الترجمة';
      wordStatus.style.display = 'none';
      flashcard.classList.remove('flipped');
      testCardFront.textContent = '?';
      testWordStatus.style.display = 'none';
      optionsGrid.innerHTML = '';
      updateStats();
      return;
    }
    cardFront.textContent = word.english;
    cardBack.textContent = word.arabic;
    wordStatus.textContent = getStatusLabel(word.status);
    wordStatus.style.display = 'block';

    testCardFront.textContent = word.english;
    testWordStatus.textContent = getStatusLabel(word.status);
    testWordStatus.style.display = 'block';

    if (currentMode === 'test' && testSubMode === 'choice') generateOptions(word);
    updateStats();
  }

  function getStatusLabel(status) {
    if (status === 'learned') return '✅ محفوظة';
    if (status === 'difficult') return '🔴 صعبة';
    return '📝 جديدة';
  }

  // خيارات متعددة
  function generateOptions(correctWord) {
    const wrong = vocabulary.filter(w => w.arabic !== correctWord.arabic)
                           .sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.arabic);
    const all = [correctWord.arabic, ...wrong].sort(() => 0.5 - Math.random());
    optionsGrid.innerHTML = '';
    all.forEach(arabic => {
      const btn = document.createElement('div');
      btn.className = 'option-btn';
      btn.textContent = arabic;
      btn.addEventListener('click', () => handleChoice(arabic));
      optionsGrid.appendChild(btn);
    });
    optionsGrid.style.display = 'grid';
  }

  function handleChoice(selected) {
    const word = getActiveWord();
    if (!word) return;
    const correct = selected === word.arabic;
    document.querySelectorAll('.option-btn').forEach(b => {
      b.style.pointerEvents = 'none';
      if (b.textContent === word.arabic) b.classList.add('correct-choice');
      if (b.textContent === selected && !correct) b.classList.add('wrong-choice');
    });
    processAnswer(correct);
  }

  function processAnswer(isCorrect) {
    const word = getActiveWord();
    if (!word) return;
    if (isCorrect) {
      word.interval = word.interval ? Math.min(word.interval * 2, 720) : 1;
      word.status = 'learned';
    } else {
      word.interval = 0;
      word.status = 'difficult';
    }
    word.lastReview = Date.now();
    word.due = Date.now() + word.interval * 3600000;

    updateCardDisplay();
    testFeedback.textContent = isCorrect ? '✅ إجابة صحيحة!' : `❌ الصحيح: ${word.arabic}`;
    testFeedback.className = `test-feedback ${isCorrect ? 'correct' : 'wrong'}`;
    if (currentMode === 'test' && testSubMode === 'writing') {
      guessInput.className = isCorrect ? 'correct' : 'wrong';
    }
    saveState();
    setTimeout(() => { if (currentMode === 'test') navigate(1); }, 1200);
  }

  function checkWriting() {
    const word = getActiveWord();
    if (!word) return;
    const val = guessInput.value.trim();
    if (!val) return (testFeedback.textContent = '⚠️ اكتب ترجمة');
    const user = val.replace(/[؟?]/g, '');
    const correct = word.arabic.replace(/[؟?]/g, '');
    processAnswer(user === correct || correct.includes(user) || user.includes(correct));
  }

  function resetTestUI() {
    guessInput.value = '';
    guessInput.className = '';
    testFeedback.textContent = '';
    testFeedback.className = '';
    optionsGrid.innerHTML = '';
    if (currentMode === 'test' && testSubMode === 'choice' && getActiveWord()) generateOptions(getActiveWord());
  }

  function navigate(delta) {
    const list = getActiveList();
    if (!list.length) return;
    currentIndex = (currentIndex + delta + list.length) % list.length;
    resetTestUI();
    updateCardDisplay();
    if (currentMode === 'test' && testSubMode === 'writing') guessInput.focus();
  }

  function switchMode(mode) {
    currentMode = mode;
    if (mode === 'cards') {
      flashcard.style.display = '';
      testArea.style.display = 'none';
      flipBtn.style.display = '';
      cardModeBtn.classList.add('active');
      testModeBtn.classList.remove('active');
    } else {
      flashcard.style.display = 'none';
      testArea.style.display = '';
      flipBtn.style.display = 'none';
      cardModeBtn.classList.remove('active');
      testModeBtn.classList.add('active');
      updateSubModeUI();
    }
    updateCardDisplay();
    saveState();
  }

  function updateSubModeUI() {
    if (testSubMode === 'writing') {
      guessInput.style.display = '';
      optionsGrid.style.display = 'none';
      typeWritingBtn.classList.add('active');
      typeChoiceBtn.classList.remove('active');
      guessInput.focus();
    } else {
      guessInput.style.display = 'none';
      optionsGrid.style.display = 'grid';
      typeWritingBtn.classList.remove('active');
      typeChoiceBtn.classList.add('active');
      if (getActiveWord()) generateOptions(getActiveWord());
    }
  }

  // تحليل الملف
  function parseFile(text) {
    const lines = text.split(/\r?\n/);
    return lines.reduce((acc, line) => {
      line = line.trim();
      if (!line) return acc;
      let eng = '', arb = '';
      if (line.includes('=')) {
        const [first, ...rest] = line.split('=');
        eng = first.trim();
        const after = rest.join('=').trim();
        const comma = after.indexOf(',');
        if (comma > -1) {
          arb = after.substring(comma + 1).trim();
          eng += ' ' + after.substring(0, comma).trim();
        } else arb = after;
      } else {
        const sep = line.includes(',') ? ',' : (line.includes('-') ? '-' : null);
        if (sep) {
          const [first, ...rest] = line.split(sep);
          eng = first.trim();
          arb = rest.join(sep).trim();
        } else { eng = line; }
      }
      if (arb.toLowerCase().includes('nan')) arb = arb.replace(/nan/gi, '').trim() || '⚠️';
      if (!eng) eng = '?';
      acc.push({
        english: eng.trim(),
        arabic: arb.trim() || '⚠️',
        status: 'new',
        interval: 0,
        lastReview: null,
        due: Date.now()
      });
      return acc;
    }, []);
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      vocabulary = parseFile(e.target.result);
      currentIndex = 0;
      currentFilter = 'all';
      applyFilter();
      updateUIForMode();
      saveState();
    };
    reader.readAsText(file, 'UTF-8');
  }

  // أحداث الرفع
  document.getElementById('fileInput').addEventListener('change', function() {
    if (this.files[0]) loadFile(this.files[0]);
    this.value = '';
  });

  const uploadArea = document.getElementById('uploadArea');
  uploadArea.addEventListener('dragover', e => e.preventDefault());
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });

  // قلب البطاقة
  flashcard.addEventListener('click', () => {
    if (currentMode === 'cards' && getActiveWord()) {
      flashcard.classList.toggle('flipped');
      isFlipped = !isFlipped;
    }
  });
  flipBtn.addEventListener('click', () => flashcard.click());

  // تبديل الأوضاع
  cardModeBtn.addEventListener('click', () => switchMode('cards'));
  testModeBtn.addEventListener('click', () => switchMode('test'));

  typeWritingBtn.addEventListener('click', () => { testSubMode = 'writing'; updateSubModeUI(); saveState(); });
  typeChoiceBtn.addEventListener('click', () => { testSubMode = 'choice'; updateSubModeUI(); saveState(); });

  prevBtn.addEventListener('click', () => navigate(-1));
  nextBtn.addEventListener('click', () => navigate(1));

  checkBtn.addEventListener('click', () => { if (testSubMode === 'writing') checkWriting(); });
  skipBtn.addEventListener('click', () => { resetTestUI(); navigate(1); });
  markDifficultBtn.addEventListener('click', () => {
    const word = getActiveWord();
    if (word) {
      word.status = 'difficult'; word.interval = 0; word.due = Date.now();
      updateCardDisplay(); saveState();
      testFeedback.textContent = '🔴 صعبة';
    }
  });

  shuffleBtn.addEventListener('click', () => {
    if (vocabulary.length < 2) return;
    for (let i = vocabulary.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vocabulary[i], vocabulary[j]] = [vocabulary[j], vocabulary[i]];
    }
    currentIndex = 0; applyFilter(); updateCardDisplay(); saveState();
  });

  focusDifficultBtn.addEventListener('click', () => {
    const diff = vocabulary.filter(w => w.status === 'difficult');
    if (!diff.length) return alert('لا توجد كلمات صعبة');
    vocabulary = [...diff, ...vocabulary.filter(w => w.status !== 'difficult')];
    currentIndex = 0; currentFilter = 'all'; applyFilter(); updateCardDisplay(); saveState();
  });

  dueReviewBtn.addEventListener('click', () => {
    if (currentFilter === 'due') {
      // العودة إلى الكل
      currentFilter = 'all';
      dueReviewBtn.textContent = '📅 مراجعة المستحق';
    } else {
      const due = vocabulary.filter(w => w.due && w.due <= Date.now());
      if (!due.length) return alert('لا توجد كلمات مستحقة');
      currentFilter = 'due';
      dueReviewBtn.textContent = '📚 عرض الكل';
    }
    applyFilter();
    currentIndex = 0;
    updateUIForMode();
    saveState();
  });

  resetProgressBtn.addEventListener('click', () => {
    if (!vocabulary.length) return;
    if (confirm('إعادة التقدم؟ ستعود كل الكلمات جديدة.')) {
      vocabulary.forEach(w => { w.status = 'new'; w.interval = 0; w.due = Date.now(); });
      currentIndex = 0; currentFilter = 'all'; applyFilter();
      updateCardDisplay(); saveState();
    }
  });

  resetBtn.addEventListener('click', () => {
    if (vocabulary.length && confirm('مسح جميع الكلمات؟')) {
      vocabulary = []; currentIndex = 0; currentFilter = 'all'; applyFilter();
      updateUIForMode(); saveState();
    }
  });

  // اختصارات
  document.addEventListener('keydown', e => {
    if (e.target.id === 'guessInput' && e.key === 'Enter') {
      e.preventDefault(); checkWriting();
    } else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
    else if (e.key === ' ' && currentMode === 'cards') { e.preventDefault(); flipBtn.click(); }
  });

  function updateUIForMode() {
    if (currentMode === 'cards') {
      flashcard.style.display = '';
      testArea.style.display = 'none';
      flipBtn.style.display = '';
      cardModeBtn.classList.add('active');
      testModeBtn.classList.remove('active');
    } else {
      flashcard.style.display = 'none';
      testArea.style.display = '';
      flipBtn.style.display = 'none';
      cardModeBtn.classList.remove('active');
      testModeBtn.classList.add('active');
      updateSubModeUI();
    }
    updateCardDisplay();
  }

  // بدء
  loadState();
  if (!vocabulary.length) updateUIForMode();
  else { applyFilter(); updateUIForMode(); }
})();