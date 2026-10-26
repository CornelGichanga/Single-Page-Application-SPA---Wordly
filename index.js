const searchForm = document.getElementById("search-form");
const wordInput = document.getElementById("word-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status-message");

const resultsSection = document.getElementById("results-section");
const wordTitle = document.getElementById("word-title");
const phonetic = document.getElementById("phonetic");
const audioButton = document.getElementById("audio-button");

const favoriteButton = document.getElementById("favorite-button");
const definitionsContainer = document.getElementById(
    "definitions-container"
);

const synonymsSection = document.getElementById("synonyms-section");
const synonymsContainer = document.getElementById("synonyms-container");

const sourceLink = document.getElementById("source-link");

const favoritesList = document.getElementById("favorites-list");
const favoritesEmpty = document.getElementById("favorites-empty");
const clearFavoritesButton = document.getElementById("clear-favorites");

const themeToggle = document.getElementById("theme-toggle");

const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

let currentEntry = null;
let currentAudioUrl = "";

let favoriteWords = loadFavorites();

function loadFavorites() {
    try {
        const savedWords = localStorage.getItem("wordly-favorites");
        const parsedWords = savedWords ? JSON.parse(savedWords) : [];

        return Array.isArray(parsedWords)
            ? parsedWords.filter(
                word =>
                    typeof word === "string" &&
                    word.trim().length > 0
            )
            : [];
    } catch (error) {
        console.error("Could not load favorites:", error);
        return [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem(
            "wordly-favorites",
            JSON.stringify(favoriteWords)
        );

        return true;
    } catch (error) {
        console.error("Could not save favorites:", error);

        showStatus(
            "Your browser could not save favorites. Check your storage settings.",
            "error"
        );

        return false;
    }
}

function showStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

async function searchWord(word) {
    const cleanedWord = word.trim();

    if (!cleanedWord) {
        showStatus("Please enter a word to search.", "error");
        wordInput.focus();
        return;
    }

    // Prevent extremely long input and reject obvious URL-like input.
    if (
        cleanedWord.length > 100 ||
        !/^[\p{L}][\p{L}' -]*$/u.test(cleanedWord)
    ) {
        showStatus(
            "Please enter a valid word using letters, spaces, apostrophes, or hyphens.",
            "error"
        );
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Searching...";

    showStatus(`Searching for "${cleanedWord}"...`);

    resultsSection.hidden = true;
    currentEntry = null;
    currentAudioUrl = "";

    audioButton.hidden = true;

    try {
        const response = await fetch(
            API_URL + encodeURIComponent(cleanedWord)
        );

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(
                    `We couldn't find "${cleanedWord}". Check the spelling and try again.`
                );
            }

            throw new Error(
                "The dictionary service is temporarily unavailable. Please try again."
            );
        }

        const data = await response.json();

        if (
            !Array.isArray(data) ||
            data.length === 0 ||
            !data[0].word ||
            !Array.isArray(data[0].meanings) ||
            data[0].meanings.length === 0
        ) {
            throw new Error(
                "No usable dictionary information was returned for this word."
            );
        }

        currentEntry = data[0];

        displayWord(currentEntry);

        resultsSection.hidden = false;

        showStatus(
            `Definition found for "${currentEntry.word}".`,
            "success"
        );

    } catch (error) {
        console.error("Dictionary search failed:", error);

        resultsSection.hidden = true;

        showStatus(
            error instanceof TypeError
                ? "Unable to connect to the dictionary. Check your internet connection and try again."
                : error.message || "Something went wrong. Please try again.",
            "error"
        );

    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search";
    }
}

function displayWord(entry) {
    wordTitle.textContent = entry.word;

    // Find the first available phonetic transcription.
    const phoneticText =
        entry.phonetic ||
        entry.phonetics?.find(item => item.text)?.text ||
        "Pronunciation unavailable";

    phonetic.textContent = phoneticText;

    // Find the first available pronunciation audio.
    const audioItem = entry.phonetics?.find(
        item => item.audio && item.audio.trim() !== ""
    );

    currentAudioUrl = audioItem
        ? audioItem.audio
        : "";

    audioButton.hidden = !currentAudioUrl;

    favoriteButton.classList.toggle(
        "saved",
        isFavorite(entry.word)
    );

    favoriteButton.textContent = isFavorite(entry.word)
        ? "★ Saved to favorites"
        : "☆ Save to favorites";

    displayDefinitions(entry.meanings);
    displaySynonyms(entry.meanings);

    // Use the API-provided source URL when available.
    const source = entry.sourceUrls?.find(
        url => typeof url === "string"
    );

    if (source) {
        sourceLink.href = source;
        sourceLink.textContent = source;
    } else {
        sourceLink.href = "https://dictionaryapi.dev/";
        sourceLink.textContent = "Free Dictionary API";
    }
}


function displayDefinitions(meanings) {
    definitionsContainer.replaceChildren();

    meanings.forEach(meaning => {
        const meaningCard = document.createElement("article");
        meaningCard.className = "meaning-card";

        const heading = document.createElement("h3");
        heading.textContent = "Definition";

        const partOfSpeech = document.createElement("p");
        partOfSpeech.className = "part-of-speech";
        partOfSpeech.textContent = meaning.partOfSpeech || "Other";

        meaningCard.append(heading, partOfSpeech);

        const definitions = meaning.definitions || [];

        definitions.slice(0, 5).forEach((definition, index) => {
            const definitionItem = document.createElement("div");
            definitionItem.className = "definition-item";

            const definitionText = document.createElement("p");
            definitionText.className = "definition-text";
            definitionText.textContent =
                `${index + 1}. ${definition.definition}`;

            definitionItem.appendChild(definitionText);

            if (definition.example) {
                const example = document.createElement("p");
                example.className = "example";
                example.textContent =
                    `Example: "${definition.example}"`;

                definitionItem.appendChild(example);
            }

            meaningCard.appendChild(definitionItem);
        });

        definitionsContainer.appendChild(meaningCard);
    });
}


function displaySynonyms(meanings) {
    synonymsContainer.replaceChildren();

    const synonyms = [
        ...new Set(
            meanings.flatMap(meaning => meaning.synonyms || [])
        )
    ];

    if (synonyms.length === 0) {
        synonymsSection.hidden = true;
        return;
    }

    synonymsSection.hidden = false;

    synonyms.slice(0, 20).forEach(synonym => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "synonym-tag";
        button.textContent = synonym;

        button.addEventListener("click", () => {
            wordInput.value = synonym;
            searchWord(synonym);
        });

        synonymsContainer.appendChild(button);
    });
}

audioButton.addEventListener("click", async () => {
    if (!currentAudioUrl) {
        showStatus(
            "Pronunciation audio is not available for this word.",
            "error"
        );
        return;
    }

    try {
        const audio = new Audio(currentAudioUrl);

        await audio.play();

    } catch (error) {
        console.error("Audio playback failed:", error);

        showStatus(
            "Unable to play pronunciation. Please try again.",
            "error"
        );
    }
});



function isFavorite(word) {
    return favoriteWords.some(
        favorite =>
            favorite.toLowerCase() === word.toLowerCase()
    );
}

favoriteButton.addEventListener("click", () => {
    if (!currentEntry) {
        return;
    }

    const word = currentEntry.word;

    if (isFavorite(word)) {
        favoriteWords = favoriteWords.filter(
            favorite =>
                favorite.toLowerCase() !== word.toLowerCase()
        );

        if (!saveFavorites()) {
            favoriteWords.push(word);
            return;
        }

        showStatus(`"${word}" removed from favorites.`, "success");

    } else {
        favoriteWords.push(word);

        if (!saveFavorites()) {
            favoriteWords.pop();
            return;
        }

        showStatus(`"${word}" added to favorites.`, "success");
    }

    renderFavorites();

    favoriteButton.classList.toggle(
        "saved",
        isFavorite(word)
    );

    favoriteButton.textContent = isFavorite(word)
        ? "★ Saved to favorites"
        : "☆ Save to favorites";
});

function renderFavorites() {
    favoritesList.replaceChildren();

    favoritesEmpty.hidden = favoriteWords.length > 0;

    clearFavoritesButton.hidden = favoriteWords.length === 0;

    favoriteWords.forEach(word => {
        const item = document.createElement("li");
        item.className = "favorite-item";

        const wordButton = document.createElement("button");

        wordButton.type = "button";
        wordButton.className = "favorite-word";
        wordButton.textContent = word;

        wordButton.addEventListener("click", () => {
            wordInput.value = word;
            searchWord(word);

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });

        const removeButton = document.createElement("button");

        removeButton.type = "button";
        removeButton.className = "remove-favorite";
        removeButton.textContent = "✕";
        removeButton.setAttribute(
            "aria-label",
            `Remove ${word} from favorites`
        );

        removeButton.addEventListener("click", () => {
            const previousFavorites = [...favoriteWords];

            favoriteWords = favoriteWords.filter(
                favorite =>
                    favorite.toLowerCase() !== word.toLowerCase()
            );

            if (!saveFavorites()) {
                favoriteWords = previousFavorites;
                return;
            }

            renderFavorites();

            if (currentEntry) {
                favoriteButton.classList.toggle(
                    "saved",
                    isFavorite(currentEntry.word)
                );

                favoriteButton.textContent = isFavorite(
                    currentEntry.word
                )
                    ? "★ Saved to favorites"
                    : "☆ Save to favorites";
            }

            showStatus(
                `"${word}" removed from favorites.`,
                "success"
            );
        });

        item.append(wordButton, removeButton);
        favoritesList.appendChild(item);
    });
}


clearFavoritesButton.addEventListener("click", () => {
    if (favoriteWords.length === 0) {
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to remove all favorite words?"
    );

    if (!confirmed) {
        return;
    }

    const previousFavorites = [...favoriteWords];

    favoriteWords = [];

    if (!saveFavorites()) {
        favoriteWords = previousFavorites;
        return;
    }

    renderFavorites();

    if (currentEntry) {
        favoriteButton.classList.remove("saved");
        favoriteButton.textContent = "☆ Save to favorites";
    }

    showStatus("All favorite words have been cleared.", "success");
});


searchForm.addEventListener("submit", event => {
    event.preventDefault();

    searchWord(wordInput.value);
});


function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark-theme", isDark);

    themeToggle.textContent = isDark
        ? " Light Mode"
        : " Dark Mode";

    themeToggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
    );
}

function loadTheme() {
    try {
        return localStorage.getItem("wordly-theme") === "dark"
            ? "dark"
            : "light";
    } catch (error) {
        return "light";
    }
}

applyTheme(loadTheme());

themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme")
        ? "light"
        : "dark";

    applyTheme(nextTheme);

    try {
        localStorage.setItem("wordly-theme", nextTheme);
    } catch (error) {
        console.error("Could not save theme preference:", error);
    }
});


renderFavorites();