(function () {
    function initLogoutModal() {
        // 1. Inject CSS
        const styleId = 'logout-modal-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* Delete Modal Styles (Reused for Logout) */
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(5px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                .modal.active {
                    opacity: 1;
                    pointer-events: auto;
                }
                .modal-content {
                    background: var(--card-bg, #fff);
                    width: 90%;
                    max-width: 400px;
                    text-align: center;
                    border-radius: 15px;
                    padding: 25px;
                    transform: scale(0.9);
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                    border: 1px solid var(--border-color, transparent);
                }
                .modal.active .modal-content {
                    transform: scale(1);
                }
            `;
            document.head.appendChild(style);
        }

        // 2. Inject HTML
        const modalId = 'logout-modal';
        if (!document.getElementById(modalId)) {
            const modalHTML = `
                <div id="${modalId}" class="modal">
                    <div class="modal-content">
                        <div style="width: 60px; height: 60px; background: rgba(231, 76, 60, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                            <i class="fas fa-sign-out-alt" style="font-size: 1.5rem; color: #e74c3c;"></i>
                        </div>
                        <h3 style="margin-bottom: 10px; color: var(--title-color, #333);">¿Cerrar Sesión?</h3>
                        <p style="color: var(--text-color, #444); margin-bottom: 25px; opacity: 0.8;">¿Estás seguro de que quieres salir?</p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button id="btn-cancel-logout" style="padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border-color, #ddd); background: transparent; color: var(--text-color, #444); cursor: pointer; flex: 1; font-weight: 500; transition: background 0.2s;">Cancelar</button>
                            <button id="btn-confirm-logout" style="padding: 10px 20px; border-radius: 8px; border: none; background: #e74c3c; color: white; cursor: pointer; flex: 1; font-weight: 600; box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3); transition: transform 0.2s;">Salir</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Bind Modal Buttons
            const btnCancel = document.getElementById('btn-cancel-logout');
            const btnConfirm = document.getElementById('btn-confirm-logout');

            if (btnCancel) btnCancel.addEventListener('click', closeLogoutModal);
            // Use window.performLogout explicitly to avoid scope issues
            if (btnConfirm) btnConfirm.addEventListener('click', () => window.performLogout());
        }

        // 3. Attach to Sidebar Link
        // Try precise selector first, then broad fallback
        const logoutLink = document.querySelector('.logout a') || document.querySelector('a[href="index.html"]');
        if (logoutLink) {
            // Check if it's actually a logout link by text content if we used fallback
            const isLogout = logoutLink.innerText.toLowerCase().includes('cerrar') || logoutLink.closest('.logout');

            if (isLogout) {
                logoutLink.onclick = function (e) {
                    e.preventDefault();
                    confirmLogout(e);
                };
                logoutLink.setAttribute('href', '#');
            }
        }
    }

    // Global Functions
    window.confirmLogout = function (e) {
        if (e) e.preventDefault();
        const modal = document.getElementById('logout-modal');
        if (modal) modal.classList.add('active');
    };

    window.closeLogoutModal = function () {
        const modal = document.getElementById('logout-modal');
        if (modal) modal.classList.remove('active');
    };

    window.performLogout = function () {
        const btn = document.getElementById('btn-confirm-logout');
        if (btn) {
            btn.innerText = "Saliendo...";
            btn.style.opacity = "0.7";
            btn.disabled = true;
        }

        // Helper to clear session data
        const clearSessionData = () => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('role');
            localStorage.removeItem('profile_avatar');
            localStorage.removeItem('profile_cover');
            localStorage.removeItem('profile_sex');
            localStorage.removeItem('profile_nickname');
            localStorage.removeItem('profile_dob');
            localStorage.removeItem('profile_education');
            localStorage.removeItem('profile_website');
            localStorage.removeItem('profile_address');
            localStorage.removeItem('profile_phone');
            localStorage.removeItem('profile_fax');
            localStorage.removeItem('profile_company');
            localStorage.removeItem('profile_role');
            // Allow 'mute_activity' to persist as a device setting? Yes.
        };

        // Safety timeout: If firebase hangs for 2 seconds, force redirect
        setTimeout(() => {
            if (localStorage.getItem('isLoggedIn')) {
                console.warn("Forcing logout due to timeout");
                clearSessionData();
                window.location.href = 'index.html';
            }
        }, 2000);

        try {
            if (typeof firebase !== 'undefined' && firebase.auth()) {
                firebase.auth().signOut().then(() => {
                    clearSessionData();
                    window.location.href = 'index.html';
                }).catch((error) => {
                    console.error("Error al cerrar sesión (modal):", error);
                    clearSessionData();
                    window.location.href = 'index.html';
                });
            } else {
                throw new Error("Firebase auth not available");
            }
        } catch (e) {
            console.error(e);
            clearSessionData();
            window.location.href = 'index.html';
        }
    };

    // Run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLogoutModal);
    } else {
        initLogoutModal();
    }
})();
