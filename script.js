(function() {
    // ========== الحالة ==========
    const state = {
        vocabulary: [],
        currentIndex: 0,
        isFlipped: false,
        testSubMode: 'writing',
        currentFilter: 'all',
        filteredVocab: [],
        direction: 'en-ar',
        dark: false,
        currentPage: 'homePage'
    };

    const elements = {};
    function cacheElements() {
        const ids = [
            'fileInput', 'uploadArea', 'totalWords', 'learnedCount', 'difficultCount', 'remainingCount',
            'masteryPercent', 'masteryFill', 'flashcard', 'cardFront', 'cardBack', 'wordStatus',
            'pronounceBtn', 'testFlashcard', 'testCardFront', 'testWordStatus', 'testPronounceBtn',
            'guessInput', 'optionsGrid', 'testFeedback', 'checkBtn', 'hintBtn', 'skipBtn', 'markDifficultBtn',
            'prevBtn', 'nextBtn', 'flipBtn', 'shuffleBtn', 'focusDifficultBtn', 'dueReviewBtn',
            'resetProgressBtn', 'resetBtn', 'typeWritingBtn', 'typeChoiceBtn',
            'enToArBtn', 'arToEnBtn', 'wordList', 'darkToggleBtn',
            'newEnglish', 'newArabic', 'addWordBtn', 'downloadWordsBtn',
            'helpSettingsBtn', 'helpModal', 'closeHelpModal', 'updateModal', 'closeUpdateModal', 'searchInput',
            'feedbackForm', 'feedbackSuccess', 'feedbackError', 'viewFeaturesBtn'
        ];
        ids.forEach(id => { elements[id] = document.getElementById(id); });
    }

    // ========== تهيئة Firebase (آمنة) ==========
    const firebaseConfig = {
        apiKey: "AIzaSyBUk9_mNyfZLDdcmCegfomrSSFDyH4QDWo",
        authDomain: "card-eng-13-s.firebaseapp.com",
        projectId: "card-eng-13-s",
        storageBucket: "card-eng-13-s.firebasestorage.app",
        messagingSenderId: "977083776382",
        appId: "1:977083776382:web:ea76228adf51c03e48072f"
    };
    let db = null;
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
        } catch (e) {
            console.warn('تعذر تهيئة Firebase:', e.message);
        }
    } else {
        console.warn('Firebase SDK غير محمل');
    }

    // ========== التنقل ==========
    function navigateTo(pageId) {
        state.currentPage = pageId;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
        if (pageId === 'wordsPage') renderWordList(elements.searchInput ? elements.searchInput.value : '');
        saveState();
    }
    window.navigateTo = navigateTo;

    // ========== التخزين ==========
    function saveState() {
        const data = {
            vocabulary: state.vocabulary,
            currentIndex: state.currentIndex,
            testSubMode: state.testSubMode,
            direction: state.direction,
            dark: state.dark
        };
        localStorage.setItem('flashcards_v2', JSON.stringify(data));
    }

    function loadState() {
        const saved = localStorage.getItem('flashcards_v2');
        if (!saved) return;
        try {
            const data = JSON.parse(saved);
            state.vocabulary = data.vocabulary || [];
            state.currentIndex = data.currentIndex || 0;
            state.testSubMode = data.testSubMode || 'writing';
            state.direction = data.direction || 'en-ar';
            state.dark = data.dark || false;
            if (state.dark) {
                document.body.classList.add('dark');
                elements.darkToggleBtn.textContent = '☀️ الوضع الفاتح';
            }
            applyFilter();
            updateDirectionUI();
            updateUI();
        } catch (e) { console.warn('بيانات قديمة'); }
    }

    // ========== الفلترة ==========
    function applyFilter() {
        if (state.currentFilter === 'due') {
            const now = Date.now();
            state.filteredVocab = state.vocabulary.filter(w => !w.due || w.due <= now);
        } else {
            state.filteredVocab = [...state.vocabulary];
        }
        if (state.currentIndex >= state.filteredVocab.length) state.currentIndex = Math.max(0, state.filteredVocab.length - 1);
    }

    function getActiveList() { return state.currentFilter === 'due' ? state.filteredVocab : state.vocabulary; }
    function getActiveWord() {
        const list = getActiveList();
        return list.length > 0 ? list[Math.min(state.currentIndex, list.length - 1)] : null;
    }

    // ========== الإحصائيات ==========
    function updateStats() {
        const total = state.vocabulary.length;
        let learned = 0, difficult = 0;
        state.vocabulary.forEach(w => {
            if (w.status === 'learned') learned++;
            else if (w.status === 'difficult') difficult++;
        });
        const remaining = total - learned - difficult;
        elements.totalWords.textContent = total;
        elements.learnedCount.textContent = learned;
        elements.difficultCount.textContent = difficult;
        elements.remainingCount.textContent = remaining;
        const mastery = total ? Math.round((learned / total) * 100) : 0;
        elements.masteryPercent.textContent = mastery + '%';
        elements.masteryFill.style.width = mastery + '%';
    }

    function getStatusLabel(status) {
        if (status === 'learned') return '✅ محفوظة';
        if (status === 'difficult') return '🔴 صعبة';
        return '📝 جديدة';
    }

    // ========== الاتجاه ==========
    function getSourceWord(word) { return state.direction === 'en-ar' ? word.english : word.arabic; }
    function getTargetWord(word) { return state.direction === 'en-ar' ? word.arabic : word.english; }
    function updateDirectionUI() {
        elements.enToArBtn.classList.toggle('active', state.direction === 'en-ar');
        elements.arToEnBtn.classList.toggle('active', state.direction === 'ar-en');
    }

    // ========== عرض البطاقة ==========
    function updateUI() {
        const word = getActiveWord();
        if (!word) {
            elements.cardFront.textContent = '📂 ارفع ملفاً أولاً';
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
        elements.pronounceBtn.style.display = (word.english && word.english !== '?') ? 'flex' : 'none';
        elements.testPronounceBtn.style.display = (word.english && word.english !== '?') ? 'flex' : 'none';
        elements.testCardFront.textContent = source;
        elements.testWordStatus.textContent = getStatusLabel(word.status);
        elements.testWordStatus.style.display = 'block';
        if (state.currentPage === 'testPage' && state.testSubMode === 'choice') generateOptions(word);
        updateStats();
    }

    function generateOptions(correctWord) {
        const target = getTargetWord(correctWord);
        const wrong = state.vocabulary.filter(w => getTargetWord(w) !== target).sort(() => 0.5 - Math.random()).slice(0,3).map(w => getTargetWord(w));
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

    // ========== التصحيح ==========
    function normalizeString(str) { return str.trim().toLowerCase().replace(/[؟?.,!،]/g, '').replace(/\s+/g, ' '); }
    function checkWriting() {
        const word = getActiveWord();
        if (!word) return;
        const input = elements.guessInput.value.trim();
        if (!input) { elements.testFeedback.textContent = '⚠️ اكتب الإجابة'; elements.testFeedback.className = 'test-feedback'; return; }
        const user = normalizeString(input);
        const correct = normalizeString(getTargetWord(word));
        const isCorrect = user === correct;
        elements.guessInput.className = isCorrect ? 'correct' : 'wrong';
        elements.testFeedback.textContent = isCorrect ? '✅ إجابة صحيحة!' : `❌ الصحيح: ${getTargetWord(word)}`;
        elements.testFeedback.className = `test-feedback ${isCorrect ? 'correct' : 'wrong'}`;
        processAnswer(isCorrect);
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
        if (isCorrect) { word.interval = word.interval ? Math.min(word.interval * 2, 720) : 1; word.status = 'learned'; }
        else { word.interval = 0; word.status = 'difficult'; }
        word.lastReview = Date.now();
        word.due = Date.now() + word.interval * 3600000;
        updateUI(); saveState();
        setTimeout(() => { if (state.currentPage === 'testPage') navigate(1); }, 800);
    }

    function navigate(delta) {
        const list = getActiveList();
        if (!list.length) return;
        state.currentIndex = (state.currentIndex + delta + list.length) % list.length;
        resetTestUI(); updateUI();
        if (state.testSubMode === 'writing') elements.guessInput.focus();
    }

    function resetTestUI() {
        elements.guessInput.value = '';
        elements.guessInput.className = '';
        elements.testFeedback.textContent = '';
        elements.testFeedback.className = '';
        elements.optionsGrid.innerHTML = '';
        if (state.testSubMode === 'choice' && getActiveWord()) generateOptions(getActiveWord());
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
                } else arabic = after;
            } else {
                const separator = trimmed.includes(',') ? ',' : (trimmed.includes('-') ? '-' : null);
                if (separator) {
                    const parts = trimmed.split(separator);
                    english = parts[0].trim();
                    arabic = parts.slice(1).join(separator).trim();
                } else english = trimmed;
            }
            if (arabic.toLowerCase().includes('nan')) arabic = arabic.replace(/nan/gi, '').trim() || '⚠️';
            if (!english) english = '?';
            result.push({ english: english || '?', arabic: arabic || '⚠️', status: 'new', interval: 0, lastReview: null, due: Date.now() });
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
            updateUI();
            saveState();
            navigateTo('studyPage');
        };
        reader.readAsText(file, 'UTF-8');
    }

    // ========== قائمة الكلمات ==========
    function renderWordList(filter = '') {
        elements.wordList.innerHTML = '';
        const filtered = state.vocabulary.filter(w => {
            if (!filter) return true;
            const f = filter.trim().toLowerCase();
            return w.english.toLowerCase().includes(f) || w.arabic.toLowerCase().includes(f);
        });
        if (!filtered.length) {
            elements.wordList.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">لا توجد كلمات مطابقة</p>';
            return;
        }
        filtered.forEach(word => {
            const actualIndex = state.vocabulary.indexOf(word);
            const item = document.createElement('div');
            item.className = 'word-item';
            item.innerHTML = `
                <div class="word-pair"><strong>${word.english}</strong> → ${word.arabic}</div>
                <div class="word-actions">
                    <button class="status-btn ${word.status}" data-index="${actualIndex}">${getStatusLabel(word.status)}</button>
                    <button class="delete-btn" data-index="${actualIndex}" title="حذف">🗑</button>
                </div>
            `;
            item.querySelector('.status-btn').addEventListener('click', () => cycleStatus(actualIndex));
            item.querySelector('.delete-btn').addEventListener('click', () => deleteWord(actualIndex));
            elements.wordList.appendChild(item);
        });
    }

    function cycleStatus(index) {
        const word = state.vocabulary[index];
        if (word.status === 'new') word.status = 'learned';
        else if (word.status === 'learned') word.status = 'difficult';
        else word.status = 'new';
        if (word.status === 'new') { word.interval = 0; word.due = Date.now(); }
        saveState();
        renderWordList(elements.searchInput ? elements.searchInput.value : '');
        updateUI();
    }

    function deleteWord(index) {
        if (confirm('هل تريد حذف هذه الكلمة؟')) {
            state.vocabulary.splice(index, 1);
            if (state.currentIndex >= state.vocabulary.length) state.currentIndex = Math.max(0, state.vocabulary.length - 1);
            saveState();
            renderWordList(elements.searchInput ? elements.searchInput.value : '');
            updateUI();
        }
    }

    function addWord() {
        const english = elements.newEnglish.value.trim();
        const arabic = elements.newArabic.value.trim();
        if (!english || !arabic) { alert('يرجى إدخال الكلمة والترجمة معًا'); return; }
        state.vocabulary.push({ english, arabic, status: 'new', interval: 0, lastReview: null, due: Date.now() });
        elements.newEnglish.value = '';
        elements.newArabic.value = '';
        saveState();
        renderWordList(elements.searchInput ? elements.searchInput.value : '');
        updateUI();
    }

    function downloadWords() {
        if (!state.vocabulary.length) { alert('لا توجد كلمات لتنزيلها'); return; }
        const lines = state.vocabulary.map(w => `${w.english}, ${w.arabic}`).join('\n');
        const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'words.txt';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US'; speechSynthesis.cancel(); speechSynthesis.speak(utterance);
        }
    }

    // ========== الدليل والتحديثات ==========
    function openHelp() { elements.helpModal.style.display = 'flex'; }
    function closeHelp() { elements.helpModal.style.display = 'none'; }
    function showUpdateIfNeeded() {
        const currentVersion = '1.3.5';
        const savedVersion = localStorage.getItem('appVersion');
        if (savedVersion !== currentVersion) {
            elements.updateModal.style.display = 'flex';
            localStorage.setItem('appVersion', currentVersion);
        }
    }
    function closeUpdate() { elements.updateModal.style.display = 'none'; }
    function openFeatures() { elements.updateModal.style.display = 'flex'; }

    // ========== نموذج الرأي (آمن) ==========
    function setCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/`;
    }
    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    }

    async function setupFeedbackForm() {
        const form = elements.feedbackForm;
        const success = elements.feedbackSuccess;
        const error = elements.feedbackError;
        if (!form) return;

        if (getCookie('feedback_submitted')) {
            form.style.display = 'none';
            success.style.display = 'block';
            success.textContent = '✅ لقد أرسلت رأيك مسبقًا.';
            return;
        }

        let fingerprint = '';
        try {
            if (typeof FingerprintJS !== 'undefined') {
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                fingerprint = result.visitorId;
            }
        } catch (e) { console.warn('FingerprintJS غير متاح'); }

        let ip = '';
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            ip = ipData.ip;
        } catch (e) { ip = 'unknown'; }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const email = formData.get('email');
            const name = formData.get('name');
            const message = formData.get('message');

            if (db) {
                try {
                    const emailQuery = await db.collection('feedbacks').where('email', '==', email).get();
                    if (!emailQuery.empty) {
                        error.style.display = 'block';
                        error.textContent = '❌ هذا البريد أرسل رأيًا مسبقًا.';
                        return;
                    }
                    const fpQuery = await db.collection('feedbacks').where('fingerprint', '==', fingerprint).get();
                    if (!fpQuery.empty) {
                        error.style.display = 'block';
                        error.textContent = '❌ هذا الجهاز أرسل رأيًا مسبقًا.';
                        return;
                    }
                    const ipQuery = await db.collection('feedbacks').where('ip', '==', ip).get();
                    if (!ipQuery.empty) {
                        error.style.display = 'block';
                        error.textContent = '❌ تم استلام رأي من هذا العنوان مسبقًا.';
                        return;
                    }
                } catch (dbError) {
                    console.error('خطأ في قاعدة البيانات:', dbError);
                }
            }

            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    if (db) {
                        try {
                            await db.collection('feedbacks').add({
                                name,
                                email,
                                message,
                                fingerprint,
                                ip,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        } catch (e) { console.warn('تعذر حفظ البيانات في Firebase'); }
                    }
                    setCookie('feedback_submitted', 'true', 365);
                    success.style.display = 'block';
                    error.style.display = 'none';
                    form.reset();
                    form.style.display = 'none';
                } else {
                    error.style.display = 'block';
                    error.textContent = '❌ حدث خطأ، حاول مرة أخرى.';
                }
            } catch (err) {
                error.style.display = 'block';
                error.textContent = '❌ تعذر الإرسال، تأكد من اتصالك بالإنترنت.';
            }
        });
    }

    // ========== الأحداث ==========
    function setupEvents() {
        elements.fileInput.addEventListener('change', function() { if (this.files[0]) loadFile(this.files[0]); this.value = ''; });
        elements.uploadArea.addEventListener('dragover', e => e.preventDefault());
        elements.uploadArea.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });

        elements.flashcard.addEventListener('click', () => {
            if (getActiveWord()) {
                elements.flashcard.classList.toggle('flipped');
                state.isFlipped = !state.isFlipped;
            }
        });
        elements.flipBtn.addEventListener('click', () => elements.flashcard.click());

        elements.pronounceBtn.addEventListener('click', e => {
            e.stopPropagation(); const word = getActiveWord(); if (word && word.english && word.english !== '?') speak(word.english);
        });
        elements.testPronounceBtn.addEventListener('click', e => {
            e.stopPropagation(); const word = getActiveWord(); if (word && word.english && word.english !== '?') speak(word.english);
        });

        elements.prevBtn.addEventListener('click', () => navigate(-1));
        elements.nextBtn.addEventListener('click', () => navigate(1));

        elements.checkBtn.addEventListener('click', () => { if (state.testSubMode === 'writing') checkWriting(); });
        elements.hintBtn.addEventListener('click', () => {
            const word = getActiveWord(); if (!word) return; const target = getTargetWord(word);
            elements.testFeedback.textContent = `💡 أول حرف: "${target.charAt(0)}..."`; elements.testFeedback.className = 'test-feedback';
        });
        elements.skipBtn.addEventListener('click', () => { resetTestUI(); navigate(1); });
        elements.markDifficultBtn.addEventListener('click', () => {
            const word = getActiveWord(); if (word) {
                word.status = 'difficult'; word.interval = 0; word.due = Date.now();
                updateUI(); saveState(); elements.testFeedback.textContent = '🔴 صعبة';
            }
        });

        elements.typeWritingBtn.addEventListener('click', () => {
            state.testSubMode = 'writing';
            elements.typeWritingBtn.classList.add('active'); elements.typeChoiceBtn.classList.remove('active');
            elements.guessInput.style.display = ''; elements.optionsGrid.style.display = 'none'; elements.hintBtn.style.display = '';
            saveState(); updateUI();
        });
        elements.typeChoiceBtn.addEventListener('click', () => {
            state.testSubMode = 'choice';
            elements.typeChoiceBtn.classList.add('active'); elements.typeWritingBtn.classList.remove('active');
            elements.guessInput.style.display = 'none'; elements.optionsGrid.style.display = 'grid'; elements.hintBtn.style.display = 'none';
            saveState(); updateUI();
        });

        elements.enToArBtn.addEventListener('click', () => { state.direction = 'en-ar'; updateDirectionUI(); updateUI(); saveState(); });
        elements.arToEnBtn.addEventListener('click', () => { state.direction = 'ar-en'; updateDirectionUI(); updateUI(); saveState(); });

        elements.darkToggleBtn.addEventListener('click', () => {
            state.dark = !state.dark;
            document.body.classList.toggle('dark', state.dark);
            elements.darkToggleBtn.textContent = state.dark ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن';
            saveState();
        });

        elements.shuffleBtn.addEventListener('click', () => {
            if (state.vocabulary.length < 2) return;
            for (let i = state.vocabulary.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [state.vocabulary[i], state.vocabulary[j]] = [state.vocabulary[j], state.vocabulary[i]];
            }
            state.currentIndex = 0; applyFilter(); updateUI(); saveState();
        });

        elements.focusDifficultBtn.addEventListener('click', () => {
            const difficult = state.vocabulary.filter(w => w.status === 'difficult');
            if (!difficult.length) { alert('لا توجد كلمات صعبة'); return; }
            state.vocabulary = [...difficult, ...state.vocabulary.filter(w => w.status !== 'difficult')];
            state.currentIndex = 0; state.currentFilter = 'all'; applyFilter(); updateUI(); saveState();
        });

        elements.dueReviewBtn.addEventListener('click', () => {
            if (state.currentFilter === 'due') {
                state.currentFilter = 'all'; elements.dueReviewBtn.textContent = '📅 مستحق';
            } else {
                const due = state.vocabulary.filter(w => w.due && w.due <= Date.now());
                if (!due.length) { alert('لا توجد كلمات مستحقة'); return; }
                state.currentFilter = 'due'; elements.dueReviewBtn.textContent = '📚 الكل';
            }
            applyFilter(); state.currentIndex = 0; updateUI(); saveState();
        });

        elements.resetProgressBtn.addEventListener('click', () => {
            if (!state.vocabulary.length) return;
            if (confirm('إعادة تعيين التقدم؟')) {
                state.vocabulary.forEach(w => { w.status = 'new'; w.interval = 0; w.due = Date.now(); });
                state.currentIndex = 0; applyFilter(); updateUI(); renderWordList(elements.searchInput ? elements.searchInput.value : ''); saveState();
            }
        });

        elements.resetBtn.addEventListener('click', () => {
            if (state.vocabulary.length && confirm('مسح جميع الكلمات؟')) {
                state.vocabulary = []; state.currentIndex = 0; applyFilter(); updateUI(); renderWordList(''); saveState();
            }
        });

        elements.addWordBtn.addEventListener('click', addWord);
        elements.newArabic.addEventListener('keypress', e => { if (e.key === 'Enter') addWord(); });

        elements.downloadWordsBtn.addEventListener('click', downloadWords);

        if (elements.searchInput) elements.searchInput.addEventListener('input', e => renderWordList(e.target.value));

        elements.helpSettingsBtn.addEventListener('click', openHelp);
        elements.closeHelpModal.addEventListener('click', closeHelp);
        elements.closeUpdateModal.addEventListener('click', closeUpdate);
        elements.viewFeaturesBtn.addEventListener('click', openFeatures);
        window.addEventListener('click', e => {
            if (e.target === elements.helpModal) closeHelp();
            if (e.target === elements.updateModal) closeUpdate();
        });

        setupFeedbackForm();

        document.addEventListener('keydown', e => {
            if (e.target.id === 'guessInput' && e.key === 'Enter') { e.preventDefault(); checkWriting(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
            else if (e.key === ' ' && state.currentPage === 'studyPage') { e.preventDefault(); elements.flipBtn.click(); }
        });
    }

    // ========== بدء ==========
    function init() {
        cacheElements();
        loadState();
        setupEvents();
        updateUI();
        updateDirectionUI();
        if (!state.vocabulary.length) navigateTo('homePage'); else navigateTo('studyPage');
        showUpdateIfNeeded();
    }
    init();
})();
