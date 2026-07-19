
// Firebase Configuration for Ceind Institute
// Transcribed from user screenshot

const firebaseConfig = {
    apiKey: "AIzaSyBhmx4tjdPD9h_EZKPhREfZxpLHDVTEeUM",
    authDomain: "ceind-institute.firebaseapp.com",
    projectId: "ceind-institute",
    storageBucket: "ceind-institute.firebasestorage.app",
    messagingSenderId: "197134578029",
    appId: "1:197134578029:web:58736d22f00c96a1fcea64",
    measurementId: "G-X0CVRTJBY1"
};

// Initialize Firebase
// Note: We are using the 'compat' libraries in HTML, so 'firebase' is available globally.
let app, auth, db, analytics;

function initFirebaseConfig() {
    if (typeof firebase === 'undefined') {
        console.warn("Firebase not loaded yet, retrying config in 50ms...");
        setTimeout(initFirebaseConfig, 50);
        return;
    }

    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app(); // Already initialized
    }

    auth = firebase.auth();
    db = firebase.firestore();
    console.log("Firestore Initialized");

    try {
        if (firebase.analytics) {
            analytics = firebase.analytics();
            console.log("Analytics Initialized");
        }
    } catch (e) {
        console.warn("Analytics not loaded (optional).", e);
    }

    // Expose to window for Type="module" scripts (like profile-data.js)
    window.app = app;
    window.auth = auth;
    window.db = db;

    // Initialize Storage
    if (firebase.storage) {
        window.storage = firebase.storage();
        console.log("Storage Initialized");
    }

    if (analytics) {
        window.analytics = analytics;
    }

    console.log("Firebase initialized successfully");
}

initFirebaseConfig();

/**
 * Creates a user without logging out the current admin.
 * Uses a temporary secondary app instance.
 */
async function createStudentAccount(email, password, displayName) {
    let secondaryApp;
    try {
        const secondaryAppName = "secondaryApp_" + Date.now();
        secondaryApp = firebase.initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = secondaryApp.auth();

        // 1. Create User in Auth
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;

        // 2. Update Profile (DisplayName)
        await newUser.updateProfile({
            displayName: displayName
        });

        // 3. Create Firestore Document (using the MAIN app's db)
        // We set role: 'student' by default
        await db.collection("users").doc(newUser.uid).set({
            displayName: displayName,
            email: email,
            role: "student",
            createdAt: new Date(),
            gradeAverage: 0 // Default value
        });

        // 4. Sign out from secondary so it doesn't interfere
        await secondaryAuth.signOut();
        return newUser;

    } catch (error) {
        throw error;
    } finally {
        // Cleanup
        if (secondaryApp) secondaryApp.delete();
    }
}
window.createStudentAccount = createStudentAccount;
