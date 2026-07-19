
document.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment for translations to apply
    setTimeout(() => {
        initTypewriter();
    }, 100);
});

function initTypewriter() {
    // Select elements
    const titlePrefix = document.querySelector('[data-i18n="hero_title_prefix"]');
    const titleHighlight = document.querySelector('.hero h1 .highlight');
    const subtitle = document.querySelector('[data-i18n="hero_subtitle"]');

    if (!titlePrefix || !titleHighlight || !subtitle) return;

    // Store original texts
    const text1 = titlePrefix.innerText;
    const text2 = titleHighlight.innerText;
    const text3 = subtitle.innerText;

    // Clear content and make visible (they should be hidden via CSS initially to avoid flash)
    // We will handle visibility by setting text to empty string.
    titlePrefix.innerText = '';
    titleHighlight.innerText = '';
    subtitle.innerText = '';

    // Create cursor element
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.innerHTML = '|';

    // We will append cursor to the active element.

    // Start sequence
    // 1. Type Title Prefix
    titlePrefix.appendChild(cursor);
    typeText(titlePrefix, text1, 50, () => {
        // 2. Type Title Highlight
        cursor.remove();
        titleHighlight.appendChild(cursor);
        // Add a space before if needed? Layout usually handles it.
        typeText(titleHighlight, text2, 80, () => {
            // 3. Type Subtitle
            cursor.remove();
            subtitle.appendChild(cursor);
            typeText(subtitle, text3, 30, () => {
                // Finish
                cursor.classList.add('blinking-infinite');
            });
        });
    });
}

function typeText(element, text, speed, callback) {
    let index = 0;
    // The cursor is expected to be the last child
    const cursor = element.querySelector('.typing-cursor');

    function type() {
        if (index < text.length) {
            // Insert before cursor
            cursor.before(text.charAt(index));
            index++;
            setTimeout(type, speed);
        } else {
            if (callback) callback();
        }
    }

    type();
}
