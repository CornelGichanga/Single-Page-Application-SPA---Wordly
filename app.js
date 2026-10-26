/**
 * Wordly SPA Application Logic Engine
 */

// Application Core Reactive State Blueprint
const state = {
    currentWordData: null,
    savedWords: JSON.parse(localStorage.getItem('wordly_saved')) || [],
    theme: localStorage.getItem('wordly_theme') || 'light'
};

const API_BASE_URL = 'https://dictionaryapi.dev';

// Persistent Global DOM Selectors
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultContainer = document.getElementById('result-container');
const savedWordsList = document.getElementById('saved-words-list');
const clearSavedBtn = document.getElementById('clear-saved');
const themeToggleBtn = document.getElementById('theme-toggle');

/**
 * Initializes app state, theme tracking systems, and bound UI listeners.
 */
function init() {
    applyTheme(state.theme);
    renderSavedWords();
    setupEventListeners();
}

function setupEventListeners() {
    searchForm.addEventListener('submit', handleSearchSubmit);
    themeToggleBtn.addEventListener('click', toggleTheme);
    clearSavedBtn.addEventListener('click', clearAllSavedWords);
}

/**
 * Orchestrates Form capturing pipeline execution
 */
async function handleSearchSubmit(e) {
    e.preventDefault();
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    executeSearch(query);
}

/**
 * Decoupled search driver supporting direct forms and historic element click queries
 */
async function executeSearch(word) {
    renderLoading();
    try {
        const data = await fetchWordData(word);
        // Extract initial record payload match
        state.currentWordData = data[0];
        renderWordResult(state.currentWordData);
    } catch (error) {
        renderError(error.message);
    }
}

/**
 * Data Fetching Interface Layer with robust status code error separation
 */
async function fetchWordData(word) {
    const response = await fetch(`${API_BASE_URL}${encodeURIComponent(word)}`);
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`We couldn't locate definitions for "${word}". Verify spelling accuracy and re-submit.`);
        }
        throw new Error('An unexpected dictionary server interruption occurred. Please re-try shortly.');
    }
    return response.json();
}

/**
 * Processes vocalization tasks via explicit audio file selection strategies
 */
function playAudio(audioUrl) {
    if (!audioUrl) return;
    const audioTrack = new Audio(audioUrl);
    audioTrack.play().catch(err => {
        console.error("Audio block playback failure:", err);
        alert("Audio vocalization failed to stream. Try another word asset.");
    });
}

/**
 * Mutates stateful collections safely targeting systemic localStorage arrays
 */
function toggleSaveWord(word) {
    const targetWord = word.toLowerCase();
    const index = state.savedWords.indexOf(targetWord);
    
    if (index === -1) {
        state.savedWords.push(targetWord);
    } else {
        state.savedWords.splice(index, 1);
    }
    
    localStorage.setItem('wordly_saved', JSON.stringify(state.savedWords));
    renderSavedWords();
    
    // Dynamically adjust active visual card styling elements on mutations
    if (state.currentWordData && state.currentWordData.word.toLowerCase() === targetWord) {
        renderWordResult(state.currentWordData);
    }
}

function clearAllSavedWords() {
    state.savedWords = [];
    localStorage.setItem('wordly_saved', JSON.stringify([]));
    renderSavedWords();
    if (state.currentWordData) {
        renderWordResult(state.currentWordData);
    }
}

function toggleTheme() {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    state.theme = nextTheme;
    localStorage.setItem('wordly_theme', nextTheme);
    applyTheme(nextTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggleBtn.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
}

/* --- UI Rendering Engine (Encapsulated and XSS Protected) --- */

function renderLoading() {
    resultContainer.innerHTML = `
        <div class="loading-spinner">
            <p>Querying Wordly language data networks...</p>
        </div>`;
}

function renderError(message) {
    resultContainer.innerHTML = `
        <div class="error-message">
            <h2>Search Evaluation Fault</h2>
            <p>${escapeHTML(message)}</p>
        </div>`;
}

function renderSavedWords() {
    savedWordsList.innerHTML = '';
    
    if (state.savedWords.length === 0) {
        savedWordsList.innerHTML = '<li style="font-size: 0.9rem; font-style: italic; opacity: 0.7;">No tracked expressions saved yet.</li>';
        clearSavedBtn.classList.add('hidden');
        return;
    }

    state.savedWords.forEach(word => {
        const li = document.createElement('li');
        li.className = 'saved-item';
        
        const btn = document.createElement('button');
        btn.className = 'saved-word-btn';
        btn.type = 'button';
        btn.textContent = word;
        btn.addEventListener('click', () => {
            searchInput.value = word;
            executeSearch(word);
        });
        
        li.appendChild(btn);
        savedWordsList.appendChild(li);
    });

    clearSavedBtn.classList.remove('hidden');
}

function renderWordResult(wordData) {
    const isSaved = state.savedWords.includes(wordData.word.toLowerCase());
    
    // Clean audio tracking matching logic targeting varied nested payload types
    let playableAudioUrl = '';
    if (wordData.phonetics && Array.isArray(wordData.phonetics)) {
        const audioMatch = wordData.phonetics.find(p => p.audio && p.audio.trim() !== '');
        if (audioMatch) playableAudioUrl = audioMatch.audio;
    }

    // Direct Structure Generation Framework
    let htmlContent = `
        <div class="word-header">
            <div>
                <h2 style="text-transform: capitalize;">${escapeHTML(wordData.word)}</h2>
                <p class="phonetic">${escapeHTML(wordData.phonetic || '')}</p>
            </div>
            <div class="meta-controls">
                ${playableAudioUrl ? `<button id="audio-play-btn" class="btn btn-audio">🔊 Play Accent</button>` : ''}
                <button id="save-word-toggle" class="btn ${isSaved ? 'btn-secondary' : 'btn-primary'}">
                    ${isSaved ? '★ Tracking' : '☆ Track Word'}
                </button>
            </div>
        </div>
    `;

    // Deep Traversal of Content Layout Elements
    wordData.meanings.forEach(meaning => {
        htmlContent += `
            <div class="meaning-card">
                <span class="part-of-speech">${escapeHTML(meaning.partOfSpeech)}</span>
                <ol class="definitions-list">
        `;

        meaning.definitions.slice(0, 3).forEach(def => {
            htmlContent += `
                <li class="definition-item">
                    <p>${escapeHTML(def.definition)}</p>
                    ${def.example ? `<span class="example">"${escapeHTML(def.example)}"</span>` : ''}
                </li>
            `;
        });

        htmlContent += `</ol>`;

        if (meaning.synonyms && meaning.synonyms.length > 0) {
            htmlContent += `<div class="synonyms-container"><strong>Synonyms:</strong> `;
            meaning.synonyms.slice(0, 5).forEach(syn => {
                htmlContent += `<span class="synonym-tag">${escapeHTML(syn)}</span>`;
            });
            htmlContent += `</div>`;
        }

        htmlContent += `</div>`;
    });

    if (wordData.sourceUrls && wordData.sourceUrls.length > 0) {
        htmlContent += `
            <footer class="source-details">
                <span>Verification Source: </span>
                <a href="${wordData.sourceUrls[0]}" target="_blank" rel="noopener noreferrer" class="source-link">
                    ${escapeHTML(wordData.sourceUrls[0])} ↗
                </a>
            </footer>
        `;
    }

    resultContainer.innerHTML = htmlContent;

    // Post injection lifecycle binding targeting context isolated sub-controls
    document.getElementById('save-word-toggle').addEventListener('click', () => {
        toggleSaveWord(wordData.word);
    });

    if (playableAudioUrl) {
        document.getElementById('audio-play-btn').addEventListener('click', () => {
            playAudio(playableAudioUrl);
        });
    }
}

/**
 * XSS Defensive Engineering Vector Guard
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        entity => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[entity] || entity)
    );
}

// Synchronous application boot trace
init();
