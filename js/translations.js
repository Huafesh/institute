// js/translations.js

// Use window.translations to avoid "Identifier already declared" errors on reloads/multiple inclusions
if (!window.translations) {
    window.translations = {
        es: {
            // Sidebar Menu
            menu_institution: "Página de la institución",
            menu_activity: "Actividad",
            menu_courses: "Mis Cursos",
            menu_panel: "Panel de Control",
            menu_schedule: "Horario",
            menu_grades: "Calificaciones",
            menu_messages: "Mensajes",
            menu_logout: "Cerrar Sesión",

            // Profile Page
            about_me: "Sobre mí",
            contact_info: "Información de Contacto",
            academic_info: "Información Académica",
            basic_info: "Información Básica",
            additional_info: "Información Adicional",
            work_info: "Información Laboral",
            tab_personal: "Personal",
            tab_academic: "Académico",
            tab_settings: "Configuración",
            settings_title: "Configuración del Perfil",
            language_label: "Idioma",
            language_desc: "Selecciona el idioma de la interfaz.",
            edit_btn: "Editar",
            ready_btn: "Listo",

            // Index Page (Home)
            nav_home: "Inicio",
            nav_about: "Nosotros",
            nav_courses_public: "Cursos",
            nav_login: "Aula Virtual",
            nav_signup: "Inscribirse",
            hero_title_prefix: "Impulsa tu carrera en",
            hero_subtitle: "Formación profesional de alto nivel adaptada a las demandas del mercado actual. Tu futuro comienza hoy.",
            btn_view_courses: "Ver Cursos",
            btn_learn_more: "Saber más",
            btn_contact: "Contacto",
            footer_rights: "Todos los derechos reservados.",

            // General
            loading_text: "Cargando..."
        },
        en: {
            // Sidebar Menu
            menu_institution: "Institution Page",
            menu_activity: "Activity",
            menu_courses: "My Courses",
            menu_panel: "Control Panel",
            menu_schedule: "Schedule",
            menu_grades: "Grades",
            menu_messages: "Messages",
            menu_logout: "Logout",

            // Profile Page
            about_me: "About Me",
            contact_info: "Contact Info",
            academic_info: "Academic Info",
            basic_info: "Basic Info",
            additional_info: "Additional Info",
            work_info: "Work Info",
            tab_personal: "Personal",
            tab_academic: "Academic",
            tab_settings: "Settings",
            settings_title: "Profile Settings",
            language_label: "Language",
            language_desc: "Select interface language.",
            edit_btn: "Edit",
            ready_btn: "Done",

            // Index Page (Home)
            nav_home: "Home",
            nav_about: "About Us",
            nav_courses_public: "Courses",
            nav_login: "Virtual Classroom",
            nav_signup: "Sign Up",
            hero_title_prefix: "Boost your career at",
            hero_subtitle: "High-level professional training adapted to current market demands. Your future starts today.",
            btn_view_courses: "View Courses",
            btn_learn_more: "Learn More",
            btn_contact: "Contact",
            footer_rights: "All rights reserved.",

            // General
            loading_text: "Loading..."
        }
    };
}

function applyLanguage(lang) {
    const t = window.translations[lang] || window.translations['es'];

    // 1. Update text content of data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) {
            // Check if it's an input placeholder or text
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                // If the element has children (like icons), we want to preserve them
                // Strategy: Update ONLY the text node if possible, or assume simple text.
                // For sidebar links which usually have <i> icon + <span> text, 
                // we should put data-i18n on the <span> NOT the <a>.
                el.innerText = t[key];
            }
        }
    });

    // 2. Update specific UI elements if they exist (Manual overrides)
    const editBtn = document.getElementById('edit-mode-toggle');
    if (editBtn && !document.body.classList.contains('is-editing')) {
        editBtn.innerText = t['edit_btn'];
    }
}

function changeLanguage(lang) {
    localStorage.setItem('app_language', lang);
    applyLanguage(lang);
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('app_language') || 'es';

    // Set drop-down value if it exists on this page
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.value = savedLang;
    }

    applyLanguage(savedLang);
});
