
// --- RESOURCE MODAL LOGIC ---
let resParentIndex = null;
let resSelfIndex = null;

function openResourceModal(pIdx, sIdx) {
    resParentIndex = pIdx;
    resSelfIndex = sIdx;

    const lesson = currentCourseData.modules[pIdx].lessons[sIdx];
    document.getElementById('res-modal-subtitle').innerText = `Lección: ${lesson.title}`;

    // Render existing resources
    renderResourceList(lesson.resources || []);

    // Reset inputs
    document.getElementById('res-url-input').value = '';
    document.getElementById('res-name-input').value = '';
    document.getElementById('btn-add-res').innerHTML = 'Agregar Enlace';
    document.getElementById('btn-add-res').disabled = false;

    document.getElementById('resource-modal').style.display = 'flex';
}

function closeResourceModal() {
    document.getElementById('resource-modal').style.display = 'none';
}

// Helper to get icon from URL
function getIconForUrl(url) {
    url = url.toLowerCase();
    if (url.includes('youtube') || url.includes('youtu.be')) return 'fa-youtube';
    if (url.includes('drive.google') || url.includes('docs.google')) return 'fa-google-drive';
    if (url.includes('dropbox')) return 'fa-dropbox';
    if (url.includes('github')) return 'fa-github';
    if (url.includes('.pdf')) return 'fa-file-pdf';
    return 'fa-link';
}

function renderResourceList(resources) {
    const list = document.getElementById('res-list-container');
    list.innerHTML = '';

    if (!resources || resources.length === 0) {
        list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">Sin recursos adjuntos.</div>';
        return;
    }

    resources.forEach((res, index) => {
        const icon = getIconForUrl(res.url); // Use helper
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; padding:10px; border-bottom:1px solid #333; justify-content:space-between;';
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1;">
                <i class="fab ${icon} fa-lg" style="color:var(--secondary-color);"></i> 
                <div>
                    <div style="color:white; font-weight:500;">${res.name}</div>
                    <div style="color:#888; font-size:0.8rem;"> enlace externo <i class="fas fa-external-link-alt" style="font-size:0.7rem;"></i></div>
                </div>
            </div>
            <i class="fas fa-trash" onclick="deleteResource(${index})" style="color:#e74c3c; cursor:pointer; padding:5px;"></i>
        `;
        list.appendChild(item);
    });
}

async function addResourceLink() {
    const urlInput = document.getElementById('res-url-input');
    const nameInput = document.getElementById('res-name-input');
    const btn = document.getElementById('btn-add-res');

    const url = urlInput.value.trim();
    const name = nameInput.value.trim();

    if (!url) return showToast("Ingresa un enlace válido.", 'error');
    if (!name) return showToast("Ingresa un nombre para el recurso.", 'error');

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        const newRes = {
            name: name,
            url: url,
            type: 'link', // Simplified type
            date: new Date().toISOString()
        };

        // Update Local Data
        if (!currentCourseData.modules[resParentIndex].lessons[resSelfIndex].resources) {
            currentCourseData.modules[resParentIndex].lessons[resSelfIndex].resources = [];
        }
        currentCourseData.modules[resParentIndex].lessons[resSelfIndex].resources.push(newRes);

        // Update Firestore
        await db.collection('courses').doc(currentCourseId).set(currentCourseData);

        // Refresh UI
        renderResourceList(currentCourseData.modules[resParentIndex].lessons[resSelfIndex].resources);
        playLesson(currentCourseData.modules[resParentIndex].lessons[resSelfIndex], resParentIndex, resSelfIndex); // Refresh view

        // Reset Inputs
        urlInput.value = '';
        nameInput.value = '';
        showToast("Enlace agregado correctamente.");

    } catch (e) {
        showToast("Error al subir: " + e.message, 'error');
        console.error(e);
    } finally {
        btn.innerHTML = 'Agregar Enlace';
        btn.disabled = false;
    }
}

async function deleteResource(index) {
    if (!await showConfirmModal("¿Eliminar este recurso?")) return;

    // Remove from array
    currentCourseData.modules[resParentIndex].lessons[resSelfIndex].resources.splice(index, 1);

    // Update Firestore
    try {
        await db.collection('courses').doc(currentCourseId).set(currentCourseData);
        renderResourceList(currentCourseData.modules[resParentIndex].lessons[resSelfIndex].resources);
        playLesson(currentCourseData.modules[resParentIndex].lessons[resSelfIndex], resParentIndex, resSelfIndex); // Refresh view
    } catch (e) {
        showToast("Error al eliminar: " + e.message, 'error');
    }
}

// --- QUIZ MODAL LOGIC ---
let quizParentIndex = null;
let quizSelfIndex = null;
let currentQuizQuestions = [];

function openQuizModal(pIdx, sIdx) {
    quizParentIndex = pIdx;
    quizSelfIndex = sIdx;

    const lesson = currentCourseData.modules[pIdx].lessons[sIdx];
    document.getElementById('quiz-modal-subtitle').innerText = `Lección: ${lesson.title}`;

    // Load existing questions or init empty
    currentQuizQuestions = lesson.questions ? JSON.parse(JSON.stringify(lesson.questions)) : [];

    renderQuizBuilder();
    document.getElementById('quiz-modal').style.display = 'flex';
}

function closeQuizModal() {
    document.getElementById('quiz-modal').style.display = 'none';
}

function renderQuizBuilder() {
    const container = document.getElementById('quiz-questions-list');
    container.innerHTML = '';

    currentQuizQuestions.forEach((q, qIndex) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'quiz-builder-item';
        qDiv.style.cssText = 'background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #333;';

        let optionsHtml = '';
        q.options.forEach((opt, oIndex) => {
            const isCorrect = q.correct === oIndex;
            optionsHtml += `
                <div style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
                    <input type="radio" name="q-${qIndex}" ${isCorrect ? 'checked' : ''} onclick="setCorrectOption(${qIndex}, ${oIndex})">
                    <input type="text" value="${opt}" onchange="updateOptionText(${qIndex}, ${oIndex}, this.value)" 
                        style="flex:1; background:#222; border:1px solid ${isCorrect ? '#2ecc71' : '#444'}; padding:5px; color:white; border-radius:4px;">
                    <i class="fas fa-times" onclick="removeOption(${qIndex}, ${oIndex})" style="color:#e74c3c; cursor:pointer;"></i>
                </div>
            `;
        });

        qDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="font-weight:bold;">Pregunta ${qIndex + 1}</span>
                <i class="fas fa-trash" onclick="removeQuestion(${qIndex})" style="color:#e74c3c; cursor:pointer;"></i>
            </div>
            <textarea placeholder="Escribe la pregunta aquí..." onchange="updateQuestionText(${qIndex}, this.value)"
                style="width:100%; height:60px; background:#222; border:1px solid #444; color:white; padding:10px; border-radius:5px; margin-bottom:10px;">${q.text}</textarea>
            
            <div style="margin-left: 20px;">
                ${optionsHtml}
                <button onclick="addOption(${qIndex})" style="margin-top:5px; font-size:0.8rem; background:none; border:1px dashed #666; color:#888; padding:3px 10px; cursor:pointer; border-radius:4px;">+ Añadir Opción</button>
            </div>
        `;
        container.appendChild(qDiv);
    });
}

// Quiz Builder Helpers
function addNewQuestion() {
    currentQuizQuestions.push({
        text: "",
        options: ["Opción A", "Opción B"],
        correct: 0
    });
    renderQuizBuilder();
}
function removeQuestion(idx) {
    if (confirm("¿Borrar pregunta?")) {
        currentQuizQuestions.splice(idx, 1);
        renderQuizBuilder();
    }
}
function updateQuestionText(idx, val) { currentQuizQuestions[idx].text = val; }
function updateOptionText(qIdx, oIdx, val) { currentQuizQuestions[qIdx].options[oIdx] = val; }
function setCorrectOption(qIdx, oIdx) {
    currentQuizQuestions[qIdx].correct = oIdx;
    renderQuizBuilder(); // Re-render to update border colors
}
function addOption(qIdx) {
    currentQuizQuestions[qIdx].options.push("Nueva Opción");
    renderQuizBuilder();
}
function removeOption(qIdx, oIdx) {
    if (currentQuizQuestions[qIdx].options.length <= 2) return alert("Mínimo 2 opciones");
    currentQuizQuestions[qIdx].options.splice(oIdx, 1);
    // Reset correct if it was removed
    if (currentQuizQuestions[qIdx].correct >= currentQuizQuestions[qIdx].options.length) {
        currentQuizQuestions[qIdx].correct = 0;
    }
    renderQuizBuilder();
}

async function saveQuizData() {
    // Basic Validation
    for (let q of currentQuizQuestions) {
        if (!q.text.trim()) return alert("Completa el texto de todas las preguntas.");
    }

    currentCourseData.modules[quizParentIndex].lessons[quizSelfIndex].questions = currentQuizQuestions;

    try {
        await db.collection('courses').doc(currentCourseId).set(currentCourseData);
        showToast("Examen guardado correctamente");
        closeQuizModal();
        playLesson(currentCourseData.modules[quizParentIndex].lessons[quizSelfIndex], quizParentIndex, quizSelfIndex); // Refresh
    } catch (e) {
        showToast("Error guardando: " + e.message, 'error');
    }
}

// --- TAB SWITCHING LOGIC ---
window.switchTab = function (tabId) {
    // 1. Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // 2. Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // 3. Show target tab content
    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.classList.add('active');

    // 4. Activate target button (find by onclick attribute to be safe)
    const targetBtn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if (targetBtn) targetBtn.classList.add('active');
};

let currentCourseId = null;
let currentCourseData = null;
window.currentUserProgress = { completedLessons: [] }; // Init empty


document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Check
    const urlParams = new URLSearchParams(window.location.search);
    currentCourseId = urlParams.get('id') || 'english';

    // 2. Auth State & Role Check
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            checkAdminRole(user.uid);
            loadUserProgress(user.uid); // Load progress
        }
        
        // 3. Load Data ONLY AFTER auth state is resolved!
        loadCmsCourseData();
    });
});

async function checkAdminRole(uid) {
    const role = localStorage.getItem('role'); // Quick check
    // In a real app, verify with ID Token claims or DB
    if (role === 'admin' || role === 'teacher') {
        enableAdminMode();
    }
}

function enableAdminMode() {
    console.log("Admin Mode Enabled");
    // Show Add Module Button
    const btn = document.getElementById('btn-add-module');
    if (btn) btn.style.display = 'block';

    // We will re-render the sidebar to inject Edit/Delete icons
    // But since render happens after data load, we rely on a flag
    window.isAdmin = true;
    renderSidebarWithAdminControls();
}

// Override/Extend the rendering logic
async function loadCmsCourseData() {
    if (!db) return;

    try {
        const doc = await db.collection('courses').doc(currentCourseId).get();
        if (!doc.exists) {
            console.warn("Course not found in DB, using empty template.");
            currentCourseData = {
                title: "Nuevo Curso",
                description: "Curso vacío generado automáticamente.",
                modules: []
            };
        } else {
            currentCourseData = doc.data();
        }

        // MIGRATION: Ensure all lessons have Unique IDs
        let changesMade = false;
        if (currentCourseData.modules) {
            currentCourseData.modules.forEach(mod => {
                if (mod.lessons) {
                    mod.lessons.forEach(l => {
                        if (!l.id) {
                            l.id = generateShortId(); // Assign unique ID
                            changesMade = true;
                        }
                    });
                }
            });
        }

        if (changesMade) {
            console.log("Migrating course to use Unique IDs...");
            await db.collection('courses').doc(currentCourseId).set(currentCourseData);
        }

        // Initial Render
        renderSidebarWithAdminControls();

        // 4. Auto-Play First Lesson
        // 4. Auto-Play First Lesson OR Show Empty State
        let hasContent = false;
        if (currentCourseData.modules && currentCourseData.modules.length > 0) {
            // Find first module with lessons
            for (let i = 0; i < currentCourseData.modules.length; i++) {
                const mod = currentCourseData.modules[i];
                if (mod.lessons && mod.lessons.length > 0) {
                    playLesson(mod.lessons[0], i, 0); // Play first lesson
                    hasContent = true;
                    break;
                }
            }
        }

        if (!hasContent) {
            // SHOW EMPTY COURSE STATE
            const vidContainer = document.querySelector('.video-container');
            vidContainer.style.background = '#111';
            // Important: Maintain aspect ratio logic (from class) but ensure content is centered via absolute overlay
            vidContainer.innerHTML = `
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: white; padding: 20px;">
                    <i class="fas fa-graduation-cap" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.5;"></i>
                    <h2>Bienvenido al Curso</h2>
                    <p style="color: #aaa; margin-top: 10px; max-width: 400px;">${window.isAdmin ? 'Este curso está vacío. ¡Empieza creando tu primer módulo!' : 'El instructor aún no ha publicado contenido.'}</p>
                    ${window.isAdmin ? `
                        <button onclick="openCmsModal('module', 'add')" style="margin-top:20px; padding:12px 25px; background:var(--secondary-color); color:white; border:none; border-radius:30px; font-weight:bold; cursor:pointer; font-size:1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                            <i class="fas fa-plus"></i> Crear Primer Módulo
                        </button>
                    ` : ''}
                </div>
            `;

            // Also clear titles to avoid "..."
            document.getElementById('video-title').textContent = currentCourseData.title || "Nuevo Curso";
            document.getElementById('breadcrumbs').textContent = "Inicio";
            document.getElementById('main-lesson-title').textContent = "Introducción";

            // Allow admin to see add button in sidebar
            if (window.isAdmin) {
                const btn = document.getElementById('btn-add-module');
                if (btn) btn.style.display = 'block';
            }

            // HIDE NAVIGATION BUTTONS
            const infoBar = document.querySelector('.lesson-info-bar');
            if (infoBar) infoBar.style.display = 'none';

        } else {
            // Ensure it's visible if there is content (in case of re-render)
            const infoBar = document.querySelector('.lesson-info-bar');
            if (infoBar) infoBar.style.display = 'flex';
        }

    } catch (e) {
        console.error("Error loading course:", e);
        const vidContainer = document.querySelector('.video-container');
        if (vidContainer) {
            vidContainer.style.background = '#111';
            vidContainer.innerHTML = `
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: white; padding: 20px;">
                    <i class="fas fa-lock" style="font-size: 3rem; margin-bottom: 15px; color: #ff6b6b;"></i>
                    <h2 style="color: #ff6b6b;">Acceso Denegado</h2>
                    <p style="color: #ccc; margin-top: 10px; max-width: 400px;">No se pudo cargar el curso. Es probable que necesites iniciar sesión con una cuenta autorizada para ver este contenido.</p>
                </div>
            `;
        }
        document.getElementById('video-title').textContent = "Error de Acceso";
    }
}

function renderSidebarWithAdminControls() {
    const container = document.getElementById('syllabus-container');
    if (!container || !currentCourseData) return;

    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const modules = currentCourseData.modules || [];

    modules.forEach((mod, modIndex) => {
        // Module Item
        const modDiv = document.createElement('div');
        modDiv.className = 'module-item';

        // Admin Controls for Module
        let adminControls = '';
        if (window.isAdmin) {
            adminControls = `
                <div class="cms-controls" style="margin-left: auto; display: flex; gap: 8px;">
                     <i class="fas fa-edit" onclick="event.stopPropagation(); openCmsModal('module', 'edit', ${modIndex})" title="Editar Nombre" style="color: #f1c40f; cursor: pointer;"></i>
                     <i class="fas fa-trash" onclick="event.stopPropagation(); deleteItem('module', ${modIndex})" title="Borrar Módulo" style="color: #e74c3c; cursor: pointer;"></i>
                </div>
            `;
        }

        modDiv.innerHTML = `
            <div class="module-title" onclick="toggleModule(${modIndex})" style="display:flex; align-items:center; cursor: pointer;">
                <i id="chevron-${modIndex}" class="fas fa-chevron-down" style="margin-right: 10px; transition: transform 0.3s;"></i>
                <span style="flex:1; font-weight:600;">${mod.title}</span>
                ${adminControls}
            </div>
            <div class="lesson-list" id="mod-list-${modIndex}" style="display: block; transition: all 0.3s ease;"></div>
        `;

        const listContainer = modDiv.querySelector(`.lesson-list`);

        // IF ADMIN: Add "New Lesson" button inside module
        if (window.isAdmin) {
            const addLessonBtn = document.createElement('div');
            addLessonBtn.style.padding = '10px 20px';
            addLessonBtn.style.textAlign = 'center';
            addLessonBtn.innerHTML = `<button onclick="openCmsModal('lesson', 'add', ${modIndex})" style="font-size:0.8rem; padding: 5px 10px; cursor: pointer; background:none; border: 1px dashed #aaa; border-radius: 5px; color:#666;">+ Agregar Lección</button>`;
            listContainer.appendChild(addLessonBtn);
        }

        // Render Lessons
        const lessons = mod.lessons || [];

        // Insert lessons
        lessons.forEach((less, lessIndex) => {
            const lDiv = document.createElement('div');
            lDiv.className = 'lesson-item';

            let lessonAdminControls = '';
            if (window.isAdmin) {
                lessonAdminControls = `
                    <div style="margin-left:auto; display:flex; gap:8px;">
                        <i class="fas fa-edit" onclick="event.stopPropagation(); openCmsModal('lesson', 'edit', ${modIndex}, ${lessIndex})" style="color: #aaa; cursor: pointer;"></i>
                        <i class="fas fa-trash" onclick="event.stopPropagation(); deleteItem('lesson', ${modIndex}, ${lessIndex})" style="color: #ff6b6b; cursor: pointer;"></i>
                    </div>
                `;
            }

            lDiv.id = `lesson-item-${modIndex}-${lessIndex}`; // Keep ID for sidebar selection

            // Check Completion
            const lessonId = less.id; // UUID
            const isCompleted = window.currentUserProgress.completedLessons.includes(lessonId);

            lDiv.innerHTML = `
                <div class="l-status"><i class="${isCompleted ? 'fas fa-check-circle' : 'far fa-circle'}" style="${isCompleted ? 'color:#2ecc71' : ''}"></i></div>
                <div class="l-info">
                    <span class="l-title">${less.title}</span>
                    <span class="l-duration">${less.duration || '? min'}</span>
                </div>
                ${lessonAdminControls}
            `;

            lDiv.onclick = (e) => {
                if (e.target.tagName === 'I') return;
                playLesson(less, modIndex, lessIndex);
            };

            if (window.isAdmin) {
                listContainer.insertBefore(lDiv, listContainer.lastChild); // Insert before Add button
            } else {
                listContainer.appendChild(lDiv);
            }
        });

        fragment.appendChild(modDiv);
    });

    container.appendChild(fragment);
}

function toggleModule(index) {
    const list = document.getElementById(`mod-list-${index}`);
    const chevron = document.getElementById(`chevron-${index}`);

    if (list.style.display === 'none') {
        list.style.display = 'block';
        chevron.style.transform = 'rotate(0deg)';
    } else {
        list.style.display = 'none';
        chevron.style.transform = 'rotate(-90deg)';
    }
}

// --- CMS MODAL LOGIC ---
const modal = document.getElementById('cms-modal');
const form = document.getElementById('cms-form');

function openCmsModal(type, action, parentIndex, selfIndex) {
    modal.style.display = 'flex';
    document.getElementById('cms-edit-type').value = type;
    document.getElementById('cms-edit-action').value = action;
    document.getElementById('cms-parent-index').value = parentIndex;
    if (typeof selfIndex !== 'undefined') document.getElementById('cms-self-index').value = selfIndex;

    const titleField = document.getElementById('cms-field-title');
    const lessonFields = document.getElementById('cms-lesson-fields');

    // Reset fields
    titleField.value = '';
    document.getElementById('cms-field-video').value = '';
    document.getElementById('cms-field-desc').value = '';
    document.getElementById('cms-video-file').value = '';
    document.getElementById('video-preview-msg').innerText = '';



    if (type === 'module') {
        lessonFields.style.display = 'none';
        document.getElementById('cms-modal-title').innerText = action === 'add' ? 'Nuevo Módulo' : 'Editar Módulo';
        if (action === 'edit') {
            titleField.value = currentCourseData.modules[parentIndex].title;
        }
    } else {
        lessonFields.style.display = 'block';
        document.getElementById('cms-modal-title').innerText = action === 'add' ? 'Nueva Lección' : 'Editar Lección';

        // Default to video
        document.getElementById('cms-field-type').value = 'video';

        if (action === 'edit') {
            const lesson = currentCourseData.modules[parentIndex].lessons[selfIndex];
            titleField.value = lesson.title;
            document.getElementById('cms-field-video').value = lesson.videoUrl || '';
            document.getElementById('cms-field-desc').value = lesson.description || '';

            // Set Type
            if (lesson.type) {
                document.getElementById('cms-field-type').value = lesson.type;
            }
        }
        toggleCmsFields();
    }
}

function closeCmsModal() {
    modal.style.display = 'none';
}

function toggleCmsFields() {
    const type = document.getElementById('cms-field-type').value;
    const vidSection = document.getElementById('cms-video-section');

    if (type === 'quiz') {
        vidSection.style.display = 'none';
    } else {
        // Video OR PDF (Document)
        vidSection.style.display = 'block';

        // Update label dynamically for better UX
        const label = vidSection.querySelector('label'); // First label (Video)
        const dropZone = document.getElementById('cms-drop-zone');
        const urlLabel = vidSection.querySelectorAll('label')[1]; // Second label (O URL Externa)

        if (type === 'pdf') {
            if (label) label.innerText = 'Documento';
            if (dropZone) dropZone.style.display = 'none';
            if (urlLabel) urlLabel.innerText = 'Enlace público del PDF (Drive / Dropbox):';
        } else {
            if (label) label.innerText = 'Video';
            // User requested to hide upload for everything since they don't have Storage
            if (dropZone) dropZone.style.display = 'none';
            if (urlLabel) urlLabel.innerText = 'URL del Video (YouTube / Vimeo / Drive):';

            const dropMsg = dropZone.querySelector('p');
            // if(dropMsg) dropMsg.innerText = 'Arrastra un video (Max 50MB) o usa la URL';
        }
    }
}

// --- SAVE FORM ---
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent reload

    const type = document.getElementById('cms-edit-type').value;
    const action = document.getElementById('cms-edit-action').value;
    const pIndex = parseInt(document.getElementById('cms-parent-index').value);
    const sIndex = document.getElementById('cms-self-index').value ? parseInt(document.getElementById('cms-self-index').value) : null;

    const title = document.getElementById('cms-field-title').value;

    const btn = document.getElementById('cms-btn-save');
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        let videoUrl = document.getElementById('cms-field-video').value;
        const desc = document.getElementById('cms-field-desc').value;
        const fileInput = document.getElementById('cms-video-file');

        // Type Logic
        const contentType = document.getElementById('cms-field-type').value; // 'video' or 'quiz'

        // VIDEO/FILE UPLOAD LOGIC
        if (type === 'lesson' && contentType === 'video' && fileInput.files.length > 0) {
            const file = fileInput.files[0];

            // Validation (50MB Limit)
            if (file.size > 50 * 1024 * 1024) throw new Error("El archivo es muy grande (Max 50MB)");

            // Determine Extension
            const fileExt = file.name.split('.').pop().toLowerCase();
            const validVideoExts = ['mp4', 'mov', 'webm', 'avi'];
            const validDocExts = ['pdf'];

            // Optional: Validate type if needed, but for now let's allow upload.

            // Path with CORRECT extension
            const path = `course_videos/${currentCourseId}/${Date.now()}_file.${fileExt}`;
            const ref = storage.ref().child(path);

            btn.innerHTML = 'Subiendo Archivo...';

            try {
                // Put with metadata could help if rules check content-type
                const snapshot = await ref.put(file, { contentType: file.type });
                videoUrl = await snapshot.ref.getDownloadURL();
            } catch (err) {
                console.error("Upload Error:", err);
                alert("Error subiendo archivo: " + err.message);
                // Reset button state
                btn.innerHTML = 'Guardar';
                btn.disabled = false;
                return;
            }

            // Auto-correct contentType if it's a PDF
            if (fileExt === 'pdf') {
                // If the user selected "video" but uploaded a PDF, let's keep it as "video" 
                // in the form but the URL will have .pdf, which playLesson handles.
                // Or better, we could update the 'type' field in the saved object later?
                // For now, let's trust playLesson's detection.
            }
        }

        // UPDATE DATA STRUCTURE
        const cleanData = currentCourseData; // Reference

        if (type === 'module') {
            if (action === 'add') {
                if (!cleanData.modules) cleanData.modules = [];
                cleanData.modules.push({ title: title, lessons: [] });
            } else {
                cleanData.modules[pIndex].title = title;
            }
        } else {
            // Lesson
            if (action === 'add') {
                if (!cleanData.modules[pIndex].lessons) cleanData.modules[pIndex].lessons = [];

                const newLesson = {
                    id: generateShortId(), // Unique ID
                    title: title,
                    type: contentType,
                    videoUrl: (contentType === 'video' || contentType === 'pdf') ? videoUrl : null,
                    description: desc,
                    duration: contentType === 'quiz' ? "Examen" : "0:30 min", // Placeholder
                    resources: [],
                    questions: [] // Init for exams
                };

                cleanData.modules[pIndex].lessons.push(newLesson);

            } else {
                const l = cleanData.modules[pIndex].lessons[sIndex];
                l.title = title;
                l.type = contentType;

                if (contentType === 'video' || contentType === 'pdf') {
                    if (videoUrl) l.videoUrl = videoUrl;
                } else {
                    l.videoUrl = null; // Clear video if switched to quiz
                    if (!l.questions) l.questions = [];
                    l.duration = "Examen";
                }

                l.description = desc;
            }
        }

        // PERSIST TO FIRESTORE
        await db.collection('courses').doc(currentCourseId).update(cleanData);

        // Refresh
        // Refresh
        closeCmsModal();
        renderSidebarWithAdminControls();
        showToast("Guardado correctamente");

        // Refresh player view if we just edited the current lesson
        if (type === 'lesson' && sIndex !== null) {
            playLesson(currentCourseData.modules[pIndex].lessons[sIndex], pIndex, sIndex);
        }

    } catch (e) {
        showToast("Error: " + e.message, 'error');
        console.error(e);
    } finally {
        btn.innerHTML = 'Guardar';
        btn.disabled = false;
    }
});

// --- DELETE ---
// --- DELETE ---
async function deleteItem(type, pIndex, sIndex) {
    const msg = type === 'module' ? "¿Seguro? Se borrarán todas las lecciones de este módulo." : "¿Borrar esta lección?";

    const confirmed = await showConfirmModal(msg);
    if (!confirmed) return;

    const cleanData = currentCourseData;

    if (type === 'module') {
        cleanData.modules.splice(pIndex, 1);
    } else {
        cleanData.modules[pIndex].lessons.splice(sIndex, 1);
    }

    try {
        await db.collection('courses').doc(currentCourseId).set(cleanData); // Use Set to overwrite
        renderSidebarWithAdminControls();
    } catch (e) {
        alert("Error borrando: " + e.message);
    }
}

// --- PLAY LESSON LOGIC ---
async function playLesson(lesson, modIdx, lessIdx) {
    if (!lesson) return;

    console.log("Playing:", lesson.title);

    // 1. Update Titles
    const vidTitle = document.getElementById('video-title');
    const bread = document.getElementById('lesson-breadcrumbs');
    const mainTitle = document.getElementById('lesson-main-title');

    // GLOBAL CONTEXT FOR Q&A & NAVIGATION
    window.currentLessonContext = { modIdx, lessIdx };
    window.currentModIndex = modIdx;
    window.currentLessIndex = lessIdx;

    // If Q&A tab is active, reload comments for this new lesson
    if (document.getElementById('qa').classList.contains('active')) {
        loadLessonComments();
    }

    if (vidTitle) vidTitle.textContent = lesson.title;
    if (bread) bread.textContent = `Módulo > ${lesson.title}`;
    if (mainTitle) mainTitle.textContent = lesson.title;

    // UPDATE COMPLETE BUTTON STATE
    const btnComplete = document.getElementById('btn-complete');
    if (btnComplete) {
        // Find current lesson object to get ID
        const lessonObj = currentCourseData.modules[modIdx].lessons[lessIdx];
        const lessonId = lessonObj.id; // USE UUID

        const isCompleted = window.currentUserProgress && window.currentUserProgress.completedLessons.includes(lessonId);
        if (isCompleted) {
            btnComplete.classList.add('completed');
            btnComplete.innerHTML = 'Completado <i class="fas fa-check-double"></i>';
            btnComplete.style.background = '#27ae60';
        } else {
            btnComplete.classList.remove('completed');
            btnComplete.innerHTML = 'Completar <i class="fas fa-check"></i>';
            btnComplete.style.background = '#2ecc71';
        }
    }

    // 2. Update Video Player / Quiz Interface
    const vidContainer = document.querySelector('.video-container');

    // Check if it's a quiz
    if (lesson.type === 'quiz') {
        // Fix Layout for Quiz: Remove 16:9 aspect ratio constraint and black background
        vidContainer.style.paddingTop = '0';
        vidContainer.style.height = 'auto'; // Allow content to dictate height
        vidContainer.style.minHeight = '85vh'; // Minimum height for presence
        vidContainer.style.background = 'transparent'; // Remove black background
        vidContainer.innerHTML = ''; // Clear previous content
        await renderQuizPlayer(lesson, vidContainer, modIdx, lessIdx);
    }
    else {
        // Restore Layout for Video (or Placeholder)
        vidContainer.style.paddingTop = '56.25%';
        vidContainer.style.height = 'auto';
        vidContainer.style.background = '#000'; // Restore black background for cinema feel

        if (lesson.videoUrl && (lesson.videoUrl.endsWith('.mp4') || lesson.videoUrl.includes('firebasestorage'))) {
            // Check for PDF or Video
            if (lesson.videoUrl.toLowerCase().includes('.pdf')) {
                // PDF RENDERER (Iframe)
                vidContainer.innerHTML = `
                    <iframe src="${lesson.videoUrl}" style="width: 100%; height: 100%; position:absolute; top:0; left:0; border:none; background:white;"></iframe>
                 `;
            } else {
                // Simple HTML5 Video Implementation
                vidContainer.innerHTML = `
                <video controls autoplay style="width: 100%; height: 100%; position:absolute; top:0; left:0; background: black; border-radius: 12px;">
                    <source src="${lesson.videoUrl}" type="video/mp4">
                    Tu navegador no soporta videos.
                </video>
            `;
            }
        } else if (lesson.videoUrl && lesson.videoUrl.includes('youtube')) {
            // Basic YouTube Embed support
            const videoId = lesson.videoUrl.split('v=')[1];
            vidContainer.innerHTML = `
            <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; border-radius: 12px;"></iframe>
         `;
        } else if (lesson.type === 'pdf' || (lesson.videoUrl && lesson.videoUrl.toLowerCase().includes('.pdf')) || (lesson.videoUrl && (lesson.videoUrl.includes('drive.google') || lesson.videoUrl.includes('dropbox')))) {
            // Fallback for PDF type explicit OR detected Drive/Dropbox links
            let embedUrl = lesson.videoUrl;

            // Smart Convert Google Drive View -> Preview
            if (embedUrl.includes('drive.google.com') && embedUrl.includes('/view')) {
                embedUrl = embedUrl.replace('/view', '/preview');
            }

            // Smart Convert Dropbox -> Raw/Embed
            if (embedUrl.includes('dropbox.com') && !embedUrl.includes('raw=1')) {
                // dl=0 -> raw=1 for direct rendering if possible, but for PDF preview usually we want the viewer? 
                // Dropbox embed logic: change 'www.dropbox.com' to 'www.dropbox.com/home...?preview=...' or just dl=0 might block iframe.
                // Better strategy for Dropbox: replace 'www.dropbox.com' with 'dl.dropboxusercontent.com' for direct render 
                // OR append raw=1. Let's try raw=1 which acts as direct file.
                if (embedUrl.includes('?')) embedUrl += '&raw=1';
                else embedUrl += '?raw=1';
            }

            vidContainer.innerHTML = `
                    <iframe src="${embedUrl}" style="width: 100%; height: 100%; position:absolute; top:0; left:0; border:none; background:white;"></iframe>
                 `;
        } else if (lesson.videoUrl && lesson.videoUrl.trim() !== "") {
            // Universal Fallback: If it has a URL but didn't match above, try to embed it as iframe
            // This covers generic websites, SlideShare, etc.
            vidContainer.innerHTML = `
                <iframe src="${lesson.videoUrl}" style="width: 100%; height: 100%; position:absolute; top:0; left:0; border:none; background:white;"></iframe>
             `;
        } else {
            // Reset to placeholder (Only if URL is empty or null)
            vidContainer.innerHTML = `
            <div class="video-placeholder">
                <div class="play-btn-lg">
                    <i class="fas fa-play" style="margin-left: 5px; color: white;"></i>
                </div>
                <h2 style="margin-top: 20px;" id="video-title">${lesson.title}</h2>
                <p>Sin contenido asignado</p>
                ${window.isAdmin ? `<button onclick="openCmsModal('lesson', 'edit', ${modIdx}, ${lessIdx})" style="margin-top:10px; background:var(--primary-color); border:none; color:white; padding:5px 15px; border-radius:4px; cursor:pointer;">Asignar Contenido</button>` : ''}
            </div>
        `;
        }
    }

    // 3. Update Overview

    const overview = document.getElementById('overview');
    if (overview) {
        overview.innerHTML = `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 15px; color: var(--text-color);">Descripción</h3>

                <p style="color: #888; line-height: 1.6;">${lesson.description || "Sin descripción disponible para esta lección."}</p>
            </div>
        `;
    }

    // 4. Update Resources Tab
    const resTab = document.getElementById('resources');
    const resBtn = document.querySelector('button[onclick="switchTab(\'resources\')"]');

    if (resTab) {
        // Admin Shortcut Button
        let adminBtnHtml = '';
        if (window.isAdmin && typeof modIdx !== 'undefined') {
            adminBtnHtml = `
                <div style="margin-bottom: 20px; text-align: right;">
                    <button onclick="openResourceModal(${modIdx}, ${lessIdx})" 
                        style="background: var(--primary-color); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 0.9rem;">
                        <i class="fas fa-plus"></i> Gestionar Recursos
                    </button>
                </div>
            `;
        }

        if (!lesson.resources || lesson.resources.length === 0) {
            resTab.innerHTML = `
                <div style="padding: 20px;">
                    ${adminBtnHtml}
                    <div style="text-align: center; padding: 20px; color: #888;">
                        <i class="far fa-folder-open" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <p>No hay recursos adjuntos para esta lección.</p>
                    </div>
                </div>
            `;
            const countBadge = document.getElementById('resources-tab-count');
            if (countBadge) countBadge.innerText = '';
        } else {
            const countBadge = document.getElementById('resources-tab-count');
            if (countBadge) countBadge.innerText = `(${lesson.resources.length})`;

            let resHtml = `<div style="padding: 20px;">${adminBtnHtml}<div style="display: grid; gap: 10px;">`;

            lesson.resources.forEach(res => {
                // Use the same helper as modal for consistency
                let iconClass = getIconForUrl(res.url || '');
                // Strip 'fa-' prefix if logic adds it, but getIconForUrl returns full class e.g. 'fa-youtube'
                // However, the HTML below uses `far ${iconClass}` or `fas`.
                // getIconForUrl returns 'fa-youtube', 'fa-google-drive' etc. which are brands (fab) or solid (fas).
                // Let's adjust helper usage or HTML.

                // Better approach: Let's trust the helper but we need to handle the prefix in HTML
                // getIconForUrl returns e.g. 'fa-youtube'. 
                // We should use class="fab fa-youtube" or class="fas fa-link".
                // Simplification: just use 'fas' or 'fab' dynamically? 
                // For now, let's keep it simple.

                // Wait, getIconForUrl is not defined in this scope? It is global in file.
                // Let's reuse the logic but safer.

                let icon = 'fa-link';
                // Quick duplicate logic to ensure it works inside this function scope if helper is effectively global
                const u = (res.url || '').toLowerCase();
                if (u.includes('youtube') || u.includes('youtu.be')) icon = 'fa-youtube';
                else if (u.includes('drive') || u.includes('docs')) icon = 'fa-google-drive';
                else if (u.includes('dropbox')) icon = 'fa-dropbox';
                else if (u.includes('github')) icon = 'fa-github';
                else if (u.includes('.pdf')) icon = 'fa-file-pdf';

                // Determine prefix (brands vs solid)
                let prefix = (icon.includes('google') || icon.includes('youtube') || icon.includes('dropbox') || icon.includes('github')) ? 'fab' : 'fas';

                resHtml += `
                    <div style="display: flex; align-items: center; padding: 15px; background: var(--bg-card); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s; cursor: pointer;" 
                         onclick="window.open('${res.url}', '_blank')"
                         onmouseover="this.style.background='rgba(255,255,255,0.05)'" 
                         onmouseout="this.style.background='var(--bg-card)'">
                        
                        <div style="width: 40px; height: 40px; background: rgba(52, 152, 219, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <i class="${prefix} ${icon}" style="color: #3498db; font-size: 1.2rem;"></i>
                        </div>
                        
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--text-color); margin-bottom: 2px;">${res.name}</div>
                            <div style="font-size: 0.8rem; color: #888;">${new Date(res.date).toLocaleDateString()}</div>
                        </div>

                        <!-- Download icon removed -->
                    </div>
                `;
            });

            resHtml += `</div></div>`;
            resTab.innerHTML = resHtml;
        }
    }

    // 5. Update Sidebar Active State
    document.querySelectorAll('.lesson-item').forEach(el => el.classList.remove('active'));
}

// --- QUIZ PLAYER LOGIC ---
async function renderQuizPlayer(lesson, container, modIdx, lessIdx) {
    const user = firebase.auth().currentUser;
    // Helper to get admin button
    const getAdminBtn = () => window.isAdmin ? `
        <button onclick="openQuizModal(${modIdx}, ${lessIdx})" style="background:none; border:1px solid #eba417; color:#eba417; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fas fa-tools"></i> Editar</button>
    ` : '';

    // 1. Initial Loading State
    container.innerHTML = `
        <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background: var(--bg-card); border-radius:12px;">
            <div style="text-align:center;">
                <i class="fas fa-circle-notch fa-spin" style="font-size:2rem; color:var(--primary-color);"></i>
                <p style="margin-top:10px; color:var(--text-color);">Cargando examen...</p>
            </div>
        </div>
    `;

    // 2. Fetch Progress (if logged in)
    let attempts = 0;
    let bestScore = 0;
    let isLocked = false;

    if (user) {
        try {
            const doc = await db.collection('users').doc(user.uid).collection('quiz_progress').doc(lesson.id).get();
            if (doc.exists) {
                const d = doc.data();
                attempts = d.attempts || 0;
                bestScore = d.bestScore || 0;
            }
        } catch (e) {
            console.error("Error fetching quiz progress", e);
        }
    }

    if (attempts >= 2 && !window.isAdmin) { // Admins bypass lock
        isLocked = true;
    }

    // 3. Render Content
    if (!lesson.questions || lesson.questions.length === 0) {
        container.innerHTML = `
            <div class="video-placeholder" style="flex-direction: column; justify-content: center; background: var(--bg-card); border: 2px dashed rgba(136, 136, 136, 0.2);">
                <i class="fas fa-pencil-alt" style="font-size: 3rem; color: var(--text-color); margin-bottom: 20px; opacity: 0.5;"></i>
                <h2 style="color: var(--title-color);">Examen sin preguntas</h2>
                <p style="color: var(--text-color); font-size: 0.9rem; margin-top: 10px; opacity: 0.7;">El instructor aún no ha configurado este examen.</p>
                ${window.isAdmin ? `<button onclick="openQuizModal(${modIdx}, ${lessIdx})" style="margin-top:20px; background:var(--primary-color); color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer;">Configurar Examen</button>` : ''}
            </div>
        `;
        return;
    }

    // Generate Questions HTML (Always render for background)
    let questionsHtml = '';
    lesson.questions.forEach((q, qIdx) => {
        let opts = '';
        q.options.forEach((opt, oIdx) => {
            opts += `
                <label style="display:flex; align-items:center; padding:10px; border:1px solid rgba(136,136,136,0.2); margin-bottom:8px; border-radius:5px; cursor:pointer; transition:background 0.2s; background: var(--bg-color);" class="quiz-option">
                    <input type="radio" name="qplay-${qIdx}" value="${oIdx}" style="margin-right:10px;">
                    <span style="color: var(--text-color);">${opt}</span>
                </label>
            `;
        });

        questionsHtml += `
            <div class="quiz-question" style="margin-bottom: 30px;">
                <h4 style="margin-bottom: 15px; color: var(--title-color);">${qIdx + 1}. ${q.text}</h4>
                <div style="margin-left: 10px;">${opts}</div>
            </div>
        `;
    });

    const quizContent = `
        <div style="max-width:800px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <h1 style="margin:0; color: var(--title-color); font-size:1.8rem;">${lesson.title}</h1>
                    <span style="font-size:0.85rem; color:#888; background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">Intentos: ${attempts}/2</span>
                </div>
                ${getAdminBtn()}
            </div>
            
            <p style="text-align:center; color: var(--text-color); opacity: 0.7; margin-bottom:40px;">Responde todas las preguntas con cuidado. Tienes 2 intentos máximo.</p>
            
            <form id="quiz-form" onsubmit="event.preventDefault(); submitQuiz(${modIdx}, ${lessIdx})">
                ${questionsHtml}
                <button type="submit" style="width:100%; padding:15px; background:var(--primary-color); color:white; border:none; border-radius:8px; font-size:1.1rem; font-weight:bold; cursor:pointer; margin-top:20px;">
                    Finalizar Examen
                </button>
            </form>
            
            <div id="quiz-result" style="display:none; margin-top:30px; padding:20px; background: rgba(0,0,0,0.02); border-radius:10px; text-align:center; border:1px solid rgba(136,136,136,0.1);"></div>
        </div>
    `;

    // LOCKED STATE (With Blur Overlay)
    if (isLocked) {
        let color = bestScore >= 13 ? '#2ecc71' : '#e74c3c';

        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        container.innerHTML = `
            <!-- BLURRED BACKGROUND -->
            <div style="width:100%; height:100%; background: var(--bg-card); overflow-y:hidden; padding:30px; box-sizing:border-box; border-radius:12px; filter: blur(8px); opacity: 0.5; pointer-events: none; user-select: none;">
                ${quizContent}
            </div>

            <!-- LOCK OVERLAY -->
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10;">
                <div style="background: var(--card-bg); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); max-width: 400px;">
                    <div style="background: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fas fa-lock" style="font-size: 2.5rem; color: var(--text-color);"></i>
                    </div>
                    <h2 style="margin-bottom: 10px; color: var(--title-color);">Examen Bloqueado</h2>
                    <p style="color: #888; margin-bottom: 20px;">Has alcanzado el límite de 2 intentos permitidos.</p>
                    
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-bottom: 25px;">
                        <div style="font-size: 0.9rem; color: #aaa;">Tu Nota Final</div>
                        <div style="font-size: 2.5rem; font-weight: 800; color: ${color};">${bestScore} / 20</div>
                    </div>

                    <button onclick="playLesson(currentCourseData.modules[${modIdx}].lessons[${lessIdx} + 1] || currentCourseData.modules[${modIdx}].lessons[${lessIdx}], ${modIdx}, ${lessIdx})" 
                        style="background: var(--primary-color); color: white; border: none; padding: 12px 30px; border-radius: 50px; font-weight: 600; cursor: pointer; transition: transform 0.2s; width: 100%;">
                        Continuar <i class="fas fa-arrow-right" style="margin-left: 5px;"></i>
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // NORMAL VIEW
    container.innerHTML = `
        <div style="width:100%; height:100%; background: var(--bg-card); overflow-y:auto; padding:30px; box-sizing:border-box; border-radius:12px; border: 1px solid rgba(136,136,136,0.1);">
            ${quizContent}
        </div>
    `;

    // (End of render function, removing old loop)
    return;
    lesson.questions.forEach((q, qIdx) => {
        let opts = '';
        q.options.forEach((opt, oIdx) => {
            opts += `
                <label style="display:flex; align-items:center; padding:10px; border:1px solid rgba(136,136,136,0.2); margin-bottom:8px; border-radius:5px; cursor:pointer; transition:background 0.2s; background: var(--bg-color);" class="quiz-option">
                    <input type="radio" name="qplay-${qIdx}" value="${oIdx}" style="margin-right:10px;">
                    <span style="color: var(--text-color);">${opt}</span>
                </label>
            `;
        });

        questionsHtml += `
            <div class="quiz-question" style="margin-bottom: 30px;">
                <h4 style="margin-bottom: 15px; color: var(--title-color);">${qIdx + 1}. ${q.text}</h4>
                <div style="margin-left: 10px;">${opts}</div>
            </div>
        `;
    });

    container.innerHTML = `
        <div style="width:100%; height:100%; background: var(--bg-card); overflow-y:auto; padding:30px; box-sizing:border-box; border-radius:12px; border: 1px solid rgba(136,136,136,0.1);">
            <div style="max-width:800px; margin:0 auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <div>
                        <h1 style="margin:0; color: var(--title-color); font-size:1.8rem;">${lesson.title}</h1>
                        <span style="font-size:0.85rem; color:#888; background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">Intentos: ${attempts}/2</span>
                    </div>
                    ${getAdminBtn()}
                </div>
                
                <p style="text-align:center; color: var(--text-color); opacity: 0.7; margin-bottom:40px;">Responde todas las preguntas con cuidado. Tienes 2 intentos máximo.</p>
                
                <form id="quiz-form" onsubmit="event.preventDefault(); submitQuiz(${modIdx}, ${lessIdx})">
                    ${questionsHtml}
                    <button type="submit" style="width:100%; padding:15px; background:var(--primary-color); color:white; border:none; border-radius:8px; font-size:1.1rem; font-weight:bold; cursor:pointer; margin-top:20px;">
                        Finalizar Examen
                    </button>
                </form>
                
                <div id="quiz-result" style="display:none; margin-top:30px; padding:20px; background: rgba(0,0,0,0.02); border-radius:10px; text-align:center; border:1px solid rgba(136,136,136,0.1);"></div>
            </div>
        </div>
    `;
}

async function submitQuiz(modIdx, lessIdx) {
    const user = firebase.auth().currentUser;
    if (!user) return alert("Debes iniciar sesión");

    const lesson = currentCourseData.modules[modIdx].lessons[lessIdx];
    const form = document.getElementById('quiz-form');
    const resultDiv = document.getElementById('quiz-result');
    const submitBtn = form.querySelector('button[type="submit"]');

    // 1. Check Attempts (Server-side check would be better, but client-side for UX)
    const lessonId = lesson.id;
    const progressRef = db.collection('users').doc(user.uid).collection('quiz_progress').doc(lessonId);

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calificando...';

    try {
        const doc = await progressRef.get();
        let currentAttempts = 0;
        let previousBest = 0;

        if (doc.exists) {
            const data = doc.data();
            currentAttempts = data.attempts || 0;
            previousBest = data.bestScore || 0;
        }

        if (currentAttempts >= 2 && !window.isAdmin) {
            alert("Has agotado tus 2 intentos para este examen.");
            submitBtn.style.display = 'none'; // Hide button
            // Show result of previous best?
            return;
        }

        // 2. Calculate Score
        let correctCount = 0;
        let total = lesson.questions.length;

        // Disable inputs
        const inputs = form.querySelectorAll('input');
        inputs.forEach(i => i.disabled = true);

        lesson.questions.forEach((q, qIdx) => {
            const selected = form.querySelector(`input[name="qplay-${qIdx}"]:checked`);
            const questionDiv = form.querySelectorAll('.quiz-question')[qIdx];

            if (selected && parseInt(selected.value) === q.correct) {
                correctCount++;
                questionDiv.style.borderLeft = '4px solid #2ecc71';
                if (selected.parentElement) selected.parentElement.style.background = 'rgba(46, 204, 113, 0.2)';
            } else {
                questionDiv.style.borderLeft = '4px solid #e74c3c';
                if (selected && selected.parentElement) selected.parentElement.style.background = 'rgba(231, 76, 60, 0.2)';

                // Highlight correct hidden to prevent cheating
            }
            questionDiv.style.paddingLeft = '15px';
        });

        // Scale to 20
        const rawScore = (correctCount / total) * 20;
        const score20 = parseFloat(rawScore.toFixed(1)); // 1 decimal place
        const newAttempts = currentAttempts + 1;
        const attemptsLeft = 2 - newAttempts;

        // 3. Save to Firestore
        const bestScore = Math.max(score20, previousBest);

        await progressRef.set({
            attempts: newAttempts,
            lastScore: score20,
            bestScore: bestScore,
            lastAttemptAt: new Date().toISOString(),
            courseId: currentCourseId, // Useful for queries
            moduleId: modIdx // Helper
        }, { merge: true });

        // 4. Show Result
        resultDiv.style.display = 'block';

        let msg = '';
        let color = '';
        if (score20 >= 20) { msg = '¡Perfecto! 🌟'; color = '#2ecc71'; }
        else if (score20 >= 13) { msg = '¡Aprobado! 👍'; color = '#2ecc71'; }
        else { msg = 'Sigue estudiando 📚'; color = '#e74c3c'; }

        resultDiv.innerHTML = `
            <div style="font-size: 3rem; font-weight: bold; color: ${color}; margin-bottom: 10px;">${score20} / 20</div>
            <p style="font-size: 1.1rem; margin-bottom: 5px;">${correctCount} de ${total} correctas</p>
            <p style="color: #ccc; margin-bottom: 20px;">${msg}</p>
            
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p>Intentos usados: <strong>${newAttempts} / 2</strong></p>
                <p>Tu mejor nota: <strong>${bestScore}</strong></p>
            </div>

            ${attemptsLeft > 0 ?
                `<button onclick="playLesson(currentCourseData.modules[${modIdx}].lessons[${lessIdx}], ${modIdx}, ${lessIdx})" style="background:none; border:1px solid #eba417; color:#eba417; padding:10px 25px; border-radius:30px; cursor:pointer; font-weight:bold;">
                    <i class="fas fa-redo"></i> Reintentar (${attemptsLeft} restante)
                </button>` :
                `<div style="color: #e74c3c; font-weight: bold;"><i class="fas fa-lock"></i> Examen finalizado. No quedan intentos.</div>`
            }
        `;
        resultDiv.scrollIntoView({ behavior: 'smooth' });
        submitBtn.style.display = 'none'; // Hide submit button permanently for this session context

    } catch (e) {
        console.error("Quiz Error:", e);
        alert("Error guardando examen: " + e.message);
        submitBtn.innerHTML = 'Finalizar Examen';
        submitBtn.disabled = false;
    }
}

// --- Q&A SYSTEM LOGIC ---

// Hook into switchTab safely
const originalSwitchTab = window.switchTab;
window.switchTab = function (tabId) {
    // Basic Tab Logic (Fallback/Override)
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.classList.add('active');

    // Attempt to find button by onclick
    const targetBtn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if (targetBtn) targetBtn.classList.add('active');

    // Trigger Q&A Load
    if (tabId === 'qa') {
        loadLessonComments();
    }
};

window.currentLessonQAUnsubscribe = null;

window.loadLessonComments = function () {
    if (!window.currentLessonContext) return;
    const { modIdx, lessIdx } = window.currentLessonContext;
    const courseId = currentCourseId; // Global from course-cms.js
    const container = document.getElementById('qa');

    // State for pagination
    if (!window.lessonCommentState) {
        window.lessonCommentState = { limit: 20, modIdx, lessIdx, courseId };
    }

    // Reset if switching lessons
    if (window.lessonCommentState.modIdx !== modIdx || window.lessonCommentState.lessIdx !== lessIdx) {
        window.lessonCommentState = { limit: 20, modIdx, lessIdx, courseId };
    }

    const currentLimit = window.lessonCommentState.limit;

    if (!container) return;

    // Render Shell if empty or placeholder
    if (!container.querySelector('.qa-container')) {
        renderQAInterface(container);
    }

    const listBody = document.getElementById('qa-body');
    if (!listBody) return;

    // Scroll listener for Infinite Scroll
    const onScrollComments = () => {
        // Detect if near bottom of window or container?
        // In course player, comments are usually at bottom of page.
        // Let's use window scroll for simplicity if it's main scroll, 
        // but course player might have its own scrolling container? 
        // Assuming main window for now, or we add a "Load More" button manually 
        // to be safe and consistent with "optimization". 
        // Actually, activity.html uses scroll listener on the container or window.
        // But here, let's stick to "Load More" button for stability or auto-trigger.

        // Let's implement the "Load More" button logic as it's more robust without specific scroll container context.
    };

    // Unsubscribe previous listener
    if (window.currentLessonQAUnsubscribe) {
        window.currentLessonQAUnsubscribe();
    }

    // Only show loader on initial load
    if (currentLimit === 20) {
        listBody.innerHTML = '<div style="text-align:center; padding:20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Cargando preguntas...</div>';
    }

    window.currentLessonQAUnsubscribe = db.collection('courses').doc(courseId).collection('comments')
        .where('modIdx', '==', modIdx)
        .where('lessIdx', '==', lessIdx)
        .limit(currentLimit)
        .onSnapshot(snapshot => {
            // Update Count Badge
            const countBadge = document.getElementById('qa-tab-count');
            if (countBadge) {
                // Counts are tricky with pagination + filter. 
                // We only know count of *loaded* docs here.
                // Ideally we store total count in DB metadata, but for now show loaded count or nothing.
                // snapshot.size is just the loaded batch.
                // Let's hide it or show "20+"?
                // Let's just update based on snapshot size for now.
                const count = snapshot.size;
                countBadge.innerText = count > 0 ? `(${count}${count >= currentLimit ? '+' : ''})` : '';
            }

            if (currentLimit === 20) listBody.innerHTML = ''; // Clear only on restart

            if (snapshot.empty) {
                listBody.innerHTML = `
                    <div style="text-align:center; padding:40px; color: var(--text-color); opacity:0.6;">
                        <i class="far fa-comments" style="font-size:3rem; margin-bottom:15px;"></i>
                        <p>No hay preguntas aún.</p>
                        <p style="font-size:0.9rem;">Sé el primero en preguntar algo sobre esta clase.</p>
                    </div>`;
                return;
            }

            // Preservation of scroll or just redraw?
            // Snapshot redraws everything usually. 
            // In activity stream we appended. Here we might redraw for simplicity of sorting.
            // But we must check if we should clear.
            listBody.innerHTML = '';

            const comments = [];
            snapshot.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));

            // Sort Client-Side (Newest First)
            comments.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA;
            });

            // Filter for parents (no parentId)
            const parents = comments.filter(c => !c.parentId);

            parents.forEach(p => {
                // Find replies for this parent
                const replies = comments.filter(r => r.parentId === p.id).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
                const html = buildLessonCommentHTML(p, replies);
                listBody.insertAdjacentHTML('beforeend', html);
            });

            updateCommentCountLabel(snapshot.size);

            // "Load More" Logic / Infinite Scroll Trigger
            // If we received exactly the limit, there might be more.
            if (snapshot.size === currentLimit) {
                const loadMoreId = 'btn-load-more-comments';
                if (!document.getElementById(loadMoreId)) {
                    const btnHTML = `
                        <div style="text-align: center; margin-top: 20px; padding-bottom: 20px;">
                            <button id="${loadMoreId}" onclick="loadMoreLessonComments()" 
                                style="background: transparent; border: 1px solid var(--secondary-color); color: var(--secondary-color); padding: 8px 20px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
                                <i class="fas fa-plus"></i> Cargar más comentarios
                            </button>
                        </div>
                    `;
                    listBody.insertAdjacentHTML('beforeend', btnHTML);
                }
            }
        });
};

window.loadMoreLessonComments = function () {
    if (window.lessonCommentState) {
        window.lessonCommentState.limit += 20;
        loadLessonComments(); // Re-trigger with new limit
    }
}

function renderQAInterface(container) {
    // Robust Avatar Check
    let userAvatar = '';
    const user = firebase.auth().currentUser;

    if (user && user.photoURL) userAvatar = user.photoURL;
    else if (window.userData && window.userData.photoURL) userAvatar = window.userData.photoURL;
    else if (localStorage.getItem("profile_avatar")) userAvatar = localStorage.getItem("profile_avatar");

    container.innerHTML = `
        <div class="qa-container" style="max-width: 800px; margin: 0 auto; padding-top: 20px;">
            <!-- Input Area -->
            <div style="display: flex; gap: 15px; margin-bottom: 30px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #ddd; background-size: cover; background-image: url('${userAvatar}'); flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <textarea id="qa-input" placeholder="Añade una pregunta o comentario..." rows="1" 
                        style="width: 100%; background: var(--bg-color); border: 1px solid rgba(136,136,136,0.2); border-radius: 12px; padding: 15px; color: var(--text-color); font-family: inherit; resize: none; margin-bottom: 10px; overflow:hidden; min-height: 50px; max-height: 150px; line-height: 1.5;"></textarea>
                    <div style="display: flex; justify-content: flex-end;">
                        <button id="qa-submit-btn" onclick="postLessonComment()" style="background: var(--secondary-color); color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: 500;">
                            Publicar
                        </button>
                    </div>
                </div>
            </div>

            <!-- List -->
            <div id="qa-body"></div>
        </div>
    `;

    // Auto-resize and Enter to Submit Logic
    const tx = document.getElementById('qa-input');
    if (tx) {
        tx.addEventListener('input', function () {
            this.style.height = 'auto'; // Reset
            this.style.height = (this.scrollHeight) + 'px';
        });

        tx.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                postLessonComment();
            }
        });
    }
}

window.postLessonComment = async function (parentId = null) {
    const input = parentId ? document.getElementById(`reply-input-${parentId}`) : document.getElementById('qa-input');
    const content = input.value.trim();

    if (!content) return;
    if (!window.currentLessonContext) return;

    const { modIdx, lessIdx } = window.currentLessonContext;
    const user = firebase.auth().currentUser;
    if (!user) return alert("Debes iniciar sesión");

    try {
        // Ensure accurate role/avatar even if userData isn't loaded yet
        let role = 'student';
        let avatar = user.photoURL;

        if (window.userData) {
            role = window.userData.role || 'student';
            avatar = window.userData.photoURL || user.photoURL;
        } else {
            // Fallback: fetch just once
            const uSnap = await db.collection('users').doc(user.uid).get();
            if (uSnap.exists) {
                const d = uSnap.data();
                role = d.role || 'student';
                avatar = d.photoURL || user.photoURL;
            }
        }

        const commentRef = await db.collection('courses').doc(currentCourseId).collection('comments').add({
            content,
            modIdx,
            lessIdx,
            parentId,
            authorId: user.uid,
            authorName: user.displayName || 'Usuario',
            authorAvatar: avatar || null,
            authorRole: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: []
        });

        // --- NOTIFICATION TRIGGERS ---
        if (parentId) {
            // It's a reply! Notify the parent author.
            db.collection('courses').doc(currentCourseId).collection('comments').doc(parentId).get().then(parentDoc => {
                if (parentDoc.exists) {
                    const pData = parentDoc.data();
                    if (pData.authorId && pData.authorId !== user.uid) {
                        // Create Notification
                        db.collection('notifications').add({
                            recipientId: pData.authorId,
                            senderId: user.uid,
                            senderName: user.displayName || 'Alguien',
                            senderAvatar: avatar || null,
                            type: 'reply',
                            message: `respondió a tu comentario: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
                            link: `${window.location.href}#comment-${commentRef.id}`, // Anchor to specific comment
                            read: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            }).catch(err => console.error("Error creating notification:", err));
        }

        input.value = '';
        if (parentId) toggleReplyInput(parentId);

    } catch (e) {
        console.error("Error posting comment:", e);
        alert("Error al publicar.");
    }
};

function buildLessonCommentHTML(comment, replies = []) {
    const isMe = firebase.auth().currentUser?.uid === comment.authorId;
    const dateStr = comment.createdAt ? new Date(comment.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(comment.createdAt.toDate()).toLocaleDateString() : '...';

    // Robust Avatar for "Me" (if comment has old/missing data) or rely on stored for others
    let displayAvatar = comment.authorAvatar;
    if (isMe) {
        if (window.userData && window.userData.photoURL) displayAvatar = window.userData.photoURL;
        else if (localStorage.getItem("profile_avatar")) displayAvatar = localStorage.getItem("profile_avatar");
        else if (firebase.auth().currentUser.photoURL) displayAvatar = firebase.auth().currentUser.photoURL;
    }

    // Robust Role Check
    let showBadge = false;
    if (comment.authorRole === 'admin' || comment.authorRole === 'teacher') showBadge = true;
    if (isMe && window.userData && (window.userData.role === 'admin' || window.userData.role === 'teacher')) showBadge = true;

    let repliesHtml = '';
    replies.forEach(r => {
        repliesHtml += buildLessonCommentHTML(r, []); // Recursion (shallow)
    });

    const replyInputHtml = `
        <div id="reply-box-${comment.id}" style="display:none; margin-top:10px; padding-left: 50px;">
            <div style="display:flex; gap:10px;">
                 <input type="text" id="reply-input-${comment.id}" placeholder="Escribe una respuesta..." 
                    onkeypress="if(event.key === 'Enter') postLessonComment('${comment.id}')"
                    style="flex:1; background: var(--bg-color); border:1px solid rgba(136,136,136,0.2); padding:8px 12px; border-radius:20px; color: var(--text-color);">
                 <button onclick="postLessonComment('${comment.id}')" style="background:var(--secondary-color); color:white; border:none; width:35px; height:35px; border-radius:50%; cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    return `
        <div id="comment-${comment.id}" class="comment-item" style="margin-bottom: 20px; ${comment.parentId ? 'margin-left: 50px; border-left: 2px solid rgba(136,136,136,0.1); padding-left: 15px;' : ''}">
            <div style="display: flex; gap: 15px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #ddd; background-size: cover; background-image: url('${displayAvatar || ''}'); flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div style="background: rgba(136,136,136,0.05); padding: 10px 15px; border-radius: 12px; display: inline-block; min-width: 200px;">
                        <div style="font-weight: 600; color: var(--title-color); font-size: 0.9rem; margin-bottom: 2px;">
                            ${comment.authorName} 
                            ${(() => {
            if (comment.authorRole === 'admin' || (isMe && window.userData?.role === 'admin')) {
                setTimeout(() => {
                    if (window.addLiquidGoldEffect) {
                        const badge = document.getElementById(`qa-badge-${comment.id}`);
                        if (badge) window.addLiquidGoldEffect(badge);
                    }
                }, 100);

                return `<span id="qa-badge-${comment.id}" style="
                                        background: #000; 
                                        color: #FFD700; 
                                        font-weight: 900; 
                                        border: 1px solid #FFD700; 
                                        box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); 
                                        text-transform: uppercase; 
                                        padding: 0px 8px; 
                                        border-radius: 50px; 
                                        font-size: 0.6rem; 
                                        margin-left: 8px;
                                        display: inline-block;
                                        letter-spacing: 0.5px;
                                        vertical-align: middle;
                                    ">👑 SUPER ADMIN</span>`;
            } else if (comment.authorRole === 'teacher' || (isMe && window.userData?.role === 'teacher')) {
                return '<i class="fas fa-check-circle" style="color:var(--secondary-color); font-size:0.8rem; margin-left:5px;" title="Profesor"></i>';
            }
            return '';
        })()}
                        </div>
                        <div style="color: var(--text-color); font-size: 0.95rem; white-space: pre-wrap;">${comment.content}</div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-top: 5px; margin-left: 5px; font-size: 0.8rem; color: #888;">
                        <span>${dateStr}</span>
                        ${!comment.parentId ? `<span style="cursor: pointer; font-weight: 500;" onclick="toggleReplyInput('${comment.id}')">Responder</span>` : ''}
                        ${(window.isAdmin || isMe) ? `<span style="cursor: pointer; color: #e74c3c;" onclick="deleteLessonComment('${comment.id}')">Eliminar</span>` : ''}
                    </div>

                    <!-- Replies -->
                    ${repliesHtml ? `<div style="margin-top: 10px;">${repliesHtml}</div>` : ''}
                    ${!comment.parentId ? replyInputHtml : ''}
                </div>
            </div>
        </div>
    `;
}

window.toggleReplyInput = function (id) {
    const box = document.getElementById(`reply-box-${id}`);
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
};

window.deleteLessonComment = async function (id) {
    if (!confirm("¿Eliminar comentario?")) return;
    try {
        await db.collection('courses').doc(currentCourseId).collection('comments').doc(id).delete();
    } catch (e) { console.error(e); }
};

function updateCommentCountLabel(count) {
    // Optional: Update UI badges
}

// --- TOAST NOTIFICATION ---
window.showToast = function (message, type = 'success') {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = type === 'success' ? '#2ecc71' : '#e74c3c';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    toast.style.zIndex = '10000';
    toast.style.fontSize = '0.95rem';
    toast.style.fontWeight = '500';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s ease';

    document.body.appendChild(toast);

    // Animate In
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Animate Out
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- CONFIRM MODAL ---
window.showConfirmModal = function (message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.style.position = 'fixed';
        modalOverlay.style.top = '0';
        modalOverlay.style.left = '0';
        modalOverlay.style.width = '100%';
        modalOverlay.style.height = '100%';
        modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalOverlay.style.display = 'flex';
        modalOverlay.style.alignItems = 'center';
        modalOverlay.style.justifyContent = 'center';
        modalOverlay.style.zIndex = '10001';
        modalOverlay.style.backdropFilter = 'blur(4px)';
        modalOverlay.style.opacity = '0';
        modalOverlay.style.transition = 'opacity 0.2s ease';

        const modalBox = document.createElement('div');
        modalBox.style.backgroundColor = 'var(--bg-card)';
        modalBox.style.padding = '25px';
        modalBox.style.borderRadius = '15px';
        modalBox.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
        modalBox.style.maxWidth = '400px';
        modalBox.style.width = '90%';
        modalBox.style.textAlign = 'center';
        modalBox.style.border = '1px solid rgba(255,255,255,0.1)';
        modalBox.style.transform = 'scale(0.9)';
        modalBox.style.transition = 'transform 0.2s ease';

        const msgP = document.createElement('p');
        msgP.innerText = message;
        msgP.style.color = 'var(--text-color)';
        msgP.style.marginBottom = '20px';
        msgP.style.fontSize = '1.1rem';

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.gap = '15px';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancelar';
        cancelBtn.style.padding = '10px 20px';
        cancelBtn.style.borderRadius = '8px';
        cancelBtn.style.border = '1px solid rgba(255,255,255,0.2)';
        cancelBtn.style.background = 'transparent';
        cancelBtn.style.color = 'var(--text-color)';
        cancelBtn.style.cursor = 'pointer';

        const confirmBtn = document.createElement('button');
        confirmBtn.innerText = 'Confirmar';
        confirmBtn.style.padding = '10px 20px';
        confirmBtn.style.borderRadius = '8px';
        confirmBtn.style.border = 'none';
        confirmBtn.style.background = '#e74c3c'; // Red for danger/action
        confirmBtn.style.color = 'white';
        confirmBtn.style.fontWeight = 'bold';
        confirmBtn.style.cursor = 'pointer';

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);
        modalBox.appendChild(msgP);
        modalBox.appendChild(btnContainer);
        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);

        // Animate In
        setTimeout(() => {
            modalOverlay.style.opacity = '1';
            modalBox.style.transform = 'scale(1)';
        }, 10);

        function close(result) {
            modalOverlay.style.opacity = '0';
            modalBox.style.transform = 'scale(0.9)';
            setTimeout(() => {
                modalOverlay.remove();
                resolve(result);
            }, 200);
        }

        cancelBtn.onclick = () => close(false);
        confirmBtn.onclick = () => close(true);
        // Close on background click
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) close(false);
        };
    });
}
// --- HELPER: UNIQUE ID ---
function generateShortId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- NAVIGATION & COMPLETION LOGIC ---
window.prevLesson = function () {
    if (typeof window.currentModIndex === 'undefined' || typeof window.currentLessIndex === 'undefined') return;

    let newMod = window.currentModIndex;
    let newLess = window.currentLessIndex - 1;

    if (newLess < 0) {
        // Go to previous module's last lesson
        newMod--;
        if (newMod < 0) return; // Start of course

        const prevModule = currentCourseData.modules[newMod];
        if (!prevModule.lessons || prevModule.lessons.length === 0) return;
        newLess = prevModule.lessons.length - 1;
    }

    playLesson(currentCourseData.modules[newMod].lessons[newLess], newMod, newLess);
};

window.nextLesson = function () {
    if (typeof window.currentModIndex === 'undefined' || typeof window.currentLessIndex === 'undefined') return;

    let newMod = window.currentModIndex;
    let newLess = window.currentLessIndex + 1;

    const currentModule = currentCourseData.modules[newMod];

    if (newLess >= currentModule.lessons.length) {
        // Go to next module's first lesson
        newMod++;
        if (newMod >= currentCourseData.modules.length) {
            // End of course
            showToast("¡Has llegado al final del curso! (por ahora) 🎉");
            return;
        }
        newLess = 0;

        // Skip empty modules if needed
        if (!currentCourseData.modules[newMod].lessons || currentCourseData.modules[newMod].lessons.length === 0) {
            return;
        }
    }

    playLesson(currentCourseData.modules[newMod].lessons[newLess], newMod, newLess);
};

window.toggleCompleteLesson = async function () {
    const btn = document.getElementById('btn-complete');
    const isComplete = btn.classList.contains('completed');
    const user = firebase.auth().currentUser;

    // Get Current Lesson ID
    const lessonObj = currentCourseData.modules[window.currentModIndex].lessons[window.currentLessIndex];
    if (!lessonObj || !lessonObj.id) {
        console.error("Lesson missing ID");
        return;
    }
    const lessonId = lessonObj.id; // USE UUID


    // Find sidebar item
    const sidebarItem = document.getElementById(`lesson-item-${window.currentModIndex}-${window.currentLessIndex}`);

    if (!isComplete) {
        // --- MARK AS COMPLETE ---
        btn.classList.add('completed');
        btn.innerHTML = 'Completado <i class="fas fa-check-double"></i>';
        btn.style.background = '#27ae60';
        showToast("Lección completada ✅");

        // Update Sidebar Icon (Optimistic UI)
        if (sidebarItem) {
            const icon = sidebarItem.querySelector('.l-status i');
            if (icon) {
                icon.className = 'fas fa-check-circle';
                icon.style.color = '#2ecc71';
            }
            sidebarItem.classList.add('completed');
        }

        // Save to Firebase
        if (user && currentCourseId) {
            try {
                await db.collection('users').doc(user.uid).collection('course_progress').doc(currentCourseId).set({
                    completedLessons: firebase.firestore.FieldValue.arrayUnion(lessonId),
                    lastUpdate: new Date() // Metadata
                }, { merge: true });

                // Update local state too (Critical for navigation persistence)
                if (!window.currentUserProgress.completedLessons.includes(lessonId)) {
                    window.currentUserProgress.completedLessons.push(lessonId);
                }

            } catch (e) {
                console.error("Error saving progress:", e);
                // Optionally revert UI if save fails, but for now silent fail or console log is okay
            }
        }

        // Auto-advance
        setTimeout(() => {
            nextLesson();
        }, 1000);

    } else {
        // --- MARK AS INCOMPLETE ---
        btn.classList.remove('completed');
        btn.innerHTML = 'Completar <i class="fas fa-check"></i>';
        btn.style.background = '#2ecc71';

        // Revert Sidebar Icon
        if (sidebarItem) {
            const icon = sidebarItem.querySelector('.l-status i');
            if (icon) {
                icon.className = 'far fa-circle';
                icon.style.color = '';
            }
            sidebarItem.classList.remove('completed');
        }

        // Remove from Firebase
        if (user && currentCourseId) {
            try {
                await db.collection('users').doc(user.uid).collection('course_progress').doc(currentCourseId).update({
                    completedLessons: firebase.firestore.FieldValue.arrayRemove(lessonId)
                });
                // Update local state too
                const index = window.currentUserProgress.completedLessons.indexOf(lessonId);
                if (index > -1) {
                    window.currentUserProgress.completedLessons.splice(index, 1);
                }
            } catch (e) {
                console.error("Error saving progress:", e);
            }
        }
    }
};

async function loadUserProgress(uid) {
    if (!currentCourseId) return;
    try {
        const doc = await db.collection('users').doc(uid).collection('course_progress').doc(currentCourseId).get();
        if (doc.exists) {
            window.currentUserProgress = doc.data();
            // Refresh Sidebar to show ticks
            renderSidebarWithAdminControls();

            // Refresh Button State if a lesson is currently playing
            if (typeof window.currentModIndex !== 'undefined') {
                const btnComplete = document.getElementById('btn-complete');

                const lessonObj = currentCourseData.modules[window.currentModIndex].lessons[window.currentLessIndex];
                if (lessonObj && lessonObj.id) {
                    const lessonId = lessonObj.id;
                    const isCompleted = window.currentUserProgress.completedLessons.includes(lessonId);

                    if (btnComplete) {
                        if (isCompleted) {
                            btnComplete.classList.add('completed');
                            btnComplete.innerHTML = 'Completado <i class="fas fa-check-double"></i>';
                            btnComplete.style.background = '#27ae60';
                        } else {
                            btnComplete.classList.remove('completed');
                            btnComplete.innerHTML = 'Completar <i class="fas fa-check"></i>';
                            btnComplete.style.background = '#2ecc71';
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error loading progress:", e);
    }
}
// --- CUSTOM MODALS & TOASTS ---

function showToast(msg, type = 'success') {
    // Create toast container if not exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:100000; display:flex; flex-direction:column; gap:10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const color = type === 'error' ? '#e74c3c' : '#2ecc71';
    toast.style.cssText = `
        background: #222; 
        color: white; 
        padding: 15px 25px; 
        border-radius: 8px; 
        border-left: 5px solid ${color};
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        display: flex; 
        align-items: center; 
        gap: 10px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;

    let icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    toast.innerHTML = `<i class="fas ${icon}" style="color:${color};"></i> <span>${msg}</span>`;

    container.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showConfirmModal(msg) {
    return new Promise((resolve) => {
        // Create modal DOM
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:100000; background:rgba(0,0,0,0.8); position:fixed; top:0; left:0; width:100%; height:100%;';

        modal.innerHTML = `
            <div class="modal-content" style="background:#222; padding:30px; border-radius:15px; border:1px solid #444; max-width:400px; width:90%; text-align:center; box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                <div style="font-size:3rem; color:#f39c12; margin-bottom:20px;"><i class="fas fa-question-circle"></i></div>
                <h3 style="color:white; margin-bottom:10px;">¿Estás seguro?</h3>
                <p style="color:#ccc; margin-bottom:30px;">${msg}</p>
                <div style="display:flex; justify-content:center; gap:10px;">
                    <button id="confirm-cancel" style="padding:10px 25px; background:transparent; border:1px solid #666; color:#ccc; border-radius:30px; cursor:pointer;">Cancelar</button>
                    <button id="confirm-ok" style="padding:10px 25px; background:var(--primary-color); border:none; color:white; border-radius:30px; cursor:pointer; font-weight:bold;">Aceptar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handlers
        const close = (val) => {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                resolve(val);
            }, 200);
        };

        document.getElementById('confirm-cancel').onclick = () => close(false);
        document.getElementById('confirm-ok').onclick = () => close(true);
    });
}
