/* Extracted Module Script */

            import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
            import { getDatabase, ref, onDisconnect, set, onValue, push, update, remove, onChildAdded, onChildChanged, onChildRemoved, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

            // --- FIREBASE CONFIGURATION ---
            // IMPORTANTE: REEMPLAZA ESTO CON TUS CLAVES REALES
            const firebaseConfig = {
                apiKey: "API_KEY",
                authDomain: "PROJECT_ID.firebaseapp.com",
                databaseURL: "https://PROJECT_ID.firebaseio.com",
                projectId: "PROJECT_ID",
                storageBucket: "PROJECT_ID.firebasestorage.app",
                messagingSenderId: "SENDER_ID",
                appId: "APP_ID"
            };

            // Initialize Firebase
            const app = initializeApp(firebaseConfig);
            const db = getDatabase(app);

            // --- MESSAGE SERVICE ---
            class MessageService {
                constructor() {
                    this.messagesRef = ref(db, 'messages');
                }

                get currentUserId() {
                    return window.presenceService ? window.presenceService.userId : null;
                }

                sendMessage(text, linkData = null, replyData = null, isAudio = false) {
                    if (!this.currentUserId) return;

                    const newMsgRef = push(this.messagesRef);
                    const msgData = {
                        text: text || '',
                        senderId: this.currentUserId,
                        timestamp: serverTimestamp(),
                        type: isAudio ? 'audio' : 'text',
                        isEdited: false,
                        linkData: linkData || null,
                        replyData: replyData || null
                    };

                    // We don't verify promise here for responsiveness, 
                    // we rely on the listener to update UI (Optimistic UI could be improved later)
                    navigatePromise(set(newMsgRef, msgData));
                }

                editMessage(msgId, newText) {
                    const msgRef = ref(db, `messages/${msgId}`);
                    update(msgRef, {
                        text: newText,
                        isEdited: true
                    });
                }

                deleteMessage(msgId) {
                    const msgRef = ref(db, `messages/${msgId}`);
                    remove(msgRef);
                }

                deleteAllMessages() {
                    const messagesRef = ref(db, 'messages');
                    remove(messagesRef);
                }

                initListeners() {
                    // 1. ADDED
                    onChildAdded(this.messagesRef, (snapshot) => {
                        const id = snapshot.key;
                        const data = snapshot.val();
                        if (!data) return;

                        // Calculate 'sent' or 'received' based on ID
                        const isMine = data.senderId === this.currentUserId;
                        const type = isMine ? 'sent' : 'received';

                        // Call Global UI Render (We need to expose a helper or modify addMessage)
                        // We will call a global exposed function to handle the safe DOM injection
                        if (window.onFirebaseMessageAdded) {
                            window.onFirebaseMessageAdded(id, data, type);
                        }
                    });

                    // 2. CHANGED (Edited)
                    onChildChanged(this.messagesRef, (snapshot) => {
                        const id = snapshot.key;
                        const data = snapshot.val();
                        if (window.onFirebaseMessageChanged) {
                            window.onFirebaseMessageChanged(id, data);
                        }
                    });

                    // 3. REMOVED (Deleted)
                    onChildRemoved(this.messagesRef, (snapshot) => {
                        const id = snapshot.key;
                        if (window.onFirebaseMessageRemoved) {
                            window.onFirebaseMessageRemoved(id);
                        }
                    });
                }
            }

            // Helper to catch errors quietly 
            function navigatePromise(p) { p.catch(e => console.error("Firebase Error:", e)); }

            // --- PRESENCE SERVICE ---
            class PresenceService {
                constructor() {
                    // Generate a random ID if not exists (Simulating Auth)
                    this.userId = localStorage.getItem('chat_user_id');
                    if (!this.userId) {
                        this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
                        localStorage.setItem('chat_user_id', this.userId);
                    }
                    this.userStatusRef = ref(db, '/status/' + this.userId);
                }

                init() {
                    // Manage Online/Offline/Away Presence
                    const connectedRef = ref(db, '.info/connected');
                    onValue(connectedRef, (snap) => {
                        if (snap.val() === true) {
                            const con = onDisconnect(this.userStatusRef);
                            con.set({ state: 'offline', last_changed: serverTimestamp() }).then(() => {
                                this.setOnline();
                            });
                        }
                    });

                    // Listen to Visibility Changes (Tab switch)
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'hidden') {
                            this.setLastActive(); // User left tab
                        } else {
                            this.setOnline();     // User back
                        }
                    });

                    // Initial Active State
                    this.setOnline();
                }

                setOnline() {
                    set(this.userStatusRef, {
                        state: 'online',
                        last_changed: serverTimestamp()
                    });
                }

                setLastActive() {
                    set(this.userStatusRef, {
                        state: 'offline',
                        last_changed: serverTimestamp()
                    });
                }

                setTyping(isTyping) {
                    // Only update if online
                    if (document.visibilityState === 'visible') {
                        set(this.userStatusRef, {
                            state: isTyping ? 'typing' : 'online',
                            last_changed: serverTimestamp()
                        });
                    }
                }

                setRecording(isRecording) {
                    if (document.visibilityState === 'visible') {
                        set(this.userStatusRef, {
                            state: isRecording ? 'recording' : 'online',
                            last_changed: serverTimestamp()
                        });
                    }
                }

                // Listen to OTHER user's status
                listenToPartner(partnerId, updateCallback) {
                    const partnerStatusRef = ref(db, '/status/' + partnerId);
                    onValue(partnerStatusRef, (snapshot) => {
                        const data = snapshot.val();
                        updateCallback(data);
                    });
                }
            }

            // Expose services globally
            window.presenceService = new PresenceService();
            window.presenceService.init();

            window.messageService = new MessageService();
            window.messageService.initListeners();