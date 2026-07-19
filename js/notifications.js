
// js/notifications.js
// Handles real-time message notifications (badge count & sound)
// Requires: Firebase (auth, firestore) to be initialized globally as window.db, window.auth

function initMessageNotifications() {
    // Wait for DB and Auth
    if (!window.db || !window.auth || !window.auth.currentUser) {
        // Retry if not ready
        setTimeout(initMessageNotifications, 500);
        return;
    }

    const user = window.auth.currentUser;
    const db = window.db;

    console.log("Initializing Message Notifications for user:", user.uid);

    // Listener for unread messages
    // Collection: 'messages'
    // Query: to == user.uid, read == false
    try {
        const q = db.collection('messages')
            .where('to', '==', user.uid)
            .where('read', '==', false);

        let firstLoad = true;

        q.onSnapshot(snapshot => {
            const count = snapshot.size;
            const badge = document.getElementById('msg-counter-badge');

            if (badge) {
                if (count > 0) {
                    badge.innerText = count;
                    badge.style.display = 'inline-block'; // Matches inline style in HTML

                    // Play sound on NEW messages only
                    const hasNewMessages = snapshot.docChanges().some(change => change.type === 'added');
                    if (!firstLoad && hasNewMessages) {
                        playSoundNotification();
                    }
                } else {
                    badge.style.display = 'none';
                }
            } else {
                // If badge not found (e.g. maybe different ID in some files?), try finding by selector
                // const fallbackBadge = document.querySelector('a[href="messages.html"] span:last-child');
                // if (fallbackBadge) { ... }
            }
            firstLoad = false;
        }, error => {
            console.warn("Notification Listener Error:", error);
        });

    } catch (e) {
        console.error("Error setting up message listener:", e);
    }
}

function playSoundNotification() {
    try {
        const audio = new Audio('assets/audio/sonido 2.mp3');
        audio.play().catch(e => {
            console.log("Audio autoplay blocked by browser policy:", e);
        });
    } catch (e) {
        console.error("Error playing sound:", e);
    }
}

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
    // We delay slightly to ensure firebase-config.js has run
    setTimeout(initMessageNotifications, 1000);
});
