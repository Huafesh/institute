// import { auth, db } from './firebase-config.js'; // Removed: using window globals
// const auth = window.auth; // Moved inside initProfile
// const db = window.db; // Moved inside initProfile

console.log("Profile Data Script Loaded");

// [OPTIMIZATION] Sync check for instant admin link visibility
(function () {
    const role = localStorage.getItem('role');
    const adminLink = document.getElementById('admin-link');
    if (adminLink && role === 'admin') {
        adminLink.style.display = 'block';
    }
})();

// Wait for Firebase to be exposed by firebase-config.js
let attempts = 0;
function initProfile() {
    // DIAGNOSTIC START
    if (!window.firebase) {
        const errEl = document.getElementById('profile-name-main');
        if (errEl) errEl.innerText = "Error: Librerías Firebase no cargadas.";
        console.error("CRITICAL: window.firebase is undefined. CDN scripts failed to load.");
        return;
    }
    // DIAGNOSTIC END

    if (!window.auth || !window.db) {
        attempts++;
        console.log("Waiting for Firebase globals...", attempts);
        if (attempts > 50) { // 5 seconds timeout
            const errEl = document.getElementById('profile-name-main');
            if (errEl) errEl.innerText = "Error: Configuración fallida.";
            console.error("Firebase libraries loaded, but auth/db globals are missing. Check firebase-config.js");
            return;
        }
        setTimeout(initProfile, 100);
        return;
    }

    const auth = window.auth;
    const db = window.db;

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User detected in Profile:", user.uid);
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    let userData = userDoc.data();

                    // Backfill missing Student ID
                    if (!userData.studentId) {
                        const newId = await generateUniqueStudentId(db);
                        await db.collection('users').doc(user.uid).update({ studentId: newId });
                        userData.studentId = newId;
                    }

                    // SYNC PROFILE: Match logic from activity-data.js
                    const localPhoto = localStorage.getItem('profile_avatar');
                    const shouldUpdate =
                        (!userData.photoURL && (user.photoURL || localPhoto)) ||
                        (!userData.displayName && user.displayName) ||
                        (userData.photoURL !== (user.photoURL || localPhoto));

                    if (shouldUpdate) {
                        // FIX: Prioritize localPhoto (Manual Upload) over Auth/Existing to ensure updates persist
                        const newPhoto = localPhoto || user.photoURL || userData.photoURL || null;
                        const newName = user.displayName || userData.displayName || 'Usuario';
                        /* Only update safe fields here, role usually shouldn't be touched by auto-sync unless missing, 
                           but profile page shouldn't demo "student" override if admin. 
                           Lets just sync visual fields. */

                        await db.collection('users').doc(user.uid).update({
                            displayName: newName,
                            photoURL: newPhoto,
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        });

                        // Update local object
                        userData.displayName = newName;
                        userData.photoURL = newPhoto;
                        console.log("Profile synced with Auth/Local data.");
                    }

                    console.log("User Data Fetched:", userData);
                    populateProfile(userData, user);
                } else {
                    console.log("No user document found in Firestore. Creating basic doc...");

                    const newUniqueId = await generateUniqueStudentId(db);

                    // Auto-healing: create basic doc if missing
                    const basicData = {
                        displayName: user.displayName || 'Usuario Nuevo',
                        email: user.email,
                        role: 'student',
                        studentId: newUniqueId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    await db.collection('users').doc(user.uid).set(basicData);
                    populateProfile(basicData, user);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                const errEl = document.getElementById('profile-name-main');
                if (errEl) errEl.innerText = "Error de conexión";
            }
        } else {
            console.log("No user logged in. Redirecting...");
            // window.location.href = 'index.html'; 
        }
    });
}

// Helper to ensure Unique ID
async function generateUniqueStudentId(db) {
    const year = new Date().getFullYear();
    let isUnique = false;
    let newId = '';

    // Safety loop: try up to 5 times (collision is rare, 5 tries is practically guaranteed)
    for (let i = 0; i < 5; i++) {
        const random = Math.floor(1000 + Math.random() * 9000);
        newId = `${year}${random}`;

        // Check duplication
        const snapshot = await db.collection('users').where('studentId', '==', newId).get();
        if (snapshot.empty) {
            isUnique = true;
            break;
        } else {
            console.warn(`Collision detected for ID ${newId}, retrying...`);
        }
    }

    // Fallback if super unlucky (timestamp based) to avoid infinite loop or failure
    if (!isUnique) {
        newId = `${year}${Date.now().toString().slice(-4)}`;
    }

    return newId;
}

function populateProfile(data, authUser) {
    // Helper to safely set text
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text || '...';
    };

    // 1. Header Info (Prioritize displayName)
    const name = data.displayName || data.fullName || 'Usuario';
    setText('profile-name-main', name);

    // Role Badge Logic
    const roleKey = (data.role || 'student').toLowerCase();
    const roleName = formatRole(roleKey);
    setText('profile-role-badge', roleName);

    // Special Styling for Super Admin
    const roleBadge = document.getElementById('profile-role-badge');
    if (roleBadge) {
        roleBadge.className = 'role-badge'; // Reset
        if (roleKey === 'admin') {
            roleBadge.classList.add('badge-super-admin');
            addLiquidGoldEffect(roleBadge);
        }
    }

    // Logic for Main Profile Avatar (Only on profile.html)
    const avatarContainer = document.getElementById('profile-avatar-display');
    const photo = localStorage.getItem('profile_avatar') || data.photoURL || authUser.photoURL;

    if (avatarContainer) {
        if (photo) {
            avatarContainer.innerText = '';
            avatarContainer.style.backgroundImage = `url('${photo}')`;
            avatarContainer.style.backgroundSize = 'cover';
            avatarContainer.style.backgroundPosition = 'center';
        } else {
            // Generate Initials from Name
            let initials = (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            if (initials === 'undefined') initials = 'U';

            avatarContainer.innerText = initials;
            avatarContainer.style.backgroundImage = 'none';
            avatarContainer.style.backgroundColor = 'var(--secondary-color)';
        }
    }

    // [GLOBAL] Always update sidebar avatars (runs on Dashboard, Institution, etc.)
    const sideAvatars = document.querySelectorAll('.user-avatar-sm');
    sideAvatars.forEach(av => {
        if (photo) {
            av.style.backgroundImage = `url('${photo}')`;
            av.style.backgroundSize = 'cover';
            av.style.backgroundPosition = 'center';
            av.innerText = '';
        } else {
            let initials = (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            if (initials === 'undefined') initials = 'U';
            av.style.backgroundImage = 'none';
            av.innerText = initials;
            av.style.backgroundColor = 'var(--secondary-color)';
        }
    });

    // Sidebar Text Update
    const sideName = document.getElementById('sidebar-user-name');
    const sideSub = document.getElementById('sidebar-user-subtitle');
    const headerGreeting = document.getElementById('header-greeting');

    if (sideName) sideName.innerText = name;

    // [DASHBOARD] Update Header Greeting
    if (headerGreeting) {
        const firstName = name.split(' ')[0];
        headerGreeting.innerText = `Hola, ${firstName} 👋`;
    }

    if (sideSub) {
        const role = data.role || 'student';
        // Reset
        sideSub.className = '';
        sideSub.style.display = 'inline-block'; // Ensure it takes badges nicely

        if (role === 'admin') {
            sideSub.innerText = '👑 SUPER ADMIN';
            sideSub.classList.add('badge-super-admin');
            // Scale down font for sidebar
            sideSub.style.fontSize = '0.7rem';
            sideSub.style.padding = '2px 8px';
            sideSub.style.marginTop = '4px';
            sideSub.style.color = '#FFD700';
            sideSub.style.fontWeight = '900';
            sideSub.style.backgroundColor = '#000'; // Solid Black Capsue
            sideSub.style.border = '1px solid #FFD700'; // Thinner border
            sideSub.style.boxShadow = '0 0 5px rgba(255, 215, 0, 0.3)'; // Softer glow
            sideSub.style.textShadow = '0 2px 4px #000, 0 0 2px #000';
            sideSub.style.borderRadius = '20px'; // Enforce capsule shape
            addLiquidGoldEffect(sideSub);
        } else {
            sideSub.innerText = role === 'student' ? `ID: ${data.studentId || 'Nuevo'}` : formatRole(role);
        }
    }

    // [GLOBAL] Admin Link Visibility
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        if (roleKey === 'admin') {
            adminLink.style.display = 'block';
        } else {
            adminLink.style.display = 'none';
        }
    }

    // 2. Stats
    setText('stat-value-1', data.coursesCount || '0');
    setText('stat-value-2', data.certificatesCount || '0');
    setText('stat-value-3', data.averageGrade || '-');

    // 3. Basic Info Tab
    setText('profile-fullname', name);
    setText('profile-email', data.email || authUser.email);
    setText('profile-student-id', data.studentId || 'No asignado');

    // 4. Additional Info (Optional fields)
    setFieldText('field-sex', data.sex || 'No especificado');
    setFieldText('field-nickname', data.nickname || 'Agregar nombre adicional', !data.nickname);
    setFieldText('field-dob', data.dateOfBirth || 'Agregar fecha', !data.dateOfBirth);
    setFieldText('field-education', data.educationLevel || 'Agregar nivel', !data.educationLevel);

    setFieldText('field-address', data.address || 'Agregar dirección', !data.address);
    setFieldText('field-phone', data.phoneNumber || 'Agregar teléfono', !data.phoneNumber);
    setFieldText('field-fax', data.fax || 'Agregar fax', !data.fax);
    setFieldText('field-company', data.company || 'Agregar empresa', !data.company);
    setFieldText('field-role', data.jobTitle || 'Agregar cargo', !data.jobTitle);

    // 5. Role-Specific UI Adjustments
    const academicTab = document.querySelector('.tab-link[onclick*="academico"]');
    const idLabel = document.querySelector('#student-id-field label');

    if (roleKey === 'admin' || roleKey === 'teacher') {
        if (academicTab) academicTab.style.display = 'none';
        if (idLabel) idLabel.innerText = roleKey === 'admin' ? 'ID de Administrador' : 'ID de Profesor';
    } else {
        if (academicTab) academicTab.style.display = 'block';
        if (idLabel) idLabel.innerText = 'ID de estudiante';
    }
}

function setFieldText(fieldId, text, isPlaceholder = false) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const span = field.querySelector('span');
    if (span) {
        // Only update if content is different to avoid cursor jumps if we were editing (not applicable here but good practice)
        span.innerText = text;
        span.style.color = isPlaceholder ? '#888' : 'var(--text-color)';
    }
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRole(role) {
    const roles = {
        'admin': '👑 Super Admin',
        'student': 'Estudiante',
        'teacher': 'Profesor'
    };
    // ... formatRole function ...
    return roles[role?.toLowerCase()] || capitalize(role);
}

function addLiquidGoldEffect(badge) {
    if (badge.querySelector('canvas')) return; // Already initialized

    // 1. Inject Optimized Filter for Small Scale
    // Only if it doesn't exist yet
    if (!document.getElementById('gold-liquid-small')) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.display = 'none';
        svg.id = 'svg-gold-filter-container';
        svg.innerHTML = `
        <defs>
            <filter id="gold-liquid-small">
                <!-- Reduced stdDeviation from 10 to 2 for smaller scale -->
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
                <feSpecularLighting in="goo" surfaceScale="2" specularConstant="1.2" specularExponent="20" lighting-color="#ffe680" result="specular">
                    <fePointLight x="50%" y="-50" z="50" />
                </feSpecularLighting>
                <feComposite in="specular" in2="goo" operator="in" result="specularOut" />
                <feComposite in="goo" in2="specularOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
        </defs>`;
        document.body.appendChild(svg);
    }

    badge.style.position = 'relative';
    badge.style.overflow = 'hidden';
    // Ensure text is visible on top with a subtle shadow
    badge.innerHTML = `<span style="position:relative; z-index:2; color:inherit; text-shadow:0 2px 4px #000, 0 0 2px #000;">${badge.innerText}</span>`;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '1';
    canvas.style.filter = "url('#gold-liquid-small')";
    badge.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];

    const resizeCanvas = () => {
        if (badge.offsetWidth > 0 && badge.offsetHeight > 0) {
            canvas.width = badge.offsetWidth;
            canvas.height = badge.offsetHeight;
        }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Fix: Trigger resize on hover/interaction for elements that start hidden (like sidebar)
    badge.addEventListener('mouseover', resizeCanvas);
    badge.closest('.sidebar')?.addEventListener('mouseover', () => setTimeout(resizeCanvas, 300)); // Delay for transition


    class MiniDrop {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = -8;
            // Bigger drops relative to the badge height (so they are visible)
            this.size = Math.random() * 4 + 4;
            this.vy = Math.random() * 0.8 + 0.8;
            this.life = 1.0;
            this.onFloor = false;
        }
        update() {
            if (!this.onFloor) {
                this.y += this.vy;
                // Floor collision logic
                if (this.y >= canvas.height - 5) {
                    this.y = canvas.height - 5;
                    this.onFloor = true;
                }
            } else {
                this.life -= 0.02; // Fade out slowly on floor
                this.size += 0.1;  // Spread slightly
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${this.life})`;
            ctx.fill();
        }
    }

    function animate() {
        if (!badge.isConnected) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // High frequency creation
        if (Math.random() < 0.6) {
            particles.push(new MiniDrop());
        }

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
                i--;
            }
        }
        requestAnimationFrame(animate);
    }
    console.log("Super Admin: Starting Optimized Liquid Gold Animation");
    animate();
}

// Start
initProfile();

// --- EDIT MODE LOGIC ---

let isEditing = false;

window.toggleEditMode = function () {
    isEditing = !isEditing;
    const body = document.body;
    const btn = document.getElementById('edit-mode-toggle');

    if (isEditing) {
        body.classList.add('is-editing');
        btn.innerText = 'Listo';
        btn.classList.add('btn-primary');
        const icons = document.querySelectorAll('.edit-icon');
        icons.forEach(i => i.classList.add('blink'));
        setTimeout(() => icons.forEach(i => i.classList.remove('blink')), 1000);
    } else {
        body.classList.remove('is-editing');
        btn.innerText = 'Editar';
    }
};

window.editField = function (containerId) {
    if (!isEditing) return;

    const container = document.getElementById(containerId);
    if (!container || container.classList.contains('editing-active')) return;

    container.classList.add('editing-active');

    const span = container.querySelector('span') || container.querySelector('a');
    let currentVal = span.innerText;
    // Fix: If it's a link, currentVal might be "Add link...". Check dataset or hidden span if available?
    // In profile.html I see <span class="url-hidden">...</span> but it's style display none.
    // Let's try to find it.
    const hiddenUrl = container.querySelector('.url-hidden');
    if (hiddenUrl && hiddenUrl.innerText) {
        currentVal = hiddenUrl.innerText;
    } else if (currentVal.includes('Agregar')) {
        currentVal = '';
    }

    const type = container.dataset.type || 'text';
    container.dataset.original = currentVal;

    let inputHtml = '';

    if (type === 'select') {
        const options = (container.dataset.options || '').split(',');
        let optionsHtml = options.map(opt => `<option value="${opt}" ${opt === currentVal ? 'selected' : ''}>${opt}</option>`).join('');
        inputHtml = `<select class="custom-select">${optionsHtml}</select>`;
    } else if (type === 'date') {
        inputHtml = `<input type="date" class="edit-input" value="${currentVal}">`;
    } else {
        inputHtml = `<input type="text" class="edit-input" value="${currentVal}" placeholder="Ingresa valor...">`;
    }

    container.innerHTML = `
        ${inputHtml}
        <div class="edit-actions">
            <i class="fas fa-check save-btn" onclick="saveField('${containerId}')"></i>
            <i class="fas fa-times cancel-btn" onclick="cancelEdit('${containerId}')"></i>
        </div>
    `;

    const input = container.querySelector('input, select');
    if (input) input.focus();
};

window.cancelEdit = function (containerId) {
    const container = document.getElementById(containerId);
    // Reload profile data to reset (Lazy way) or reconstruct HTML
    // Reconstruct is better for UX
    // But since we rely on "original" which might be stale if we didn't save complex html...
    // Let's just re-call populateProfile if possible? No, populateProfile needs data.
    // Let's reload page logic? No, too jarring.
    // Let's just reconstruct based on type.

    // Simplest: Remove editing-active and call initProfile/populate if we want to be safe?
    // Or just putting back the placeholder.

    // For now, let's just refresh the specific field from Memory if we had a global userData object...
    // We don't have global userData exposed easily. 
    // Let's just reload the page for Cancel? No.

    // Let's use the 'original' text.
    const original = container.dataset.original || 'Agregar...';
    const type = container.dataset.type;

    if (type === 'link') {
        container.innerHTML = `
            <a href="${original}" target="_blank" class="link-display">
                <i class="fas fa-globe"></i> <span class="link-text-truncate">${original || 'Agregar enlace'}</span>
            </a>
            <span class="url-hidden" style="display:none;">${original}</span>
            <i class="fas fa-pencil-alt edit-icon" onclick="editField('${containerId}')"></i>
        `;
    } else {
        container.innerHTML = `
            <span>${original || 'Agregar...'}</span> 
            <i class="fas fa-pencil-alt edit-icon" onclick="editField('${containerId}')"></i>
        `;
    }
    container.classList.remove('editing-active');
};

window.saveField = async function (containerId) {
    const container = document.getElementById(containerId);
    const input = container.querySelector('input, select');
    const newVal = input.value;

    const btn = container.querySelector('.save-btn');
    btn.className = 'fas fa-spinner fa-spin';

    const fieldMap = {
        'field-sex': 'sex',
        'field-nickname': 'nickname',
        'field-dob': 'dateOfBirth',
        'field-education': 'educationLevel',
        'field-website': 'website',
        'field-address': 'address',
        'field-phone': 'phoneNumber',
        'field-fax': 'fax',
        'field-company': 'company',
        'field-role': 'jobTitle',
        'field-department': 'department',
        'link-slot-1': 'link1',
        'link-slot-2': 'link2'
    };

    const dbField = fieldMap[containerId];

    if (dbField) {
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                await window.db.collection('users').doc(user.uid).update({
                    [dbField]: newVal
                });
            }

            // Update UI
            if (container.dataset.type === 'link') {
                container.innerHTML = `
                    <a href="${newVal}" target="_blank" class="link-display">
                        <i class="fas fa-globe"></i> <span class="link-text-truncate">${newVal}</span>
                    </a>
                    <span class="url-hidden" style="display:none;">${newVal}</span>
                    <i class="fas fa-pencil-alt edit-icon" onclick="editField('${containerId}')"></i>
                 `;
            } else {
                container.innerHTML = `
                    <span style="color:var(--text-color)">${newVal}</span> 
                    <i class="fas fa-pencil-alt edit-icon" onclick="editField('${containerId}')"></i>
                `;
            }
            container.classList.remove('editing-active');

        } catch (e) {
            console.error(e);
            alert("Error al guardar: " + e.message);
            // Cancel to restore state
            // cancelEdit(containerId); 
            // Better: stick to edit mode so user can retry
            btn.className = 'fas fa-check save-btn';
        }
    }
};


// --- DEEP SYNC LOGIC (Avatar Propagation) ---
window.syncAvatarToPastPosts = async function (userId, newPhotoURL) {
    if (!userId || !window.db) return;
    console.log("Starting Deep Sync for Avatar...");

    const db = window.db;
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    // Helper to manage batches (limit 500 ops per batch)
    const addOperation = async (ref, data) => {
        currentBatch.update(ref, data);
        operationCount++;
        if (operationCount >= 450) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            operationCount = 0;
        }
    };

    try {
        // 1. Sync Posts
        const postsSnap = await db.collection('posts').where('authorId', '==', userId).get();
        postsSnap.forEach(doc => {
            addOperation(doc.ref, { authorAvatar: newPhotoURL });
        });

        // 2. Sync Comments (using Collection Group)
        // Requires index on 'comments' collection for 'authorId' field usually.
        // If index missing, this might fail in console, but it's essential for this feature.
        const commentsSnap = await db.collectionGroup('comments').where('authorId', '==', userId).get();
        commentsSnap.forEach(doc => {
            addOperation(doc.ref, { authorAvatar: newPhotoURL });
        });

        // Commit final batch
        if (operationCount > 0) batches.push(currentBatch);

        await Promise.all(batches.map(b => b.commit()));
        console.log(`Deep Sync Complete: Updated ${postsSnap.size} posts and ${commentsSnap.size} comments.`);

    } catch (e) {
        console.error("Deep Sync Error:", e);
        // Silent fail is acceptable as this is a background consistency job
    }
};

// --- DYNAMIC ACADEMIC HISTORY ---
// Function loadAcademicHistory is defined in profile-academic.js


// Hook for Academic History
firebase.auth().onAuthStateChanged(user => {
    if (user && window.loadAcademicHistory) {
        console.log('Loading Academic History for', user.uid);
        loadAcademicHistory(user.uid);
    }
});

