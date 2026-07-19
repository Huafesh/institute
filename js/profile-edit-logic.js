
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
