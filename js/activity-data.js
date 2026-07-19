// activity-data.js - Maneja el Muro y la Barra Lateral

function initActivity() {
    if (!window.firebase || !window.auth || !window.db) {
        console.log("Esperando a Firebase...");
        setTimeout(initActivity, 100);
        return;
    }

    const auth = window.auth;
    const db = window.db;

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("Actividad: Usuario detectado", user.uid);

            try {
                // 1. Cargar datos del usuario actual
                const userDoc = await db.collection('users').doc(user.uid).get();
                let userData = userDoc.exists ? userDoc.data() : {};

                // SYNC PROFILE: If Auth/Local has data but Firestore is missing/different, update it.
                // This ensures "Super Admin" photo is visible to everyone in Likes list.
                const localPhoto = localStorage.getItem('profile_avatar');
                const shouldUpdate =
                    (!userData.photoURL && (user.photoURL || localPhoto)) ||
                    (!userData.displayName && user.displayName) ||
                    (userData.photoURL !== (user.photoURL || localPhoto)) || // Keep synced
                    (!userDoc.exists); // Create if missing

                if (shouldUpdate) {
                    const newPhoto = user.photoURL || localPhoto || userData.photoURL || null;
                    const newName = user.displayName || userData.displayName || 'Usuario';
                    const newRole = userData.role || 'student'; // Don't overwrite role if exists, default to student

                    await db.collection('users').doc(user.uid).set({
                        displayName: newName,
                        photoURL: newPhoto,
                        email: user.email,
                        role: newRole,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Reload data after sync
                    userData = { ...userData, displayName: newName, photoURL: newPhoto, role: newRole };
                    console.log("Perfil sincronizado con Firestore para visibilidad pública.");
                }

                window.userData = userData; // Expose global user data

                // Actualizar Sidebar (Handled by profile-data.js)
                // updateSidebar(user, userData);

                // Mostrar composer solo para admin/profesor
                const role = userData.role || 'student';
                if (role === 'admin' || role === 'teacher') {
                    if (document.getElementById('admin-composer')) {
                        document.getElementById('admin-composer').style.display = 'block';
                    }
                    setupPostCreation(db, user, userData);
                } else {
                    if (document.getElementById('admin-composer')) {
                        document.getElementById('admin-composer').style.display = 'none';
                    }
                }

                // 2. Iniciar escucha de posts
                loadPosts(db, user.uid);

            } catch (e) {
                console.error("Error cargando perfil:", e);
            }
        } else {
            window.location.href = 'login.html';
        }
    });
}

// --- ACTUALIZAR SIDEBAR ---
// Handled by profile-data.js now to avoid redundancy
// function updateSidebar(user, userData) { ... }

// --- LOGICA DE POSTS ---
function loadPosts(db, currentUserId) {
    const feedContainer = document.getElementById('feed-container-dynamic');
    const loader = document.getElementById('feed-loader');

    db.collection('posts').orderBy('createdAt', 'desc').limit(20)
        .onSnapshot((snapshot) => {
            if (loader) loader.style.display = 'none';
            // Only clear initially if not using docChanges logic or if actually empty
            if (snapshot.empty) {
                feedContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">No hay noticias recientes.</div>';
                return;
            }

            // Remove placeholder if it exists and we have data
            if (feedContainer.innerText.includes('No hay noticias')) {
                feedContainer.innerHTML = '';
            }

            snapshot.docChanges().forEach(change => {
                const doc = change.doc;
                const post = doc.data();
                const postId = doc.id;
                const html = createPostHTML(post, postId, currentUserId);

                if (change.type === "added") {
                    // Prepend or Append? Query is desc, so new ones come first.
                    // If we just use insertAdjacentHTML('beforeend'), they will be in order of query result usually.
                    // But docChanges "added" can happen for initial load too.
                    // Safest for 'desc' time feed with limit is usually just putting them in the right place or appending.
                    // Since snapshot maintains order, let's rely on standard logic or just append if it's the first load.
                    // Actually, for "realtime" new posts (added later), they should go to top.
                    // Complex sorting: iterate snapshot.docs to ensure order?
                    // Simpler approach for now:

                    // IF it's a completely new post (not initial load), it should be at top.
                    // But on initial load, they come as "added".
                    // Let's use a simple strategy: Find the element it should be after/before?
                    // Optimized: just use a data-list approach or re-sort?
                    // Re-sorting DOM is heavy.
                    // Let's rely on the fact that for "limit 20 desc", initial load adds them in order.
                    // New posts (created now) triggers "added" at index 0.

                    if (change.newIndex === 0 && feedContainer.children.length > 0) {
                        feedContainer.insertAdjacentHTML('afterbegin', html);
                    } else {
                        feedContainer.insertAdjacentHTML('beforeend', html);
                    }

                    // Trigger Effect if Admin Badge exists
                    if (window.addLiquidGoldEffect) {
                        const badge = document.getElementById(`admin-badge-${postId}`);
                        if (badge) setTimeout(() => window.addLiquidGoldEffect(badge), 50);
                    }

                }
                if (change.type === "modified") {
                    const existingCard = document.getElementById(`post-${postId}`);
                    if (existingCard) {
                        // Create temp element to compare new content with old
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = html.trim();
                        const newCard = tempDiv.firstChild;

                        // Check if only likes/comments changed by comparing other parts? 
                        // Simplified approach: Just update the dynamic parts directly from the new HTML's data
                        // But we don't prefer replacing the whole HTML if we can avoid it (to stop flickering)

                        // 1. Update Likes Count & Icon
                        // Like btn is the first child of footer
                        const oldLikeBtn = existingCard.querySelector('.post-footer .footer-btn:first-child');
                        const newLikeBtn = newCard.querySelector('.post-footer .footer-btn:first-child');
                        if (oldLikeBtn && newLikeBtn) {
                            // Only update if changed to avoid minor repaints? No, simple replacement is safer for sync.
                            oldLikeBtn.className = newLikeBtn.className;
                            oldLikeBtn.innerHTML = newLikeBtn.innerHTML;
                        }

                        // 2. Update Comment Count
                        const oldCommentBtn = existingCard.querySelector('.footer-btn[onclick*="showComments"]');
                        const newCommentBtn = newCard.querySelector('.footer-btn[onclick*="showComments"]');
                        if (oldCommentBtn && newCommentBtn) {
                            oldCommentBtn.innerHTML = newCommentBtn.innerHTML;
                        }

                        // 3. Update Text Content if changed (Edits)
                        const oldContent = existingCard.querySelector('.post-content p');
                        const newContent = newCard.querySelector('.post-content p');
                        if (oldContent && newContent && oldContent.innerHTML !== newContent.innerHTML) {
                            oldContent.innerHTML = newContent.innerHTML;
                        }

                        // If attachment changed... (Rare, but possible for edits)
                        const oldAttachment = existingCard.querySelector('.pdf-attachment, .post-image, .poll-container');
                        const newAttachment = newCard.querySelector('.pdf-attachment, .post-image, .poll-container');
                        // If structure differs significantly, fallback to full replace
                        if ((!oldAttachment && newAttachment) || (oldAttachment && !newAttachment)) {
                            existingCard.outerHTML = html;
                        } else if (oldAttachment && newAttachment && oldAttachment.classList.contains('poll-container')) {
                            // POLL UPDATE: If it's a poll, we MUST update the content because percentages/votes change
                            oldAttachment.innerHTML = newAttachment.innerHTML;
                        }
                    }
                }
                if (change.type === "removed") {
                    const existingCard = document.getElementById(`post-${postId}`);
                    if (existingCard) {
                        existingCard.remove();
                    }
                }
            });
        });
}

function createPostHTML(post, postId, currentUserId) {
    let dateStr = 'Justo ahora';
    if (post.createdAt) {
        const date = post.createdAt.toDate();
        const now = new Date();
        const diff = (now - date) / 1000 / 60;
        if (diff < 60) dateStr = `Hace ${Math.floor(diff)} min`;
        else if (diff < 1440) dateStr = `Hace ${Math.floor(diff / 60)} h`;
        else dateStr = date.toLocaleDateString();
    }

    let authorRoleLabel = '<span style="color:#888;">Miembro</span>';
    if (post.authorRole === 'teacher') authorRoleLabel = '<span style="color:#3498db; font-weight:600;">Profesor</span>';
    if (post.authorRole === 'admin') {
        // Estilo exacto de la sidebar (compacto)
        const style = `
            background: #000; 
            color: #FFD700; 
            font-weight: 900; 
            border: 1px solid #FFD700; 
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); 
            text-transform: uppercase; 
            padding: 2px 12px; 
            border-radius: 50px; 
            letter-spacing: 1px; 
            font-size: 0.6rem; 
            position: relative; 
            text-shadow: 0 2px 4px #000; 
            display: inline-block;
            white-space: nowrap;
            vertical-align: middle;
            margin-left: 5px;
        `;
        authorRoleLabel = `<span id="admin-badge-${postId}" style="${style}">👑 SUPER ADMIN</span>`;
    }

    let attachmentHTML = '';
    let tag = 'Nuevo';
    const attachment = post.attachment;

    if (attachment) {
        if (attachment.type === 'image') {
            attachmentHTML = `<img src="${attachment.data}" class="post-image" alt="Post Image">`;
            tag = 'Foto';
        } else if (attachment.type === 'pdf') {
            attachmentHTML = `
                <a href="${attachment.data}" download="${attachment.name}" class="pdf-attachment" style="text-decoration: none; color: inherit;">
                    <i class="fas fa-file-pdf pdf-icon"></i>
                    <div class="pdf-info">
                        <h5>${attachment.name}</h5>
                        <span>${attachment.size || 'PDF Document'}</span>
                    </div>
                    <i class="fas fa-download" style="margin-left: auto; color: #888;"></i>
                </a>`;
            tag = 'PDF';
        } else if (attachment.type === 'link') {
            let domain = attachment.url;
            try { domain = new URL(attachment.url).hostname; } catch (e) { }
            attachmentHTML = `
                <a href="${attachment.url}" target="_blank" class="pdf-attachment" style="text-decoration: none; color: inherit; border-color: #3498db; background: rgba(52, 152, 219, 0.05);">
                    <img src="https://icons.duckduckgo.com/ip3/${domain}.ico" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                    <div class="pdf-info">
                        <h5 style="color: #3498db;">${attachment.text}</h5>
                        <span style="text-transform: uppercase;">${domain}</span>
                    </div>
                    <i class="fas fa-external-link-alt" style="margin-left: auto; color: #3498db;"></i>
                </a>`;
            tag = 'Enlace';
        } else if (attachment.type === 'poll') {
            const options = attachment.options || ['Opción 1', 'Opción 2'];
            const votes = attachment.votes || {}; // { optionIndex: [userIds] }

            // Calculate Totals
            let totalVotes = 0;
            const voteCounts = options.map((_, idx) => {
                const count = votes[idx] ? votes[idx].length : 0;
                totalVotes += count;
                return count;
            });

            // Check if current user voted
            let userVoteIndex = -1;
            Object.keys(votes).forEach(idx => {
                if (votes[idx].includes(currentUserId)) userVoteIndex = parseInt(idx);
            });
            const hasVoted = userVoteIndex > -1;

            let pollHTML = '<div class="poll-container">';

            options.forEach((opt, idx) => {
                const count = voteCounts[idx] || 0;
                const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isSelected = userVoteIndex === idx;

                // Visual Styles
                const bgStyle = hasVoted
                    ? `background: linear-gradient(90deg, rgba(52, 152, 219, 0.2) ${percentage}%, var(--bg-color, #f4f4f4) ${percentage}%); border-color: ${isSelected ? '#3498db' : 'var(--border-color, #ddd)'};`
                    : `background: var(--bg-color, #f4f4f4); border: 1px solid var(--border-color, #ddd); cursor: pointer; hover:background: var(--hover-color, #eee);`;

                // Allow switching votes: DISABLED. Once voted, locked.
                const clickAction = hasVoted ? '' : `onclick="votePoll('${postId}', ${idx})"`;
                // Remove cursor pointer if voted
                const cursorStyle = hasVoted ? '' : 'cursor: pointer;';

                const checkMark = isSelected ? '<i class="fas fa-check-circle" style="color:#3498db; margin-left: auto;"></i>' : '';
                const percentText = hasVoted ? `<span style="font-size:0.8rem; color:var(--text-color, #666); margin-left: 10px;">${percentage}% (${count})</span>` : '';

                pollHTML += `
                    <div class="poll-option" ${clickAction} style="margin-top: ${idx > 0 ? '10px' : '0'}; ${cursorStyle}">
                        <div class="poll-bar-bg" style="${bgStyle} padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; transition: all 0.2s;">
                            <span style="font-weight: 600; color: var(--title-color, #333);">${opt}</span>
                            ${percentText}
                            ${checkMark}
                        </div>
                    </div>`;
            });

            pollHTML += `<div style="text-align: right; font-size: 0.75rem; color: #888; margin-top: 5px;">${totalVotes} votos totales</div></div>`;
            attachmentHTML = pollHTML;
            tag = 'Encuesta';
        }
    }

    const likesCount = post.likes ? post.likes.length : 0;
    const isLiked = post.likes && post.likes.includes(currentUserId);
    const likeClass = isLiked ? 'fas fa-heart' : 'far fa-heart';
    const btnClass = isLiked ? 'footer-btn liked' : 'footer-btn';

    // Use promptDeletePost from activity-ui.js
    const deleteBtn = (post.authorId === currentUserId)
        ? `<i class="fas fa-trash-alt delete-btn" onclick="promptDeletePost('${postId}')" style="cursor: pointer; color: #e74c3c; opacity: 0.6; transition: opacity 0.2s;" title="Eliminar"></i>`
        : '';

    return `
    <div class="post-card" id="post-${postId}">
        <div class="post-header">
            <!-- Use live avatar if it's the current user, or fallback to stored -->
            <div class="post-author-img" style="background-image: url('${(post.authorId === currentUserId ? (window.userData?.photoURL || localStorage.getItem("profile_avatar") || post.authorAvatar) : post.authorAvatar) || ''}'); background-color:#ccc;"></div>
            <div class="post-meta">
                <h4>${post.authorName} <i class="fas fa-check-circle" style="color: #3498db; font-size: 0.8rem;"></i></h4>
                <span>${dateStr} • ${authorRoleLabel}</span>
            </div>
            <div style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
                <div class="post-tag">${tag}</div>
                ${deleteBtn}
            </div>
        </div>
        <div class="post-content">
            <p>${post.content ? post.content.replace(/\n/g, '<br>') : ''}</p>
        </div>
        ${attachmentHTML}
        
        <div class="post-footer">
            <div class="${btnClass}">
                <i class="${likeClass}" onclick="event.stopPropagation(); toggleLikeDB('${postId}', '${currentUserId}')" style="cursor: pointer; padding: 5px;"></i> 
                <span onclick="event.stopPropagation(); showLikes('${postId}')" style="cursor: pointer; padding: 5px;">${likesCount} Likes</span>
            </div>
            <div class="footer-btn" onclick="showComments('${postId}')">
                <i class="far fa-comment"></i> <span>${post.commentsCount || 0}</span> Comentarios
            </div>
        </div>
    </div>`;
}

// --- CREACIÓN DE POSTS ---
function setupPostCreation(db, user, userData) {
    const btn = document.querySelector('.btn-post');
    const input = document.querySelector('.composer-input');

    if (!btn || !input) return;

    btn.onclick = async () => {
        const content = input.value.trim();
        const attachment = window.currentAttachment; // From UI

        if (!content && !attachment) return;

        btn.disabled = true;
        btn.innerText = "Publicando...";

        try {
            await db.collection('posts').add({
                content: content,
                authorId: user.uid,
                authorName: userData.displayName || user.displayName || 'Admin',
                authorRole: userData.role || 'admin',
                authorIsCreator: userData.isCreator === true,
                authorAvatar: userData.photoURL || user.photoURL || localStorage.getItem('profile_avatar'),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                attachment: attachment || null,
                likes: []
            });

            input.value = '';
            if (window.clearAttachments) window.clearAttachments();
            btn.innerText = "Publicar";
            btn.disabled = false;

        } catch (e) {
            console.error("Error al publicar:", e);
            alert("Error al publicar."); // Fallback
            btn.innerText = "Publicar";
            btn.disabled = false;
        }
    };
}

// --- COMMENTS LOGIC ---
window.loadCommentsForPost = function (postId) {
    const db = window.db;
    const body = document.getElementById('int-body');

    // State for pagination
    if (!window.commentPagination) window.commentPagination = {};
    window.commentPagination[postId] = { limit: 20, unsubscribe: null };

    const loadBatch = (limit) => {
        if (window.commentPagination[postId].unsubscribe) {
            window.commentPagination[postId].unsubscribe();
        }

        window.commentPagination[postId].unsubscribe = db.collection('posts').doc(postId).collection('comments')
            .orderBy('createdAt', 'desc') // Newest First
            .limit(limit)
            .onSnapshot(snapshot => {
                const wasEmpty = body.innerHTML === '';
                const currentScroll = body.scrollTop;
                // const isNearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 100;

                body.innerHTML = '';
                if (snapshot.empty) {
                    body.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">Sé el primero en comentar.</div>';
                    return;
                }

                // Render Logic (Same as before)
                const comments = [];
                snapshot.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));

                const parents = comments.filter(c => !c.parentId);
                const replies = comments.filter(c => c.parentId);

                // State tracking for pagination (persists across snapshots)
                if (!window.replyStates) window.replyStates = {};
                const BATCH_SIZE = 8;

                parents.forEach(parent => {
                    const parentHTML = buildCommentHTML(parent, postId, false);
                    body.insertAdjacentHTML('beforeend', parentHTML);

                    // Find replies for this parent
                    const myReplies = replies.filter(r => r.parentId === parent.id);
                    if (myReplies.length > 0) {
                        const replyContainer = document.createElement('div');
                        replyContainer.className = 'reply-container';
                        replyContainer.id = `replies-${parent.id}`;
                        replyContainer.style.marginLeft = '50px';
                        replyContainer.style.borderLeft = '2px solid rgba(0,0,0,0.1)';
                        replyContainer.style.paddingLeft = '10px';

                        const currentLimit = window.replyStates[parent.id] || BATCH_SIZE;

                        myReplies.forEach((reply, index) => {
                            const isHidden = index >= currentLimit;
                            const replyHTML = buildCommentHTML(reply, postId, true, isHidden);
                            replyContainer.insertAdjacentHTML('beforeend', replyHTML);
                        });

                        if (myReplies.length > BATCH_SIZE) {
                            const remaining = myReplies.length - currentLimit;
                            let btnHTML = '';
                            if (remaining > 0) {
                                btnHTML = `<div class="reply-pagination-btn" onclick="expandReplies('${parent.id}', ${myReplies.length})" style="padding: 5px 10px; color: #3498db; cursor: pointer; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-chevron-down"></i> Ver ${Math.min(remaining, BATCH_SIZE)} respuestas más</div>`;
                            } else {
                                btnHTML = `<div class="reply-pagination-btn" onclick="collapseReplies('${parent.id}')" style="padding: 5px 10px; color: #7f91a4; cursor: pointer; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-chevron-up"></i> Comprimir respuestas</div>`;
                            }
                            replyContainer.insertAdjacentHTML('beforeend', btnHTML);
                        }

                        body.appendChild(replyContainer);
                    }
                });

                // Auto-scroll logic:
                // If First Load (limit == 20), scroll to TOP (Newest).
                // If Infinite Scroll (limit > 20), maintain position to allow scrolling down to older.

                if (window.commentPagination[postId].limit === 20) {
                    setTimeout(() => body.scrollTop = 0, 50);
                } else {
                    body.scrollTop = currentScroll;
                }
                setTimeout(() => window.resolveMissingAvatars(), 100);
            });
    };

    // Initial Load
    loadBatch(20);

    // Scroll Listener for Infinite Scroll
    const onScroll = () => {
        if (body.scrollTop + body.clientHeight >= body.scrollHeight - 50) {
            // Near Bottom
            const currentLimit = window.commentPagination[postId].limit;
            // Debounce or check? Firestore snapshot is fast, but let's avoid rapid fire.
            // Check if we already have a listener for next batch?
            // Just increment.
            // But we need to know if we reached max?
            // We don't verify total count here, we just ask for more.
            // If snapshot size didn't increase, maybe we stop?
            // Store last size?

            // Optimization: Only increase if we haven't reached end. 
            // Hard to know without metadata.
            // Just increase:
            const newLimit = currentLimit + 20;
            if (newLimit > 500) return; // Hard cap for safety? Or just let it fly.

            // Only update if we actually change limit and throttle
            if (window.commentPagination[postId].limit !== newLimit) {
                window.commentPagination[postId].limit = newLimit;
                // Delay slightly to prevent thrashing
                loadBatch(newLimit);
            }
        }
    };

    // Remove old listener if any (from previous opens)
    // Actually Modal open creates new body, but listener might persist on element?
    // Element is reused? "interactionModal". Yes.
    // So we must remove old scroll listener.
    body.onscroll = null; // Clear old
    // Use onscroll property or addEventListener with cleanup?
    // Assigning to onscroll is safer for single-listener cleanup.
    body.onscroll = onScroll;
}

// --- PAGINATION HELPERS ---
window.expandReplies = function (parentId, totalCount) {
    if (!window.replyStates) window.replyStates = {};
    const current = window.replyStates[parentId] || 8;
    const nextStep = current + 8;

    window.replyStates[parentId] = nextStep; // Update state

    // Immediate UI Update (without waiting for snapshot)
    const container = document.getElementById(`replies-${parentId}`);
    if (container) {
        const hiddenItems = container.querySelectorAll('.comment-group[style*="display: none"]');
        for (let i = 0; i < 8 && i < hiddenItems.length; i++) {
            hiddenItems[i].style.display = 'flex'; // Change from 'block' to 'flex' to match original comment-group display
        }

        // Update Button logic is tricky without re-render, but effectively we just wait for snapshot?
        // No, snapshot won't fire on local state change. We must force re-render or manually update DOM.
        // Simplest: Manually remove button and append new one.
        const btn = container.querySelector('.reply-pagination-btn');
        if (btn) btn.remove();

        const remaining = totalCount - nextStep;
        if (remaining > 0) {
            container.insertAdjacentHTML('beforeend', `
                <div class="reply-pagination-btn" onclick="expandReplies('${parentId}', ${totalCount})" style="padding: 5px 10px; color: #3498db; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                    <i class="fas fa-chevron-down"></i> Ver ${Math.min(remaining, 8)} respuestas más
                </div>`);
        } else {
            container.insertAdjacentHTML('beforeend', `
                <div class="reply-pagination-btn" onclick="collapseReplies('${parentId}')" style="padding: 5px 10px; color: #7f91a4; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                    <i class="fas fa-chevron-up"></i> Comprimir respuestas
                </div>`);
        }
    }
}

window.collapseReplies = function (parentId) {
    if (!window.replyStates) window.replyStates = {};
    window.replyStates[parentId] = 8; // Reset

    // UI Logic
    const container = document.getElementById(`replies-${parentId}`);
    if (container) {
        const items = container.querySelectorAll('.comment-group');
        items.forEach((item, index) => {
            if (index >= 8) item.style.display = 'none';
        });

        const btn = container.querySelector('.reply-pagination-btn');
        if (btn) btn.remove();

        // Add back "Show More"
        // Need total count? We can approximate or just trigger a re-render if we had access to data.
        // Or just cheat and say "See all" or check hidden length.
        const hiddenCount = items.length - 8;
        if (hiddenCount > 0) { // Only show "Ver más" if there are actually hidden replies
            container.insertAdjacentHTML('beforeend', `
                    <div class="reply-pagination-btn" onclick="expandReplies('${parentId}', ${items.length})" style="padding: 5px 10px; color: #3498db; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                        <i class="fas fa-chevron-down"></i> Ver ${Math.min(hiddenCount, 8)} respuestas más
                    </div>`);
        }
    }
}

function buildCommentHTML(comment, postId, isReply, isHidden = false) {
    const isMe = window.auth.currentUser && window.auth.currentUser.uid === comment.authorId;
    const displayAvatar = isMe ? (window.userData?.photoURL || localStorage.getItem("profile_avatar") || comment.authorAvatar) : comment.authorAvatar;

    // If it's a reply, maybe don't show "Responder" button again to prevent deep nesting UI clutter?
    // Or allow 1-level deep replies (tagging parent). Facebook usually allows replying to replies.

    return `
    <div id="comment-${comment.id}" class="comment-group" style="margin-bottom: ${isReply ? '10px' : '15px'}; ${isHidden ? 'display: none;' : ''}">
        <div class="comment-row" style="padding: ${isReply ? '10px 0' : '15px 20px'}; border-bottom: ${isReply ? 'none' : '1px solid rgba(0, 0, 0, 0.05)'}; display: flex; gap: 12px;">
            ${(displayAvatar && displayAvatar !== 'null' && displayAvatar !== 'undefined') ?
            `<div class="ur-avatar" style="width: ${isReply ? '30px' : '40px'}; height: ${isReply ? '30px' : '40px'}; border-radius: 50%; background: #ddd; background-size: cover; background-image: url('${displayAvatar}')"></div>` :
            `<div class="ur-avatar avatar-placeholder" data-author-id="${comment.authorId}" style="width: ${isReply ? '30px' : '40px'}; height: ${isReply ? '30px' : '40px'}; border-radius: 50%; background: var(--secondary-color); color: white; display: flex; align-items: center; justify-content: center; font-size: ${isReply ? '0.7rem' : '0.9rem'}; font-weight: 600;">${(comment.authorName || 'U').charAt(0).toUpperCase()}</div>`
        }
            <div class="comment-content" style="flex: 1;">
                <div class="comment-bubble" style="background: rgba(0, 0, 0, 0.03); padding: 10px 15px; border-radius: 12px; border-top-left-radius: 0;">
                    <span class="c-name" style="font-weight: 600; font-size: 0.85rem; color: var(--title-color); display: block; margin-bottom: 2px;">${comment.authorName}</span>
                    <span class="c-text" style="font-size: 0.9rem; color: var(--text-color);">${comment.content}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                    <span class="c-time" style="font-size: 0.7rem; color: #888;">${comment.createdAt ? new Date(comment.createdAt.toDate()).toLocaleTimeString() : '...'}</span>
                    ${!isReply ? `<span class="c-reply" onclick="replyToComment('${comment.authorName}', '${comment.id}')" style="font-size: 0.75rem; font-weight: 600; cursor: pointer; color: #65676b; margin-left: 10px;">Responder</span>` : ''}
                    ${(window.userData?.role === 'admin' || window.auth.currentUser?.uid === comment.authorId) ?
            `<i class="fas fa-trash-alt" onclick="promptDeleteComment('${comment.id}', '${postId}')" style="cursor: pointer; color: #e74c3c; opacity: 0.6; font-size: 0.8rem; margin-left: 10px;"></i>` : ''}
                </div>
            </div>
        </div>
    </div>`;
} // Closing buildCommentHTML

window.postComment = async function () {
    const input = document.querySelector('.comment-input');
    const text = input.value.trim();
    const postId = window.currentOpenPostId;

    if (!text || !postId || !window.auth.currentUser) return;

    try {
        const user = window.auth.currentUser;
        const payload = {
            content: text,
            authorId: user.uid,
            authorName: user.displayName || 'Usuario',
            authorAvatar: user.photoURL || localStorage.getItem('profile_avatar') || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add parentId if replying
        if (window.currentReplyParentId) {
            payload.parentId = window.currentReplyParentId;
        }

        const commentRef = await window.db.collection('posts').doc(postId).collection('comments').add(payload);

        // --- NOTIFICATION LOGIC ---
        try {
            // Determine Recipient
            let recipientId = null;
            let notifMessage = '';
            let notifType = 'comment'; // or 'reply'

            if (payload.parentId) {
                // It's a reply: Notify the Parent Comment Author
                const parentDoc = await window.db.collection('posts').doc(postId).collection('comments').doc(payload.parentId).get();
                if (parentDoc.exists) {
                    recipientId = parentDoc.data().authorId;
                    notifMessage = `respondió a tu comentario en el Muro: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`;
                    notifType = 'reply';
                }
            } else {
                // It's a top-level comment: Notify the Post Author
                const postDoc = await window.db.collection('posts').doc(postId).get();
                if (postDoc.exists) {
                    recipientId = postDoc.data().authorId;
                    notifMessage = `comentó en tu publicación: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`;
                    notifType = 'comment';
                }
            }

            // Create Notification (if recipient exists and is NOT me)
            if (recipientId && recipientId !== user.uid) {
                await window.db.collection('notifications').add({
                    recipientId: recipientId,
                    senderId: user.uid,
                    senderName: user.displayName || 'Alguien',
                    senderAvatar: user.photoURL || null,
                    type: notifType,
                    message: notifMessage,
                    link: `activity.html?post=${postId}&comment=${commentRef.id}`, // Deep link logic (TODO: Handle in activity.html)
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

        } catch (notifErr) {
            console.error("Error sending notification:", notifErr);
        }

        // Reset Reply State
        window.currentReplyParentId = null;
        input.placeholder = "Escribe un comentario...";

        input.value = '';

        // Update comment count on parent post
        window.db.collection('posts').doc(postId).update({
            commentsCount: firebase.firestore.FieldValue.increment(1)
        });

    } catch (e) {
        console.error("Error posting comment:", e);
    }
}

window.deleteComment = async function (commentId, postId) {
    // Confirmation handled by Modal in activity-ui.js

    try {
        const db = window.db;
        const commentsRef = db.collection('posts').doc(postId).collection('comments');

        // 1. Check for replies (Cascade Delete)
        const repliesSnapshot = await commentsRef.where('parentId', '==', commentId).get();

        const batch = db.batch();
        let deleteCount = 1; // The parent itself

        // Delete Parent
        batch.delete(commentsRef.doc(commentId));

        // Delete Children
        repliesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
            deleteCount++;
        });

        await batch.commit();

        // 2. Decrement counter by total deleted (Parent + Children)
        db.collection('posts').doc(postId).update({
            commentsCount: firebase.firestore.FieldValue.increment(-deleteCount)
        });

    } catch (e) {
        console.error("Error deleting comment:", e);
        alert("Error al eliminar comentario.");
    }
};

// --- LIKES LOGIC ---
window.loadLikesForPost = async function (postId) {
    const body = document.getElementById('int-body');
    const db = window.db;

    try {
        const postDoc = await db.collection('posts').doc(postId).get();
        if (!postDoc.exists) return;

        const likes = postDoc.data().likes || [];

        if (likes.length === 0) {
            body.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">Nadie ha reaccionado aún.</div>';
            return;
        }

        body.innerHTML = '';

        // Fetch users (Limit to 20 for perf? Or use Promise.all)
        // Note: For production, this should be paginated or optimized.
        const promises = likes.slice(0, 50).map(uid => db.collection('users').doc(uid).get());
        const userDocs = await Promise.all(promises);

        userDocs.forEach((uDoc, index) => {
            let u = {};
            const uid = likes[index]; // Get UID from original array

            if (uDoc.exists) {
                u = uDoc.data();
            } else if (uid === window.auth.currentUser?.uid) {
                // Fallback for current user if their public doc is missing
                const currentUser = window.auth.currentUser;
                u = {
                    photoURL: currentUser.photoURL || window.userData?.photoURL || localStorage.getItem('profile_avatar'),
                    displayName: currentUser.displayName || window.userData?.displayName || 'Tú',
                    role: window.userData?.role || 'admin'
                };
            } else {
                // Unknown user (deleted?)
                u = { displayName: 'Usuario Desconocido', role: 'Miembro' };
            }

            const html = `
            <div class="user-row" style="display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.05);">
                <div class="ur-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: #ddd; background-size: cover; background-image: url('${u.photoURL || ''}')"></div>
                <div class="ur-info" style="flex: 1;">
                    <span class="ur-name" style="display: block; font-weight: 600; color: var(--text-color); font-size: 0.9rem;">${u.displayName || 'Usuario'}</span>
                    <span class="ur-role" style="font-size: 0.75rem; color: #888;">${u.role || 'Estudiante'}</span>
                </div>
            </div>`;
            body.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Error loading likes", e);
        body.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Error cargando me gusta.</div>';
    }
}

window.deletePostDB = async function (postId) {
    // No confirmation here, UI handled it.
    try { await window.db.collection('posts').doc(postId).delete(); }
    catch (e) { console.error(e); }
};

window.toggleLikeDB = async function (postId, userId) {
    const postRef = window.db.collection('posts').doc(postId);
    try {
        await window.db.runTransaction(async (t) => {
            const doc = await t.get(postRef);
            if (!doc.exists) return;
            const likes = doc.data().likes || [];
            const index = likes.indexOf(userId);
            if (index > -1) likes.splice(index, 1); else likes.push(userId);
            t.update(postRef, { likes: likes });
        });
    } catch (e) { console.error(e); }
};

initActivity();

// --- SELF-HEALING AVATARS (Lazy Load) ---
const avatarCache = {}; // Memory cache prevents duplicate reads
window.resolveMissingAvatars = async function () {
    const targets = document.querySelectorAll('.avatar-placeholder');
    if (targets.length === 0) return;

    const ids = new Set([...targets].map(el => el.dataset.authorId));

    for (const uid of ids) {
        if (!uid || uid === 'undefined') continue;

        // Check Cache first
        if (avatarCache[uid] === undefined) {
            try {
                const doc = await window.db.collection('users').doc(uid).get();
                if (doc.exists && doc.data().photoURL) {
                    avatarCache[uid] = doc.data().photoURL;
                } else {
                    avatarCache[uid] = null; // Don't retry if really null
                }
            } catch (e) {
                console.error("Avatar fetch error:", e);
                avatarCache[uid] = null;
            }
        }

        const url = avatarCache[uid];
        if (url) {
            // Update all placeholders for this UID
            document.querySelectorAll(`.avatar-placeholder[data-author-id="${uid}"]`).forEach(el => {
                el.style.backgroundImage = `url('${url}')`;
                el.innerText = ''; // Remove initial
                el.style.backgroundSize = 'cover';
                el.style.backgroundColor = '#ddd';
                el.classList.remove('avatar-placeholder'); // Done
            });
        }
    }
};

// --- POLL VOTING LOGIC ---
window.votePoll = async function (postId, optionIndex) {
    if (!window.auth.currentUser) return;
    const userId = window.auth.currentUser.uid;
    const postRef = window.db.collection('posts').doc(postId);

    try {
        // Optimistic UI Feedback (Immediate)
        const postCard = document.getElementById(`post-${postId}`);
        if (postCard) {
            const allOpts = postCard.querySelectorAll('.poll-bar-bg');
            allOpts.forEach(el => el.style.opacity = '0.7'); // Dim to show processing
            const targetOpt = postCard.querySelectorAll('.poll-option')[optionIndex]?.querySelector('.poll-bar-bg');
            if (targetOpt) {
                targetOpt.style.border = '2px solid #3498db'; // Highlight selection immediately
                targetOpt.innerHTML += ' <i class="fas fa-spinner fa-spin" style="margin-left:auto; color:#3498db;"></i>';
            }
        }

        await window.db.runTransaction(async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists) throw "Post does not exist!";

            const postData = postDoc.data();
            const attachment = postData.attachment;

            if (!attachment || attachment.type !== 'poll') return;

            let votes = attachment.votes || {};

            // 1. Check if already voted (Strict Mode)
            let previousVoteIndex = -1;
            Object.keys(votes).forEach(idx => {
                if (votes[idx].includes(userId)) previousVoteIndex = parseInt(idx);
            });

            // STRICT RULE: Once voted, cannot change.
            if (previousVoteIndex > -1) {
                console.warn("User already voted on this poll (Server Check).");
                return;
            }

            // 2. Add new vote
            if (!votes[optionIndex]) votes[optionIndex] = [];
            votes[optionIndex].push(userId);

            transaction.update(postRef, { 'attachment.votes': votes });
        });
        console.log("Vote recorded");
    } catch (e) {
        console.error("Poll vote failed:", e);
    }
}
