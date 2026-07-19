/* Extracted Script */

                    // Self-repair: Remove duplicate selection bars if they exist outside the chat area
                    document.addEventListener('DOMContentLoaded', () => {
                        const bars = document.querySelectorAll('#selection-bar');
                        if (bars.length > 1) {
                            const correctBar = document.querySelector('.chat-area #selection-bar');
                            bars.forEach(b => {
                                if (b !== correctBar && correctBar) {
                                    b.remove(); // Remove legacy bars
                                }
                            });
                        }
                    });
                

/* Extracted Script */

            // ... (Previous Scripts) ...
            const menuTrigger = document.getElementById('menu-trigger');
            const chatMenu = document.getElementById('chatDropdown'); // Updated ID

            menuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                chatMenu.classList.toggle('show');
                menuTrigger.classList.toggle('active');
            });

            window.addEventListener('click', () => {
                if (chatMenu && chatMenu.classList.contains('show')) {
                    chatMenu.classList.remove('show');
                    menuTrigger.classList.remove('active');
                }
            });

            // Background Picker
            function closeBgPicker() { document.getElementById('bg-modal').classList.remove('show'); }
            function setChatBg(bg) {
                const chatArea = document.getElementById('main-chat-area');
                if (bg === 'default') {
                    chatArea.style.background = ''; // Revert to CSS assets
                } else {
                    chatArea.style.background = bg;
                }
                closeBgPicker();
            }

            // --- TYPING & SEND LOGIC ---
            const attachBtn = document.getElementById('attach-btn');
            const attachMenu = document.getElementById('attach-menu');
            const hdPreviewBtn = document.getElementById('hd-preview-btn');
            const inputMsg = document.getElementById('input-msg');
            const actionContainer = document.getElementById('action-container');
            const chatInputArea = document.getElementById('chat-input-area');
            const gifUploadInput = document.getElementById('gif-upload-input'); // Added for GIF feature

            // --- PRESENCE EVENT LISTENERS ---
            if (inputMsg) {
                let typingTimeout;
                inputMsg.addEventListener('input', () => {
                    window.presenceService.setTyping(true);
                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        window.presenceService.setTyping(false);
                    }, 3000);
                });
                inputMsg.addEventListener('blur', () => {
                    window.presenceService.setTyping(false);
                });
            }

            let recTimerInterval;
            let recSeconds = 0;
            let audioContext;
            let analyser;
            let microphone;
            let visualizerFrame;
            const visualizerContainer = document.getElementById('visualizer-container');
            const BAR_COUNT = 30; // Number of bars

            // Create bars initially
            for (let i = 0; i < BAR_COUNT; i++) {
                const bar = document.createElement('div');
                bar.classList.add('wave-bar');
                visualizerContainer.appendChild(bar);
            }

            // Audio Sounds
            const audioSend = new Audio('assets/audio/sonido 1.mp3');
            const audioReceive = new Audio('assets/audio/sonido 2.mp3');

            // Toggle HD Button on Attach - REMOVED (Handled in Preview)
            // Toggle Attach Menu on Click
            attachBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (attachMenu) {
                    attachMenu.classList.toggle('show');
                    attachBtn.classList.toggle('active');
                }
            });

            // Close menu on outside click
            window.addEventListener('click', (e) => {
                if (attachMenu && attachMenu.classList.contains('show')) {
                    attachMenu.classList.remove('show');
                    attachBtn.classList.remove('active');
                }
            });

            // Handle Image Selection
            const imageInput = document.getElementById('image-upload-input');
            imageInput.addEventListener('change', function (e) {
                if (this.files && this.files[0]) {
                    const file = this.files[0];

                    // Strict validation
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                    if (!allowedTypes.includes(file.type)) {
                        alert('Solo se permiten imágenes (JPG, PNG, WEBP) o GIFs.');
                        this.value = '';
                        return;
                    }

                    const reader = new FileReader();

                    reader.onload = function (e) {
                        const imageUrl = e.target.result;
                        openPreviewModal(imageUrl);
                    }

                    reader.readAsDataURL(file);
                }
                // Reset input so same file can be selected again
                this.value = '';
            });

            // Handle GIF Selection (Fix for persistence bug)
            if (gifUploadInput) {
                gifUploadInput.addEventListener('change', function (e) {
                    if (this.files && this.files[0]) {
                        const file = this.files[0];
                        if (file.type !== 'image/gif') {
                            alert('Por favor selecciona un archivo GIF.');
                            this.value = '';
                            return;
                        }
                        const reader = new FileReader();
                        reader.onload = function (e) {
                            openPreviewModal(e.target.result);
                        }
                        reader.readAsDataURL(file);
                    }
                    this.value = ''; // Reset to allow re-selection
                });
            }

            // Handle Paste Image (Ctrl+V)
            inputMsg.addEventListener('paste', function (e) {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let index in items) {
                    const item = items[index];
                    if (item.kind === 'file' && item.type.startsWith('image/')) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = function (event) {
                            openPreviewModal(event.target.result);
                        };
                        reader.readAsDataURL(blob);
                    }
                }
            });

            // --- PREVIEW MODAL LOGIC ---
            const previewModal = document.getElementById('preview-modal');
            const previewImg = document.getElementById('preview-img-element');
            const previewCaption = document.getElementById('preview-caption');
            let currentPreviewUrl = '';

            function openPreviewModal(url) {
                currentPreviewUrl = url;
                previewImg.src = url;
                previewCaption.value = '';
                previewCaption.style.height = 'auto'; // Reset height
                // Reset HD Button visibility (Show it by default)
                const hdBtn = document.getElementById('hd-preview-btn');
                if (hdBtn) hdBtn.style.display = 'flex';
                previewModal.classList.add('show');
                setTimeout(() => {
                    previewCaption.focus();
                }, 100);
            }

            function closePreviewModal() {
                previewModal.classList.remove('show');
                currentPreviewUrl = '';
                previewImg.src = ''; // Clear image to prevent persistence
            }

            function sendFromPreview() {
                const caption = previewCaption.value.trim();
                const isHD = hdPreviewBtn.classList.contains('active');
                renderSentImageMessage(currentPreviewUrl, isHD, caption);

                // Reset HD Button
                hdPreviewBtn.classList.remove('active');

                closePreviewModal();
                // Auto-focus the input bar after sending
                document.getElementById('input-msg').focus();
            }

            // Auto-expand textarea
            previewCaption.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });

            // Enter to send, Shift+Enter for new line
            previewCaption.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendFromPreview();
                }
            });

            function renderSentImageMessage(url, isHD, caption = '') {
                const container = document.getElementById('msg-container');
                const now = new Date();
                const timeStr = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();

                let hdBadge = '';
                if (isHD) {
                    hdBadge = '<div style="position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.6); color:#ffcc00; font-size:0.7rem; padding:2px 6px; border-radius:4px; font-weight:700; z-index:2;">HD</div>';
                }

                let captionHtml = '';
                if (caption) {
                    // Integrate time inside the caption div for better layout (inline/float)
                    captionHtml = `
                <div style="padding:4px 8px 6px 8px; font-size:0.95rem; color:#fff; word-wrap:break-word;">
                    ${caption}
                    <span style="float:right; margin-left:10px; font-size:0.75rem; color:rgba(255,255,255,0.7); margin-top:4px;">
                        ${timeStr} <i class="fas fa-check"></i>
                    </span>
                </div>`;
                }

                // Adjust margin for time if caption exists (Only for NO CAPTION case now)
                // If caption exists, time is already inside it.
                const timeStyle = "position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.5); padding:2px 6px; border-radius:10px; margin:0; font-size:0.75rem; color:#fff;";

                const html = `
                <div class="message msg-sent" style="padding:4px; width: 250px; max-width: 85%; white-space: normal;">
                    <div onclick="openImageViewer('${url}')" style="position:relative; border-radius:8px; overflow:hidden; cursor:pointer;">
                        <img src="${url}" style="display:block; width:100%; height:auto;">
                        ${hdBadge}
                        ${!caption ? `<div class="msg-info" style="${timeStyle}">${timeStr} <i class="fas fa-check"></i></div>` : ''}
                    </div>
                    ${captionHtml}
                </div>
            `;
                container.insertAdjacentHTML('beforeend', html);
                container.scrollTop = container.scrollHeight;
                audioSend.play().catch(e => { });

                // UPDATE SIDEBAR PREVIEW (Tyson)
                const activeContact = document.querySelector('.contact-item.active');
                if (activeContact) {
                    const previewEl = activeContact.querySelector('.c-preview');
                    const timeEl = activeContact.querySelector('.c-time');

                    if (previewEl) {
                        // Update layout: [Mini Thumb] Caption/Photo
                        let defaultText = 'Photo';
                        // Check for .gif extension, giphy (urls), or data URI for gifs
                        if (url.toLowerCase().includes('.gif') || url.includes('giphy') || url.includes('data:image/gif')) {
                            defaultText = 'GIF';
                        }
                        const text = caption ? caption : defaultText;
                        previewEl.innerHTML = `<img src="${url}" class="preview-mini-thumb"><span>${text}</span>`;
                    }

                    if (timeEl) {
                        timeEl.innerText = timeStr;
                    }
                }
            }

            // --- SISTEMA DE EMOJIS CATEGORIZADO (WHATSAPP STYLE) ---

            // Mapa de categorías del JSON a nuestros IDs
            const categoryMap = {
                "Smileys & Emotion": "smileys",
                "People & Body": "smileys",
                "Animals & Nature": "animals",
                "Food & Drink": "food",
                "Activities": "activity",
                "Travel & Places": "travel",
                "Objects": "objects",
                "Symbols": "symbols",
                "Flags": "flags"
            };

            // Variable para guardar recientes (máximo 24)
            let recentEmojis = JSON.parse(localStorage.getItem('ceind_recent_emojis')) || [];

            document.addEventListener('DOMContentLoaded', () => {
                // 1. Chat Principal
                initCategorizedEmojis('emoji-picker', 'emoji-grid', 'input-msg');
                // 2. Preview de Foto
                initCategorizedEmojis('preview-emoji-picker', 'preview-emoji-grid', 'preview-caption');
                // 3. NUEVO: Reacciones
                initCategorizedEmojis('reaction-full-picker', 'reaction-emoji-grid', (emoji) => {
                    if (typeof reactToMessage === 'function') reactToMessage(emoji);
                }, 'msg-context-menu');
            });

            // --- SISTEMA DE EMOJIS COMPLETO (SCROLL FIX + BÚSQUEDA) ---

            async function initCategorizedEmojis(pickerId, gridId, inputId, scrollContainerId = null) {
                const grid = document.getElementById(gridId);
                const picker = document.getElementById(pickerId);
                const scrollContainer = scrollContainerId ? document.getElementById(scrollContainerId) : grid;

                if (!grid || !picker || !scrollContainer) return;

                // Buscar el input de búsqueda dentro de este picker
                const searchInput = picker.querySelector('.emoji-search-input');

                try {
                    // 1. Descargar JSON
                    const response = await fetch('https://unpkg.com/emoji.json/emoji.json');
                    const data = await response.json();

                    // 2. Agrupar (Igual que antes)
                    const grouped = {
                        recent: recentEmojis,
                        smileys: [], animals: [], food: [], activity: [],
                        travel: [], objects: [], symbols: [], flags: []
                    };

                    // NEW: Deduplication Set
                    const seenEmojis = new Set();

                    data.forEach(emoji => {
                        const char = emoji.char || emoji;
                        if (seenEmojis.has(char)) return; // Skip duplicates
                        seenEmojis.add(char);

                        // El JSON trae "group" o "category" (Ej: "Smileys & Emotion (face-smiling)")
                        const cat = (emoji.category || emoji.group || "").toString();

                        // Lógica de Mapeo más flexible (startsWith)
                        let myCat = 'objects'; // Default
                        if (cat.startsWith("Smileys & Emotion") || cat.startsWith("People & Body")) myCat = 'smileys';
                        else if (cat.startsWith("Animals & Nature")) myCat = 'animals';
                        else if (cat.startsWith("Food & Drink")) myCat = 'food';
                        else if (cat.startsWith("Activities")) myCat = 'activity';
                        else if (cat.startsWith("Travel & Places")) myCat = 'travel';
                        else if (cat.startsWith("Objects")) myCat = 'objects';
                        else if (cat.startsWith("Symbols")) myCat = 'symbols';
                        else if (cat.startsWith("Flags")) myCat = 'flags';

                        if (grouped[myCat]) grouped[myCat].push(emoji);
                    });

                    // 3. Renderizar
                    grid.innerHTML = '';
                    const sections = [
                        { id: 'recent', title: 'Recientes' },
                        { id: 'smileys', title: 'Caras y Personas' },
                        { id: 'animals', title: 'Animales y Naturaleza' },
                        { id: 'food', title: 'Comida y Bebida' },
                        { id: 'activity', title: 'Actividades' },
                        { id: 'travel', title: 'Viajes y Lugares' },
                        { id: 'objects', title: 'Objetos' },
                        { id: 'symbols', title: 'Símbolos' },
                        { id: 'flags', title: 'Banderas' }
                    ];

                    sections.forEach(sec => {
                        const emojis = grouped[sec.id];
                        if (emojis.length > 0) {
                            // Título de Sección
                            const title = document.createElement('div');
                            title.className = 'category-title';
                            title.innerText = sec.title;
                            // Importante: Guardamos el ID limpio para buscarlo luego
                            title.setAttribute('data-section-id', sec.id);
                            grid.appendChild(title);

                            // Grid de emojis
                            const sectionDiv = document.createElement('div');
                            sectionDiv.className = 'emoji-section';

                            emojis.forEach(emoji => {
                                const span = document.createElement('span');
                                span.innerText = emoji.char || emoji;

                                // SIMPLIFICACIÓN: Usamos el TITULO DE LA CATEGORÍA como palabras clave.
                                // Esto ya está en ESPAÑOL (ej: "Animales y Naturaleza").
                                // Así que si buscan "Animales", aparecerá.

                                const searchTerms = (emoji.name || "") + " " + (emoji.category || "") + " " + sec.title;

                                // Guardamos todo en minúsculas para buscar fácil
                                span.dataset.name = searchTerms.toLowerCase();

                                span.onclick = (e) => {
                                    e.stopPropagation();

                                    // LÓGICA HÍBRIDA:
                                    if (typeof inputId === 'function') {
                                        // SI ES FUNCIÓN (Para Reacciones): Ejecutamos la función pasando el emoji
                                        inputId(span.innerText);
                                    } else {
                                        // SI ES STRING (Para Chat): Buscamos el input y escribimos (Lógica original)
                                        const input = document.getElementById(inputId);
                                        if (input) {
                                            input.value += span.innerText;
                                            input.focus();
                                            input.dispatchEvent(new Event('input')); // Disparar auto-grow
                                        }
                                    }

                                    addToRecents(span.innerText);
                                };
                                sectionDiv.appendChild(span);
                            });
                            grid.appendChild(sectionDiv);
                        }
                    });

                    // 4. LÓGICA DE NAVEGACIÓN (Corrección del Scroll)
                    const navBtns = picker.querySelectorAll('.nav-btn');
                    navBtns.forEach(btn => {
                        btn.onclick = (e) => {
                            e.stopPropagation();

                            // Visual activo
                            navBtns.forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');

                            const targetId = btn.getAttribute('data-target');
                            // Use querySelector to safely find the title even if other sections are empty
                            const targetEl = grid.querySelector(`.category-title[data-section-id="${targetId}"]`);

                            if (targetEl) {
                                // Fix for Sticky Headers:
                                // The Title element has 'position: sticky', so its offsetTop is unreliable (it reports the stuck position).
                                // We use the next sibling (the actual emoji section) which is static, and subtract the title height to position it correctly.
                                const sectionEl = targetEl.nextElementSibling;
                                if (sectionEl) {
                                    scrollContainer.scrollTop = sectionEl.offsetTop - targetEl.offsetHeight;
                                } else {
                                    // Fallback just in case
                                    scrollContainer.scrollTop = targetEl.offsetTop;
                                }
                            }
                        };
                    });

                    // Scrollspy: Activate category icon while scrolling
                    scrollContainer.addEventListener('scroll', () => {
                        // Use requestAnimationFrame for performance
                        window.requestAnimationFrame(() => {
                            const titles = Array.from(grid.querySelectorAll('.category-title'));
                            let currentId = 'recent'; // Default fallback

                            // We check the offset of the SECTION (nextSibling) 
                            // because the Title is sticky and might report weird offsets
                            const scrollPos = scrollContainer.scrollTop + 80; // Margin to trigger switch earlier

                            titles.forEach(title => {
                                const section = title.nextElementSibling;
                                if (section && section.offsetTop <= scrollPos) {
                                    currentId = title.getAttribute('data-section-id');
                                }
                            });

                            if (currentId) {
                                navBtns.forEach(btn => {
                                    if (btn.getAttribute('data-target') === currentId) {
                                        btn.classList.add('active');
                                    } else {
                                        btn.classList.remove('active');
                                    }
                                });
                            }
                        });
                    });

                    // 5. LÓGICA DE BÚSQUEDA OPTIMIZADA (Sin Lag) 🚀
                    if (searchInput) {
                        // Cacheamos los elementos UNA sola vez para no buscarlos en cada tecla
                        // (Esto ahorra mucha memoria)
                        const allSpans = Array.from(grid.querySelectorAll('.emoji-section span'));
                        const titles = Array.from(grid.querySelectorAll('.category-title'));
                        const nav = picker.querySelector('.emoji-nav'); // Get nav element

                        // UX: Hide categories when searching to have more space
                        searchInput.addEventListener('focus', () => {
                            if (nav) nav.classList.add('hidden-nav');
                        });

                        // Restore categories when focus is lost
                        searchInput.addEventListener('blur', () => {
                            if (nav) {
                                nav.classList.remove('hidden-nav');
                            }
                        });

                        let debounceTimer; // El temporizador del truco

                        searchInput.addEventListener('input', (e) => {
                            const term = e.target.value.toLowerCase().trim();

                            // Si limpiamos el buscador, mostramos todo AL INSTANTE
                            if (term === '') {
                                clearTimeout(debounceTimer);
                                // Usamos requestAnimationFrame para que sea visualmente suave
                                requestAnimationFrame(() => {
                                    allSpans.forEach(s => s.style.display = ''); // '' vuelve al default
                                    titles.forEach(t => t.style.display = 'block');
                                });
                                return;
                            }

                            // TRUCO ANTI-LAG (Debounce)
                            // Si el usuario sigue escribiendo, cancelamos la búsqueda anterior
                            clearTimeout(debounceTimer);

                            // Esperamos 300ms antes de buscar de verdad
                            debounceTimer = setTimeout(() => {
                                const terms = term.split(/\s+/);

                                // Ocultamos títulos para limpiar la vista
                                titles.forEach(t => t.style.display = 'none');

                                // Búsqueda eficiente
                                // Usamos un fragmento de renderizado para no pintar uno por uno
                                requestAnimationFrame(() => {
                                    allSpans.forEach(span => {
                                        const name = span.dataset.name;
                                        const match = terms.every(t => name.includes(t));
                                        // Usar 'none' y '' es más rápido que 'inline-block' explícito
                                        span.style.display = match ? '' : 'none';
                                    });
                                });
                            }, 300); // 300ms es el tiempo perfecto
                        });

                        // Evitar cierre al clic
                        searchInput.addEventListener('click', (e) => e.stopPropagation());
                    }

                } catch (error) {
                    console.error("Error cargando emojis:", error);
                }
            }

            function addToRecents(char) {
                // Evitar duplicados y mover al principio
                recentEmojis = recentEmojis.filter(e => e.char !== char && e !== char);
                recentEmojis.unshift({ char: char }); // Guardamos como objeto para compatibilidad

                // Limitar a 24
                if (recentEmojis.length > 24) recentEmojis.pop();

                // Guardar en disco
                localStorage.setItem('ceind_recent_emojis', JSON.stringify(recentEmojis));

                // Nota: Para ver los cambios en "Recientes" hay que recargar la página
                // O podrías programar que se re-renderice la sección 'recent' dinámicamente.
            }

            // Lógica de apertura del menú principal (Tu botón de carita)
            const emojiPicker = document.getElementById('emoji-picker');
            const smileBtn = document.querySelector('.input-icon.fa-smile');

            if (smileBtn && emojiPicker) {
                smileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    emojiPicker.classList.toggle('show');
                    smileBtn.classList.toggle('active');
                });

                window.addEventListener('click', (e) => {
                    if (!emojiPicker.contains(e.target) && e.target !== smileBtn) {
                        emojiPicker.classList.remove('show');
                        smileBtn.classList.remove('active');
                    }
                });
            }

            // Typing Listener for Icon Swap
            inputMsg.addEventListener('input', () => {
                const val = inputMsg.value.trim();
                if (val.length > 0) {
                    // Determine if we need to switch state
                    if (actionContainer.classList.contains('show-mic')) {
                        actionContainer.classList.remove('show-mic');
                        actionContainer.classList.add('show-send');
                    }
                } else {
                    if (actionContainer.classList.contains('show-send')) {
                        actionContainer.classList.remove('show-send');
                        actionContainer.classList.add('show-mic');
                    }
                }
            });

            function sendMessage() {
                const text = inputMsg.value.trim();

                // --- INTENTO DE EDICIÓN ---
                if (messageBeingEdited) {
                    if (text !== "") {
                        saveEditedMessage(text);
                    } else {
                        // Optional: Allow deleting content? No, just alert.
                        // Or if empty, maybe user wants to delete? 
                        // Better to just ignore or require text.
                        alert("El mensaje no puede estar vacío");
                    }
                    return;
                }

                // We allow empty text purely for link previews? Or maybe not.
                // Let's assume text OR linkData is required.
                if (text === "" && !currentLinkData) return;

                const chatContainer = document.getElementById('msg-container');

                // Check if chat is empty (new conversation started), if so add 'Hoy'
                // We check children length. If 0 (or we just cleared), add date divider.
                if (chatContainer.children.length === 0) {
                    chatContainer.insertAdjacentHTML('beforeend', '<span class="date-divider">Hoy</span>');
                }

                // CHECK REPLY STATUS
                let replyData = null;
                if (isReplying) {
                    const rTitle = document.getElementById('reply-title');
                    const rText = document.getElementById('reply-text');
                    if (rTitle && rText) {
                        replyData = {
                            id: currentReplyTargetId,
                            name: rTitle.innerText,
                            text: rText.innerText
                        };
                    }
                    // RESET REPLY UI automatically
                    closeReplyPreview();
                }

                // Pass text, linkData, and replyData separately
                // UPDATED: Send to Firebase instead of local addMessage
                window.messageService.sendMessage(text, currentLinkData, replyData, false);

                inputMsg.value = "";
                inputMsg.style.height = 'auto'; // Reset height

                // Clear Link Preview
                closeLinkPreview();

                // Reset States
                // hdBtn reset removed
                inputMsg.placeholder = "Escribe un mensaje...";

                // Reset Icon to Mic
                actionContainer.classList.remove('show-send');
                actionContainer.classList.add('show-mic');

                // Reset ID
                currentReplyTargetId = null;
            }

            // --- READ MORE / LESS LOGIC ---
            window.expandMessage = function (id) {
                const container = document.getElementById('msg-' + id);
                if (!container) return;
                const hiddenChunks = container.querySelectorAll('.msg-chunk.hidden');

                if (hiddenChunks.length > 0) {
                    // Reveal next chunk
                    hiddenChunks[0].style.display = 'inline';
                    hiddenChunks[0].classList.remove('hidden');
                    hiddenChunks[0].classList.add('visible');
                }

                // Check remaining
                const remaining = container.querySelectorAll('.msg-chunk.hidden').length;
                const moreBtn = container.querySelector('.read-more-btn.more');
                const lessBtn = container.querySelector('.read-more-btn.less');

                if (lessBtn) lessBtn.style.display = 'inline'; // Show less btn after first expand

                if (remaining === 0 && moreBtn) {
                    moreBtn.style.display = 'none';
                }
            };

            window.collapseMessage = function (id) {
                const container = document.getElementById('msg-' + id);
                if (!container) return;
                const allChunks = container.querySelectorAll('.msg-chunk');

                // Hide all chunks (extensions)
                allChunks.forEach(chunk => {
                    chunk.style.display = 'none';
                    chunk.classList.remove('visible');
                    chunk.classList.add('hidden');
                });

                const moreBtn = container.querySelector('.read-more-btn.more');
                const lessBtn = container.querySelector('.read-more-btn.less');

                if (moreBtn) {
                    moreBtn.style.display = 'inline';
                    // moreBtn.innerText = '... Leer más'; // Reset text if needed
                }
                if (lessBtn) lessBtn.style.display = 'none';
            };

            /* Helper to linkify text */
            function linkify(text) {
                if (!text) return '';
                // Regex to capture URLs
                // This is a basic implementation.
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                return text.replace(urlRegex, function (url) {
                    return `<a href="${url}" target="_blank" class="msg-link" style="color: #3390ec; text-decoration: underline; word-break: break-all;">${url}</a>`;
                });
            }

            /* Date Divider Helper */
            let lastMessageDate = null; // Global tracker

            function formatDateDivider(timestamp) {
                const date = new Date(timestamp);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                const isToday = date.toDateString() === today.toDateString();
                const isYesterday = date.toDateString() === yesterday.toDateString();

                if (isToday) return 'Hoy';
                if (isYesterday) return 'Ayer';

                // Format DD/MM/YYYY
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }

            /* Function to add message to DOM */
            function addMessage(content, type, isAudio = false, linkData = null, replyData = null, forwardData = null, firebaseId = null, timestamp = null) {
                const container = document.getElementById('msg-container');
                const uniqueId = firebaseId || ('msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000));

                const now = timestamp ? new Date(timestamp) : new Date();

                // DATE DIVIDER LOGIC
                // If specific timestamp provided (history), check against last one.
                // If it's a new "live" message (no timestamp or very recent), it will likely be "Hoy".
                // But for history loading, this sequence matters.
                if (timestamp) {
                    const msgDateStr = now.toDateString();
                    if (lastMessageDate !== msgDateStr) {
                        const dividerText = formatDateDivider(timestamp);
                        // Check if divider already exists at the bottom to avoid duplicates (e.g. if partial load)
                        const lastEl = container.lastElementChild;
                        if (!lastEl || !lastEl.classList.contains('date-divider') || lastEl.innerText !== dividerText) {
                            // IMPROVEMENT: Sticky Date Headers similar to WhatsApp/Telegram
                            // z-index 9 to sit below toasts but above messages if needed (though messages are usually relative z0)
                            const dividerHtml = `<div class="date-divider" style="text-align: center; margin: 15px 0; position: sticky; top: 10px; z-index: 9; pointer-events: none;"><span style="background: rgba(0,0,0,0.4); color: #ddd; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; backdrop-filter: blur(2px); box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${dividerText}</span></div>`;
                            container.insertAdjacentHTML('beforeend', dividerHtml);
                        }
                        lastMessageDate = msgDateStr;
                    }
                }

                const timeStr = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();

                let extraContent = '';

                // Generate REPLY PREVIEW HTML if replyData exists
                let replyHtml = '';

                // Generate FORWARD LABEL if forwardData exists
                let forwardHtml = '';
                if (forwardData) {
                    forwardHtml = `<div class="msg-forward-label"><i class="fas fa-share"></i> Reenviado de <b>${forwardData.from}</b></div>`;
                }

                if (replyData) {
                    const originalIdSafe = replyData.id ? `'${replyData.id}'` : 'null';
                    replyHtml = `<div class="msg-reply-context" onclick="scrollToOriginalMessage(${originalIdSafe})"><div class="reply-details"><div class="reply-name">${replyData.name}</div><div class="reply-prev-text">${replyData.text}</div></div></div>`;
                }

                let hasLargeCard = false; // Flag to check if we have a large card

                // Generate Link Preview HTML if data exists
                if (linkData) {
                    const { title, description, image, url, logo, publisher } = linkData;
                    const domain = publisher || (url ? new URL(url).hostname : 'Link');

                    // Prioritize large card if explicit image present, for YouTube/TikTok/Instagram
                    const isVideoPlatform = (domain === 'YouTube' || domain === 'TikTok' || domain === 'Instagram' || (url && (url.match(/(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)/i))));

                    if (isVideoPlatform && image && image.url) {
                        hasLargeCard = true; // Set flag

                        // Prepare Timestamp for Overlay
                        const statusIcon = type === 'sent' ? '<i class="fas fa-check"></i>' : '';
                        const metaOverlay = `<div class="media-meta-overlay">${timeStr} ${statusIcon}</div>`;

                        // LARGE CARD STYLE (Refined Vertical Layout)
                        extraContent = `
                        <a href="${url}" target="_blank" class="msg-link-card large">
                            <div class="link-card-content">
                                <div class="link-site-name">${domain}</div>
                                <div class="link-title">${title}</div>
                                <div class="link-desc">${description || ''}</div>
                            </div>
                            <div class="link-card-media" style="background-image: url('${image.url}');">
                                <div class="play-overlay"><i class="fas fa-play"></i></div>
                                ${metaOverlay}
                            </div>
                        </a>
                        `;
                    } else {
                        // STANDARD COMPACT STYLE
                        let finalImgUrl = null;
                        let bgSize = 'cover';

                        // Fallback Logic: Image -> Logo -> None
                        if (image && image.url) {
                            finalImgUrl = image.url;
                        } else if (logo && logo.url) {
                            finalImgUrl = logo.url;
                            bgSize = 'contain';
                        }

                        const imgStyle = finalImgUrl
                            ? `background-image: url('${finalImgUrl}'); background-size: ${bgSize}; background-position: center; background-repeat: no-repeat;`
                            : 'display:none;';

                        const thumbHtml = finalImgUrl ? `<div class="link-compact-thumb" style="${imgStyle}"></div>` : '';

                        extraContent = `<a href="${url}" target="_blank" class="msg-link-card compact">${thumbHtml}<div class="link-compact-info"><div class="link-title">${title || domain}</div><div class="link-desc">${description || ''}</div><div class="link-domain">${domain}</div></div></a>`;
                    }
                }

                // Play Sounds
                if (type === 'sent') {
                    audioSend.currentTime = 0;
                    audioSend.play().catch(e => console.log('Audio play failed:', e));
                } else {
                    audioReceive.currentTime = 0;
                    audioReceive.play().catch(e => console.log('Audio play failed:', e));
                }

                // --- READ MORE LOGIC ---
                const CHAR_LIMIT = 500;
                const CHUNK_SIZE = 500;

                let displayContent = content;

                // Only apply if it's sent/received text, not audio, and exceeds limit
                if (!isAudio && !linkData && content && content.length > CHAR_LIMIT) {
                    const id = Date.now() + Math.random().toString(36).substr(2, 9);
                    const firstChunk = content.substring(0, CHAR_LIMIT);
                    const remainingText = content.substring(CHAR_LIMIT);

                    let fragments = [];
                    for (let i = 0; i < remainingText.length; i += CHUNK_SIZE) {
                        fragments.push(remainingText.substring(i, i + CHUNK_SIZE));
                    }

                    // Build hidden chunks
                    let htmlChunks = fragments.map(f => {
                        return `<span class="msg-chunk hidden" style="display:none">${f}</span>`;
                    }).join('');

                    displayContent = `<span id="msg-${id}">${firstChunk}${htmlChunks}<span class="expand-controls"><span class="read-more-btn more" onclick="expandMessage('${id}')">... Leer más</span><span class="read-more-btn less" onclick="collapseMessage('${id}')" style="display:none">Leer menos</span></span></span>`;
                }

                // Always linkify formatting for DisplayContent
                if (!isAudio && content) {
                    displayContent = linkify(content);
                }

                // Handling read-more logic with linkified content is tricky if we split by char stats
                // But for now let's apply linkify to the full content or chunks.
                // If content was chunked (lines 3765+), we need to handle that.
                // Re-doing the Read More Logic compatible with Linkify:
                if (!isAudio && !linkData && content && content.length > CHAR_LIMIT) {
                    const id = Date.now() + Math.random().toString(36).substr(2, 9);
                    // We linkify the WHOLE text first, then split? No, that breaks tags.
                    // We split TEXT first, then linkify chunks.
                    const firstChunk = content.substring(0, CHAR_LIMIT);
                    const remainingText = content.substring(CHAR_LIMIT);

                    const firstChunkHtml = linkify(firstChunk);

                    let fragments = [];
                    for (let i = 0; i < remainingText.length; i += CHUNK_SIZE) {
                        fragments.push(remainingText.substring(i, i + CHUNK_SIZE));
                    }

                    let htmlChunks = fragments.map(f => {
                        return `<span class="msg-chunk hidden" style="display:none">${linkify(f)}</span>`;
                    }).join('');

                    displayContent = `<span id="msg-${id}">${firstChunkHtml}${htmlChunks}<span class="expand-controls"><span class="read-more-btn more" onclick="expandMessage('${id}')">... Leer más</span><span class="read-more-btn less" onclick="collapseMessage('${id}')" style="display:none">Leer menos</span></span></span>`;
                }

                const extraClass = isAudio ? ' audio-msg' : '';

                // CONDITIONAL FOOTER: Only show standard footer if NO large card
                let footerHtml = '';
                if (!hasLargeCard) {
                    footerHtml = `<div class="msg-info" style="float: right; margin-left: 10px; margin-top: 4px;">${timeStr} ${type === 'sent' ? '<i class="fas fa-check"></i>' : ''}</div>`;
                }

                // Order: DisplayContent (Link/Text) FIRST, then ExtraContent (Card)
                const html = `<div class="message msg-${type}${extraClass}" id="${uniqueId}">${forwardHtml}${replyHtml}${displayContent}${extraContent}${footerHtml}</div>`;

                container.insertAdjacentHTML('beforeend', html);
                container.scrollTop = container.scrollHeight;

                // Hook for VirtualScroll
                if (typeof VirtualScroll !== 'undefined') {
                    const newMsgEl = document.getElementById(uniqueId);
                    if (newMsgEl) VirtualScroll.observeNew(newMsgEl);
                }

                // UPDATE SIDEBAR PREVIEW (Text & Audio & Link)
                const activeContact = document.querySelector('.contact-item.active');
                if (type === 'sent' && activeContact) {
                    const previewEl = activeContact.querySelector('.c-preview');
                    const timeEl = activeContact.querySelector('.c-time');

                    if (previewEl) {
                        if (isAudio) {
                            previewEl.innerHTML = '<i class="fas fa-microphone" style="margin-right:5px;"></i>Voice Message';
                        } else if (linkData) {
                            // Link Preview in Sidebar: Prioritize Thumbnail (Image) -> Logo -> Icon
                            const thumbUrl = linkData.image && linkData.image.url ? linkData.image.url : (linkData.logo && linkData.logo.url ? linkData.logo.url : '');
                            const thumbHtml = thumbUrl ? `<img src="${thumbUrl}" class="preview-mini-thumb" style="object-fit: cover;">` : '<i class="fas fa-link" style="margin-right:5px;"></i>';
                            previewEl.innerHTML = `${thumbHtml}<span>${content || linkData.title}</span>`;
                        } else {
                            // Plain text - Truncate for sidebar visibility
                            // Replace newlines with spaces to prevent sidebar stretching
                            let cleanContent = content.replace(/\n/g, ' ');

                            let truncated = cleanContent;
                            if (cleanContent.length > 20) {
                                truncated = cleanContent.substring(0, 20) + '...';
                            }
                            previewEl.innerText = truncated;
                        }
                    }

                    if (timeEl) {
                        timeEl.innerText = timeStr;
                    }
                }
            }

            // Auto-expand logic
            inputMsg.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';

                // Toggle Mic/Send icon based on content
                const text = this.value.trim();
                if (text.length > 0) {
                    // Show Send
                    actionContainer.classList.remove('show-mic');
                    actionContainer.classList.add('show-send');
                } else {
                    // Show Mic
                    actionContainer.classList.remove('show-send');
                    actionContainer.classList.add('show-mic');
                }
            });

            // Handle Enter vs Shift+Enter
            inputMsg.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Send message
                    sendMessage();
                }
                // Shift+Enter does default (newline)
            });

            // Remove old keypress listener to avoid duplicates or conflicts
            // (Previously line 2933)

            // Initialize recording data storage
            let recordingData = [];
            let mediaRecorder;
            let audioChunks = [];

            // --- IMAGE VIEWER LOGIC ---
            const imageViewer = document.getElementById('image-viewer');
            const viewerImg = document.getElementById('viewer-img');
            const navMenu = document.querySelector('nav'); // To hide/show nav if needed

            // Zoom & Pan State
            let isZoomed = false;
            let isDragging = false;
            let startX = 0, startY = 0;
            let translateX = 0, translateY = 0;
            let scale = 1;

            function updateImageTransform() {
                viewerImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            }

            function openImageViewer(url) {
                viewerImg.src = url;
                viewerImg.style.transform = ''; // Let CSS animation take over initially
                imageViewer.classList.add('show');

                // Reset State
                isZoomed = false;
                scale = 1;
                translateX = 0;
                translateY = 0;
                viewerImg.style.cursor = 'zoom-in';
                document.getElementById('zoom-btn').className = 'fas fa-search-plus';

                // Hide Download button for GIFs
                const isGif = url.toLowerCase().includes('.gif') || url.includes('giphy');
                const dlBtn = document.getElementById('viewer-download-btn');
                if (dlBtn) dlBtn.style.display = isGif ? 'none' : '';
            }

            function closeImageViewer() {
                imageViewer.classList.remove('show');
                setTimeout(() => { viewerImg.src = ''; }, 200);
            }

            function toggleZoom() {
                isZoomed = !isZoomed;
                if (isZoomed) {
                    scale = 2.5;
                    viewerImg.style.cursor = 'grab';
                    document.getElementById('zoom-btn').className = 'fas fa-search-minus';
                } else {
                    scale = 1;
                    translateX = 0;
                    translateY = 0;
                    viewerImg.style.cursor = 'zoom-in';
                    document.getElementById('zoom-btn').className = 'fas fa-search-plus';
                }
                updateImageTransform();
            }

            // --- DRAG & ZOOM LOGIC (MOUSE & TOUCH) ---

            // 1. MOUSE DRAG
            viewerImg.addEventListener('mousedown', (e) => {
                if (!isZoomed && scale <= 1) return; // Only allow drag if zoomed
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                viewerImg.style.cursor = 'grabbing';
                viewerImg.style.transition = 'none';
                e.preventDefault();
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateImageTransform();
            });

            window.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    if (scale > 1) viewerImg.style.cursor = 'grab';
                    else viewerImg.style.cursor = 'zoom-in';
                    viewerImg.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                }
            });

            // 2. MOUSE WHEEL ZOOM
            viewerImg.addEventListener('wheel', (e) => {
                e.preventDefault(); // Stop page scroll
                const delta = e.deltaY > 0 ? -0.2 : 0.2;
                let newScale = scale + delta;

                // Clamp scale
                newScale = Math.min(Math.max(0.5, newScale), 5);
                scale = newScale;

                if (scale > 1) {
                    isZoomed = true;
                    viewerImg.style.cursor = 'grab';
                    document.getElementById('zoom-btn').className = 'fas fa-search-minus';
                } else {
                    isZoomed = false;
                    viewerImg.style.cursor = 'zoom-in';
                    document.getElementById('zoom-btn').className = 'fas fa-search-plus';
                    // Optional: Snap back to center if zoomed out fully?
                    // Let's keep it free for now, or reset if scale < 1.05
                    if (scale <= 1) {
                        scale = 1;
                        translateX = 0;
                        translateY = 0;
                    }
                }
                updateImageTransform();
            }, { passive: false });

            // 3. TOUCH LOGIC (Mobile Pan & Pinch)
            let initialPinchDist = 0;
            let initialScale = 1;

            viewerImg.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    // Single touch -> Pan
                    if (!isZoomed && scale <= 1) return;
                    isDragging = true;
                    startX = e.touches[0].clientX - translateX;
                    startY = e.touches[0].clientY - translateY;
                    viewerImg.style.transition = 'none';
                } else if (e.touches.length === 2) {
                    // Two fingers -> Pinch
                    isDragging = false; // Cancel pan
                    initialPinchDist = getDistance(e.touches);
                    initialScale = scale;
                    viewerImg.style.transition = 'none';
                }
            }, { passive: false });

            viewerImg.addEventListener('touchmove', (e) => {
                e.preventDefault(); // Important to stop scrolling
                if (e.touches.length === 1 && isDragging) {
                    // Pan
                    translateX = e.touches[0].clientX - startX;
                    translateY = e.touches[0].clientY - startY;
                    updateImageTransform();
                } else if (e.touches.length === 2) {
                    // Pinch
                    const dist = getDistance(e.touches);
                    if (initialPinchDist > 0) {
                        const ratio = dist / initialPinchDist;
                        scale = Math.min(Math.max(0.5, initialScale * ratio), 5);

                        // Update state
                        if (scale > 1) {
                            isZoomed = true;
                            document.getElementById('zoom-btn').className = 'fas fa-search-minus';
                        } else {
                            document.getElementById('zoom-btn').className = 'fas fa-search-plus';
                        }
                        updateImageTransform();
                    }
                }
            }, { passive: false });

            viewerImg.addEventListener('touchend', (e) => {
                // Restore smooth transition when lifting fingers
                if (e.touches.length < 2) {
                    viewerImg.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                }
                if (e.touches.length === 0) {
                    isDragging = false;
                    if (scale <= 1) {
                        isZoomed = false;
                        scale = 1;
                        translateX = 0;
                        translateY = 0;
                        updateImageTransform();
                    }
                }
            });

            // Helper
            function getDistance(touches) {
                const dx = touches[0].clientX - touches[1].clientX;
                const dy = touches[0].clientY - touches[1].clientY;
                return Math.sqrt(dx * dx + dy * dy);
            }

            // Prevent ghost image drag
            viewerImg.addEventListener('dragstart', (e) => e.preventDefault());

            function downloadCurrentImage() {
                const a = document.createElement('a');
                a.href = viewerImg.src;
                a.download = 'imagen_chat.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            // --- SHARE / FORWARD LOGIC ---
            const forwardModal = document.getElementById('forward-modal');

            function openShareModal() {
                forwardModal.classList.add('show');
            }

            function closeShareModal() {
                forwardModal.classList.remove('show');
            }

            function forwardTo(name) {
                // Mock forwarding action
                closeShareModal();
                closeImageViewer();
                // Optional: simulate sending a "Forwarded message"
                // For now, just alert or consistent feedback
                setTimeout(() => {
                    alert(`Imagen reenviada a ${name}`);
                }, 300);
            }

            // Close logic on Forward Modal outside click
            forwardModal.addEventListener('click', (e) => {
                if (e.target === forwardModal) closeShareModal();
            });

            // --- REAL RECORDING LOGIC (Web Audio API & MediaRecorder) ---
            // --- REAL RECORDING LOGIC (Web Audio API & MediaRecorder) ---
            let isPaused = false;
            let recPauseBtn = document.getElementById('rec-pause-btn');
            let resumeVisualizerLoop = null; // Function ref to restart loop

            async function startRecording() {
                try {
                    // Request Mic Permission
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                    if (window.presenceService) window.presenceService.setRecording(true);

                    chatInputArea.classList.add('recording');
                    actionContainer.classList.remove('show-mic');
                    actionContainer.classList.add('show-audio');

                    // Reset Pause State
                    isPaused = false;
                    recPauseBtn.className = 'fas fa-pause-circle rec-control-icon';
                    recPauseBtn.title = 'Pausar';

                    // 1. Setup Visualizer (AudioContext)
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    analyser = audioContext.createAnalyser();
                    microphone = audioContext.createMediaStreamSource(stream);
                    microphone.connect(analyser);
                    analyser.fftSize = 64;

                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    // Use scoped selector
                    const bars = visualizerContainer.querySelectorAll('.wave-bar');
                    recordingData = []; // Clear previous data

                    // Define Loop Function
                    function updateVisualizer() {
                        if (isPaused) return; // Stop if paused

                        analyser.getByteFrequencyData(dataArray);

                        let sum = 0;
                        for (let j = 0; j < bufferLength; j++) sum += dataArray[j];
                        recordingData.push(sum / bufferLength);

                        // Real-time visual
                        for (let i = 0; i < BAR_COUNT; i++) {
                            const index = Math.floor(i * (bufferLength / BAR_COUNT));
                            const value = dataArray[index] || 0;
                            let h = (value / 255) * 24;
                            if (h < 4) h = 4;
                            bars[i].style.height = h + 'px';
                        }
                        visualizerFrame = requestAnimationFrame(updateVisualizer);
                    }

                    // Assign to global
                    resumeVisualizerLoop = updateVisualizer;
                    updateVisualizer();

                    // 2. Setup MediaRecorder for actual audio capture
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = event => {
                        audioChunks.push(event.data);
                    };
                    mediaRecorder.start();

                    // Start Timer
                    recSeconds = 0;
                    document.getElementById('rec-timer').innerText = "0:00";
                    recTimerInterval = setInterval(() => {
                        if (!isPaused) {
                            recSeconds++;
                            const mins = Math.floor(recSeconds / 60);
                            const secs = recSeconds % 60;
                            document.getElementById('rec-timer').innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                        }
                    }, 1000);

                } catch (err) {
                    console.error('Error accessing microphone:', err);
                    alert('No se pudo acceder al micrófono. Verifica los permisos.');
                }
            }

            // Toggle Pause Logic
            recPauseBtn.addEventListener('click', () => {
                if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

                if (isPaused) {
                    // RESUME
                    mediaRecorder.resume();
                    isPaused = false;
                    recPauseBtn.className = 'fas fa-pause-circle rec-control-icon'; // Show Pause icon
                    recPauseBtn.title = 'Pausar';

                    // Restart Visualizer Loop
                    if (resumeVisualizerLoop) resumeVisualizerLoop();
                } else {
                    // PAUSE
                    mediaRecorder.pause();
                    isPaused = true;
                    recPauseBtn.className = 'fas fa-microphone rec-control-icon paused'; // Show Mic icon
                    recPauseBtn.title = 'Reanudar';
                }
            });


            function stopRecordingInternal() {
                if (recTimerInterval) clearInterval(recTimerInterval);
                if (visualizerFrame) cancelAnimationFrame(visualizerFrame);

                // Note: We don't close the stream here immediately if we need it for MediaRecorder.stop()
                // We'll let sendAudio or cancelRecording handle the specific stop logic

                // Reset UI
                chatInputArea.classList.remove('recording');
                if (window.presenceService) window.presenceService.setRecording(false);
                actionContainer.classList.remove('show-audio');
                actionContainer.classList.add('show-mic');

                // Reset bars
                const bars = visualizerContainer.querySelectorAll('.wave-bar');
                bars.forEach(b => b.style.height = '4px');
            }

            function cancelRecording() {
                // Just stop everything and ignore data
                stopRecordingInternal();
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                if (audioContext) audioContext.close();
                if (microphone && microphone.mediaStream) {
                    microphone.mediaStream.getTracks().forEach(track => track.stop());
                }
            }

            function sendAudio() {
                // 1. Stop UI & Timer
                stopRecordingInternal();
                const durationText = document.getElementById('rec-timer').innerText;

                // 2. Stop Recorder and handle the data
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
                        const audioUrl = URL.createObjectURL(audioBlob);

                        renderSentAudioMessage(audioUrl, durationText);

                        // Cleanup
                        if (audioContext) audioContext.close();
                        if (microphone && microphone.mediaStream) {
                            microphone.mediaStream.getTracks().forEach(track => track.stop());
                        }
                    };
                    mediaRecorder.stop();
                } else {
                    // Fallback if something went wrong (e.g., very fast click or mic not allowed)
                    renderSentAudioMessage('#', durationText);
                    if (audioContext) audioContext.close();
                    if (microphone && microphone.mediaStream) {
                        microphone.mediaStream.getTracks().forEach(track => track.stop());
                    }
                }
            }

            function renderSentAudioMessage(url, duration) {
                // telegram-style: compact but dense
                const messageBarCount = 42;
                let waveformHtml = '<div class="waveform-container" onclick="seekAudio(event, this)" style="display:flex; align-items:center; gap:2px; height:24px; cursor:pointer;">';

                if (recordingData.length > 0) {
                    const chunkSize = Math.max(1, Math.floor(recordingData.length / messageBarCount));
                    for (let i = 0; i < messageBarCount; i++) {
                        let start = i * chunkSize;
                        let end = start + chunkSize;
                        if (end > recordingData.length) end = recordingData.length;

                        let slice = recordingData.slice(start, end);
                        let avg = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);

                        let normalized = avg / 128;
                        if (normalized > 1) normalized = 1;

                        let h = normalized * 20;
                        if (h < 4) h = 4;

                        const opacity = 0.85;
                        // Added class 'wave-bar' to target individual bars
                        waveformHtml += `<div class="wave-bar" style="width:2px; height:${h.toFixed(1)}px; background:#fff; opacity:${opacity}; border-radius:1px; transition: background 0.1s, opacity 0.1s;"></div>`;
                    }
                } else {
                    for (let i = 0; i < messageBarCount; i++) {
                        let h = Math.random() > 0.5 ? 8 : 4;
                        // Added class 'wave-bar'
                        waveformHtml += `<div class="wave-bar" style="width:2px; height:${h}px; background:#fff; opacity:0.7; border-radius:1px; transition: background 0.1s, opacity 0.1s;"></div>`;
                    }
                }
                waveformHtml += '</div>';

                const now = new Date();
                const timeStr = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
                // Generate unique ID for duration text
                const durationId = 'dur-' + Date.now() + Math.floor(Math.random() * 1000);

                const audioHtml = `
                <div style="display:flex; align-items:center; gap:12px; width: 240px; padding: 0;">
                    <!-- Play Button (Passed durationId) -->
                    <div onclick="playAudioMsg('${url}', this, '${durationId}')" style="width:44px; height:44px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--msg-sent); cursor:pointer; flex-shrink:0;">
                        <i class="fas fa-play" style="font-size:1.3rem; margin-left:3px;"></i>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; justify-content:center; flex:1;">
                        ${waveformHtml}
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                            <div id="${durationId}" data-original="${duration}" style="font-size:0.75rem; color:rgba(255,255,255,0.9); line-height:1;">
                                ${duration}
                            </div>
                            <div class="audio-meta-info">
                                ${timeStr} <i class="fas fa-check" style="font-size:0.8em;"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
                addMessage(audioHtml, 'sent', true);
            }

            // --- PLAYBACK ---
            // --- PLAYBACK ---
            let currentAudio = null;
            let currentBtn = null;

            // Global for playback timer
            let playbackInterval = null;

            function seekAudio(event, waveContainer) {
                // Navigate up: waveContainer -> Column -> Wrapper -> PlayBtn (first child)
                const wrapper = waveContainer.parentElement.parentElement;
                const btn = wrapper.children[0];

                if (currentAudio && currentBtn === btn) {
                    const rect = waveContainer.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const per = Math.max(0, Math.min(1, x / rect.width));

                    if (isFinite(currentAudio.duration)) {
                        currentAudio.currentTime = currentAudio.duration * per;
                    }
                }
            }

            function playAudioMsg(url, btn, durationId) {
                const icon = btn.querySelector('i');
                const waveBars = btn.parentElement.querySelectorAll('.wave-bar');
                const durationEl = document.getElementById(durationId);

                // Animation Helper
                const animateIcon = (newIconClass) => {
                    icon.style.transition = 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    icon.style.transform = 'scale(0) rotate(180deg)';

                    setTimeout(() => {
                        icon.className = `fas ${newIconClass}`;
                        if (newIconClass === 'fa-play') {
                            icon.style.marginLeft = '3px'; // Fix alignment for play triangle
                        } else {
                            icon.style.marginLeft = '0';
                        }
                        icon.style.transform = 'scale(1) rotate(0deg)';
                    }, 200);
                };

                const startMonitoring = () => {
                    if (playbackInterval) clearInterval(playbackInterval);

                    playbackInterval = setInterval(() => {
                        if (!currentAudio) return;

                        const currentTime = currentAudio.currentTime;
                        const duration = currentAudio.duration;

                        if (!duration) return;

                        // 1. Update Timer (Current / Total)
                        const formatTime = (t) => {
                            const m = Math.floor(t / 60);
                            const s = Math.floor(t % 60);
                            return `${m}:${s < 10 ? '0' : ''}${s}`;
                        };

                        const currentStr = formatTime(currentTime);
                        const totalStr = formatTime(duration);

                        if (durationEl) durationEl.innerText = `${currentStr} / ${totalStr}`;

                        // 2. Update Waveform
                        const percent = currentTime / duration;
                        const activeIndex = Math.floor(percent * waveBars.length);

                        waveBars.forEach((bar, index) => {
                            if (index < activeIndex) {
                                bar.style.backgroundColor = 'var(--secondary-color)';
                                bar.style.opacity = '1';
                            } else {
                                bar.style.backgroundColor = '#fff';
                                bar.style.opacity = '0.5';
                            }
                        });

                    }, 100);
                };

                const resetUI = () => {
                    if (playbackInterval) clearInterval(playbackInterval);
                    animateIcon('fa-play');
                    // Reset bars
                    waveBars.forEach(bar => {
                        bar.style.opacity = '1';
                        bar.style.backgroundColor = '#fff'; // Reset to white
                    });
                    // Reset time
                    if (durationEl) durationEl.innerText = durationEl.getAttribute('data-original');
                    currentAudio = null;
                    currentBtn = null;
                };

                // If clicking the same button...
                if (currentAudio && currentBtn === btn) {
                    if (currentAudio.paused) {
                        // RESUME
                        currentAudio.play();
                        animateIcon('fa-pause');
                        startMonitoring();
                    } else {
                        // PAUSE
                        currentAudio.pause();
                        if (playbackInterval) clearInterval(playbackInterval);
                        animateIcon('fa-play');
                    }
                    return;
                }

                // Stop any other playing audio
                if (currentAudio) {
                    currentAudio.pause();
                    if (playbackInterval) clearInterval(playbackInterval);

                    if (currentBtn) {
                        const oldIcon = currentBtn.querySelector('i');
                        const oldBars = currentBtn.parentElement.querySelectorAll('.wave-bar');
                        // Reset previous UI
                        oldIcon.className = 'fas fa-play';
                        oldIcon.style.marginLeft = '3px';
                        oldIcon.style.transform = 'scale(1)';
                        oldBars.forEach(b => {
                            b.style.backgroundColor = '#fff';
                            b.style.opacity = '1';
                        });
                        // Note: We can't easily reset the timer of the previous one without its ID.
                        // A robust solution would store the active durationId globally.
                        // For now, let's accept that the previous timer might stay at "paused time" or not fully reset until clicked again.
                        // Ideally: if (currentDurationId) document.getElementById(currentDurationId).innerText = ...
                    }
                }

                // Start new audio
                currentAudio = new Audio(url);
                currentBtn = btn;

                currentAudio.play();
                animateIcon('fa-pause');

                // Timer & Progress Logic
                playbackInterval = setInterval(() => {
                    if (!currentAudio) return;

                    const currentTime = currentAudio.currentTime;
                    const duration = currentAudio.duration;

                    if (!duration) return;

                    // 1. Update Timer (Current / Total)
                    const formatTime = (t) => {
                        const m = Math.floor(t / 60);
                        const s = Math.floor(t % 60);
                        return `${m}:${s < 10 ? '0' : ''}${s}`;
                    };
                    if (durationEl) durationEl.innerText = `${formatTime(currentTime)} / ${formatTime(duration)}`;

                    // 2. Update Waveform
                    const percent = currentTime / duration;
                    const activeIndex = Math.floor(percent * waveBars.length);

                    waveBars.forEach((bar, index) => {
                        // Telegram style: played bars are darker/colored, unplayed are light/transparent
                        if (index < activeIndex) {
                            bar.style.backgroundColor = 'var(--secondary-color)'; // Active Color
                            bar.style.opacity = '1';
                        } else {
                            bar.style.backgroundColor = '#fff';
                            bar.style.opacity = '0.5';
                        }
                    });

                }, 100);

                currentAudio.onended = () => {
                    resetUI();

                    // Auto-play next audio logic
                    // 1. Find the current message element
                    // btn -> wrapper -> column -> audio-msg-container -> ... -> .message
                    // Let's traverse up to find .message
                    let msgEl = btn.closest('.message');
                    if (msgEl) {
                        let nextMsg = msgEl.nextElementSibling;
                        if (nextMsg && nextMsg.classList.contains('message')) {
                            // Check if it is an audio message (contains a play button)
                            // Looking for a div with onclick="playAudioMsg..."
                            let nextBtn = nextMsg.querySelector('div[onclick^="playAudioMsg"]');
                            if (nextBtn) {
                                nextBtn.click();
                            }
                        }
                    }
                };
            }

            // --- DYNAMIC AVATAR LOGIC (Synced with Profile) ---
            document.addEventListener('DOMContentLoaded', () => {
                loadSidebarImages();
            });

            function loadSidebarImages() {
                const savedAvatar = localStorage.getItem('profile_avatar');
                if (savedAvatar) {
                    const sidebarAvatars = document.querySelectorAll('.user-avatar-sm');
                    sidebarAvatars.forEach(av => {
                        av.style.backgroundImage = `url('${savedAvatar}')`;
                        av.style.backgroundSize = 'cover';
                        av.style.backgroundPosition = 'center';
                        av.innerText = '';
                    });
                }
            }


            const filtersContainer = document.getElementById('filtersScroll');
            const scrollLeftBtn = document.getElementById('scrollLeftBtn');
            const scrollRightBtn = document.getElementById('scrollRightBtn');

            function checkScroll() {
                if (!filtersContainer) return;

                // Show/Hide Left Button
                if (filtersContainer.scrollLeft > 5) {
                    scrollLeftBtn.style.display = 'flex';
                } else {
                    scrollLeftBtn.style.display = 'none';
                }

                // Show/Hide Right Button
                if (filtersContainer.scrollLeft + filtersContainer.clientWidth >= filtersContainer.scrollWidth - 5) {
                    scrollRightBtn.style.display = 'none';
                } else {
                    scrollRightBtn.style.display = 'flex';
                }
            }

            function scrollFilters(direction) {
                if (!filtersContainer) return;
                const scrollAmount = 150;
                filtersContainer.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
                setTimeout(checkScroll, 300);
            }

            if (filtersContainer) {
                filtersContainer.addEventListener('scroll', checkScroll);
                window.addEventListener('resize', checkScroll);
                checkScroll();
            }

            // --- FILTER BUTTONS INTERACTION ---
            const filterBtns = document.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove active class from all
                    filterBtns.forEach(b => b.classList.remove('active'));
                    // Add active class to clicked
                    btn.classList.add('active');

                    const filter = btn.innerText.trim();
                    const contactItems = document.querySelectorAll('.contact-item');

                    contactItems.forEach(item => {
                        const category = item.getAttribute('data-category');

                        if (filter === 'Todos') {
                            item.style.display = 'flex';
                        } else if (category === filter) {
                            item.style.display = 'flex';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                });
            });


            // --- LINK PREVIEW LOGIC ---
            const linkPreviewBar = document.getElementById('link-preview-bar');
            const lpThumb = document.getElementById('lp-thumb');
            const lpTitle = document.getElementById('lp-title');
            const lpDesc = document.getElementById('lp-desc');
            const lpDomain = document.getElementById('lp-domain');
            let currentLinkData = null;
            let linkCheckTimeout = null;

            inputMsg.addEventListener('input', () => {
                clearTimeout(linkCheckTimeout);
                const text = inputMsg.value;

                // Regex to find LAST url in text (most likely the one being typed or pasted)
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const matches = text.match(urlRegex);

                if (matches && matches.length > 0) {
                    const url = matches[matches.length - 1]; // Use last matched URL

                    // Debounce fetch
                    linkCheckTimeout = setTimeout(() => {
                        fetchLinkPreview(url);
                    }, 500);
                } else {
                    closeLinkPreview();
                }
            });

            function fetchLinkPreview(url) {
                if (currentLinkData && currentLinkData.url === url) return;

                linkPreviewBar.classList.add('show');
                linkPreviewBar.querySelector('.lp-loading').style.display = 'flex';
                linkPreviewBar.querySelector('.lp-content').style.display = 'none';

                const isYouTube = url.match(/(youtube\.com|youtu\.be)/i);
                const isTikTok = url.match(/tiktok\.com/i);
                const isInstagram = url.match(/instagram\.com/i);

                // OPTIMIZATION: Instant Load for Instagram (Icon Only, No Fetch)
                if (isInstagram) {
                    const instantData = {
                        title: 'Instagram',
                        description: 'Ver en Instagram',
                        image: null,
                        url: url,
                        publisher: 'Instagram',
                        logo: { url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png' }
                    };
                    currentLinkData = instantData;
                    renderLinkPreview(instantData);
                    return;
                }

                const useNoEmbed = isYouTube || isTikTok;

                // Transform Shorts URL to standard Watch URL for API compatibility
                if (isYouTube && url.includes('/shorts/')) {
                    url = url.replace('/shorts/', '/watch?v=');
                }

                // Select API Strategy
                if (useNoEmbed) {
                    fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.error) throw new Error(data.error);

                            let publisher = 'Link';
                            let logoUrl = '';

                            if (isYouTube) {
                                publisher = 'YouTube';
                                logoUrl = 'https://www.youtube.com/s/desktop/1a561936/img/favicon.ico';
                            } else if (isTikTok) {
                                publisher = 'TikTok';
                                logoUrl = 'https://sf16-scmcdn-sg.ibytedtos.com/goofy/tiktok/web/node/_next/static/images/logo-dark-e95da587d6ef96360113.png';

                                // FORCE FALLBACK if no thumbnail (common in TikTok oEmbed)
                                if (!data.thumbnail_url) {
                                    throw new Error('TikTok thumbnail missing from oEmbed');
                                }
                            }

                            const processed = {
                                title: data.title,
                                description: data.author_name ? `by ${data.author_name}` : '',
                                image: { url: data.thumbnail_url },
                                url: data.url || url,
                                publisher: publisher,
                                logo: { url: logoUrl }
                            };
                            currentLinkData = processed;
                            renderLinkPreview(processed);
                        })
                        .catch(err => {
                            console.warn('Video platform noembed failed, trying generic fallback:', err);
                            // Fallback to generic scraper
                            fetchOpenGraphData(url);
                        });
                } else {
                    // 1. Try Microlink (Fast, cache-based)
                    fetch(`https://api.microlink.io/api?url=${encodeURIComponent(url)}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === 'success') {
                                currentLinkData = data.data;
                                renderLinkPreview(data.data);
                            } else {
                                throw new Error('Microlink failed or blocked');
                            }
                        })
                        .catch(err => {
                            console.log('Microlink failed, switching to Manual CORS Scraper:', err);
                            // 2. Fallback: Manual Open Graph Scraper via CORS Proxy
                            fetchOpenGraphData(url);
                        });
                }
            }

            function fetchOpenGraphData(targetUrl) {
                // Use a high-performance CORS proxy
                // Alternatives: 'https://api.allorigins.win/get?url=' or 'https://corsproxy.io/?'
                const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl);

                fetch(proxyUrl)
                    .then(response => {
                        if (response.ok) return response.json();
                        throw new Error('Network response was not ok.');
                    })
                    .then(data => {
                        // allorigins returns JSON with "contents" holding the HTML
                        const html = data.contents;
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, "text/html");

                        // Helper to get meta content
                        const getMeta = (prop) => {
                            const el = doc.querySelector(`meta[property="${prop}"]`) || doc.querySelector(`meta[name="${prop}"]`);
                            return el ? el.getAttribute('content') : null;
                        };

                        const title = getMeta('og:title') || doc.title || 'Link';
                        const description = getMeta('og:description') || getMeta('description') || '';
                        const image = getMeta('og:image');
                        const siteName = getMeta('og:site_name') || new URL(targetUrl).hostname;

                        // Reconstruct structure to match Microlink/Noembed
                        const processed = {
                            title: title,
                            description: description,
                            image: image ? { url: image } : null,
                            url: targetUrl,
                            publisher: siteName,
                            logo: { url: `https://www.google.com/s2/favicons?domain=${new URL(targetUrl).hostname}` }
                        };

                        currentLinkData = processed;
                        renderLinkPreview(processed);
                    })
                    .catch(error => {
                        console.error('All Link Preview attempts failed:', error);
                        // Show "failed" state or just simple Link card
                        renderLinkPreview({
                            title: targetUrl,
                            description: 'No preview available',
                            url: targetUrl,
                            publisher: new URL(targetUrl).hostname
                        });
                    });
            }

            function renderLinkPreview(data) {
                linkPreviewBar.querySelector('.lp-loading').style.display = 'none';
                linkPreviewBar.querySelector('.lp-content').style.display = 'flex';

                lpTitle.innerText = data.title || 'Link';
                lpDesc.innerText = data.description || '';
                lpDomain.innerText = data.publisher || (data.url ? new URL(data.url).hostname : 'link');

                if (data.image && data.image.url) {
                    lpThumb.style.display = 'block';
                    lpThumb.style.backgroundImage = `url('${data.image.url}')`;
                    lpThumb.style.backgroundSize = 'cover';
                } else if (data.logo && data.logo.url) {
                    // Fallback to Logo/Favicon
                    lpThumb.style.display = 'block';
                    lpThumb.style.backgroundImage = `url('${data.logo.url}')`;
                    lpThumb.style.backgroundSize = 'contain';
                    lpThumb.style.backgroundRepeat = 'no-repeat';
                } else {
                    lpThumb.style.display = 'none';
                }
            }

            function closeLinkPreview() {
                linkPreviewBar.classList.remove('show');
                currentLinkData = null;

            }

            // --- PREVIEW MODAL EMOJI PICKER ---
            const previewEmojiBtn = document.getElementById('preview-emoji-btn');
            const previewEmojiPicker = document.getElementById('preview-emoji-picker');
            const previewEmojiGrid = document.getElementById('preview-emoji-grid');
            const previewCaptionInput = document.getElementById('preview-caption');

            if (previewEmojiBtn && previewEmojiPicker) {
                previewEmojiBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    previewEmojiPicker.classList.toggle('show');
                });

                // Close on outside click
                window.addEventListener('click', (e) => {
                    if (!previewEmojiPicker.contains(e.target) && e.target !== previewEmojiBtn) {
                        previewEmojiPicker.classList.remove('show');
                    }
                });
            }

            if (previewEmojiGrid) {
                const spans = previewEmojiGrid.querySelectorAll('span');
                spans.forEach(span => {
                    span.addEventListener('click', () => {
                        previewCaptionInput.value += span.innerText;
                        // Trigger auto-grow
                        previewCaptionInput.dispatchEvent(new Event('input'));
                    });
                });
            }


            // --- GIF MODAL LOGIC START ---





            function triggerImageUpload() {
                const el = document.getElementById('image-upload-input');
                if (el) el.click();
            }

            // --- GIF MODAL LOGIC ---
            const gifModal = document.getElementById('gif-modal');
            const gifSearchInput = document.getElementById('gif-search-input');
            const gifGrid = document.getElementById('gif-grid');
            // REPLACE WITH YOUR GIPHY API KEY
            const GIPHY_API_KEY = 'qORQUZBZ0InCpe6QVSTLiX9MUlHyhegF';

            function openGifModal() {
                if (gifModal) {
                    gifModal.classList.add('show');
                    fetchTrendingGifs(); // Load initial trends
                    // Focus input
                    setTimeout(() => { if (gifSearchInput) gifSearchInput.focus(); }, 100);
                }
            }

            function closeGifModal() {
                if (gifModal) gifModal.classList.remove('show');
            }

            function triggerLocalGifUpload() {
                if (gifUploadInput) gifUploadInput.click();
            }

            // Handle Local GIF Upload - REMOVED (Moved to earlier block with fix)

            // GIPHY API INTEGRATION
            if (gifSearchInput) {
                let debounceTimer;
                gifSearchInput.addEventListener('input', (e) => {
                    clearTimeout(debounceTimer);
                    const query = e.target.value.trim();
                    debounceTimer = setTimeout(() => {
                        if (query.length > 0) {
                            searchGifs(query);
                        } else {
                            fetchTrendingGifs();
                        }
                    }, 500);
                });
            }

            async function fetchTrendingGifs() {
                if (!gifGrid) return;
                // Use API if Key present, else mock or error
                if (GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') {
                    gifGrid.innerHTML = '<div style="color:#eee; grid-column:1/-1; text-align:center;">Por favor, añade tu GIPHY API KEY en el código.</div>';
                    return;
                }
                gifGrid.innerHTML = '<div style="color:#aaa; grid-column:1/-1; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

                try {
                    const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`);
                    const data = await res.json();
                    renderGifs(data.data);
                } catch (e) {
                    console.error(e);
                    gifGrid.innerHTML = '<div style="color:#ff6b6b; grid-column:1/-1; text-align:center;">Error al cargar GIFs.</div>';
                }
            }

            async function searchGifs(query) {
                if (!gifGrid) return;
                if (GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') return;

                gifGrid.innerHTML = '<div style="color:#aaa; grid-column:1/-1; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
                try {
                    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`);
                    const data = await res.json();
                    renderGifs(data.data);
                } catch (e) {
                    console.error(e);
                    gifGrid.innerHTML = '<div style="color:#ff6b6b; grid-column:1/-1; text-align:center;">Error en la búsqueda.</div>';
                }
            }

            function renderGifs(gifs) {
                if (!gifGrid) return;
                gifGrid.innerHTML = '';
                if (!gifs || gifs.length === 0) {
                    gifGrid.innerHTML = '<div style="color:#aaa; grid-column:1/-1; text-align:center;">No se encontraron resultados.</div>';
                    return;
                }

                gifs.forEach(gif => {
                    const url = gif.images.fixed_height_small.url; // Preview URL
                    const fullUrl = gif.images.original.url; // Send URL (better quality)

                    const div = document.createElement('div');
                    div.className = 'gif-item';
                    div.innerHTML = `<img src="${url}" loading="lazy">`;
                    div.onclick = () => {
                        closeGifModal();
                        // Open Preview with FULL URL properly
                        openPreviewModal(fullUrl);
                        // Hide HD Button for GIFs
                        const hdBtn = document.getElementById('hd-preview-btn');
                        if (hdBtn) hdBtn.style.display = 'none';
                    };
                    gifGrid.appendChild(div);
                });
            }

            // --- LÓGICA DEL BUSCADOR INTELIGENTE ---
            const chatSearchBtn = document.getElementById('chat-search-btn');
            const chatSearchBar = document.getElementById('chat-search-bar');
            const inChatInput = document.getElementById('in-chat-search-input');
            const btnSearchUp = document.getElementById('btn-search-up');
            const btnSearchDown = document.getElementById('btn-search-down');
            const btnSearchClose = document.getElementById('btn-search-close');
            const searchCounter = document.getElementById('search-counter');

            let searchMatches = []; // Guardará las posiciones de los resultados
            let currentMatchIndex = -1;
            let originalMessagesHTML = []; // Copia de seguridad para restaurar

            // 1. Abrir/Cerrar Buscador
            chatSearchBtn.addEventListener('click', () => {
                chatSearchBar.classList.toggle('show');
                if (chatSearchBar.classList.contains('show')) {
                    // DISABLE VIRTUALIZATION FOR SEARCH
                    VirtualScroll.isEnabled = false;
                    VirtualScroll.cleanup(true); // Restore everything to search it

                    setTimeout(() => {
                        inChatInput.focus();
                    }, 100);
                    // Guardamos el HTML original para no romper nada al cerrar
                    const msgs = document.querySelectorAll('.message');
                    originalMessagesHTML = Array.from(msgs).map(m => ({ el: m, html: m.innerHTML }));
                } else {
                    clearSearch();
                    // RE-ENABLE VIRTUALIZATION
                    VirtualScroll.isEnabled = true;
                    VirtualScroll.init();
                }
            });

            btnSearchClose.addEventListener('click', () => {
                chatSearchBar.classList.remove('show');
                clearSearch();
                // RE-ENABLE VIRTUALIZATION
                VirtualScroll.isEnabled = true;
                VirtualScroll.init();
            });

            // 2. Función de Búsqueda en Tiempo Real
            inChatInput.addEventListener('input', (e) => {
                // 1. AUTO-GROW (Nuevo código)
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';

                const term = e.target.value.trim().toLowerCase();

                // Restaurar primero para limpiar búsqueda anterior
                originalMessagesHTML.forEach(item => {
                    item.el.innerHTML = item.html;
                });

                searchMatches = [];
                currentMatchIndex = -1;

                if (term === '') {
                    updateCounter();
                    return;
                }

                // Buscar texto en cada mensaje
                const msgs = document.querySelectorAll('.message');
                msgs.forEach((msg) => {
                    // Evitamos buscar dentro de etiquetas HTML (como <div class="time">)
                    // Usamos una expresión regular segura para texto
                    const text = msg.textContent.toLowerCase();

                    if (text.includes(term)) {
                        // Magia: Resaltar texto sin romper HTML
                        highlightTextInNode(msg, term);
                    }
                });

                // Recolectar todos los spans resaltados
                searchMatches = document.querySelectorAll('.highlight-text');

                if (searchMatches.length > 0) {
                    currentMatchIndex = 0; // Ir al primero
                    focusMatch(currentMatchIndex);
                }

                updateCounter();
            });

            // Función auxiliar para resaltar texto (respetando HTML)
            function highlightTextInNode(element, term) {
                const regex = new RegExp(`(${term})`, 'gi');

                // Recorremos solo nodos de texto para no romper divs internos (hora, check)
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
                let node;
                const textNodes = [];

                while (node = walker.nextNode()) {
                    textNodes.push(node);
                }

                textNodes.forEach(textNode => {
                    if (textNode.nodeValue.toLowerCase().includes(term)) {
                        const span = document.createElement('span');
                        // Reemplaza el texto plano con el HTML resaltado
                        span.innerHTML = textNode.nodeValue.replace(regex, '<span class="highlight-text">$1</span>');
                        textNode.parentNode.replaceChild(span, textNode);
                    }
                });
            }

            // 3. Navegación (Arriba / Abajo)
            btnSearchDown.addEventListener('click', () => {
                if (searchMatches.length === 0) return;
                currentMatchIndex++;
                if (currentMatchIndex >= searchMatches.length) currentMatchIndex = 0; // Loop al inicio
                focusMatch(currentMatchIndex);
                updateCounter();
            });

            btnSearchUp.addEventListener('click', () => {
                if (searchMatches.length === 0) return;
                currentMatchIndex--;
                if (currentMatchIndex < 0) currentMatchIndex = searchMatches.length - 1; // Loop al final
                focusMatch(currentMatchIndex);
                updateCounter();
            });

            function focusMatch(index) {
                // Quitar foco del anterior
                searchMatches.forEach(m => m.classList.remove('current'));

                // Poner foco al nuevo
                const match = searchMatches[index];
                match.classList.add('current');

                // Scroll suave hacia el mensaje
                match.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            function updateCounter() {
                if (searchMatches.length === 0) {
                    searchCounter.innerText = "Sin resultados";
                } else {
                    searchCounter.innerText = `${currentMatchIndex + 1} de ${searchMatches.length}`;
                }
            }

            function clearSearch() {
                inChatInput.value = '';
                searchCounter.innerText = "0 de 0";
                // Restaurar HTML original (quita lo amarillo)
                originalMessagesHTML.forEach(item => {
                    item.el.innerHTML = item.html;
                });
            }
            /* --- FUNCIONES DEL MENÚ DE OPCIONES --- */

            // 1. INFO DEL CONTACTO
            function goToContactInfo() {
                // Redirige al perfil.html. En el futuro, puedes pasar un ID por URL: profile.html?id=usuario123
                window.location.href = 'profile.html';
            }

            // 2. SELECCIONAR MENSAJES
            let isSelectionMode = false;

            function toggleSelectionMode() {
                isSelectionMode = !isSelectionMode;
                const chatBody = document.getElementById('msg-container');
                const selectionBar = document.getElementById('selection-bar');
                const messages = document.querySelectorAll('.message');

                if (isSelectionMode) {
                    // DISABLE VIRTUALIZATION (Checkboxes need to be in DOM)
                    VirtualScroll.isEnabled = false;
                    VirtualScroll.cleanup(true);

                    // Activar modo
                    chatBody.classList.add('selection-mode');
                    selectionBar.classList.add('active');

                    // Agregar checkboxes dinámicamente si no existen
                    messages.forEach(msg => {
                        if (!msg.querySelector('.msg-checkbox')) {
                            const checkbox = document.createElement('div');
                            checkbox.className = 'msg-checkbox';
                            msg.insertBefore(checkbox, msg.firstChild); // Poner al inicio

                            // Evento click para seleccionar
                            msg.onclick = (e) => {
                                if (!isSelectionMode) return;
                                e.stopPropagation(); // Evitar otros clicks
                                toggleMessageSelection(msg);
                            };
                        }
                    });
                } else {
                    // Desactivar modo
                    chatBody.classList.remove('selection-mode');
                    selectionBar.classList.remove('active');
                    // Limpiar selecciones
                    document.querySelectorAll('.message.selected').forEach(m => m.classList.remove('selected'));
                    updateSelectionCount();

                    // RE-ENABLE VIRTUALIZATION
                    VirtualScroll.isEnabled = true;
                    VirtualScroll.init();
                }
                // Cerrar menú dropdown si está abierto
                const dropdown = document.getElementById('chatDropdown');
                if (dropdown) dropdown.classList.remove('show');
            }

            function toggleMessageSelection(msgElement) {
                msgElement.classList.toggle('selected');
                updateSelectionCount();
            }

            function updateSelectionCount() {
                const count = document.querySelectorAll('.message.selected').length;
                document.getElementById('selected-count').innerText = count;
            }

            // Acciones dummy (solo visuales por ahora)
            function actionDeleteSelected() {
                const selected = document.querySelectorAll('.message.selected');
                if (selected.length === 0) return;

                const count = selected.length;
                const modal = document.getElementById('delete-single-msg-modal');
                // Intentamos buscar título y texto dentro del modal existente
                const title = modal.querySelector('h3');
                const warningP = modal.querySelector('.delete-warning-text');
                const nameSpan = document.getElementById('del-contact-name-span');
                const checkbox = document.getElementById('delete-for-everyone-check');

                if (title) {
                    title.innerText = count === 1 ? "¿Eliminar mensaje?" : `¿Eliminar ${count} mensajes?`;
                }

                if (warningP) {
                    // Guardar texto original si no existe backup
                    if (!warningP.hasAttribute('data-original-text')) {
                        warningP.setAttribute('data-original-text', warningP.innerHTML);
                    }

                    let baseText = "¿Estás seguro de que quieres eliminar ";
                    if (count === 1) {
                        baseText += "este mensaje?";
                        if (nameSpan) nameSpan.parentElement.style.display = 'inline';
                    } else {
                        baseText += `estos ${count} mensajes?`;
                    }
                    warningP.innerHTML = baseText;
                }

                if (checkbox) checkbox.checked = false;

                // Mostrar modal
                modal.style.display = 'flex';
                // No seteamos messagePendingDeletion para indicar que es bulk
                messagePendingDeletion = null;
            }
            function actionStar() {
                const selected = document.querySelectorAll('.message.selected');
                if (selected.length === 0) return;

                // 1. Check logic: If ANY selected message is NOT starred -> Star ALL
                // If ALL selected messages ARE starred -> Unstar ALL
                let hasUnstarred = false;
                selected.forEach(msg => {
                    if (!msg.querySelector('.favorite-icon')) {
                        hasUnstarred = true;
                    }
                });

                selected.forEach(msg => {
                    const infoDiv = msg.querySelector('.msg-info');
                    const existingStar = msg.querySelector('.favorite-icon');

                    if (hasUnstarred) {
                        // ADD STAR if not present
                        if (!existingStar && infoDiv) {
                            const star = document.createElement('i');
                            star.className = 'fas fa-star favorite-icon';
                            // Insert before the time text (infoDiv.firstChild is usually time text)
                            infoDiv.insertBefore(star, infoDiv.firstChild);
                        }
                    } else {
                        // REMOVE STAR
                        if (existingStar) {
                            existingStar.remove();
                        }
                    }
                });

                const actionText = hasUnstarred ? "Mensajes marcados como favoritos" : "Se quitaron de favoritos";
                showToast(actionText);

                toggleSelectionMode(); // Exit mode
            }
            function actionForward() {
                alert("Abriendo lista de contactos para reenviar... (Simulación)");
                toggleSelectionMode();
            }

            // 3. SILENCIAR NOTIFICACIONES (GHOSTING)
            let isMuted = false;
            /* --- LÓGICA DE SILENCIAR (MUTE) MEJORADA --- */

            function toggleMute() {
                // 1. Cerrar el dropdown del chat
                const dropdown = document.getElementById('chatDropdown');
                if (dropdown) dropdown.classList.remove('show');

                const header = document.querySelector('.chat-header');

                // CHECK IF ALREADY MUTED -> UNMUTE
                if (header.classList.contains('muted')) {
                    // Unmute logic
                    header.classList.remove('muted');

                    // Remove Header Icon
                    const hIcon = document.getElementById('mute-icon-indicator');
                    if (hIcon) hIcon.remove();

                    // Remove Sidebar Icon
                    const activeContact = document.querySelector('.contact-item.active');
                    if (activeContact) {
                        const sIcon = activeContact.querySelector('.muted-sidebar-icon');
                        if (sIcon) sIcon.remove();
                    }

                    showToast("Notificaciones activadas");

                    // Restore Dropdown Text
                    const muteBtn = document.getElementById('mute-option');
                    if (muteBtn) {
                        muteBtn.innerHTML = '<i class="far fa-bell-slash"></i> Silenciar notificaciones';
                    }

                    return;
                }

                // IF NOT MUTED -> OPEN MODAL

                // 2. Preparar el avatar del modal
                const modalAvatar = document.getElementById('mute-modal-avatar');
                const headerImg = document.querySelector('.chat-header .c-avatar-img'); // Assuming this class based on other code
                const contactName = document.querySelector('.chat-user-info h4').innerText;

                // Adjust based on header structure from confirmMuteAction context or previous reads
                // The previous code had specific avatar logic, preserving it but simplifying slightly if needed.
                // Assuming c-avatar-img exists as seen in context

                if (modalAvatar) {
                    // Check existing background image inline style
                    if (headerImg && headerImg.style.backgroundImage && headerImg.style.backgroundImage !== 'none') {
                        modalAvatar.style.backgroundImage = headerImg.style.backgroundImage;
                        modalAvatar.innerText = "";
                    } else {
                        modalAvatar.style.backgroundImage = "none";
                        modalAvatar.innerText = contactName.charAt(0);
                    }
                }

                // 3. Mostrar el modal
                document.getElementById('mute-modal').style.display = 'flex';
            }

            function closeMuteModal() {
                document.getElementById('mute-modal').style.display = 'none';
            }

            function confirmMuteAction() {
                // Obtener la opción seleccionada
                const selected = document.querySelector('input[name="mute-time"]:checked').value;

                // UI del header
                const header = document.querySelector('.chat-header');
                const activeContact = document.querySelector('.contact-item.active');

                header.classList.add('muted');

                // 1. HEADER ICONS
                if (!document.getElementById('mute-icon-indicator')) {
                    const nameContainer = document.querySelector('.chat-user-info h4');
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-bell-slash muted-indicator';
                    icon.id = 'mute-icon-indicator';
                    nameContainer.appendChild(icon);
                }

                // 2. SIDEBAR ICON
                if (activeContact) {
                    if (!activeContact.querySelector('.muted-sidebar-icon')) {
                        // Direct selector to the time container
                        const metaRight = activeContact.querySelector('.meta-info-right');
                        if (metaRight) {
                            const sideIcon = document.createElement('i');
                            sideIcon.className = 'fas fa-bell-slash muted-sidebar-icon';
                            metaRight.appendChild(sideIcon);
                        }
                    }
                }

                // Mostrar feedback visual con tu sistema de Toast
                const timeLabels = { '1h': '1 hora', '4h': '4 horas', '8h': '8 horas', '1d': '1 día', '3d': '3 días', 'forever': 'siempre' };
                showToast(`Chat silenciado por ${timeLabels[selected]}`);

                closeMuteModal();

                // UPDATE DROPDOWN TO "UNMUTE"
                const muteBtn = document.getElementById('mute-option');
                if (muteBtn) {
                    muteBtn.innerHTML = '<i class="fas fa-bell"></i> Unmute';
                }
            }

            // 5. VACIAR CHAT CON BARRA DE CARGA
            function openClearModal() {
                document.getElementById('clear-chat-modal').style.display = 'flex';
                const dropdown = document.getElementById('chatDropdown');
                if (dropdown) dropdown.classList.remove('show');
            }

            function closeClearModal() {
                document.getElementById('clear-chat-modal').style.display = 'none';
                // Resetear modal por si acaso
                document.getElementById('clear-chat-buttons').style.display = 'flex';
                document.getElementById('clear-progress-box').style.display = 'none';
            }

            function startClearProcess() {
                // 1. Ocultar botones y mostrar barra
                document.getElementById('clear-chat-buttons').style.display = 'none';
                document.getElementById('clear-progress-box').style.display = 'block';
                document.getElementById('clear-chat-text').innerText = "Eliminando historial del servidor...";

                const progressBar = document.getElementById('clear-progress-fill');
                const progressText = document.getElementById('clear-progress-text');

                // FIREBASE CLEAR (Restored)
                window.messageService.deleteAllMessages();

                let progress = 0;

                // 2. Simulación de carga (Visual Feedback)
                const interval = setInterval(() => {
                    // Incremento aleatorio para parecer "calculando"
                    progress += Math.floor(Math.random() * 5) + 2;

                    if (progress > 100) progress = 100;

                    progressBar.style.width = progress + '%';
                    progressText.innerText = `Procesando... ${progress}%`;

                    if (progress === 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            // 3. Acción Final: Borrar todo
                            document.getElementById('msg-container').innerHTML = '<div style="text-align:center; padding:20px; color:#777;">Chat vaciado</div>'; // Feedback visual
                            closeClearModal();
                            alert("Chat vaciado correctamente.");

                            // Restaurar el modal a su estado original para la próxima vez
                            setTimeout(() => {
                                document.getElementById('clear-chat-buttons').style.display = 'flex';
                                document.getElementById('clear-progress-box').style.display = 'none';
                                document.getElementById('clear-chat-text').innerText = "¿Estás seguro? Esta acción borrará todo el historial.";
                                progressBar.style.width = '0%';
                            }, 500);
                        }, 500);
                    }
                }, 50); // Velocidad de la carga
            }

            function toggleSearch() {
                const dropdown = document.getElementById('chatDropdown');
                if (dropdown) dropdown.classList.remove('show');
                document.getElementById('chat-search-btn').click();
            }

            // 6. WALLPAPER LOGIC REMOVED (Replaced below)
            /* --- LÓGICA DE FONDO DE PANTALLA MEJORADA (Tiempo real + Blur) --- */

            const mainContentContainer = document.querySelector('.main-content'); // El contenedor a desenfocar
            const chatAreaTarget = document.getElementById('main-chat-area'); // El área donde va el fondo

            // 1. Cargar al inicio
            document.addEventListener('DOMContentLoaded', () => {
                const savedBg = localStorage.getItem('chat_wallpaper');
                if (savedBg) {
                    applyBackground(savedBg);
                } else {
                    // Initialize default theme if no custom bg
                    ThemeAdapter.initDefault();
                }
            });

            /* --- THEME ADAPTER (Camouflage) --- */
            const ThemeAdapter = {
                canvas: null,
                ctx: null,
                pollInterval: null,
                isEnabled: true, // Default to true

                init() {
                    this.canvas = document.createElement('canvas');
                    this.canvas.width = 50; // Low res for performance
                    this.canvas.height = 50;
                    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

                    // Load Preference
                    const savedPref = localStorage.getItem('adaptive_theme_enabled');
                    if (savedPref !== null) {
                        this.isEnabled = (savedPref === 'true');
                    }

                    // Sync Switch UI if exists
                    const toggleEl = document.getElementById('adaptive-theme-toggle');
                    if (toggleEl) toggleEl.checked = this.isEnabled;
                },

                toggleAdaptive(state) {
                    this.isEnabled = state;
                    localStorage.setItem('adaptive_theme_enabled', state);

                    if (state) {
                        // Re-trigger application based on current background
                        // We can't easily re-extract without re-loading resource.
                        // Simplest way: re-call setChatBg with current saved bg? 
                        // Or just show toast "Cambio aplicado" and user re-selects or reloads.
                        // Better: Try to grab current bg style.
                        const currentBg = localStorage.getItem('chat_wallpaper');
                        if (currentBg) applyBackground(currentBg);
                    } else {
                        this.stopPolling();
                        this.initDefault();
                    }
                },

                initDefault() {
                    // Default Dark Blue Theme
                    this.applyTheme(23, 33, 43);
                },

                applyTheme(r, g, b) {
                    const root = document.documentElement;
                    root.style.setProperty('--theme-rgb', `${r}, ${g}, ${b}`);
                },

                extractFromImage(url) {
                    if (!this.isEnabled) return; // Feature disabled

                    this.stopPolling();
                    if (!this.canvas) this.init();

                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = url;
                    img.onload = () => {
                        this.ctx.drawImage(img, 0, 0, 50, 50);
                        const rgb = this.getAverageColor();
                        this.applyTheme(rgb.r, rgb.g, rgb.b);
                    };
                },

                extractFromVideo(videoElement) {
                    if (!this.isEnabled) return; // Feature disabled

                    this.stopPolling();
                    if (!this.canvas) this.init();

                    const update = () => {
                        if (videoElement.paused || videoElement.ended) return;
                        try {
                            this.ctx.drawImage(videoElement, 0, 0, 50, 50);
                            const rgb = this.getAverageColor();
                            this.applyTheme(rgb.r, rgb.g, rgb.b);
                        } catch (e) {
                            // Video might not be ready
                        }
                    };

                    // Poll every 2 seconds
                    this.pollInterval = setInterval(update, 2000);
                    update();
                },

                stopPolling() {
                    if (this.pollInterval) clearInterval(this.pollInterval);
                },

                getAverageColor() {
                    const frame = this.ctx.getImageData(0, 0, 50, 50);
                    const length = frame.data.length;
                    let r = 0, g = 0, b = 0, count = 0;

                    for (let i = 0; i < length; i += 4) {
                        r += frame.data[i];
                        g += frame.data[i + 1];
                        b += frame.data[i + 2];
                        count++;
                    }

                    return {
                        r: Math.floor(r / count),
                        g: Math.floor(g / count),
                        b: Math.floor(b / count)
                    };
                }
            };
            // -------------------------------------

            // 2. Funciones para abrir/cerrar modal con efecto BLUR
            function openBgPicker() {
                // Mostrar modal
                document.getElementById('bg-picker-modal').classList.add('show');
                const dropdown = document.getElementById('chatDropdown');
                if (dropdown) dropdown.classList.remove('show');
                // Activar desenfoque en el fondo
                if (mainContentContainer) mainContentContainer.classList.add('blurred');
            }

            function closeBgPicker() {
                // Ocultar modal
                document.getElementById('bg-picker-modal').classList.remove('show');
                // Quitar desenfoque
                if (mainContentContainer) mainContentContainer.classList.remove('blurred');
            }

            // 3. Función central para guardar y aplicar
            function setChatBg(bgValue) {
                if (bgValue === 'default') {
                    localStorage.removeItem('chat_wallpaper');
                    // Restaurar fondo original (Asegúrate que esta ruta sea correcta en tu proyecto)
                    applyBackground("url('assets/imagenes/Fondo PC.png')");
                } else {
                    // Si pesa mucho, solo avisamos (pero guardamos igual)
                    if (bgValue.length > 3000000) {
                        if (typeof showToast === 'function') showToast("Video pesado: Puede consumir rendimiento");
                    }

                    // Intentar guardar SIEMPRE (Libertad al usuario)
                    try {
                        localStorage.setItem('chat_wallpaper', bgValue);
                    } catch (e) {
                        console.warn("Fallo al guardar (probablemente límite almacenamiento):", e);
                        if (typeof showToast === 'function') showToast("Error: Video demasiado grande para guardar");
                    }
                    applyBackground(bgValue); // Aplicar INMEDIATAMENTE
                }
                closeBgPicker(); // Cerrar modal y quitar blur
            }

            // 4. Función para aplicar visualmente el estilo (FORZANDO EL AJUSTE)
            function applyBackground(bgStyle) {
                const videoEl = document.getElementById('bg-video-element');

                // Stop any previous polling
                ThemeAdapter.stopPolling();

                // Limpiamos estilos previos inline
                chatAreaTarget.style.background = '';
                chatAreaTarget.style.backgroundImage = '';

                // DETECTAR SI ES VIDEO (DataURI de video o URL de video)
                // Nota: Para este caso, asumimos que si empieza con data:video es video.
                if (bgStyle.startsWith('data:video') || bgStyle.endsWith('.mp4') || bgStyle.endsWith('.webm')) {
                    if (videoEl) {
                        videoEl.src = bgStyle;
                        videoEl.style.display = 'block';
                        videoEl.play().catch(e => console.log("Error autoplay video:", e));

                        // TRIGGER THEME ADAPTER FOR VIDEO
                        ThemeAdapter.extractFromVideo(videoEl);
                    }
                }
                // ES IMAGEN O COLOR
                else {
                    if (videoEl) {
                        videoEl.pause();
                        videoEl.style.display = 'none';
                        videoEl.removeAttribute('src'); // Liberar memoria
                    }

                    // Detectamos si es una imagen (URL o Base64 data:image)
                    if (bgStyle.includes('url') || bgStyle.includes('data:image')) {
                        // Es una imagen
                        const finalBg = bgStyle.includes('url') ? bgStyle : `url('${bgStyle}')`;
                        chatAreaTarget.style.backgroundImage = finalBg;

                        // Forzamos las propiedades para que se ajuste bien
                        chatAreaTarget.style.backgroundSize = 'cover';
                        chatAreaTarget.style.backgroundPosition = 'center center';

                        // TRIGGER THEME ADAPTER FOR IMAGE
                        // Clean URL from url('...') if present
                        let imgUrl = bgStyle;
                        if (bgStyle.startsWith('url')) {
                            imgUrl = bgStyle.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                        }
                        ThemeAdapter.extractFromImage(imgUrl);

                    } else {
                        // Es un color sólido o gradiente
                        chatAreaTarget.style.background = bgStyle;
                        // If it's a simple hex color, we could try to apply it as theme?
                        // For now, reset to default theme for safety if it's just a color/gradient
                        ThemeAdapter.initDefault();
                    }
                }
            }

            // 5. Manejar la subida de imagen local (FileReader + Canvas Resizing)
            document.addEventListener('DOMContentLoaded', () => {
                const bgInput = document.getElementById('bg-upload-input');

                if (bgInput) {
                    bgInput.addEventListener('change', function (e) {
                        if (this.files && this.files[0]) {
                            const file = this.files[0];

                            // 1. SI ES VIDEO: Validar duración (Max 60s)
                            if (file.type.startsWith('video/')) {
                                const videoTest = document.createElement('video');
                                videoTest.preload = 'metadata';
                                videoTest.onloadedmetadata = function () {
                                    window.URL.revokeObjectURL(videoTest.src);
                                    if (videoTest.duration > 60) {
                                        if (videoTest.duration > 60) {
                                            showToast("Video demasiado largo (Max 1 min)");
                                            return;
                                        }
                                        return;
                                    }
                                    // Si pasa la validación, leer como DataURL
                                    const reader = new FileReader();
                                    reader.onload = function (evt) {
                                        setChatBg(evt.target.result);
                                    };
                                    reader.readAsDataURL(file);
                                };
                                videoTest.src = URL.createObjectURL(file);
                            }
                            // 2. SI ES GIF: Bypass Canvas
                            else if (file.type === 'image/gif') {
                                const reader = new FileReader();
                                reader.onload = function (evt) {
                                    setChatBg(evt.target.result);
                                };
                                reader.readAsDataURL(file);
                            }
                            // 3. SI ES IMAGEN ESTÁTICA: Usar Canvas
                            else {
                                const reader = new FileReader();
                                reader.onload = function (event) {
                                    const img = new Image();
                                    img.onload = function () {
                                        const canvas = document.createElement('canvas');
                                        const ctx = canvas.getContext('2d');

                                        const MAX_WIDTH = 1920;
                                        const MAX_HEIGHT = 1080;
                                        let width = img.width;
                                        let height = img.height;

                                        if (width > height) {
                                            if (width > MAX_WIDTH) {
                                                height *= MAX_WIDTH / width;
                                                width = MAX_WIDTH;
                                            }
                                        } else {
                                            if (height > MAX_HEIGHT) {
                                                width *= MAX_HEIGHT / height;
                                                height = MAX_HEIGHT;
                                            }
                                        }

                                        if (width < 320) {
                                            const scale = 320 / width;
                                            width *= scale;
                                            height *= scale;
                                        }

                                        canvas.width = width;
                                        canvas.height = height;
                                        ctx.drawImage(img, 0, 0, width, height);

                                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                        setChatBg(dataUrl);
                                    };
                                    img.src = event.target.result;
                                };
                                reader.readAsDataURL(file);
                            }
                        }
                        this.value = ''; // Reset input to allow re-uploading same file
                    });
                }
            });

        

/* Extracted Script */

        // CONTEXT MENU LOGIC
        const ctxMenu = document.getElementById('msg-context-menu');
        const reactionFullPicker = document.getElementById('reaction-full-picker');
        const reactionArrow = document.getElementById('react-expand-btn');
        let currentMsgTarget = null;

        function toggleExpandedReactions() {
            reactionFullPicker.classList.toggle('show');
            reactionArrow.classList.toggle('rotated');
        }

        function reactToMessage(emoji) {
            if (!currentMsgTarget) return;

            // Check if bubble exists
            let reactionBubble = currentMsgTarget.querySelector('.msg-reaction-bubble');

            // TOGGLE LOGIC: If same emoji, remove it.
            if (reactionBubble && reactionBubble.innerText === emoji) {
                removeReaction(reactionBubble);
                ctxMenu.classList.remove('show');
                return;
            }

            // CREATE OR UPDATE ID
            if (!reactionBubble) {
                reactionBubble = document.createElement('div');
                reactionBubble.className = 'msg-reaction-bubble pop-in'; // Add entry animation

                // Style bubble
                reactionBubble.style.position = 'absolute';
                reactionBubble.style.bottom = '-10px';
                reactionBubble.style.right = currentMsgTarget.classList.contains('msg-sent') ? '10px' : 'auto';
                reactionBubble.style.left = currentMsgTarget.classList.contains('msg-received') ? '10px' : 'auto';
                reactionBubble.style.background = '#232e3c';
                reactionBubble.style.border = '1px solid #0e1621';
                reactionBubble.style.borderRadius = '10px';
                reactionBubble.style.padding = '2px 5px';
                reactionBubble.style.fontSize = '0.9rem'; /* Slightly larger */
                reactionBubble.style.cursor = 'pointer'; /* Indicate clickable */
                reactionBubble.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                reactionBubble.style.zIndex = '5';

                // CLICK TO REMOVE
                reactionBubble.onclick = (e) => {
                    e.stopPropagation(); // Prevent message click issues
                    removeReaction(reactionBubble);
                };

                currentMsgTarget.appendChild(reactionBubble);
                currentMsgTarget.style.position = 'relative'; // Ensure positioning context
            } else {
                // Update existing: Re-trigger animation
                reactionBubble.className = 'msg-reaction-bubble'; // Reset
                void reactionBubble.offsetWidth; // Trigger reflow
                reactionBubble.className = 'msg-reaction-bubble pop-in';
            }

            reactionBubble.innerText = emoji;
            ctxMenu.classList.remove('show');
        }

        // Helper to remove with animation
        function removeReaction(bubble) {
            if (!bubble) return;
            bubble.classList.remove('pop-in');
            bubble.classList.add('pop-out');

            // Wait for animation then remove
            setTimeout(() => {
                if (bubble && bubble.parentNode) bubble.remove();
            }, 200); // Match animation duration
        }

        /* --- LÓGICA DE ELIMINAR MENSAJE (BLOQUE ÚNICO) --- */
        // Variable global para guardar temporalmente el mensaje a eliminar
        let messagePendingDeletion = null;

        /* --- LÓGICA DE EDICIÓN --- */
        let messageBeingEdited = null;

        function enterEditMode(msgElement) {
            messageBeingEdited = msgElement;

            // 1. Get Clean Text (ignoring time, checks, etc)
            const clone = msgElement.cloneNode(true);
            const artifacts = clone.querySelectorAll('.msg-time, .message-time, .time, .timestamp, .msg-info, .msg-meta, .msg-reaction-bubble, .msg-check, .check-read, span[style*="float: right"], .msg-reply-context, .msg-forward-header, .msg-link-card, .msg-edited-tag');
            artifacts.forEach(el => el.remove());
            const text = clone.innerText.trim();

            // 2. Populate Input
            const input = document.getElementById('input-msg');
            input.value = text;
            input.focus();

            // 3. Show Edit UI (Recycle Reply Preview Bar for simplicity or create new)
            // Let's us the Reply Preview Bar but styled for Edit
            const previewBar = document.getElementById('reply-preview-bar');
            const replyTitle = document.getElementById('reply-title');
            const replyText = document.getElementById('reply-text');
            const accentLine = document.querySelector('.reply-accent-line');

            if (previewBar) {
                previewBar.style.display = 'flex';
                replyTitle.innerText = "Editando mensaje";
                replyText.innerText = text; // Show what we are editing

                // Visual cues
                previewBar.classList.add('editing-mode');
                if (accentLine) accentLine.style.background = '#3390ec'; // Blue pen color
            }

            // 4. Update Send Button Icon to Check
            const actionContainer = document.getElementById('action-container');
            actionContainer.classList.remove('show-mic');
            actionContainer.classList.add('show-send');
            // Optionally change icon to checkmark using CSS or JS, but paper-plane is fine for "Update"
        }

        function cancelEditMode() {
            messageBeingEdited = null;
            const previewBar = document.getElementById('reply-preview-bar');
            if (previewBar) {
                previewBar.style.display = 'none';
                previewBar.classList.remove('editing-mode');
            }
            document.getElementById('input-msg').value = '';
        }

        function saveEditedMessage(newText) {
            if (!messageBeingEdited) return;

            // UPDATED: Delegar todo a Firebase (Fuente de verdad)
            // Esto dispara 'onFirebaseMessageChanged', que regenerará el HTML correctamente
            // incluyendo respuestas, reenvíos, y etiquetas.
            window.messageService.editMessage(messageBeingEdited.id, newText);

            cancelEditMode();
        }

        /* --- LÓGICA DE RESPUESTA (REPLY) --- */
        let isReplying = false;
        let currentReplyTargetId = null;

        function scrollToOriginalMessage(originalId) {
            if (!originalId) return;
            const targetMsg = document.getElementById(originalId);
            if (targetMsg) {
                targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetMsg.classList.add('flash-anim');
                setTimeout(() => {
                    targetMsg.classList.remove('flash-anim');
                }, 1200); // 0.4s * 3
            } else {
                console.warn("Mensaje original no encontrado");
            }
        }

        function openReplyPreview(msgElement) {
            isReplying = true;
            currentReplyTargetId = msgElement.id; // Capture ID
            const previewBar = document.getElementById('reply-preview-bar');
            const replyTitle = document.getElementById('reply-title');
            const replyText = document.getElementById('reply-text');
            const input = document.getElementById('input-msg');

            if (previewBar && msgElement) {
                // Get data
                const isSent = msgElement.classList.contains('msg-sent');
                const name = isSent ? "Tú" : (document.querySelector('.chat-user-info h4')?.innerText || "Contacto");

                // Get text (clean cleanup)
                const clone = msgElement.cloneNode(true);
                // Exclude previous reply context (PREVENT RECURSION) along with other metadata
                const artifacts = clone.querySelectorAll('.msg-reply-context, .msg-time, .message-time, .time, .timestamp, .msg-info, .msg-meta, .msg-reaction-bubble, .msg-check, .check-read, span[style*="float: right"]');
                artifacts.forEach(el => el.remove());
                let text = clone.innerText.trim();

                // Check if image
                if (msgElement.querySelector('img')) {
                    text = "📷 Foto";
                }

                replyTitle.innerText = name;
                replyText.innerText = text;
                previewBar.style.display = 'flex';

                if (input) input.focus();
            }
        }

        function closeReplyPreview() {
            isReplying = false;
            // Reset Edit Mode variable too
            messageBeingEdited = null;

            const previewBar = document.getElementById('reply-preview-bar');
            if (previewBar) {
                previewBar.style.display = 'none';
            }
        }

        // Función ORIGINAL necesaria para el click derecho
        function handleContextAction(action) {
            if (!currentMsgTarget) return;
            if (action === 'delete') {
                openDeleteSingleModal(currentMsgTarget);
            } else if (action === 'edit') {
                // SOLO PERMITIR EDITAR MENSAJES PROPIOS (msg-sent)
                if (currentMsgTarget.classList.contains('msg-sent')) {
                    enterEditMode(currentMsgTarget);
                } else {
                    showToast("Solo puedes editar tus propios mensajes");
                }
            } else if (action === 'reply') { // NUEVO CASO REPLY
                openReplyPreview(currentMsgTarget);
            } else if (action === 'copy') {
                // CLONE the element to manipulate it without affecting the UI
                const clone = currentMsgTarget.cloneNode(true);

                // Remove timestamp, checks, reactions, and metadata (Robust List)
                const artifacts = clone.querySelectorAll('.msg-time, .message-time, .time, .timestamp, .msg-info, .msg-meta, .msg-reaction-bubble, .msg-check, .check-read, span[style*="float: right"]');
                artifacts.forEach(el => el.remove());

                // Get the clean text
                const text = clone.innerText.trim();
                navigator.clipboard.writeText(text);
                showToast("Mensaje copiado al portapapeles");
            } else if (action === 'forward') {
                actionForward();
            } else {
                alert(`Acción: ${action} (Simulada)`);
            }
            if (ctxMenu) ctxMenu.classList.remove('show');
            if (reactionFullPicker) {
                reactionFullPicker.classList.remove('show');
                if (reactionArrow) reactionArrow.classList.remove('rotated');
            }
        }

        // --- FUNCION TOAST PERSONALIZADO ---
        function showToast(message) {
            const toast = document.getElementById("custom-toast");
            const msgSpan = document.getElementById("toast-message");
            if (toast && msgSpan) {
                msgSpan.innerText = message;
                toast.className = "show";
                // Ocultar después de 3 segundos
                setTimeout(function () { toast.className = toast.className.replace("show", ""); }, 3000);
            }
        }

        // Función que abre el modal (Llamada desde el menú click derecho)
        function openDeleteSingleModal(msgElement) {
            messagePendingDeletion = msgElement;

            // Obtener nombre del contacto
            const nameEl = document.querySelector('.chat-user-info h4');
            const contactName = nameEl ? nameEl.innerText : "este contacto";

            // Actualizar texto del modal
            const nameSpan = document.getElementById('del-contact-name-span');
            if (nameSpan) nameSpan.innerText = contactName;

            // Resetear checkbox
            const check = document.getElementById('delete-for-everyone-check');
            if (check) check.checked = false;

            // Mostrar modal
            const modal = document.getElementById('delete-single-msg-modal');
            if (modal) modal.style.display = 'flex';
        }

        // Función que cierra el modal
        function closeDeleteSingleModal() {
            const modal = document.getElementById('delete-single-msg-modal');
            if (modal) modal.style.display = 'none';
            messagePendingDeletion = null;
        }

        // Función que ejecuta el borrado (Llamada por el botón ROJO)
        function confirmDeleteSingleMsg() {
            // CASO 1: BORRADO DE SELECCIÓN MÚLTIPLE
            const selected = document.querySelectorAll('.message.selected');
            if (selected.length > 0 && !messagePendingDeletion) {
                // Checkbox "para todos"
                const checkbox = document.getElementById('delete-for-everyone-check');
                const forEveryone = checkbox ? checkbox.checked : false;

                selected.forEach(msg => {
                    window.messageService.deleteMessage(msg.id);
                });

                closeDeleteSingleModal();
                toggleSelectionMode(); // Salir modo selección

                const text = forEveryone ?
                    `Se eliminaron ${selected.length} mensajes (para todos)` :
                    `Se eliminaron ${selected.length} mensajes`;
                showToast(text);
                return;
            }

            // CASO 2: BORRADO INDIVIDUAL
            if (messagePendingDeletion) {
                // FIREBASE DELETE
                window.messageService.deleteMessage(messagePendingDeletion.id);

                closeDeleteSingleModal();
                showToast("Mensaje eliminado");
            } else {
                closeDeleteSingleModal(); // Por seguridad si no hay mensaje seleccionado
            }
        }

        /* --- DOBLE CLIC PARA RESPONDER (Quick Reply) --- */
        const chatContainer = document.getElementById('msg-container');

        chatContainer.addEventListener('dblclick', (e) => {
            // 1. Buscamos si el clic fue dentro de una burbuja de mensaje
            const msgEl = e.target.closest('.message');

            if (msgEl) {
                // 2. Ejecutamos la función de respuesta que ya creamos antes
                openReplyPreview(msgEl);

                // 3. Añadimos el efecto visual de "pulso"
                msgEl.classList.add('reply-animation');

                // 4. Quitamos la clase al terminar para poder hacerlo de nuevo luego
                setTimeout(() => {
                    msgEl.classList.remove('reply-animation');
                }, 200);

                // 5. Opcional: Vibración en móviles (si soporta)
                if (navigator.vibrate) navigator.vibrate(30);
            }
        });

        document.addEventListener('contextmenu', (e) => {
            const msgEl = e.target.closest('.message');
            if (msgEl) {
                e.preventDefault();
                currentMsgTarget = msgEl;

                // Reset expansion
                if (reactionFullPicker && reactionArrow) {
                    reactionFullPicker.classList.remove('show');
                    reactionArrow.classList.remove('rotated');
                }

                const msgRect = msgEl.getBoundingClientRect();
                const isSent = msgEl.classList.contains('msg-sent');

                // DIMENSIONES
                const menuWidth = 300;
                // CAMBIO IMPORTANTE: Asumimos una altura mayor por si abre los emojis
                // Si el usuario abre los emojis, el menú crecerá. Mejor posicionarlo con espacio.
                const estimatedHeight = 500;

                let x, y;

                // --- LÓGICA HORIZONTAL (Igual que antes) ---
                if (isSent) {
                    x = msgRect.left - menuWidth - 5;
                    if (x < 0) x = msgRect.right + 5;
                } else {
                    x = msgRect.right + 5;
                    if (x + menuWidth > window.innerWidth) x = msgRect.left - menuWidth - 5;
                }

                // --- LÓGICA VERTICAL MEJORADA ---
                // Intentamos centrarlo respecto al click o al mensaje, pero priorizando que quepa en pantalla
                y = msgRect.top;

                // Si al desplegar hacia abajo se sale de la pantalla...
                if (y + estimatedHeight > window.innerHeight) {
                    // ...lo pegamos al borde inferior (dejando un margen)
                    y = window.innerHeight - estimatedHeight - 20;
                }

                // Si al subirlo se sale por arriba...
                if (y < 20) {
                    y = 20; // Lo forzamos a 20px del borde superior
                    // Nota: Si el menú es más alto que TODA la pantalla, el usuario tendrá que usar scroll
                }

                // Aplicar coordenadas
                if (x < 5) x = 5;
                if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 5;

                ctxMenu.style.left = x + 'px';
                ctxMenu.style.top = y + 'px';

                // IMPORTANTE: Resetear altura máxima del menú dinámicamente
                // Calculamos cuánto espacio queda hacia abajo desde 'y'
                const checkBottom = window.innerHeight - y - 20; // 20px margen abajo
                ctxMenu.style.maxHeight = checkBottom + 'px';

                // Asegurar que si crece, tenga scroll si es necesario (el menú completo, no solo picker)
                ctxMenu.style.overflowY = 'auto';
                ctxMenu.style.overflowX = 'hidden';
                ctxMenu.classList.add('show');
            } else {
                ctxMenu.classList.remove('show');
            }
        });

        document.addEventListener('click', (e) => {
            if (ctxMenu.classList.contains('show') && !ctxMenu.contains(e.target)) {
                ctxMenu.classList.remove('show');
            }
        });
        /* --- LÓGICA AVANZADA DE REENVIAR (FORWARD MULTIPLE) --- */

        // 1. Base de datos simulada (SIN Mensajes Guardados por petición)
        const contactsData = [
            { id: 'grp1', name: "Ceind - Comunidad 🇵🇪", status: "1,245 miembros", avatarImg: "assets/img/group.jpg", color: "#e17076" },
            { id: 'usr1', name: "Prof. Ana Miller", status: "En línea", avatarImg: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80" },
            { id: 'usr2', name: "Luis Castillo", status: "últ. vez hace 5 min", initial: "LC", color: "#ff9f43" },
            { id: 'usr3', name: "Soporte Técnico", status: "En línea", avatarIcon: "fas fa-user-shield", color: "#003d80" },
            { id: 'usr4', name: "Jota Vasquez", status: "últ. vez ayer", initial: "JV", color: "#8e44ad" },
            { id: 'usr5', name: "Aaron Dev", status: "En línea", initial: "AD", color: "#1abc9c" },
            { id: 'usr6', name: "Tyson", status: "últ. vez recientemente", initial: "T", color: "#7CB342" }
        ];

        let messageContentToForward = null;
        let selectedForwardContacts = new Set(); // Set para guardar IDs seleccionados

        // 2. Función Principal
        function actionForward() {
            if (!currentMsgTarget) return;

            // Limpiar selección previa
            selectedForwardContacts.clear();
            updateForwardFooter();

            // A. Clonar mensaje
            const clone = currentMsgTarget.cloneNode(true);
            const artifacts = clone.querySelectorAll('.msg-time, .msg-info, .msg-reply-context, .msg-reaction-bubble');
            artifacts.forEach(el => el.remove());

            const imgElement = clone.querySelector('img');
            if (imgElement) {
                messageContentToForward = { type: 'image', src: imgElement.src };
            } else {
                messageContentToForward = { type: 'text', text: clone.innerText.trim() };
            }

            // B. Renderizar
            renderForwardList();

            // C. Mostrar
            document.getElementById('forward-modal').classList.add('show');
            document.getElementById('forward-search-input').value = '';
            document.getElementById('forward-comment-input').value = ''; // Reset comment
            document.getElementById('forward-search-input').focus();

            if (ctxMenu) ctxMenu.classList.remove('show');
        }

        // 3. Renderizar lista con soporte de selección
        function renderForwardList(filterText = '') {
            const container = document.getElementById('forward-list-container');
            container.innerHTML = '';

            const term = filterText.toLowerCase();

            contactsData.forEach(contact => {
                if (term && !contact.name.toLowerCase().includes(term)) return;

                const item = document.createElement('div');
                // Chequear si está seleccionado
                const isSelected = selectedForwardContacts.has(contact.id);
                item.className = isSelected ? 'forward-item selected' : 'forward-item';

                // Toggle selection al click
                item.onclick = () => toggleForwardSelection(contact.id);

                // Avatar logic
                let avatarHTML = '';
                if (contact.avatarImg && !contact.avatarImg.includes('assets/')) {
                    avatarHTML = `<div class="f-avatar"><img src="${contact.avatarImg}"></div>`;
                } else if (contact.avatarIcon) {
                    avatarHTML = `<div class="f-avatar" style="background:${contact.color}"><i class="${contact.avatarIcon}" style="color:#fff;"></i></div>`;
                } else {
                    const bg = contact.color || '#555';
                    const txt = contact.initial || contact.name.charAt(0);
                    avatarHTML = `<div class="f-avatar" style="background:${bg}">${txt}</div>`;
                }

                item.innerHTML = `
                    <div class="forward-item-left">
                        ${avatarHTML}
                        <div class="f-info" style="margin-left: 10px;"> <!-- Margen añadido para separar del avatar -->
                            <h4>${contact.name}</h4>
                            <span>${contact.status}</span>
                        </div>
                    </div>
                    <div class="forward-checkbox"></div>
                `;

                container.appendChild(item);
            });
        }

        // 4. Lógica de Selección
        function toggleForwardSelection(id) {
            if (selectedForwardContacts.has(id)) {
                selectedForwardContacts.delete(id);
            } else {
                selectedForwardContacts.add(id);
            }
            // Re-render ligero o actualización de clases (por simplicidad re-renderizamos todo, la lista es corta)
            // Para mejor UX (evitar parpadeo) solo actualizamos visualmente si es posible, pero renderForwardList es rápido aquí.
            // Optimizaxión: buscar el elemento y togglear clase.
            renderForwardList(document.getElementById('forward-search-input').value);
            updateForwardFooter();
        }

        function updateForwardFooter() {
            const footer = document.getElementById('forward-footer');
            const count = selectedForwardContacts.size;

            if (count > 0) {
                footer.classList.add('show');
                // Always focus on input when selection exists, regardless of how many
                // This allows instant typing after selecting any contact
                setTimeout(() => {
                    const input = document.getElementById('forward-comment-input');
                    if (input) input.focus();
                }, 100);
            } else {
                footer.classList.remove('show');
            }
        }

        // Buscador
        document.getElementById('forward-search-input').addEventListener('input', (e) => {
            renderForwardList(e.target.value);
        });

        // Permitir enviar con ENTER en el comentario
        document.getElementById('forward-comment-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performMultiForward();
            }
        });

        // 5. Acción FINAL: Enviar a múltiples
        function performMultiForward() {
            const count = selectedForwardContacts.size;
            if (count === 0) return;

            // Get Comment
            const comment = document.getElementById('forward-comment-input').value.trim();

            // Simulación
            let names = [];
            selectedForwardContacts.forEach(id => {
                const c = contactsData.find(x => x.id === id);
                if (c) names.push(c.name);
            });

            closeShareModal();

            // Mensaje Toast
            // Detectar si es múltiple
            let isMultiple = Array.isArray(messageContentToForward);
            let msgType = '';

            if (isMultiple) {
                msgType = `${messageContentToForward.length} mensajes reenviados`;
            } else {
                msgType = messageContentToForward.type === 'image' ? 'Imagen reenviada' : 'Mensaje reenviado';
            }

            // Simular envío de comentario
            if (comment) {
                setTimeout(() => {
                    showToast(`...y comentario: "${comment}"`);
                }, 1500); // 1.5s después del primer toast
            }

            if (count === 1) {
                showToast(`${msgType} a ${names[0]}`);
            } else {
                showToast(`${msgType} a ${count} chats`);
            }

            // Limpiar
            selectedForwardContacts.clear();

            // SIMULACIÓN VISUAL
            // Si es múltiple, no añadimos nada visual para no spamear
            if (!isMultiple) {
                setTimeout(() => {
                    // let content = messageContentToForward.text || "Foto";
                    // addMessage(content, 'sent', false, null, null, { from: "Tú" });
                }, 500);
            }
        }

        // NUEVO: Forward Selected (Bulk)
        function actionForwardSelected() {
            const selected = document.querySelectorAll('.message.selected');
            if (selected.length === 0) return;

            // Limpiar selección de contactos previa
            selectedForwardContacts.clear();
            updateForwardFooter();

            // Preparar array de contenido
            let itemsToForward = [];

            selected.forEach(msg => {
                // Clonar para limpiar
                const clone = msg.cloneNode(true);
                const artifacts = clone.querySelectorAll('.msg-time, .msg-info, .msg-reply-context, .msg-reaction-bubble, .msg-checkbox');
                artifacts.forEach(el => el.remove());

                const imgElement = clone.querySelector('img');
                if (imgElement && !clone.innerText.trim()) {
                    itemsToForward.push({ type: 'image', src: imgElement.src });
                } else {
                    itemsToForward.push({ type: 'text', text: clone.innerText.trim() });
                }
            });

            // Asignar a la variable global (ahora soporta array)
            messageContentToForward = itemsToForward;

            // Renderizar y mostrar modal (reutilizando lógica existente)
            renderForwardList();

            const modal = document.getElementById('forward-modal');
            if (modal) {
                modal.classList.add('show');
                const search = document.getElementById('forward-search-input');
                if (search) {
                    search.value = '';
                    search.focus();
                }
                document.getElementById('forward-comment-input').value = '';
            }
        }

        function closeShareModal() {
            document.getElementById('forward-modal').classList.remove('show');
        }

        /* --- VIRTUAL SCROLL MANAGER --- */
        const VirtualScroll = {
            observer: null,
            cache: new Map(),
            isEnabled: true,

            init() {
                if (!this.isEnabled) return;

                // Configurar IntersectionObserver
                // root: null (viewport), rootMargin: '200px' (buffer to render before visible)
                const options = {
                    root: null, // document viewport using the container overflow
                    // Important: Messages are inside #msg-container. We might need to set root to that if we want strict behavior,
                    // but defaults usually work if container is scrolling document. 
                    // Let's grab the container explicitly to be safe.
                    root: document.getElementById('msg-container'),
                    rootMargin: '400px 0px', // Pre-load 400px above/below
                    threshold: 0
                };

                this.observer = new IntersectionObserver(this.handleEntries.bind(this), options);

                // Observe existing messages
                document.querySelectorAll('.message').forEach(msg => {
                    this.observer.observe(msg);
                });
            },

            handleEntries(entries) {
                if (!this.isEnabled) return;

                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.restore(entry.target);
                    } else {
                        // Solo virtualizar si ya se renderizó y tiene altura real
                        // y NO es el último mensaje (para evitar glitch al escribir)
                        this.virtualize(entry.target);
                    }
                });
            },

            virtualize(element) {
                // Ignore if selected (prevent losing state)
                if (element.classList.contains('selected')) return;
                // Ignore if it's the very last message (prevent jump when typing)
                if (element === element.parentElement.lastElementChild) return;

                // Ignore if already virtualized
                if (element.classList.contains('virtualized')) return;

                // 1. Capture height
                const rect = element.getBoundingClientRect();
                if (rect.height === 0) return; // Not rendered yet

                // 2. Cache content
                if (!this.cache.has(element.id)) {
                    // Solo cachear si tiene ID. Si no, generar uno o saltar.
                    // Asumimos que los mensajes tienen ID únicos por lógica anterior.
                    if (element.id) {
                        this.cache.set(element.id, element.innerHTML);
                    } else {
                        return;
                    }
                }

                // 3. Apply virtualization
                element.style.height = `${rect.height}px`;
                element.innerHTML = ''; // UNLOAD CONTENT
                element.classList.add('virtualized');
            },

            restore(element) {
                if (!element.classList.contains('virtualized')) return;

                // 1. Retrieve content
                const content = this.cache.get(element.id);
                if (content) {
                    element.innerHTML = content;
                }

                // 2. Remove styles
                element.style.height = '';
                element.classList.remove('virtualized');

                // 3. Re-attach events logic if needed? 
                // onclick handlers are usually on the element itself in the HTML structure we saw earlier??
                // Wait, logic `msg.onclick` in selection mode is attached via JS. 
                // Virtualization might kill those event listeners if attached to children!
                // But the listeners were attached to the `.message` div (element), not its children.
                // So clearing innerHTML is SAFE for the parent container listeners.

                // Re-enable search highlight if search is active?
                // Actually we handle Search by disabling virtualization, so we are good.
            },

            cleanup(forceRestore = true) {
                if (this.observer) {
                    this.observer.disconnect();
                    this.observer = null;
                }

                if (forceRestore) {
                    document.querySelectorAll('.message.virtualized').forEach(msg => {
                        this.restore(msg);
                    });
                }
            },

            // Call this when adding a NEW message to chat
            observeNew(element) {
                if (this.observer && this.isEnabled) {
                    this.observer.observe(element);
                }
            }
        };

        // Initialize VirtualScroll on Load
        document.addEventListener('DOMContentLoaded', () => {
            // Init after a short delay to allow initial render
            setTimeout(() => {
                VirtualScroll.init();
            }, 1000);

            // SCROLL TO BOTTOM LOGIC
            const msgContainer = document.getElementById('msg-container');
            const scrollBtn = document.getElementById('scroll-bottom-btn');

            if (msgContainer && scrollBtn) {
                msgContainer.addEventListener('scroll', () => {
                    // Show if we are NOT at the bottom (more than 400px away)
                    const distanceToBottom = msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight;

                    if (distanceToBottom > 400) {
                        scrollBtn.classList.add('show');
                    } else {
                        scrollBtn.classList.remove('show');
                    }
                });

                scrollBtn.addEventListener('click', () => {
                    // Recursive function to keep scrolling until we hit bottom
                    // This handles dynamic height changes from VirtualScroll restoration
                    const scrollToBottom = () => {
                        const target = msgContainer.scrollHeight;
                        const current = msgContainer.scrollTop + msgContainer.clientHeight;

                        if (current < target - 50) { // Tolerance
                            msgContainer.scrollTo({
                                top: target,
                                behavior: 'smooth'
                            });

                            // Check again after a short delay (allow smooth scroll + render)
                            setTimeout(() => {
                                if (msgContainer.scrollTop + msgContainer.clientHeight < msgContainer.scrollHeight - 50) {
                                    scrollToBottom();
                                }
                            }, 300);
                        }
                    };

                    // Initial triggers
                    scrollToBottom();
                    // Forced retry in case of heavy load
                    setTimeout(scrollToBottom, 500);
                });
            }
        });

    

/* Extracted Script */

        // --- UI UPDATE HELPER FOR PARTNER STATUS ---
        // Call window.presenceService.listenToPartner('OTHER_USER_ID', window.updatePartnerStatusUI) to activate.

        window.updatePartnerStatusUI = function (data) {
            const uiStatusSpan = document.querySelector('.chat-user-info span');
            if (!uiStatusSpan || !data) return;
            const { state, last_changed } = data;

            if (state === 'online') {
                uiStatusSpan.innerText = 'en línea';
                uiStatusSpan.style.color = '#00a8ff';
            } else if (state === 'typing') {
                uiStatusSpan.innerText = 'escribiendo...';
                uiStatusSpan.style.color = '#00a8ff';
            } else if (state === 'recording') {
                uiStatusSpan.innerText = 'grabando audio...';
                uiStatusSpan.style.color = '#00a8ff';
            } else {
                const date = new Date(last_changed);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                uiStatusSpan.innerText = `ult. vez a las ${hours}:${minutes}`;
                uiStatusSpan.style.color = '#7f91a4';
            }
        };

        // --- FIREBASE MESSAGE LISTENERS HANDLERS ---
        window.onFirebaseMessageAdded = function (id, data, type) {
            if (document.getElementById(id)) return; // Prevent duplicates

            const isAudio = data.type === 'audio';
            const isMine = type === 'sent';

            // Pass Timestamp!
            addMessage(data.text, type, isAudio, data.linkData, data.replyData, null, id, data.timestamp);

            // Handle Edited Flag
            if (data.isEdited) {
                const msgEl = document.getElementById(id);
                if (msgEl) {
                    const footer = msgEl.querySelector('.msg-info');
                    if (footer && !footer.querySelector('.msg-edited-tag')) {
                        const et = document.createElement('span');
                        et.className = 'msg-edited-tag';
                        et.innerText = ' editado';
                        et.style.marginRight = '4px';
                        et.style.fontSize = '0.7em';
                        et.style.opacity = '0.7';
                        footer.prepend(et);
                    }
                }
            }
        };

        window.onFirebaseMessageChanged = function (id, data) {
            const msgEl = document.getElementById(id);
            if (!msgEl) return;

            if (data.type === 'text' || !data.type) {
                const newHtml = linkify(data.text);

                // 1. PRESERVAR REACCIÓN (No viene en data de mensaje, es un nodo hijo inyectado)
                const reaction = msgEl.querySelector('.msg-reaction-bubble');

                // 2. GENERAR CONTEXTO DE RESPUESTA
                let replyHtml = '';
                if (data.replyData) {
                    const r = data.replyData;
                    const originalIdSafe = r.id ? `'${r.id}'` : 'null';
                    replyHtml = `<div class="msg-reply-context" onclick="scrollToOriginalMessage(${originalIdSafe})"><div class="reply-details"><div class="reply-name">${r.name}</div><div class="reply-prev-text">${r.text}</div></div></div>`;
                }

                // 3. GENERAR CONTEXTO DE REENVÍO
                let forwardHtml = '';
                if (data.forwardData) {
                    forwardHtml = `<div class="msg-forward-header"><div class="msg-forward-label"><i class="fas fa-share"></i> Reenviado de <b>${data.forwardData.from}</b></div></div>`;
                }

                // 4. GENERAR LINK CARD (Si existe)
                let linkCardHtml = '';
                if (data.linkData) {
                    // Reutilizamos lógica simplificada de addMessage o simplemente mostramos un link genérico si es complejo replicar todo.
                    // Para consistencia, idealmente deberíamos tener una función helper generateLinkCard(linkData).
                    // Por ahora, intentaremos rescatar la card antigua si no hay data nueva, pero data debería tenerlo.
                    // Si data.linkData existe, lo usamos.
                    const ld = data.linkData;
                    linkCardHtml = `<a href="${ld.url}" target="_blank" class="msg-link-card compact"><div class="link-compact-info"><div class="link-title">${ld.title || 'Link'}</div><div class="link-desc">${ld.description || ''}</div></div></a>`;
                    // Nota: La versión full de addMessage es más compleja, pero esto evita que desaparezca.
                }

                // 5. REGENERAR FOOTER (Hora + Editado)
                // Usamos estilos inline para coincidir con addMessage y evitar deformaciones
                let timeStr = '';
                const oldTime = msgEl.querySelector('.msg-time');
                if (oldTime) timeStr = oldTime.innerText;
                else {
                    const d = data.timestamp ? new Date(data.timestamp) : new Date();
                    timeStr = d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
                }

                // Detectar si es enviado para mostrar el check
                const isSent = msgEl.classList.contains('msg-sent');
                const checkIcon = isSent ? '<i class="fas fa-check-double msg-check"></i>' : '';

                const footerHtml = `
                <div class="msg-info" style="float: right; margin-left: 10px; margin-top: 4px;">
                    <span class="msg-edited-tag" style="margin-right: 4px; font-size: 0.7em; opacity: 0.7;"> editado</span>
                    <span class="msg-time">${timeStr}</span>
                    ${checkIcon}
                </div>`;

                // --- APLICAR CAMBIOS ---
                msgEl.innerHTML = '';

                if (forwardHtml) msgEl.insertAdjacentHTML('beforeend', forwardHtml);
                if (replyHtml) msgEl.insertAdjacentHTML('beforeend', replyHtml);

                msgEl.insertAdjacentHTML('beforeend', newHtml);

                if (linkCardHtml) msgEl.insertAdjacentHTML('beforeend', linkCardHtml);

                msgEl.insertAdjacentHTML('beforeend', footerHtml);

                if (reaction) msgEl.appendChild(reaction);
            }
        };

        window.onFirebaseMessageRemoved = function (id) {
            const msgEl = document.getElementById(id);
            if (msgEl) {
                msgEl.style.transform = 'scale(0)';
                setTimeout(() => msgEl.remove(), 200);
            }
        };
    

/* Extracted Script */

        // --- TOAST NOTIFICATION OVERRIDE (Fixing Blur Issue) ---
        window.showToast = function (message) {
            const toast = document.getElementById('custom-toast');
            const toastMsg = document.getElementById('toast-message');
            if (!toast || !toastMsg) return;

            // FIX: Mover el toast al body para escapar del blur de main-content
            if (toast.parentElement.tagName !== 'BODY') {
                document.body.appendChild(toast);
            }

            toastMsg.innerText = message;

            // Forzar reflow para asegurar transición
            void toast.offsetWidth;

            toast.classList.add('show');

            // Reset timer if spamming
            if (window.toastTimeout) clearTimeout(window.toastTimeout);

            window.toastTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        };