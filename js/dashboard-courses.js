
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase Auth
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded.");
        return;
    }

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            loadDashboardCourses(user.uid);
        } else {
            console.log("No user logged in (Dashboard)");
            // Redirect if needed, or show skeletons
        }
    });
});

async function loadDashboardCourses(userId) {
    const grid = document.querySelector('.courses-grid');
    if (!grid) return;

    // Show Skeletons or Loading state
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #777;">Cargando tus cursos... <i class="fas fa-circle-notch fa-spin"></i></div>';

    try {
        // 1. Fetch All Courses (Definition)
        const coursesSnap = await db.collection('courses').get();
        const courses = [];
        coursesSnap.forEach(doc => {
            courses.push({ id: doc.id, ...doc.data() });
        });

        // 2. Fetch User Progress
        // We assume a collection 'users/{uid}/progress/{courseId}' OR a single doc 'users/{uid}/progress' map
        // Let's use individual docs for scalability: users/{uid}/course_progress/{courseId}
        const progressSnap = await db.collection('users').doc(userId).collection('course_progress').get();
        const userProgress = {}; // Map: courseId -> { completedLessons: [] }
        progressSnap.forEach(doc => {
            userProgress[doc.id] = doc.data();
        });

        // 3. Render
        grid.innerHTML = ''; // Clear loading

        if (courses.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No hay cursos disponibles por el momento.</div>';
            return;
        }

        let animationDelay = 0;

        courses.forEach(course => {
            // -- LOGIC: Calculate Progress --
            // 1. Get all valid Lesson IDs from the course definition
            const validLessonIds = new Set();
            if (course.modules) {
                course.modules.forEach(mod => {
                    if (mod.lessons) {
                        mod.lessons.forEach(l => {
                            if (l.id) validLessonIds.add(l.id);
                        });
                    }
                });
            }
            const totalLessons = validLessonIds.size;

            // 2. Get user's completed lessons & Filter orphans/duplicates
            const myProgress = userProgress[course.id] || { completedLessons: [] };
            let completedCount = 0;

            if (myProgress.completedLessons && Array.isArray(myProgress.completedLessons)) {
                // Only count lessons that actually exist in the current course
                // AND use Set to avoid counting duplicates if DB has bad data
                const uniqueUserCompletions = new Set(myProgress.completedLessons);

                uniqueUserCompletions.forEach(pid => {
                    if (validLessonIds.has(pid)) {
                        completedCount++;
                    }
                });
            }

            // Math
            let percent = 0;
            if (totalLessons > 0) {
                percent = Math.round((completedCount / totalLessons) * 100);
            }
            if (percent > 100) percent = 100; // Safety cap

            // Determine Status Badge & Button Text based on progress
            let badgeText = "Nuevo";
            let btnText = "Empezar Curso";
            let badgeClass = "badge-new"; // Custom class if needed

            if (percent > 0 && percent < 100) {
                badgeText = "En Progreso";
                btnText = "Continuar Clase";
            } else if (percent === 100) {
                badgeText = "Completado";
                btnText = "Repasar Curso";
            }

            // -- RENDER CARD --
            const card = document.createElement('div');
            card.className = 'course-card';
            // Animation Style
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.animation = `fadeSlideUp 0.5s forwards ${animationDelay}s`;

            // Thumbnail fallback
            let thumbUrl = `assets/imagenes/thumb-${course.id}.png`;
            // In a real app we might store thumbUrl in Firestore. For now, try standardized naming or generic.

            card.innerHTML = `
                <div class="course-thumb" style="background-image: url('${thumbUrl}');">
                    <span class="course-badge" style="background: ${getBadgeColor(badgeText)}">${badgeText}</span>
                </div>
                <div class="card-body">
                    <h4>${course.title}</h4>
                    <div class="progress-container">
                        <div class="progress-info">
                            <span>Avance</span>
                            <span>${percent}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%;" data-width="${percent}%"></div>
                        </div>
                    </div>
                    <a href="course_player.html?id=${course.id}" class="btn-course">${btnText}</a>
                </div>
            `;

            grid.appendChild(card);

            // Trigger progress bar animation after a slight delay so CSS transition catches it
            setTimeout(() => {
                const fill = card.querySelector('.progress-fill');
                fill.style.width = fill.getAttribute('data-width');
            }, 100 + (animationDelay * 1000));

            animationDelay += 0.1; // Stagger effect
        });

    } catch (err) {
        console.error("Error loading courses:", err);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Error cargando cursos. Intenta recargar.</div>';
    }
}

// Helper: Count all lessons in modules
function countTotalLessons(course) {
    if (!course.modules || !Array.isArray(course.modules)) return 0;
    let count = 0;
    course.modules.forEach(mod => {
        if (mod.lessons && Array.isArray(mod.lessons)) {
            count += mod.lessons.length;
        }
    });
    return count;
}

function getBadgeColor(status) {
    if (status === 'Completado') return '#2ecc71'; // Green
    if (status === 'En Progreso') return '#3498db'; // Blue
    return 'rgba(0,0,0,0.6)'; // Default/Black
}

// Check for Animation CSS
if (!document.getElementById('dash-anim-style')) {
    const style = document.createElement('style');
    style.id = 'dash-anim-style';
    style.innerHTML = `
        @keyframes fadeSlideUp {
            to { opacity: 1; transform: translateY(0); }
        }
        .progress-fill { transition: width 1s cubic-bezier(0.25, 1, 0.5, 1); }
        .course-card .course-thumb { transition: transform 0.3s; }
        .course-card:hover .course-thumb { transform: scale(1.03); }
    `;
    document.head.appendChild(style);
}
