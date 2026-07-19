const COURSES_DATA = {
    "english": {
        id: "english",
        title: "Inglés desde cero",
        badge: "En Progreso",
        progress: 45,
        totalLessons: 20,
        completedLessons: 9,
        currentLesson: {
            title: "Presente Simple y Verbo To Be",
            breadcrumbs: "Módulo 1: Introducción > Lección 2",
            videoUrl: "", // Placeholder
            description: `En esta lección aprenderemos los fundamentos gramaticales esenciales para empezar a estructurar oraciones en inglés. Nos centraremos en el verbo "To Be" en sus formas afirmativa, negativa e interrogativa.`,
            resources: [
                { type: "pdf", title: "Guía de Ejercicios - Verbo To Be.pdf", size: "2.4 MB" },
                { type: "audio", title: "Audio Práctica de Pronunciación.mp3", size: "5.1 MB" }
            ]
        },
        modules: [
            {
                title: "Módulo 1: Introducción",
                lessons: [
                    { title: "1.1 Bienvenida al curso", duration: "5:30 min", status: "completed", icon: "fas fa-check-circle" },
                    { title: "1.2 Fundamentos Básicos", duration: "12:45 min", status: "active", icon: "fas fa-play-circle" },
                    { title: "1.3 Los Pronombres", duration: "8:20 min", status: "pending", icon: "far fa-circle" }
                ]
            },
            {
                title: "Módulo 2: Gramática I",
                lessons: [
                    { title: "2.1 Estructura Afirmativa", duration: "15:10 min", status: "pending", icon: "far fa-circle" },
                    { title: "2.2 Estructura Negativa", duration: "10:05 min", status: "pending", icon: "far fa-circle" },
                    { title: "2.3 Examen Parcial", duration: "30:00 min", status: "locked", icon: "fas fa-lock" }
                ]
            }
        ]
    },
    "china": {
        id: "china",
        title: "Importaciones desde China",
        badge: "Nuevo",
        progress: 0,
        totalLessons: 15,
        completedLessons: 0,
        currentLesson: {
            title: "Introducción al Mercado Chino",
            breadcrumbs: "Módulo 1: Conceptos Básicos > Lección 1",
            videoUrl: "",
            description: "Descubre las oportunidades que ofrece el gigante asiático y cómo empezar tu negocio de importaciones de manera segura y rentable.",
            resources: [
                { type: "pdf", title: "Lista de Proveedores Verificados.pdf", size: "1.8 MB" }
            ]
        },
        modules: [
            {
                title: "Módulo 1: Conceptos Básicos",
                lessons: [
                    { title: "1.1 ¿Por qué importar de China?", duration: "10:00 min", status: "active", icon: "fas fa-play-circle" },
                    { title: "1.2 Tipos de Proveedores", duration: "15:30 min", status: "pending", icon: "far fa-circle" },
                    { title: "1.3 Incoterms 2024", duration: "20:00 min", status: "pending", icon: "far fa-circle" }
                ]
            },
            {
                title: "Módulo 2: Alibaba y Búsqueda",
                lessons: [
                    { title: "2.1 Creando cuenta en Alibaba", duration: "08:45 min", status: "locked", icon: "fas fa-lock" },
                    { title: "2.2 Filtros de Seguridad", duration: "12:10 min", status: "locked", icon: "fas fa-lock" }
                ]
            }
        ]
    },
    "usa": {
        id: "usa",
        title: "Importaciones desde USA",
        badge: "Nuevo",
        progress: 0,
        totalLessons: 12,
        completedLessons: 0,
        currentLesson: {
            title: "Logística y Couriers",
            breadcrumbs: "Módulo 1: Logística > Lección 1",
            videoUrl: "",
            description: "Aprende cómo funcionan los almacenes en Miami y cómo traer tus productos de USA sin pagar impuestos excesivos.",
            resources: []
        },
        modules: [
            {
                title: "Módulo 1: Logística",
                lessons: [
                    { title: "1.1 Casilleros en Miami", duration: "14:20 min", status: "active", icon: "fas fa-play-circle" },
                    { title: "1.2 Regulación de Aduanas", duration: "18:00 min", status: "pending", icon: "far fa-circle" }
                ]
            }
        ]
    },
    "jr": {
        id: "jr",
        title: "Importador Jr.",
        badge: "Nuevo",
        progress: 0,
        totalLessons: 8,
        completedLessons: 0,
        currentLesson: {
            title: "Mentalidad de Importador",
            breadcrumbs: "Módulo 1: Inicio > Lección 1",
            videoUrl: "",
            description: "Aprende la mentalidad necesaria para emprender en el mundo de las importaciones y perder el miedo a invertir.",
            resources: []
        },
        modules: [
            {
                title: "Módulo 1: Inicio",
                lessons: [
                    { title: "1.1 Mentalidad Emprendedora", duration: "10:30 min", status: "active", icon: "fas fa-play-circle" },
                    { title: "1.2 Nichos de Mercado", duration: "14:00 min", status: "pending", icon: "far fa-circle" }
                ]
            }
        ]
    }
};
