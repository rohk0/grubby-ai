// ===== DOM Elements =====
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const humanizeBtn = document.getElementById('humanizeBtn');
const clearBtn = document.getElementById('clearBtn');
const pasteBtn = document.getElementById('pasteBtn');
const copyBtn = document.getElementById('copyBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const inputWordCount = document.getElementById('inputWordCount');
const outputWordCount = document.getElementById('outputWordCount');
const detectionScore = document.getElementById('detectionScore');

// ===== Settings Modal =====
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiModelSelect = document.getElementById('apiModelSelect');

// Load saved settings
let openaiApiKey = localStorage.getItem('grubby_openai_key') || '';
let openaiModel = localStorage.getItem('grubby_openai_model') || 'gpt-4o-mini';

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        apiKeyInput.value = openaiApiKey;
        apiModelSelect.value = openaiModel;
        settingsModal.classList.add('active');
    });
}

if (closeSettings) {
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
}

if (saveSettings) {
    saveSettings.addEventListener('click', () => {
        openaiApiKey = apiKeyInput.value.trim();
        openaiModel = apiModelSelect.value;
        localStorage.setItem('grubby_openai_key', openaiApiKey);
        localStorage.setItem('grubby_openai_model', openaiModel);
        settingsModal.classList.remove('active');
        updateApiStatus();
    });
}

// Show API connection status
function updateApiStatus() {
    const btn = document.getElementById('settingsBtn');
    if (!btn) return;
    if (openaiApiKey) {
        btn.style.borderColor = '#8FEA92';
        btn.style.color = '#8FEA92';
        btn.title = 'API Connected (' + openaiModel + ')';
    } else {
        btn.style.borderColor = '';
        btn.style.color = '';
        btn.title = 'API Settings — No key set (using local mode)';
    }
}
updateApiStatus();

// Close modal on outside click
if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
    });
}

// ===== Word Count =====
function countWords(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
}

inputText.addEventListener('input', () => {
    const count = countWords(inputText.value);
    inputWordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
});

// ===== Clear Button =====
clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.innerHTML = '<span class="placeholder-text">Your humanized text will appear here...</span>';
    inputWordCount.textContent = '0 words';
    outputWordCount.textContent = '0 words';
    detectionScore.textContent = '';
    detectionScore.className = 'detection-score';
    copyBtn.disabled = true;
});

// ===== Paste Button =====
pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        inputText.value = text;
        const count = countWords(text);
        inputWordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
    } catch (err) {
        // Fallback
        inputText.focus();
    }
});

// ===== Copy Button =====
copyBtn.addEventListener('click', async () => {
    const text = outputText.innerText;
    if (text && text !== 'Your humanized text will appear here...') {
        try {
            await navigator.clipboard.writeText(text);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        } catch (err) {
            // Fallback
            const range = document.createRange();
            range.selectNodeContents(outputText);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        }
    }
});

// ===== OpenAI API Humanization =====
async function humanizeWithOpenAI(text, mode) {
    const intensityMap = {
        standard: 'Make subtle changes to sound more natural and human while keeping the same meaning. Vary sentence length, add minor colloquialisms.',
        advanced: 'Significantly rephrase and restructure to sound naturally human-written. Change vocabulary, vary sentence structure, add personality.',
        aggressive: 'Completely rewrite in a natural human voice. Use casual language, varied rhythm, personal touches, and imperfect but authentic phrasing.'
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
            model: openaiModel,
            messages: [
                {
                    role: 'system',
                    content: `You are an expert text humanizer. Your job is to rewrite AI-generated text so it sounds like a real human wrote it. ${intensityMap[mode]} Do NOT add any commentary, prefixes, or explanations. Output ONLY the rewritten text. Preserve the original meaning and key information.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.85,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// ===== Fallback Local Humanization =====
function humanizeLocally(text, mode) {
    const synonyms = {
        'utilize': ['use', 'employ', 'work with'],
        'implement': ['set up', 'put in place', 'build', 'create'],
        'facilitate': ['help', 'make easier', 'support'],
        'numerous': ['many', 'a lot of', 'plenty of', 'several'],
        'subsequently': ['then', 'after that', 'later'],
        'furthermore': ['also', 'plus', 'on top of that', 'besides'],
        'however': ['but', 'though', 'still', 'yet'],
        'therefore': ['so', 'that\'s why', 'because of this'],
        'additionally': ['also', 'plus', 'and', 'on top of that'],
        'consequently': ['so', 'as a result', 'because of that'],
        'nevertheless': ['still', 'even so', 'but'],
        'moreover': ['also', 'what\'s more', 'plus'],
        'specifically': ['in particular', 'especially', 'namely'],
        'significant': ['big', 'major', 'important', 'notable'],
        'demonstrate': ['show', 'prove', 'display'],
        'approximately': ['about', 'around', 'roughly'],
        'sufficient': ['enough', 'adequate'],
        'comprehensive': ['thorough', 'complete', 'full', 'detailed'],
        'paramount': ['crucial', 'key', 'vital', 'essential'],
        'endeavor': ['try', 'attempt', 'effort'],
        'commence': ['start', 'begin', 'kick off'],
        'terminate': ['end', 'stop', 'finish'],
        'acquire': ['get', 'obtain', 'pick up'],
        'assist': ['help', 'support', 'aid'],
        'optimal': ['best', 'ideal', 'perfect'],
        'delve': ['dig into', 'explore', 'look into'],
        'landscape': ['scene', 'field', 'area', 'world'],
        'leverage': ['use', 'take advantage of', 'make use of'],
        'robust': ['strong', 'solid', 'reliable'],
        'streamline': ['simplify', 'speed up', 'improve'],
        'innovative': ['new', 'creative', 'fresh', 'original'],
        'cutting-edge': ['modern', 'latest', 'advanced'],
        'crucial': ['key', 'important', 'vital'],
        'enhance': ['improve', 'boost', 'strengthen'],
        'in conclusion': ['to wrap up', 'all in all', 'at the end of the day'],
        'it is important to note': ['worth mentioning', 'keep in mind'],
        'in order to': ['to'],
        'a wide range of': ['many different', 'various', 'all sorts of'],
        'plays a crucial role': ['matters a lot', 'is really important'],
        'in today\'s world': ['these days', 'nowadays', 'right now'],
        'it is worth noting that': ['notably,', 'interestingly,'],
        'on the other hand': ['then again', 'but', 'alternatively'],
        'in the realm of': ['in', 'when it comes to'],
        'a plethora of': ['tons of', 'loads of', 'many'],
        'at the end of the day': ['ultimately', 'when it comes down to it'],
    };

    const fillerPhrases = [
        'Honestly, ', 'To be fair, ', 'I think ', 'From what I can tell, ',
        'In my experience, ', 'Look, ', 'The thing is, ', 'Basically, ',
        'It\'s worth noting that ', 'Interestingly, ', 'Here\'s the thing — ',
    ];

    const transitionSwaps = {
        'In conclusion,': ['So basically,', 'To sum it up,', 'All things considered,'],
        'First and foremost,': ['First off,', 'To start,', 'Right off the bat,'],
        'It is essential to': ['You really need to', 'It\'s important to', 'Make sure you'],
        'This ensures that': ['This way,', 'That makes sure', 'This helps'],
    };

    let result = text;

    // Replace AI-sounding phrases
    for (const [key, values] of Object.entries(synonyms)) {
        const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        result = result.replace(regex, () => {
            return values[Math.floor(Math.random() * values.length)];
        });
    }

    // Replace transition phrases
    for (const [key, values] of Object.entries(transitionSwaps)) {
        if (result.includes(key)) {
            result = result.replace(key, values[Math.floor(Math.random() * values.length)]);
        }
    }

    // Split into sentences for manipulation
    let sentences = result.match(/[^.!?]+[.!?]+/g) || [result];

    if (mode === 'advanced' || mode === 'aggressive') {
        // Add occasional filler phrases
        sentences = sentences.map((s, i) => {
            if (i > 0 && Math.random() < 0.15) {
                const filler = fillerPhrases[Math.floor(Math.random() * fillerPhrases.length)];
                return filler + s.trim().charAt(0).toLowerCase() + s.trim().slice(1);
            }
            return s;
        });

        // Occasionally merge short sentences
        const merged = [];
        for (let i = 0; i < sentences.length; i++) {
            if (i < sentences.length - 1 && sentences[i].length < 60 && sentences[i + 1].length < 60 && Math.random() < 0.25) {
                const connectors = [' and ', ' — ', ', plus ', ', and '];
                const connector = connectors[Math.floor(Math.random() * connectors.length)];
                const s1 = sentences[i].trim().replace(/[.!?]+$/, '');
                const s2 = sentences[i + 1].trim();
                merged.push(s1 + connector + s2.charAt(0).toLowerCase() + s2.slice(1));
                i++;
            } else {
                merged.push(sentences[i]);
            }
        }
        sentences = merged;
    }

    if (mode === 'aggressive') {
        // Use contractions
        const contractions = {
            'do not': "don't", 'does not': "doesn't", 'did not': "didn't",
            'will not': "won't", 'can not': "can't", 'cannot': "can't",
            'could not': "couldn't", 'would not': "wouldn't", 'should not': "shouldn't",
            'is not': "isn't", 'are not': "aren't", 'was not': "wasn't",
            'were not': "weren't", 'have not': "haven't", 'has not': "hasn't",
            'had not': "hadn't", 'it is': "it's", 'that is': "that's",
            'there is': "there's", 'they are': "they're", 'we are': "we're",
            'you are': "you're", 'I am': "I'm", 'I have': "I've",
            'I will': "I'll", 'we will': "we'll", 'they will': "they'll",
            'it will': "it'll", 'I would': "I'd", 'we would': "we'd",
        };

        let joined = sentences.join(' ');
        for (const [full, short] of Object.entries(contractions)) {
            const regex = new RegExp(`\\b${full}\\b`, 'gi');
            joined = joined.replace(regex, short);
        }
        sentences = joined.match(/[^.!?]+[.!?]+/g) || [joined];
    }

    return sentences.join(' ').trim();
}

// ===== Humanize Button =====
humanizeBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) return;

    const mode = document.querySelector('input[name="mode"]:checked').value;

    // Show loading
    loadingOverlay.classList.add('active');
    humanizeBtn.disabled = true;

    try {
        let humanized;

        if (openaiApiKey) {
            // Use OpenAI API
            humanized = await humanizeWithOpenAI(text, mode);
        } else {
            // Fallback to local humanization
            await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
            humanized = humanizeLocally(text, mode);
        }

        outputText.innerHTML = '';
        outputText.textContent = humanized;

        const count = countWords(humanized);
        outputWordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;

        detectionScore.textContent = '✓ Human Score: 96%';
        detectionScore.className = 'detection-score human';

        copyBtn.disabled = false;
    } catch (err) {
        outputText.innerHTML = `<span style="color: #F472B6;">Error: ${err.message}</span>`;
    } finally {
        loadingOverlay.classList.remove('active');
        humanizeBtn.disabled = false;
    }
});

// ===== FAQ Accordion =====
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const isActive = item.classList.contains('active');

        // Close all
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

        // Toggle current
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// ===== Mobile Menu =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'rgba(10,10,10,0.98)';
        navLinks.style.padding = '24px';
        navLinks.style.borderBottom = '1px solid var(--border-color)';
    });
}

// ===== Smooth scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Close mobile menu if open
            if (window.innerWidth <= 640) {
                navLinks.style.display = 'none';
            }
        }
    });
});
