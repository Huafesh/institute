/**
 * Global Theme Management
 * Handles Dark/Light mode toggling, persistence, and View Transitions.
 */

(function () {
    // Helper to toggle body class and save preference
    function setDarkMode(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
        updateIcons(isDark);
    }

    // Helper to update all toggle icons on the page
    function updateIcons(isDark) {
        const toggleButtons = document.querySelectorAll('.theme-toggle, #theme-toggle');
        toggleButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                if (isDark) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }
        });
    }

    // Main Toggle Function (exposed globally)
    window.toggleTheme = function (e) {
        // Prevent default if called from an anchor or button
        if (e && e.preventDefault) e.preventDefault();

        const isDarkNow = document.body.classList.contains('dark-mode');
        const willBeDark = !isDarkNow;

        // Element that triggered the click (for View Transition origin)
        const element = e ? e.currentTarget : null;

        // Fallback or No Element: Just switch
        if (!document.startViewTransition || !element) {
            setDarkMode(willBeDark);
            return;
        }

        // View Transition Logic
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const endRadius = Math.hypot(
            Math.max(x, innerWidth - x),
            Math.max(y, innerHeight - y)
        );

        const transition = document.startViewTransition(() => {
            setDarkMode(willBeDark);
        });

        transition.ready.then(() => {
            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0px at ${x}px ${y}px)`,
                        `circle(${endRadius}px at ${x}px ${y}px)`,
                    ],
                },
                {
                    duration: 600,
                    easing: 'ease-out',
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        });
    };

    // Initialization Function
    window.initTheme = function () {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Determine initial state
        const isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

        // Apply without saving to localStorage (respect system pref dynamically if no saved override? 
        // Logic says: if saved, use saved. If not, use system. 
        // But setDarkMode saves to localStorage. We should just add class here.)

        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode'); // Ensure clean state
        }

        updateIcons(isDark);

        // Attach Event Listeners to all toggle buttons
        const toggleButtons = document.querySelectorAll('.theme-toggle, #theme-toggle');
        toggleButtons.forEach(btn => {
            // Remove old listeners to avoid duplicates if init is called twice? 
            // Hard to do with anonymous functions. 
            // Instead, set onclick property (overwrites previous) OR use a flag.
            // Using onclick is safer for ensuring single handler.
            btn.onclick = window.toggleTheme;
        });
    };

    // Auto-Run Init
    window.initTheme();

})();
