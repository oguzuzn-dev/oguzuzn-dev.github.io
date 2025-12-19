// Oyun Yapılandırması
const CONFIG = {
    DIFFICULTY_SETTINGS: {
        easy: {
            digits: [4, 6],
            displayTime: 5,
            missingDigits: 2,
            additionalQuestions: ['sum', 'lastDigit']
        },
        medium: {
            digits: [7, 9],
            displayTime: 7,
            missingDigits: 3,
            additionalQuestions: ['sum', 'lastDigit', 'firstDigit']
        },
        hard: {
            digits: [10, 12],
            displayTime: 10,
            missingDigits: 4,
            additionalQuestions: ['sum', 'lastDigit', 'firstDigit', 'digitCount']
        },
        expert: {
            digits: [13, 16],
            displayTime: 15,
            missingDigits: 5,
            additionalQuestions: ['sum', 'lastDigit', 'firstDigit', 'digitCount', 'evenCount']
        },
        master: {
            digits: [17, 20],
            displayTime: 20,
            missingDigits: 7,
            additionalQuestions: ['sum', 'lastDigit', 'firstDigit', 'digitCount', 'evenCount', 'oddCount', 'average']
        }
    },
    DIFFICULTY_MULTIPLIERS: {
        easy: 10,
        medium: 20,
        hard: 30,
        expert: 50,
        master: 100
    },
    QUESTION_TEXTS: {
        sum: 'Tüm rakamların toplamı nedir?',
        lastDigit: 'Son rakam nedir?',
        firstDigit: 'İlk rakam nedir?',
        digitCount: 'Kaç basamaklı bir sayıydı?',
        evenCount: 'Kaç tane çift rakam vardı?',
        oddCount: 'Kaç tane tek rakam vardı?',
        average: 'Rakamların ortalaması nedir? (Yuvarlanmış)',
        maxDigit: 'En büyük rakam neydi?',
        minDigit: 'En küçük rakam neydi?',
        middleDigit: 'Ortadaki rakam neydi?'
    },
    DIFFICULTY_NAMES: {
        easy: 'Kolay',
        medium: 'Orta',
        hard: 'Zor',
        expert: 'Uzman',
        master: 'Usta'
    }
};

// Yardımcı Fonksiyonlar
const Utils = {
    generateRandomNumber: function(min, max) {
        const length = Math.floor(Math.random() * (max - min + 1)) + min;
        let number = '';
        for (let i = 0; i < length; i++) {
            number += Math.floor(Math.random() * 10);
        }
        return number;
    },
    
    hideRandomDigits: function(number, count) {
        const indices = [];
        const numberArray = number.split('');
        
        while (indices.length < count) {
            const randomIndex = Math.floor(Math.random() * number.length);
            if (!indices.includes(randomIndex)) {
                indices.push(randomIndex);
            }
        }
        
        indices.sort((a, b) => a - b);
        
        const hidden = numberArray.map((digit, index) => 
            indices.includes(index) ? '_' : digit
        ).join('');
        
        return { hidden, indices };
    },
    
    calculateAnswers: function(number) {
        const digits = number.split('').map(d => parseInt(d));
        const sum = digits.reduce((a, b) => a + b, 0);
        const evenCount = digits.filter(d => d % 2 === 0).length;
        const oddCount = digits.filter(d => d % 2 !== 0).length;
        const average = Math.round(sum / digits.length);
        const maxDigit = Math.max(...digits);
        const minDigit = Math.min(...digits);
        const middleDigit = digits[Math.floor(digits.length / 2)];
        
        return {
            sum: sum.toString(),
            lastDigit: number[number.length - 1],
            firstDigit: number[0],
            digitCount: number.length.toString(),
            evenCount: evenCount.toString(),
            oddCount: oddCount.toString(),
            average: average.toString(),
            maxDigit: maxDigit.toString(),
            minDigit: minDigit.toString(),
            middleDigit: middleDigit.toString()
        };
    },

    formatDate: function(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (hours < 1) return 'Az önce';
        if (hours < 24) return hours + ' saat önce';
        if (days < 7) return days + ' gün önce';
        
        return date.toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    },

    getScoreBadge: function(score, difficulty) {
        const multiplier = CONFIG.DIFFICULTY_MULTIPLIERS[difficulty];
        const settings = CONFIG.DIFFICULTY_SETTINGS[difficulty];
        const maxPossible = (settings.missingDigits + settings.additionalQuestions.length) * multiplier;
        const percentage = (score / maxPossible) * 100;
        
        if (percentage === 100) return '🏆 Mükemmel!';
        if (percentage >= 90) return '⭐ Harika!';
        if (percentage >= 75) return '✨ Çok İyi!';
        if (percentage >= 60) return '👍 İyi!';
        if (percentage >= 40) return '💪 Fena Değil!';
        return '🎯 Çalışmaya Devam!';
    }
};

// Oyun Durumu
let gameState = {
    current: 'menu',
    difficulty: null,
    originalNumber: '',
    displayedNumber: '',
    missingIndices: [],
    userAnswers: {},
    questionAnswers: {},
    timeLeft: 0,
    score: 0,
    results: null,
    timer: null
};

// LocalStorage Yönetimi
const Storage = {
    saveScore: function(score, difficulty) {
        if (!this.getSetting('autoSave')) return;
        
        const scores = this.getScores();
        scores.push({
            score: score,
            difficulty: difficulty,
            date: Date.now()
        });
        localStorage.setItem('memory64_scores', JSON.stringify(scores));
        
        // İstatistikleri güncelle
        this.updateStats();
    },

    getScores: function(filterDifficulty = null) {
        const scores = JSON.parse(localStorage.getItem('memory64_scores') || '[]');
        if (filterDifficulty && filterDifficulty !== 'all') {
            return scores.filter(s => s.difficulty === filterDifficulty);
        }
        return scores;
    },

    clearScores: function() {
        localStorage.removeItem('memory64_scores');
        localStorage.removeItem('memory64_stats');
        this.updateStats();
    },

    updateStats: function() {
        const scores = this.getScores();
        const stats = {
            totalGames: scores.length,
            highestScore: scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0,
            averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0
        };
        localStorage.setItem('memory64_stats', JSON.stringify(stats));
        this.displayStats();
    },

    displayStats: function() {
        const stats = JSON.parse(localStorage.getItem('memory64_stats') || '{"totalGames":0,"highestScore":0,"averageScore":0}');
        document.getElementById('totalGamesPlayed').textContent = stats.totalGames;
        document.getElementById('highestScore').textContent = stats.highestScore;
        document.getElementById('averageScore').textContent = stats.averageScore;
    },

    getSetting: function(key) {
        const settings = JSON.parse(localStorage.getItem('memory64_settings') || '{}');
        if (key === 'autoSave' && settings[key] === undefined) return true;
        return settings[key] || false;
    },

    setSetting: function(key, value) {
        const settings = JSON.parse(localStorage.getItem('memory64_settings') || '{}');
        settings[key] = value;
        localStorage.setItem('memory64_settings', JSON.stringify(settings));
    }
};

// Ekran Yönetimi
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenName + 'Screen').classList.add('active');
}

function showDifficultySelection() {
    showScreen('difficulty');
}

function showLeaderboard() {
    showScreen('leaderboard');
    renderLeaderboard('all');
}

function showSettings() {
    showScreen('settings');
    loadSettings();
}

// Oyunu Başlat
function startGame(difficulty) {
    const settings = CONFIG.DIFFICULTY_SETTINGS[difficulty];
    const number = Utils.generateRandomNumber(settings.digits[0], settings.digits[1]);
    
    gameState.current = 'showing';
    gameState.difficulty = difficulty;
    gameState.originalNumber = number;
    gameState.displayedNumber = number;
    gameState.timeLeft = settings.displayTime;
    gameState.userAnswers = {};
    gameState.questionAnswers = {};
    gameState.results = null;
    
    showScreen('showing');
    document.getElementById('numberDisplay').textContent = number;
    document.getElementById('timerText').textContent = gameState.timeLeft;
    
    const badge = document.getElementById('showingDifficultyBadge');
    badge.textContent = CONFIG.DIFFICULTY_NAMES[difficulty];
    badge.className = 'difficulty-badge ' + difficulty;
    
    startTimer();
}

// Zamanlayıcıyı Başlat
function startTimer() {
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        document.getElementById('timerText').textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            transitionToAnswering();
        }
    }, 1000);
}

// Cevaplama Ekranına Geç
function transitionToAnswering() {
    const settings = CONFIG.DIFFICULTY_SETTINGS[gameState.difficulty];
    const { hidden, indices } = Utils.hideRandomDigits(
        gameState.originalNumber, 
        settings.missingDigits
    );
    
    gameState.displayedNumber = hidden;
    gameState.missingIndices = indices;
    gameState.current = 'answering';
    
    showScreen('answering');
    
    const badge = document.getElementById('answeringDifficultyBadge');
    badge.textContent = CONFIG.DIFFICULTY_NAMES[gameState.difficulty];
    badge.className = 'difficulty-badge ' + gameState.difficulty;
    
    renderAnsweringScreen();
}

// Cevaplama Ekranını Oluştur
function renderAnsweringScreen() {
    const container = document.getElementById('numberInputContainer');
    container.innerHTML = '';
    
    const numberArray = gameState.displayedNumber.split('');
    
    numberArray.forEach((char, index) => {
        const digitBox = document.createElement('div');
        digitBox.className = 'digit-box';
        
        if (char === '_') {
            digitBox.classList.add('input');
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.dataset.index = index;
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && /^\d$/.test(value)) {
                    gameState.userAnswers[index] = value;
                    const nextInput = container.querySelector(`input[data-index="${index + 1}"]`);
                    if (nextInput) {
                        nextInput.focus();
                    }
                } else if (!value) {
                    delete gameState.userAnswers[index];
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value) {
                    const prevInput = container.querySelector(`input[data-index="${index - 1}"]`);
                    if (prevInput) {
                        prevInput.focus();
                    }
                }
            });
            digitBox.appendChild(input);
        } else {
            digitBox.classList.add('visible');
            digitBox.textContent = char;
        }
        
        container.appendChild(digitBox);
    });
    
    const firstInput = container.querySelector('input');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
    
    renderQuestions();
}

// Soruları Oluştur
function renderQuestions() {
    const settings = CONFIG.DIFFICULTY_SETTINGS[gameState.difficulty];
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    settings.additionalQuestions.forEach(question => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        
        const label = document.createElement('label');
        label.className = 'question-label';
        label.textContent = CONFIG.QUESTION_TEXTS[question];
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'question-input';
        input.dataset.question = question;
        input.placeholder = 'Cevabınız...';
        input.addEventListener('input', (e) => {
            gameState.questionAnswers[question] = e.target.value;
        });
        
        questionItem.appendChild(label);
        questionItem.appendChild(input);
        container.appendChild(questionItem);
    });
}

// Cevapları Kontrol Et
function checkAnswers() {
    const settings = CONFIG.DIFFICULTY_SETTINGS[gameState.difficulty];
    const correctAnswers = Utils.calculateAnswers(gameState.originalNumber);
    let digitScore = 0;
    let questionScore = 0;
    const detailedResults = { digits: [], questions: [] };
    
    gameState.missingIndices.forEach(index => {
        const userDigit = gameState.userAnswers[index];
        const correctDigit = gameState.originalNumber[index];
        const isCorrect = userDigit === correctDigit;
        if (isCorrect) digitScore++;
        detailedResults.digits.push({
            index,
            correct: correctDigit,
            user: userDigit || '_',
            isCorrect
        });
    });
    
    settings.additionalQuestions.forEach(question => {
        const userAnswer = (gameState.questionAnswers[question] || '').toLowerCase().trim();
        const correctAnswer = correctAnswers[question];
        const isCorrect = userAnswer === correctAnswer;
        if (isCorrect) questionScore++;
        detailedResults.questions.push({
            question,
            text: CONFIG.QUESTION_TEXTS[question],
            correct: correctAnswer,
            user: gameState.questionAnswers[question] || '(boş)',
            isCorrect
        });
    });
    
    const totalScore = (digitScore + questionScore) * CONFIG.DIFFICULTY_MULTIPLIERS[gameState.difficulty];
    gameState.score = totalScore;
    gameState.results = detailedResults;
    gameState.current = 'results';
    
    Storage.saveScore(totalScore, gameState.difficulty);
    
    showScreen('results');
    renderResults();
}

// Sonuçları Göster
function renderResults() {
    document.getElementById('scoreValue').textContent = gameState.score;
    document.getElementById('originalNumberDisplay').textContent = gameState.originalNumber;
    
    const badge = document.getElementById('scoreBadge');
    badge.textContent = Utils.getScoreBadge(gameState.score, gameState.difficulty);
    
    const container = document.getElementById('resultsDetails');
    container.innerHTML = '';
    
    if (gameState.results.digits.length > 0) {
        const digitSection = document.createElement('div');
        digitSection.className = 'result-section';
        
        const digitTitle = document.createElement('h3');
        digitTitle.className = 'result-section-title';
        digitTitle.textContent = 'Rakam Tahminleri';
        digitSection.appendChild(digitTitle);
        
        gameState.results.digits.forEach(result => {
            const item = document.createElement('div');
            item.className = `result-item ${result.isCorrect ? 'correct' : 'incorrect'}`;
            
            const info = document.createElement('div');
            info.className = 'result-info';
            
            const question = document.createElement('div');
            question.className = 'result-question';
            question.textContent = `${result.index + 1}. pozisyon`;
            
            const answers = document.createElement('div');
            answers.className = 'result-answers';
            answers.textContent = `Doğru: ${result.correct} | Cevabınız: ${result.user}`;
            
            info.appendChild(question);
            info.appendChild(answers);
            
            const status = document.createElement('div');
            status.className = 'result-status';
            status.textContent = result.isCorrect ? '✓' : '✗';
            
            item.appendChild(info);
            item.appendChild(status);
            digitSection.appendChild(item);
        });
        
        container.appendChild(digitSection);
    }
    
    if (gameState.results.questions.length > 0) {
        const questionSection = document.createElement('div');
        questionSection.className = 'result-section';
        
        const questionTitle = document.createElement('h3');
        questionTitle.className = 'result-section-title';
        questionTitle.textContent = 'Ek Sorular';
        questionSection.appendChild(questionTitle);
        
        gameState.results.questions.forEach(result => {
            const item = document.createElement('div');
            item.className = `result-item ${result.isCorrect ? 'correct' : 'incorrect'}`;
            
            const info = document.createElement('div');
            info.className = 'result-info';
            
            const question = document.createElement('div');
            question.className = 'result-question';
            question.textContent = result.text;
            
            const answers = document.createElement('div');
            answers.className = 'result-answers';
            answers.textContent = `Doğru: ${result.correct} | Cevabınız: ${result.user}`;
            
            info.appendChild(question);
            info.appendChild(answers);
            
            const status = document.createElement('div');
            status.className = 'result-status';
            status.textContent = result.isCorrect ? '✓' : '✗';
            
            item.appendChild(info);
            item.appendChild(status);
            questionSection.appendChild(item);
        });
        
        container.appendChild(questionSection);
    }
}

// Skor Tablosu
function renderLeaderboard(filter) {
    const scores = Storage.getScores(filter);
    const container = document.getElementById('leaderboardList');
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    if (scores.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎮</div>
                <p>Henüz skor yok!</p>
                <p class="empty-desc">İlk oyununu oyna ve listede yerini al.</p>
            </div>
        `;
        return;
    }
    
    scores.sort((a, b) => b.score - a.score);
    
    container.innerHTML = '';
    scores.forEach((score, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        if (index === 0) item.classList.add('top-1');
        if (index === 1) item.classList.add('top-2');
        if (index === 2) item.classList.add('top-3');
        
        const rank = document.createElement('div');
        rank.className = 'leaderboard-rank';
        rank.textContent = '#' + (index + 1);
        
        const info = document.createElement('div');
        info.className = 'leaderboard-info';
        
        const scoreValue = document.createElement('div');
        scoreValue.className = 'leaderboard-score';
        scoreValue.textContent = score.score + ' puan';
        
        const meta = document.createElement('div');
        meta.className = 'leaderboard-meta';
        meta.textContent = `${CONFIG.DIFFICULTY_NAMES[score.difficulty]} • ${Utils.formatDate(score.date)}`;
        
        info.appendChild(scoreValue);
        info.appendChild(meta);
        
        item.appendChild(rank);
        item.appendChild(info);
        
        if (index < 3) {
            const medal = document.createElement('div');
            medal.className = 'leaderboard-medal';
            medal.textContent = ['🥇', '🥈', '🥉'][index];
            item.appendChild(medal);
        }
        
        container.appendChild(item);
    });
}

function filterLeaderboard(filter) {
    renderLeaderboard(filter);
}

function clearLeaderboard() {
    if (confirm('Tüm skorları silmek istediğinizden emin misiniz?')) {
        Storage.clearScores();
        renderLeaderboard('all');
    }
}

// Ayarlar
function loadSettings() {
    document.getElementById('soundToggle').checked = Storage.getSetting('sound');
    document.getElementById('darkModeToggle').checked = Storage.getSetting('darkMode');
    document.getElementById('autoSaveToggle').checked = Storage.getSetting('autoSave');
    
    if (Storage.getSetting('darkMode')) {
        document.body.classList.add('dark-mode');
    }
}

function toggleSound() {
    const enabled = document.getElementById('soundToggle').checked;
    Storage.setSetting('sound', enabled);
}

function toggleDarkMode() {
    const enabled = document.getElementById('darkModeToggle').checked;
    Storage.setSetting('darkMode', enabled);
    document.body.classList.toggle('dark-mode', enabled);
}

function toggleAutoSave() {
    const enabled = document.getElementById('autoSaveToggle').checked;
    Storage.setSetting('autoSave', enabled);
}

function showStats() {
    alert('İstatistikler özelliği yakında eklenecek!');
}

function resetAllData() {
    if (confirm('Tüm verileri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        localStorage.clear();
        Storage.updateStats();
        loadSettings();
        alert('Tüm veriler silindi!');
        backToMenu();
    }
}

// Ana Menüye Dön
function backToMenu() {
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    gameState.current = 'menu';
    showScreen('menu');
    Storage.displayStats();
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    showScreen('menu');
    Storage.displayStats();
    loadSettings();
});