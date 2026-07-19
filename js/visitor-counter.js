
// Visitor Counter Logic for Ceind Institute

const COUNTER_DOC_REF = 'stats/global';
const DIGIT_HEIGHT = 40; // px, must match CSS
const DIGITS_COUNT = 6;  // Minimum digits

/**
 * Initializes the visitor counters.
 * @param {HTMLElement} viewEl - Element for page views
 * @param {HTMLElement} userEl - Element for unique users
 */
function initVisitorCounters(viewEl, userEl) {
    if (!viewEl || !userEl) return;

    // 1. Initialize DOM structure (000000)
    createSlotMachine(viewEl, DIGITS_COUNT);
    createSlotMachine(userEl, DIGITS_COUNT);

    // 2. Increment Counters (Write to Firestore)
    incrementCounters();

    // 3. Listen for Real-time Updates (Read from Firestore)
    db.collection('stats').doc('global').onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const views = data.page_views || 0;
            const visitors = data.unique_visitors || 0;

            // Update UI with animation
            updateSlotMachine(viewEl, views);
            updateSlotMachine(userEl, visitors);
        } else {
            console.warn("Stats document does not exist. Creating it...");
            // Optional: Auto-create if missing (careful with permissions)
            db.collection('stats').doc('global').set({ page_views: 0, unique_visitors: 0 });
        }
    }, (error) => {
        console.error("Error listening to stats:", error);
    });
}

/**
 * Increments page views and (conditionally) unique visitors.
 */
async function incrementCounters() {
    const statsRef = db.collection('stats').doc('global');
    const visitorKey = 'ceind_visitor_id';
    let isUnique = false;

    // Check LocalStorage for unique visitor ID
    if (!localStorage.getItem(visitorKey)) {
        isUnique = true;
        localStorage.setItem(visitorKey, 'visited_' + Date.now());
    }

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(statsRef);

            if (!doc.exists) {
                transaction.set(statsRef, {
                    page_views: 1,
                    unique_visitors: isUnique ? 1 : 0
                });
            } else {
                const newViews = (doc.data().page_views || 0) + 1;
                const newVisitors = (doc.data().unique_visitors || 0) + (isUnique ? 1 : 0);

                transaction.update(statsRef, {
                    page_views: newViews,
                    unique_visitors: newVisitors
                });
            }
        });
        console.log("Visit recorded. Unique?", isUnique);
    } catch (e) {
        console.error("Failed to increment counters:", e);
    }
}

// --- Animation Logic (Ported from index.html) ---

function createSlotMachine(container, size = DIGITS_COUNT) {
    container.innerHTML = ''; // Clear
    for (let i = 0; i < size; i++) {
        const windowDiv = document.createElement('div');
        windowDiv.className = 'digit-window';

        const strip = document.createElement('div');
        strip.className = 'digit-strip';
        strip.id = `${container.id}-strip-${i}`;

        for (let n = 0; n <= 9; n++) {
            const span = document.createElement('span');
            span.textContent = n;
            strip.appendChild(span);
        }

        windowDiv.appendChild(strip);
        container.appendChild(windowDiv);
    }
}

function updateSlotMachine(container, number) {
    const numStr = number.toString();

    // Auto-expand if number grows beyond current strips
    const currentStrips = container.querySelectorAll('.digit-window').length;
    if (numStr.length > currentStrips) {
        createSlotMachine(container, numStr.length);
    }

    // Pad with leading zeros based on current strips
    // effectively showing 001234
    const targetLength = Math.max(currentStrips, numStr.length);
    const paddedNum = numStr.padStart(targetLength, '0');

    // Animate each strip
    // Note: We need to handle the case where we have MORE strips than digits in number
    // e.g. Strips=6, Num=123. paddedNum="000123". 
    // We iterate 0..5. 

    paddedNum.split('').forEach((digit, index) => {
        // Since we might have rebuilt or we are just updating, finding by ID is safest
        // IF we rebuilt in createSlotMachine, IDs correspond to 0..N

        // HOWEVER: createSlotMachine generates IDs based on index 0 to N.
        // paddedNum is also length N.
        // So index matches perfectly.

        const strip = document.getElementById(`${container.id}-strip-${index}`);
        if (!strip) return;

        const position = digit * DIGIT_HEIGHT;
        strip.style.transform = `translateY(-${position}px)`;
    });
}

// Expose init globally
window.initVisitorCounters = initVisitorCounters;
