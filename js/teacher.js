// ============================================
// AUTENTISERING
// ============================================

// Kolla om redan inloggad vid sidladdning
async function checkAuth() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        document.getElementById('step-login').classList.add('hidden');
        document.getElementById('step-create').classList.remove('hidden');
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
        errorEl.textContent = 'Fel e-post eller lösenord.';
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Logga in';
        return;
    }

    document.getElementById('step-login').classList.add('hidden');
    document.getElementById('step-create').classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Logga in';
}

async function logout() {
    await db.auth.signOut();
    document.getElementById('step-create').classList.add('hidden');
    document.getElementById('step-result').classList.add('hidden');
    document.getElementById('step-login').classList.remove('hidden');
}

// Kör vid sidladdning
checkAuth();

// ============================================
// QUIZ-HANTERING
// ============================================

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

// Visa felmeddelande
function showError(message) {
    const el = document.getElementById('error-message');
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}

// Generera quiz
async function generateQuiz() {
    hideError();

    const jsonInput = document.getElementById('json-input').value.trim();
    if (!jsonInput) {
        showError('Klistra in ditt JSON-frågeformat först.');
        return;
    }

    // Parsa JSON
    let quizData;
    try {
        quizData = JSON.parse(jsonInput);
    } catch (e) {
        showError('Ogiltig JSON. Kontrollera formatet och försök igen.');
        return;
    }

    // Validera
    const validationError = validateQuizData(quizData);
    if (validationError) {
        showError(validationError);
        return;
    }

    // Inaktivera knapp
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.textContent = 'Skapar quiz...';

    try {
        const quizId = generateId();

        const { error } = await db
            .from('quizzes')
            .insert({ id: quizId, questions: quizData });

        if (error) throw error;

        // Visa resultat
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        const quizUrl = `${baseUrl}quiz.html?id=${quizId}`;

        document.getElementById('quiz-link').value = quizUrl;

        // Generera QR-kod
        document.getElementById('qr-code').innerHTML = '';
        new QRCode(document.getElementById('qr-code'), {
            text: quizUrl,
            width: 200,
            height: 200,
        });

        document.getElementById('step-create').classList.add('hidden');
        document.getElementById('step-result').classList.remove('hidden');

    } catch (error) {
        showError('Kunde inte spara quizet. Kontrollera din Supabase-konfiguration.');
        console.error('Supabase error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generera Quiz';
    }
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

// Återställ formuläret
function resetForm() {
    document.getElementById('step-result').classList.add('hidden');
    document.getElementById('step-create').classList.remove('hidden');
    document.getElementById('json-input').value = '';
}
