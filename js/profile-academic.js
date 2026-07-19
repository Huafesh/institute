
// Logic for Profile Academic Tab (Courses List & Animations)

window.loadAcademicHistory = async function (userId) {
    const container = document.querySelector('#academico .content-card');
    if (!container) return;

    // Loading State
    container.innerHTML = '<h3><i class="fas fa-graduation-cap"></i> Historial Académico</h3><div style="padding:20px; text-align:center;">Cargando cursos...</div>';

    try {
        const db = firebase.firestore();

        // 1. Fetch Courses
        const coursesSnap = await db.collection('courses').get();
        const courses = []; // definition
        coursesSnap.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));

        // 2. Fetch User Progress
        const progressSnap = await db.collection('users').doc(userId).collection('course_progress').get();
        const userProgress = {};
        progressSnap.forEach(doc => userProgress[doc.id] = doc.data());

        // 3. Map to View Model
        const viewData = courses.map(c => {
            const prog = userProgress[c.id] || { completedLessons: [] };
            const total = countTotalLessons(c);
            const done = prog.completedLessons ? prog.completedLessons.length : 0;
            let percent = total > 0 ? Math.round((done / total) * 100) : 0;
            if (percent > 100) percent = 100;

            let grade = prog.finalGrade !== undefined ? prog.finalGrade : null;

            // Status text
            let status = "Nuevo";
            if (percent > 0 && percent < 100) status = "En Progreso";
            if (percent === 100) status = "Completado";

            return {
                name: c.title,
                status: status,
                progress: percent,
                grade: grade // Can be null
            };
        });

        renderAcademicHistory(viewData);

    } catch (e) {
        console.error("Error loading academic history:", e);
        container.innerHTML = '<h3><i class="fas fa-graduation-cap"></i> Historial Académico</h3><div style="padding:20px; text-align:center; color:red;">Error cargando datos.</div>';
    }
};

function countTotalLessons(course) {
    if (!course.modules) return 0;
    let count = 0;
    course.modules.forEach(m => { if (m.lessons) count += m.lessons.length; });
    return count;
}

// Render Function (Adapted from original profile.html)
function renderAcademicHistory(coursesData) {
    const container = document.querySelector('#academico .content-card');
    if (!container) return;

    let html = `<h3><i class="fas fa-graduation-cap"></i> Historial Académico</h3>`;

    // Sort: High Grades -> High Progress -> Others
    const sorted = coursesData.sort((a, b) => {
        const gA = a.grade || 0;
        const gB = b.grade || 0;
        if (gA !== gB) return gB - gA;
        return b.progress - a.progress;
    });

    if (sorted.length === 0) {
        html += '<div style="padding:20px; text-align:center;">No hay cursos inscritos.</div>';
        container.innerHTML = html;
        return;
    }

    sorted.forEach((course, index) => {
        const gradeClass = getGradeClass(course.grade);
        const badgeClass = getBadgeClass(course.grade);

        let badgeContent = '';
        let canvasHtml = '';

        // Perfect Grade Logic (Liquid Gold)
        if (course.grade && course.grade >= 20.0) {
            let canvasId = `liquid-canvas-${index}`;
            canvasHtml = `<canvas id="${canvasId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; filter: url('#gold-liquid'); border-radius:10px;"></canvas>`;
        }

        if (course.grade !== null && course.grade !== undefined) {
            let gradeText = `Nota: ${Number(course.grade).toFixed(1)}`;
            if (course.grade >= 20.0) {
                gradeText = `<i class="fas fa-star" style="font-size:0.75rem; margin-right:3px;"></i> ${gradeText} <i class="fas fa-star" style="font-size:0.75rem; margin-left:3px;"></i>`;
            }

            let badgeStyle = `display:inline-block; margin-top: 5px; padding: 2px 10px; border-radius: 10px; font-size: 0.8rem; font-weight:600; position:relative; z-index:2;`;
            if (course.grade >= 20.0) {
                badgeStyle += ` background: #1a1a1a; border: 1px solid #FFD700; color: #FFD700; box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);`;
            }

            badgeContent = `<span class="${course.grade >= 20.0 ? '' : badgeClass}" style="${badgeStyle}">${gradeText}</span>`;
        } else {
            // Progress Badge
            let color = '#3498db';
            let bg = 'rgba(52, 152, 219, 0.1)';
            if (course.progress === 100) { color = '#2ecc71'; bg = 'rgba(46, 204, 113, 0.1)'; }
            else if (course.progress === 0) { color = '#999'; bg = '#eee'; }

            badgeContent = `<span style="display:inline-block; margin-top: 5px; background: ${bg}; color: ${color}; padding: 2px 10px; border-radius: 10px; font-size: 0.8rem; font-weight:600;">Avance: ${course.progress}%</span>`;
        }

        let defaultStyle = `background: rgba(0,0,0,0.02); padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid var(--secondary-color); position: relative; overflow: hidden;`;
        if (gradeClass === 'grade-perfect') {
            defaultStyle = `padding: 15px; border-radius: 10px; margin-bottom: 15px; position: relative; overflow: hidden;`;
        }

        html += `
        <div style="${defaultStyle}" class="academic-item ${gradeClass}">
            ${canvasHtml}
            <h4 style="margin-bottom: 5px; position:relative; z-index:1;">${course.name}</h4>
            <p style="font-size: 0.9rem; opacity: 0.8; position:relative; z-index:1;">${course.status}</p>
            <div style="position:relative; z-index:1;">${badgeContent}</div>
        </div>
        `;
    });

    container.innerHTML = html;

    // Trigger Animations
    sorted.forEach((course, index) => {
        if (course.grade && course.grade >= 20.0) {
            startLiquidAnimation(`liquid-canvas-${index}`);
        }
    });
}

function getGradeClass(grade) {
    if (grade === null || grade === undefined) return '';
    if (grade >= 20.0) return 'grade-perfect';
    if (grade >= 16.0) return 'grade-green';
    if (grade >= 11.0) return 'grade-yellow';
    return 'grade-red';
}
function getBadgeClass(grade) {
    if (grade === null || grade === undefined) return '';
    if (grade >= 20.0) return 'badge-perfect';
    if (grade >= 16.0) return 'badge-green';
    if (grade >= 11.0) return 'badge-yellow';
    return 'badge-red';
}

function startLiquidAnimation(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    let particles = [];

    function resize() {
        if (parent.offsetWidth > 0 && parent.offsetHeight > 0) {
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight;
        }
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    class GoldDrop {
        constructor(x) {
            this.x = x;
            this.y = -20;
            this.size = Math.random() * 12 + 8;
            this.vy = Math.random() * 2 + 1;
            this.onFloor = false;
            this.life = 1.0;
        }
        update() {
            if (!this.onFloor) {
                this.y += this.vy;
                this.vy += 0.1;
                if (this.y >= canvas.height - 15) {
                    this.y = canvas.height - 15;
                    this.onFloor = true;
                }
            } else {
                this.life -= 0.003;
                this.size += 0.15;
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(212, 175, 55, ${this.life})`;
            ctx.fill();
        }
    }

    function animate() {
        if (canvas.width > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (Math.random() < 0.1) {
                particles.push(new GoldDrop(Math.random() * canvas.width));
            }
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                if (particles[i].life <= 0) {
                    particles.splice(i, 1);
                    i--;
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}
