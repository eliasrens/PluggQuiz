const MAX_QUESTIONS = 20;
let allQuestions = [];
let questions = [];
let currentIndex = 0;
let correctCount = 0;
let hasAnswered = false;

// Hämta quiz-ID från URL
function getQuizId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Slumpa och välj max 20 frågor
function pickRandomQuestions() {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    questions = shuffled.slice(0, MAX_QUESTIONS);
}

// Ladda quiz från Supabase
async function loadQuiz() {
    const quizId = getQuizId();

    if (!quizId) {
        showErrorScreen();
        return;
    }

    try {
        const { data, error } = await db
            .from('quizzes')
            .select('questions')
            .eq('id', quizId)
            .single();

        if (error || !data) {
            showErrorScreen();
            return;
        }

        allQuestions = data.questions;
        pickRandomQuestions();
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('question-card').classList.remove('hidden');
        showQuestion();

    } catch (err) {
        console.error('Error loading quiz:', err);
        showErrorScreen();
    }
}

function showErrorScreen() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
}

// Visa aktuell fråga
function showQuestion() {
    hasAnswered = false;
    const q = questions[currentIndex];

    // Progress
    document.getElementById('progress-text').textContent =
        `Fråga ${currentIndex + 1} av ${questions.length}`;
    document.getElementById('progress-bar').style.width =
        `${((currentIndex) / questions.length) * 100}%`;

    // Frågetext
    document.getElementById('question-text').textContent = q.question;

    // Alternativ
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    q.options.forEach((option) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn w-full text-left p-4 bg-gray-900 border border-gray-700 rounded-xl font-medium text-gray-200 hover:bg-gray-800 hover:border-gray-600 transition-all duration-200';
        btn.textContent = option;
        btn.onclick = () => selectAnswer(option, btn);
        container.appendChild(btn);
    });

    // Göm förklaring och nästa-knapp
    document.getElementById('explanation-box').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');
}

// Hantera svar
function selectAnswer(selected, btnElement) {
    if (hasAnswered) return;
    hasAnswered = true;

    const q = questions[currentIndex];
    const isCorrect = selected === q.correct_answer;
    const allButtons = document.querySelectorAll('.option-btn');

    // Inaktivera alla knappar
    allButtons.forEach(btn => {
        btn.classList.remove('hover:bg-gray-800', 'hover:border-gray-600');
        btn.style.cursor = 'default';

        // Markera rätt svar grönt
        if (btn.textContent === q.correct_answer) {
            btn.classList.remove('bg-gray-900', 'border-gray-700', 'text-gray-200');
            btn.classList.add('bg-emerald-900/50', 'border-emerald-500', 'text-emerald-300');
        }
    });

    if (isCorrect) {
        correctCount++;
        document.getElementById('score-text').textContent =
            `${correctCount} rätt`;
    } else {
        // Markera fel svar rött
        btnElement.classList.remove('bg-gray-900', 'border-gray-700', 'text-gray-200');
        btnElement.classList.add('bg-red-900/50', 'border-red-500', 'text-red-300');

        // Visa förklaring
        document.getElementById('explanation-text').textContent = q.explanation;
        document.getElementById('explanation-box').classList.remove('hidden');
    }

    // Visa nästa-knapp
    const nextBtn = document.getElementById('next-btn');
    if (currentIndex < questions.length - 1) {
        nextBtn.textContent = 'Nästa fråga →';
    } else {
        nextBtn.textContent = 'Visa resultat';
    }
    nextBtn.classList.remove('hidden');
}

// Gå till nästa fråga
function nextQuestion() {
    currentIndex++;

    if (currentIndex >= questions.length) {
        showCompletion();
        return;
    }

    showQuestion();
}

// Visa avslutningsskärm
function showCompletion() {
    document.getElementById('question-card').classList.add('hidden');
    document.getElementById('completion-screen').classList.remove('hidden');
    document.getElementById('final-score').textContent =
        `Du fick ${correctCount} av ${questions.length} rätt`;

    // Visa "Nya frågor"-knappen bara om det finns fler frågor än max
    const newQuestionsBtn = document.getElementById('new-questions-btn');
    if (allQuestions.length > MAX_QUESTIONS) {
        newQuestionsBtn.classList.remove('hidden');
    }
}

// Gör om samma frågor
function restartQuiz() {
    currentIndex = 0;
    correctCount = 0;
    document.getElementById('completion-screen').classList.add('hidden');
    document.getElementById('question-card').classList.remove('hidden');
    document.getElementById('score-text').textContent = '';
    showQuestion();
}

// Nya slumpade frågor
function newQuestions() {
    currentIndex = 0;
    correctCount = 0;
    pickRandomQuestions();
    document.getElementById('completion-screen').classList.add('hidden');
    document.getElementById('question-card').classList.remove('hidden');
    document.getElementById('score-text').textContent = '';
    showQuestion();
}

// Starta
loadQuiz();
