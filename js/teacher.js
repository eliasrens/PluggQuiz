// ============================================
// AUTENTISERING
// ============================================

async function checkAuth() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        document.getElementById('step-login').classList.add('hidden');
        showDashboard();
    }
}

async function login() {
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');

    if (!username || !password) {
        errorEl.textContent = 'Fyll i användarnamn och lösenord.';
        errorEl.classList.remove('hidden');
        return;
    }

    const email = username + '@pluggquiz.se';

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.textContent = 'Loggar in...';

    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.textContent = 'Fel användarnamn eller lösenord.';
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Logga in';
        return;
    }

    document.getElementById('step-login').classList.add('hidden');
    btn.disabled = false;
    btn.textContent = 'Logga in';
    showDashboard();
}

async function logout() {
    await db.auth.signOut();
    hideAllSteps();
    document.getElementById('step-login').classList.remove('hidden');
}

// Kör vid sidladdning
checkAuth();

// ============================================
// NAVIGATION
// ============================================

function hideAllSteps() {
    document.getElementById('step-login').classList.add('hidden');
    document.getElementById('step-dashboard').classList.add('hidden');
    document.getElementById('step-create').classList.add('hidden');
    document.getElementById('step-result').classList.add('hidden');
}

// ============================================
// DASHBOARD
// ============================================

async function showDashboard() {
    hideAllSteps();
    document.getElementById('step-dashboard').classList.remove('hidden');
    await loadQuizList();
}

async function loadQuizList() {
    const container = document.getElementById('quiz-list');
    container.innerHTML = '<p class="text-gray-500 text-center py-8">Laddar...</p>';

    const { data, error } = await db
        .from('quizzes')
        .select('id, name, created_at, questions')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<p class="text-red-400 text-center py-8">Kunde inte ladda quizar.</p>';
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Inga quizar ännu. Skapa ditt första!</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(quiz => {
        const count = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
        const date = new Date(quiz.created_at).toLocaleDateString('sv-SE');
        const name = quiz.name || 'Namnlöst quiz';

        const card = document.createElement('div');
        card.className = 'bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4';
        card.innerHTML = `
            <div class="min-w-0 flex-1">
                <h3 class="text-white font-medium truncate">${escapeHtml(name)}</h3>
                <p class="text-gray-500 text-sm">${count} frågor · ${date}</p>
            </div>
            <div class="flex gap-2 shrink-0">
                <button onclick="showQuizLink('${quiz.id}')" class="text-violet-400 hover:text-violet-300 text-sm font-medium py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">Dela</button>
                <button onclick="editQuiz('${quiz.id}')" class="text-gray-400 hover:text-gray-200 text-sm font-medium py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">Redigera</button>
                <button onclick="deleteQuiz('${quiz.id}', '${escapeHtml(name)}')" class="text-red-400/60 hover:text-red-400 text-sm font-medium py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">Ta bort</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function deleteQuiz(quizId, quizName) {
    if (!confirm(`Vill du verkligen ta bort "${quizName}"?`)) return;

    const { error } = await db
        .from('quizzes')
        .delete()
        .eq('id', quizId);

    if (error) {
        alert('Kunde inte ta bort quizet.');
        console.error('Delete error:', error);
        return;
    }

    await loadQuizList();
}

// ============================================
// SKAPA / REDIGERA QUIZ
// ============================================

let editingQuizId = null;

function showCreateForm() {
    editingQuizId = null;
    hideAllSteps();
    document.getElementById('step-create').classList.remove('hidden');
    document.getElementById('form-title').textContent = 'Skapa nytt quiz';
    document.getElementById('generate-btn').textContent = 'Spara Quiz';
    document.getElementById('quiz-name').value = '';
    document.getElementById('json-input').value = '';
    hideError();
}

async function editQuiz(quizId) {
    const { data, error } = await db
        .from('quizzes')
        .select('id, name, questions')
        .eq('id', quizId)
        .single();

    if (error || !data) return;

    editingQuizId = quizId;
    hideAllSteps();
    document.getElementById('step-create').classList.remove('hidden');
    document.getElementById('form-title').textContent = 'Redigera quiz';
    document.getElementById('generate-btn').textContent = 'Spara ändringar';
    document.getElementById('quiz-name').value = data.name || '';
    document.getElementById('json-input').value = JSON.stringify(data.questions, null, 2);
    hideError();
}

// Generera ett kort unikt ID (8 tecken)
function generateId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Validera JSON-formatet
function validateQuizData(data) {
    if (!Array.isArray(data)) {
        return 'JSON måste vara en array (börja med [ och sluta med ])';
    }
    if (data.length === 0) {
        return 'Arrayen är tom – lägg till minst en fråga';
    }

    for (let i = 0; i < data.length; i++) {
        const q = data[i];
        if (!q.question || typeof q.question !== 'string') {
            return `Fråga ${i + 1}: saknar "question"`;
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
            return `Fråga ${i + 1}: "options" måste vara en array med exakt 4 alternativ`;
        }
        if (!q.correct_answer || typeof q.correct_answer !== 'string') {
            return `Fråga ${i + 1}: saknar "correct_answer"`;
        }
        if (!q.options.includes(q.correct_answer)) {
            return `Fråga ${i + 1}: "correct_answer" matchar inget av alternativen`;
        }
        if (!q.explanation || typeof q.explanation !== 'string') {
            return `Fråga ${i + 1}: saknar "explanation"`;
        }
    }

    return null;
}

// Visa/dölj felmeddelande
function showError(message) {
    const el = document.getElementById('error-message');
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}

// Spara quiz (skapa nytt eller uppdatera)
async function saveQuiz() {
    hideError();

    const name = document.getElementById('quiz-name').value.trim();
    if (!name) {
        showError('Ge ditt quiz ett namn.');
        return;
    }

    const jsonInput = document.getElementById('json-input').value.trim();
    if (!jsonInput) {
        showError('Klistra in ditt JSON-frågeformat först.');
        return;
    }

    let quizData;
    try {
        quizData = JSON.parse(jsonInput);
    } catch (e) {
        showError('Ogiltig JSON. Kontrollera formatet och försök igen.');
        return;
    }

    const validationError = validateQuizData(quizData);
    if (validationError) {
        showError(validationError);
        return;
    }

    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.textContent = 'Sparar...';

    try {
        let quizId;

        if (editingQuizId) {
            // Uppdatera befintligt quiz
            quizId = editingQuizId;
            const { error } = await db
                .from('quizzes')
                .update({ name: name, questions: quizData })
                .eq('id', quizId);
            if (error) throw error;
        } else {
            // Skapa nytt quiz
            quizId = generateId();
            const { error } = await db
                .from('quizzes')
                .insert({ id: quizId, name: name, questions: quizData });
            if (error) throw error;
        }

        showQuizLink(quizId);

    } catch (error) {
        showError('Kunde inte spara quizet.');
        console.error('Supabase error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = editingQuizId ? 'Spara ändringar' : 'Spara Quiz';
    }
}

// ============================================
// VISA LÄNK & QR-KOD
// ============================================

function showQuizLink(quizId) {
    hideAllSteps();
    document.getElementById('step-result').classList.remove('hidden');

    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const quizUrl = `${baseUrl}quiz.html?id=${quizId}`;

    document.getElementById('quiz-link').value = quizUrl;

    document.getElementById('qr-code').innerHTML = '';
    new QRCode(document.getElementById('qr-code'), {
        text: quizUrl,
        width: 200,
        height: 200,
    });
}

// Kopiera länk
function copyLink() {
    const link = document.getElementById('quiz-link').value;
    navigator.clipboard.writeText(link).then(() => {
        const btn = event.target;
        btn.textContent = 'Kopierad!';
        setTimeout(() => btn.textContent = 'Kopiera', 2000);
    });
}

// Kopiera AI-prompt
function copyAIPrompt() {
    const quizName = document.getElementById('quiz-name').value.trim();
    const topic = quizName ? quizName : '[ÄMNE]';

    const prompt = `Generera 100 flervalsfrågor om ${topic} på svenska.

Returnera BARA en JSON-array i exakt detta format, utan kommentarer:

[
  {
    "question": "Frågan här",
    "options": ["Alternativ A", "Alternativ B", "Alternativ C", "Alternativ D"],
    "correct_answer": "Det korrekta alternativet (måste matcha ett av options exakt)",
    "explanation": "Kort förklaring till varför det är rätt svar."
  }
]

Regler:
- Alltid exakt 4 alternativ per fråga
- correct_answer måste vara identisk med ett av värdena i options
- Variera svårighetsgrad
- Förklaringen ska vara pedagogisk och kort`;

    navigator.clipboard.writeText(prompt).then(() => {
        const btn = document.getElementById('copy-prompt-btn');
        btn.textContent = 'Kopierad!';
        setTimeout(() => btn.textContent = 'Kopiera AI-prompt', 2000);
    });
}
