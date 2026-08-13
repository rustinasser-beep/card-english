(function () {
  // حالة التطبيق
  const state = {
    vocabulary: [],
    currentIndex: 0,
    isFlipped: false,
    currentMode: 'cards',       // 'cards' | 'test'
    testSubMode: 'writing',     // 'writing' | 'choice'
    currentFilter: 'all',       // 'all' | 'due'
    filteredVocab: [],
    direction: 'en-ar',         // 'en-ar' | 'ar-en'
    dark: false
  };

  // عناصر DOM
  const elements = {
    darkToggle: document.getElementById('darkToggle'),
    aboutBtn: document.getElementById('aboutBtn'),
    aboutModal: document.getElementById('aboutModal'),
    closeAboutModal: document.getElementById('closeAboutModal'),
    listBtn: document.getElementById('listBtn'),
    listModal: document.getElementById('listModal'),
    closeListModal: document.getElementById('closeListModal'),
    wordList: document.getElementById('wordList'),

    flashcard: document.getElementById('flashcard'),
    cardFront: document.getElementById('cardFront'),
    cardBack: document.getElementById('cardBack'),
    wordStatus: document.getElementById('wordStatus'),
    pronounceBtn: document.getElementById('pronounceBtn'),

    testArea: document.getElementById('testArea'),
    testFlashcard: document.getElementById('testFlashcard'),
    testCardFront: document.getElementById('testCardFront'),
    testWordStatus: document.getElementById('testWordStatus'),
    testPronounceBtn: document.getElementById('testPronounceBtn'),
    guessInput: document.getElementById('guessInput'),
    optionsGrid: document.getElementById('optionsGrid'),
    testFeedback: document.getElementById('testFeedback'),
    hintBtn: document.getElementById('hintBtn'),

    totalWordsSpan: document.getElementById('totalWords'),
    learnedCountSpan: document.getElementById('learnedCount'),
    difficultCountSpan: document.getElementById('difficultCount'),
    remainingCountSpan: document.getElementById('remainingCount'),
    masteryPercentSpan: document.getElementById('masteryPercent'),

    cardModeBtn: document.getElementById('cardModeBtn'),
    testModeBtn: document.getElementById('testModeBtn'),
    typeWritingBtn: document.getElementById('typeWritingBtn'),
    typeChoiceBtn: document.getElementById('typeChoiceBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    flipBtn: document.getElementById('flipBtn'),
    checkBtn: document.getElementById('checkBtn'),
    skipBtn: document.getElementById('skipBtn'),
    markDifficultBtn: document.getElementById('markDifficultBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    focusDifficultBtn: document.getElementById('focusDifficultBtn'),
    dueReviewBtn: document.getElementById('dueReviewBtn'),
    resetProgressBtn: document.getElementById('resetProgressBtn'),
    resetBtn: document.getElementById('resetBtn'),
    enToArBtn: document.getElementById('enToArBtn'),
    arToEnBtn: document.getElementById('arToEnBtn')
  };

  // ========== التخزين ==========
  function saveState() {
    const toStore = {
      vocabulary: state.vocabulary,
      currentIndex: state.currentIndex,
      currentMode: state.currentMode,
      testSubMode: state.testSubMode,
      currentFilter: state.currentFilter,
      direction: state.direction,
      dark: state.dark
    };
    localStorage.setItem('flashcards_v2', JSON.stringify(toStore));
  }

  function loadState() {
    const saved = localStorage.getItem('flashcards_v2');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      state.vocabulary = parsed.vocabulary || [];
      state.currentIndex = parsed.currentIndex || 0;
      state.currentMode = parsed.currentMode || 'cards';
      state.testSubMode = parsed.testSubMode || 'writing';
      state.currentFilter = parsed.currentFilter || 'all';
      state.direction = parsed.direction || 'en-ar';
      state.dark = parsed.dark || false;

      if (state.dark) {
        document.body.classList.add('dark');
        elements.darkToggle.textContent = '☀️';
      }

      // تطبيق الاتجاه
      setDirectionUI(state.direction);

      applyFilter();
      updateUIForMode();
      updateCardDisplay();
    } catch (e) {
      console.warn('بيانات قديمة، سيتم تجاهلها', e);
    }
  }

  // ========== الفلترة ==========
  function applyFilter() {
    if (state.currentFilter === 'due') {
      const now = Date.now();
      state.filteredVocab = state.vocabulary.filter(w => !w.due || w.due <= now);
    } else {
      state.filteredVocab = [...state.vocabulary];
    }
    if (state.currentIndex >= state.filteredVocab.length) {
      state.currentIndex = Math.max(0, state.filteredVocab.length - 1);
    }
  }

  function getActiveList() {
    return state.currentFilter === 'due' ? state.filteredVocab : state.vocabulary;
  }

  function getActiveWord() {
    const list = getActiveList();
    return list.length > 0 ? list[Math.min(state.currentIndex, list.length - 1)] : null;
  }

  // ========== الإحصائيات ==========
  function updateStats() {
    const counts = { total: state.vocabulary.length, learned: 0, difficult: 0, remaining: 0 };
    state.vocabulary.forEach(w => {
      if (w.status === 'learned') counts.learned++;
      else if (w.status === 'difficult') counts.difficult++;
      else counts.remaining++;
    });
    elements.totalWordsSpan.textContent = counts.total;
    elements.learnedCountSpan.textContent = counts.learned;
    elements.difficultCountSpan.textContent = counts.difficult;
    elements.remainingCountSpan.textContent = counts.remaining;
    const mastery = counts.total ? Math.round((counts.learned / counts.total) * 100) : 0;
    elements.masteryPercentSpan.textContent = mastery + '%';
  }

  function getStatusLabel(status) {
    if (status === 'learned') return '✅ محفوظة';
    if (status === 'difficult') return '🔴 صعبة';
    return '📝 جديدة';
  }

  // ========== عرض البطاقة ==========
  function getSourceWord(word) {
    return state.direction === 'en-ar' ? word.english : word.arabic;
  }

  function getTargetWord(word) {
    return state.direction === 'en-ar' ? word.arabic : word.english;
  }

  function isSourceEnglish() {
    return state.direction === 'en-ar';
  }

  function updateCardDisplay() {
    const word = getActiveWord();
    if (!word) {
      elements.cardFront.textContent = '📂 ارفع ملفاً للبدء';
      elements.cardBack.textContent = 'الترجمة';
      elements.wordStatus.style.display = 'none';
      elements.pronounceBtn.style.display = 'none';
      elements.flashcard.classList.remove('flipped');
      elements.testCardFront.textContent = '?';
      elements.testWordStatus.style.display = 'none';
      elements.testPronounceBtn.style.display = 'none';
      elements.optionsGrid.innerHTML = '';
      updateStats();
      return;
    }
    const source = getSourceWord(word);
    const target = getTargetWord(word);

    elements.cardFront.textContent = source;
    elements.cardBack.textContent = target;
    elements.wordStatus.textContent = getStatusLabel(word.status);
    elements.wordStatus.style.display = 'block';

    // زر النطق يظهر دائمًا إذا كانت الكلمة الإنجليزية موجودة
    if (word.english && word.english !== '?') {
      elements.pronounceBtn.style.display = 'flex';
      elements.testPronounceBtn.style.display = 'flex';
    } else {
      elements.pronounceBtn.style.display = 'none';
      elements.testPronounceBtn.style.display = 'none';
    }

    elements.testCardFront.textContent = source;
    elements.testWordStatus.textContent = getStatusLabel(word.status);
    elements.testWordStatus.style.display = 'block';

    if (state.currentMode === 'test' && state.testSubMode === 'choice') {
      generateOptions(word);
    }
    updateStats();
  }

  function generateOptions(correctWord) {
    const target = getTargetWord(correctWord);
    const wrong = state.vocabulary
      .filter(w => getTargetWord(w) !== target)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(w => getTargetWord(w));
    const all = [target, ...wrong].sort(() => 0.5 - Math.random());
    elements.optionsGrid.innerHTML = '';
    all.forEach(t => {
      const btn = document.createElement('div');
      btn.className = 'option-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => handleChoice(t));
      elements.optionsGrid.appendChild(btn);
    });
    elements.optionsGrid.style.display = 'grid';
  }

  // ========== التعامل مع الإجابات ==========
  function normalizeString(str) {
    return str
      .trim()
      .toLowerCase()
      .replace(/[؟?.,!،]/g, '')
      .replace(/\s+/g, ' ');
  }

  function checkWriting() {
    const word = getActiveWord();
    if (!word) return;
    const userInput = elements.guessInput.value.trim();
    if (!userInput) {
      elements.testFeedback.textContent = '⚠️ اكتب الترجمة';
      elements.testFeedback.className = 'test-feedback';
      return;
    }
    const correct = normalizeString(getTargetWord(word));
    const user = normalizeString(userInput);
    const isCorrect = (user === correct);

    if (isCorrect) {
      elements.guessInput.className = 'correct';
      elements.testFeedback.textContent = '✅ إجابة صحيحة!';
      elements.testFeedback.className = 'test-feedback correct';
      processAnswer(true);
    } else {
      elements.guessInput.className = 'wrong';
      elements.testFeedback.textContent = `❌ الصحيح: ${getTargetWord(word)}`;
      elements.testFeedback.className = 'test-feedback wrong';
      processAnswer(false);
    }
  }

  function handleChoice(selected) {
    const word = getActiveWord();
    if (!word) return;
    const correct = selected === getTargetWord(word);
    document.querySelectorAll('.option-btn').forEach(b => {
      b.style.pointerEvents = 'none';
      if (b.textContent === getTargetWord(word)) b.classList.add('correct-choice');
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
    saveState();

    if (isCorrect) {
      elements.testFeedback.textContent = '✅ إجابة صحيحة!';
      elements.testFeedback.className = 'test-feedback correct';
    } else {
      elements.testFeedback.textContent = `❌ الصحيح: ${getTargetWord(word)}`;
      elements.testFeedback.className = 'test-feedback wrong';
    }

    setTimeout(() => {
      if (state.currentMode === 'test') navigate(1);
    }, 1200);
  }

  // ========== التنقل ==========
  function navigate(delta) {
    const list = getActiveList();
    if (!list.length) return;
    state.currentIndex = (state.currentIndex + delta + list.length) % list.length;
    resetTestUI();
    updateCardDisplay();
    if (state.currentMode === 'test' && state.testSubMode === 'writing') {
      elements.guessInput.focus();
    }
  }

  function resetTestUI() {
    elements.guessInput.value = '';
    elements.guessInput.className = '';
    elements.testFeedback.textContent = '';
    elements.testFeedback.className = '';
    elements.optionsGrid.innerHTML = '';
    if (state.currentMode === 'test' && state.testSubMode === 'choice' && getActiveWord()) {
      generateOptions(getActiveWord());
    }
  }

  // ========== التبديل بين الأوضاع ==========
  function switchMode(mode) {
    state.currentMode = mode;
    if (mode === 'cards') {
      elements.flashcard.style.display = '';
      elements.testArea.style.display = 'none';
      elements.flipBtn.style.display = '';
      elements.cardModeBtn.classList.add('active');
      elements.testModeBtn.classList.remove('active');
    } else {
      elements.flashcard.style.display = 'none';
      elements.testArea.style.display = '';
      elements.flipBtn.style.display = 'none';
      elements.cardModeBtn.classList.remove('active');
      elements.testModeBtn.classList.add('active');
      updateSubModeUI();
    }
    updateCardDisplay();
    saveState();
  }

  function updateSubModeUI() {
    if (state.testSubMode === 'writing') {
      elements.guessInput.style.display = '';
      elements.optionsGrid.style.display = 'none';
      elements.hintBtn.style.display = '';
      elements.typeWritingBtn.classList.add('active');
      elements.typeChoiceBtn.classList.remove('active');
      elements.guessInput.focus();
    } else {
      elements.guessInput.style.display = 'none';
      elements.optionsGrid.style.display = 'grid';
      elements.hintBtn.style.display = 'none';
      elements.typeWritingBtn.classList.remove('active');
      elements.typeChoiceBtn.classList.add('active');
      if (getActiveWord()) generateOptions(getActiveWord());
    }
  }

  function setDirectionUI(dir) {
    state.direction = dir;
    elements.enToArBtn.classList.toggle('active', dir === 'en-ar');
    elements.arToEnBtn.classList.toggle('active', dir === 'ar-en');
    updateCardDisplay();
    saveState();
  }

  // ========== تحليل الملف ==========
  function parseFile(text) {
    const lines = text.split(/\r?\n/);
    const result = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let english = '', arabic = '';
      if (trimmed.includes('=')) {
        const parts = trimmed.split('=');
        english = parts[0].trim();
        const after = parts.slice(1).join('=').trim();
        const commaIdx = after.indexOf(',');
        if (commaIdx !== -1) {
          arabic = after.substring(commaIdx + 1).trim();
          english += ' ' + after.substring(0, commaIdx).trim();
        } else {
          arabic = after;
        }
      } else {
        const separator = trimmed.includes(',') ? ',' : (trimmed.includes('-') ? '-' : null);
        if (separator) {
          const parts = trimmed.split(separator);
          english = parts[0].trim();
          arabic = parts.slice(1).join(separator).trim();
        } else {
          english = trimmed;
          arabic = '';
        }
      }
      if (arabic.toLowerCase().includes('nan')) {
        arabic = arabic.replace(/nan/gi, '').trim();
        if (!arabic) arabic = '⚠️ غير معروف';
      }
      if (!english) english = '?';
      if (english || arabic) {
        result.push({
          english: english || '?',
          arabic: arabic || '⚠️',
          status: 'new',
          interval: 0,
          lastReview: null,
          due: Date.now()
        });
      }
    }
    return result;
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      state.vocabulary = parseFile(e.target.result);
      state.currentIndex = 0;
      state.currentFilter = 'all';
      applyFilter();
      updateUIForMode();
      saveState();
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ========== النطق ==========
  function speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  }

  // ========== قائمة الكلمات ==========
  function renderWordList() {
    const list = elements.wordList;
    list.innerHTML = '';
    if (!state.vocabulary.length) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">لا توجد كلمات بعد</p>';
      return;
    }
    state.vocabulary.forEach((word, index) => {
      const item = document.createElement('div');
      item.className = 'word-item';
      item.innerHTML = `
        <div class="word-pair">
          <strong>${word.english}</strong> → ${word.arabic}
        </div>
        <div class="word-actions">
          <button class="status-btn ${word.status}" data-index="${index}">
            ${getStatusLabel(word.status)}
          </button>
        </div>
      `;
      item.querySelector('.status-btn').addEventListener('click', () => cycleStatus(index));
      list.appendChild(item);
    });
  }

  function cycleStatus(index) {
    const word = state.vocabulary[index];
    if (word.status === 'new') word.status = 'learned';
    else if (word.status === 'learned') word.status = 'difficult';
    else word.status = 'new';
    // إعادة تعيين الجدولة إذا عادت جديدة
    if (word.status === 'new') {
      word.interval = 0;
      word.due = Date.now();
    }
    saveState();
    renderWordList();
    updateCardDisplay();
  }

  function openListModal() {
    renderWordList();
    elements.listModal.style.display = 'flex';
  }

  // ========== الأحداث ==========
  function setupEvents() {
    // مودال عن المبرمج
    elements.aboutBtn.addEventListener('click', () => {
      elements.aboutModal.style.display = 'flex';
    });
    elements.closeAboutModal.addEventListener('click', () => {
      elements.aboutModal.style.display = 'none';
    });
    window.addEventListener('click', e => {
      if (e.target === elements.aboutModal) elements.aboutModal.style.display = 'none';
      if (e.target === elements.listModal) elements.listModal.style.display = 'none';
    });

    // مودال القائمة
    elements.listBtn.addEventListener('click', openListModal);
    elements.closeListModal.addEventListener('click', () => {
      elements.listModal.style.display = 'none';
    });

    // الوضع الداكن
    elements.darkToggle.addEventListener('click', () => {
      state.dark = !state.dark;
      document.body.classList.toggle('dark', state.dark);
      elements.darkToggle.textContent = state.dark ? '☀️' : '🌙';
      saveState();
    });

    // اتجاه الحفظ
    elements.enToArBtn.addEventListener('click', () => setDirectionUI('en-ar'));
    elements.arToEnBtn.addEventListener('click', () => setDirectionUI('ar-en'));

    // رفع الملف
    document.getElementById('fileInput').addEventListener('change', function () {
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
    elements.flashcard.addEventListener('click', () => {
      if (state.currentMode === 'cards' && getActiveWord()) {
        elements.flashcard.classList.toggle('flipped');
        state.isFlipped = !state.isFlipped;
      }
    });
    elements.flipBtn.addEventListener('click', () => elements.flashcard.click());

    // زر النطق
    elements.pronounceBtn.addEventListener('click', e => {
      e.stopPropagation();
      const word = getActiveWord();
      if (word && word.english && word.english !== '?') speak(word.english);
    });
    elements.testPronounceBtn.addEventListener('click', e => {
      e.stopPropagation();
      const word = getActiveWord();
      if (word && word.english && word.english !== '?') speak(word.english);
    });

    // التبديل بين الأوضاع
    elements.cardModeBtn.addEventListener('click', () => switchMode('cards'));
    elements.testModeBtn.addEventListener('click', () => switchMode('test'));
    elements.typeWritingBtn.addEventListener('click', () => {
      state.testSubMode = 'writing';
      updateSubModeUI();
      saveState();
    });
    elements.typeChoiceBtn.addEventListener('click', () => {
      state.testSubMode = 'choice';
      updateSubModeUI();
      saveState();
    });

    // التنقل
    elements.prevBtn.addEventListener('click', () => navigate(-1));
    elements.nextBtn.addEventListener('click', () => navigate(1));

    // الاختبار
    elements.checkBtn.addEventListener('click', () => {
      if (state.testSubMode === 'writing') checkWriting();
    });
    elements.hintBtn.addEventListener('click', () => {
      const word = getActiveWord();
      if (!word) return;
      const target = getTargetWord(word);
      elements.testFeedback.textContent = `💡 أول حرف: "${target.charAt(0)}..."`;
      elements.testFeedback.className = 'test-feedback';
    });
    elements.skipBtn.addEventListener('click', () => {
      resetTestUI();
      navigate(1);
    });
    elements.markDifficultBtn.addEventListener('click', () => {
      const word = getActiveWord();
      if (word) {
        word.status = 'difficult';
        word.interval = 0;
        word.due = Date.now();
        updateCardDisplay();
        saveState();
        elements.testFeedback.textContent = '🔴 صعبة';
      }
    });

    // إجراءات إضافية
    elements.shuffleBtn.addEventListener('click', () => {
      if (state.vocabulary.length < 2) return;
      for (let i = state.vocabulary.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.vocabulary[i], state.vocabulary[j]] = [state.vocabulary[j], state.vocabulary[i]];
      }
      state.currentIndex = 0;
      applyFilter();
      updateCardDisplay();
      saveState();
    });

    elements.focusDifficultBtn.addEventListener('click', () => {
      const difficult = state.vocabulary.filter(w => w.status === 'difficult');
      if (!difficult.length) {
        alert('لا توجد كلمات صعبة');
        return;
      }
      state.vocabulary = [...difficult, ...state.vocabulary.filter(w => w.status !== 'difficult')];
      state.currentIndex = 0;
      state.currentFilter = 'all';
      applyFilter();
      updateCardDisplay();
      saveState();
    });

    elements.dueReviewBtn.addEventListener('click', () => {
      if (state.currentFilter === 'due') {
        state.currentFilter = 'all';
        elements.dueReviewBtn.textContent = '📅 مراجعة المستحق';
      } else {
        const due = state.vocabulary.filter(w => w.due && w.due <= Date.now());
        if (!due.length) {
          alert('لا توجد كلمات مستحقة');
          return;
        }
        state.currentFilter = 'due';
        elements.dueReviewBtn.textContent = '📚 عرض الكل';
      }
      applyFilter();
      state.currentIndex = 0;
      updateUIForMode();
      saveState();
    });

    elements.resetProgressBtn.addEventListener('click', () => {
      if (!state.vocabulary.length) return;
      if (confirm('إعادة تعيين التقدم؟ ستعود كل الكلمات إلى "جديدة".')) {
        state.vocabulary.forEach(w => {
          w.status = 'new';
          w.interval = 0;
          w.due = Date.now();
        });
        state.currentIndex = 0;
        state.currentFilter = 'all';
        applyFilter();
        updateCardDisplay();
        saveState();
      }
    });

    elements.resetBtn.addEventListener('click', () => {
      if (state.vocabulary.length && confirm('مسح جميع الكلمات؟')) {
        state.vocabulary = [];
        state.currentIndex = 0;
        state.currentFilter = 'all';
        applyFilter();
        updateUIForMode();
        saveState();
      }
    });

    // اختصارات لوحة المفاتيح
    document.addEventListener('keydown', e => {
      if (e.target.id === 'guessInput' && e.key === 'Enter') {
        e.preventDefault();
        checkWriting();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === ' ' && state.currentMode === 'cards') {
        e.preventDefault();
        elements.flipBtn.click();
      }
    });
  }

  // ========== التحديث العام ==========
  function updateUIForMode() {
    if (state.currentMode === 'cards') {
      elements.flashcard.style.display = '';
      elements.testArea.style.display = 'none';
      elements.flipBtn.style.display = '';
      elements.cardModeBtn.classList.add('active');
      elements.testModeBtn.classList.remove('active');
    } else {
      elements.flashcard.style.display = 'none';
      elements.testArea.style.display = '';
      elements.flipBtn.style.display = 'none';
      elements.cardModeBtn.classList.remove('active');
      elements.testModeBtn.classList.add('active');
      updateSubModeUI();
    }
    updateCardDisplay();
  }

  // ========== بدء التطبيق ==========
  function init() {
    loadState();
    if (!state.vocabulary.length) {
      updateUIForMode();
    } else {
      applyFilter();
      updateUIForMode();
    }
    setupEvents();
  }

  init();
})();
