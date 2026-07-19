// activity-ui.js - Handles UI interactions, Modals, and Attachments
console.log("Activity UI Loaded");

// --- GIPHY INTEGRATION ---
const GIPHY_API_KEY = 'qORQUZBZ0InCpe6QVSTLiX9MUlHyhegF';
let searchTimeout;

window.openGifModal = function () {
    const modal = document.getElementById('gifPickerModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    const input = document.getElementById('gif-search-input');
    if (input) input.focus();
    fetchTrendingGifs();
}

window.closeGifModal = function () {
    const modal = document.getElementById('gifPickerModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

window.handleGifSearch = function (e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    searchTimeout = setTimeout(() => {
        if (query.length > 2) {
            searchGifs(query);
        } else if (query.length === 0) {
            fetchTrendingGifs();
        }
    }, 500);
}

async function fetchTrendingGifs() {
    const container = document.getElementById('gif-results-container');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #888;"><i class="fas fa-spinner fa-spin"></i> Cargando tendencias...</div>';

    try {
        const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`);
        const data = await response.json();
        renderGifResults(data.data);
    } catch (error) {
        console.error("Giphy Error:", error);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #e74c3c;">Error al cargar GIFs.</div>';
    }
}

async function searchGifs(query) {
    const container = document.getElementById('gif-results-container');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #888;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';

    try {
        const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20&rating=g`);
        const data = await response.json();
        renderGifResults(data.data);
    } catch (error) {
        console.error("Giphy Error:", error);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #e74c3c;">Error en la búsqueda.</div>';
    }
}

function renderGifResults(gifs) {
    const container = document.getElementById('gif-results-container');
    container.innerHTML = '';

    if (!gifs || gifs.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #888;">No se encontraron resultados.</div>';
        return;
    }

    gifs.forEach(gif => {
        const url = gif.images.fixed_height.url;
        const div = document.createElement('div');
        div.style.cssText = `
            height: 100px; 
            background-image: url('${url}'); 
            background-size: cover; 
            background-position: center; 
            border-radius: 8px; 
            cursor: pointer; 
            transition: transform 0.2s;
        `;
        div.onmouseover = () => div.style.transform = 'scale(1.05)';
        div.onmouseout = () => div.style.transform = 'scale(1)';
        div.onclick = () => selectGif(url);
        container.appendChild(div);
    });
}

function selectGif(url) {
    window.closeGifModal();
    // Use global attachment handler
    window.currentAttachment = { type: 'image', data: url };
    window.showStagingArea('image');
    document.getElementById('preview-img').src = url;
}


// --- ATTACHMENT LOGIC ---
window.currentAttachment = null;

window.toggleAttachmentUI = function (type) {
    window.clearAttachments();
    const staging = document.getElementById('staging-area');
    staging.style.display = 'block';

    if (type === 'link') {
        document.getElementById('input-link-container').style.display = 'flex';
    } else if (type === 'poll') {
        document.getElementById('input-poll-container').style.display = 'flex';
    }
}

window.confirmLink = function () {
    const url = document.getElementById('link-url').value.trim();
    const text = document.getElementById('link-text').value;
    if (!url) return;
    window.currentAttachment = { type: 'link', url: url, text: text || url };
    window.showStagingArea('badge');
    document.getElementById('staged-badge-text').innerText = "Link Adjunto: " + (text || url);
}

window.confirmPoll = function () {
    const opt1 = document.getElementById('poll-opt1').value;
    const opt2 = document.getElementById('poll-opt2').value;
    if (!opt1 || !opt2) return;
    window.currentAttachment = { type: 'poll', options: [opt1, opt2] };
    window.showStagingArea('badge');
    document.getElementById('staged-badge-text').innerText = "Encuesta Lista";
}

window.showStagingArea = function (mode) {
    const staging = document.getElementById('staging-area');
    staging.style.display = 'block';

    // Hide inputs
    document.getElementById('input-link-container').style.display = 'none';
    document.getElementById('input-poll-container').style.display = 'none';

    // Show specific preview
    if (mode === 'image') document.getElementById('preview-img-container').style.display = 'block';
    if (mode === 'pdf') document.getElementById('preview-pdf-container').style.display = 'flex';
    if (mode === 'badge') document.getElementById('staged-badge').style.display = 'flex';
}

window.clearAttachments = function () {
    window.currentAttachment = null;
    const staging = document.getElementById('staging-area');
    if (staging) staging.style.display = 'none';

    // Hide all containers
    ['preview-img-container', 'preview-pdf-container', 'input-link-container',
        'input-poll-container', 'staged-badge'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

    // Clear inputs
    ['link-url', 'link-text', 'poll-opt1', 'poll-opt2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}


// --- INTERACTION MODALS (COMMENTS / LIKES) ---
window.currentOpenPostId = null;

window.showComments = function (postId) {
    window.currentOpenPostId = postId;
    const modal = document.getElementById('interactionModal');
    document.getElementById('int-title').innerText = "Comentarios";
    document.getElementById('int-footer').style.display = 'flex'; // Show input
    const body = document.getElementById('int-body');
    body.innerHTML = '<div style="text-align:center; padding:20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    modal.classList.add('show');

    // Trigger Data Load
    if (window.loadCommentsForPost) {
        window.loadCommentsForPost(postId);
    }

    setTimeout(() => {
        const input = document.querySelector('.comment-input');
        if (input) input.focus();
    }, 100);
}

window.showLikes = function (postId) {
    const modal = document.getElementById('interactionModal');
    document.getElementById('int-title').innerText = "Personas que reaccionaron";
    document.getElementById('int-footer').style.display = 'none'; // Hide input
    const body = document.getElementById('int-body');
    body.innerHTML = '<div style="text-align:center; padding:20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    modal.classList.add('show');

    // Trigger Data Load
    if (window.loadLikesForPost) {
        window.loadLikesForPost(postId);
    }
}

window.closeModal = function () {
    document.getElementById('interactionModal').classList.remove('show');
    window.currentReplyParentId = null;
    const input = document.querySelector('.comment-input');
    if (input) {
        input.value = "";
        input.placeholder = "Escribe un comentario...";
    }
    window.currentOpenPostId = null;
}

window.currentReplyParentId = null;

window.replyToComment = function (authorName, commentId) {
    const input = document.querySelector('.comment-input');
    if (input) {
        window.currentReplyParentId = commentId;
        input.placeholder = `Respondiendo a ${authorName}...`;
        input.focus();
    }
}


// --- DELETE MODAL ---
let postToDeleteId = null;
let commentToDelete = null; // { id, postId }

window.promptDeletePost = function (postId) {
    postToDeleteId = postId;
    commentToDelete = null;
    document.getElementById('delete-modal-title').innerText = "¿Eliminar Publicación?";
    const modal = document.getElementById('delete-modal');
    modal.classList.add('active');
}

window.promptDeleteComment = function (commentId, postId) {
    commentToDelete = { id: commentId, postId: postId };
    postToDeleteId = null;
    document.getElementById('delete-modal-title').innerText = "¿Eliminar Comentario?";
    const modal = document.getElementById('delete-modal');
    modal.classList.add('active');
}

window.closeDeleteModal = function () {
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('active');
    postToDeleteId = null;
    commentToDelete = null;
}

window.confirmDelete = function () {
    if (postToDeleteId && window.deletePostDB) {
        // Optimistic UI removal for Post
        const card = document.getElementById(`post-${postToDeleteId}`);
        if (card) {
            card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
            card.style.opacity = "0";
            card.style.transform = "scale(0.95) translateY(10px)";
            setTimeout(() => card.remove(), 500);
        }
        window.deletePostDB(postToDeleteId);
    } else if (commentToDelete && window.deleteComment) {
        // Call deleteComment directly (it handles DB and UI logic)
        // NOTE: We rely on deleteComment to NOT ask for confirmation again.
        window.deleteComment(commentToDelete.id, commentToDelete.postId);
    }
    window.closeDeleteModal();
}



// --- SHARED UI EFFECTS ---
// Copied from profile-data.js to maintain exact consistency for Super Admin badges
window.addLiquidGoldEffect = function (badge) {
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
    badge.innerHTML = `<span style="position:relative; z-index:2; color:inherit; text-shadow:0 2px 4px #000;">${badge.innerText}</span>`;

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
        canvas.width = badge.offsetWidth;
        canvas.height = badge.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);


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
    animate();
}

// --- DOM READY INIT ---
document.addEventListener('DOMContentLoaded', () => {

    // File Input Listeners




    // Composer Auto-resize
    const composerInput = document.querySelector('.composer-input');
    if (composerInput) {
        composerInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.scrollHeight > 120) {
                this.style.overflowY = "auto";
            } else {
                this.style.overflowY = "hidden";
            }
        });

        // Enter to publish
        composerInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                // Trigger click on publish button which is handled in data.js
                const btn = document.querySelector('.btn-post');
                if (btn) btn.click();
            }
        });
    }

    // Comment Input Enter
    const commentInput = document.querySelector('.comment-input');
    if (commentInput) {
        commentInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                if (window.postComment) window.postComment();
            }
        });
    }

    // --- DEEP LINK HANDLING ---
    const urlParams = new URLSearchParams(window.location.search);
    const linkedPostId = urlParams.get('post');
    const linkedCommentId = urlParams.get('comment');

    if (linkedPostId) {
        // Wait slightly for UI to settle? No, just open.
        // We rely on window.showComments being available.
        // If not yet available (race condition?), retry.
        const openLinkedPost = () => {
            if (window.showComments) {
                window.showComments(linkedPostId);

                // If there's a comment ID, we want to scroll to it.
                // But comments load asynchronously. 
                // We can use a MutationObserver on the modal body?
                // Or just a dumb polling for now.
                if (linkedCommentId) {
                    const checkComment = setInterval(() => {
                        const body = document.getElementById('int-body');
                        // Try to find by partial ID or data attribute or just text? 
                        // We don't have IDs on comment rows? 
                        // Wait! In activity-data.js buildCommentHTML doesn't assign ID to the DIV?
                        // Let's check... it renders <div class="comment-group" ...
                        // It does NOT seem to have an ID.
                        // Fix: logic needs to find the comment. 
                        // I will need to update activity-data.js to add IDs to comments first.
                        // For now, let's just open the modal.
                        clearInterval(checkComment);
                    }, 1000);
                }

            } else {
                setTimeout(openLinkedPost, 100);
            }
        };
        openLinkedPost();
    }
});
