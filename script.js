// Constants
const hamMenu = document.querySelector(".hamburger");
const offScreenMenu = document.querySelector(".off-screen-menu");
const dropdown = document.querySelector("#theme-menu.dropdown-content");
const themeOptions = document.querySelectorAll(".dropdown-content a");
const themeSwitchHam = document.getElementById("theme-switch-ham");
const navItems = document.querySelectorAll(".nav-item");
const themeOptionsHam = document.querySelector(".theme-options");

let themeVisible = false;

// Toggle hamburger menu
hamMenu.addEventListener("click", () => {
    hamMenu.classList.toggle("active");
    offScreenMenu.classList.toggle("active");
});

// Theme dropdown toggle
document.getElementById("theme-switch").addEventListener("click", () => {
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});

// Close theme dropdown when clicking outside
window.addEventListener("click", (event) => {
    if (!event.target.closest("#theme-switch") && !event.target.closest(".dropdown-content")) {
        dropdown.style.display = "none";
    }
});

// Load saved theme from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.body.className = savedTheme;
}

// Apply the selected theme
themeOptions.forEach(option => {
    option.addEventListener("click", (event) => {
        const selectedTheme = event.target.getAttribute("data-theme");
        if (selectedTheme) {
            document.body.className = selectedTheme;
            localStorage.setItem('theme', selectedTheme);
        }
    });
});

// Toggle between showing nav items and theme options in hamburger menu
themeSwitchHam.addEventListener("click", () => {
    themeVisible = !themeVisible;

    if (themeVisible) {
        navItems.forEach(item => item.style.display = "none");
        themeOptionsHam.style.display = "block";
        themeOptionsHam.style.opacity = "1";
        themeOptionsHam.style.pointerEvents = "auto";
    } else {
        themeOptionsHam.style.display = "none";
        navItems.forEach(item => item.style.display = "block");
    }
});

// Apply the selected theme from hamburger menu
const themeOptionsHamLinks = document.querySelectorAll(".theme-options a");
themeOptionsHamLinks.forEach(option => {
    option.addEventListener("click", (event) => {
        const selectedTheme = event.target.getAttribute("data-theme");
        if (selectedTheme) {
            document.body.className = selectedTheme;
            localStorage.setItem('theme', selectedTheme);
            themeOptionsHam.style.display = "none";
            themeVisible = false;
            navItems.forEach(item => item.style.display = "block");
        }
    });
});

function updateWidth() {
    const [container, navbar] = [document.querySelector('.container'), document.querySelector('.navbar')];
    if (!window.location.pathname.includes('gallery')) return;

    const newWidth = window.innerWidth > 768 ? "calc(100vw - 10%)" : "100vw";
    [container, navbar].forEach(el => el.style.transition = "max-width 0.5s ease-in-out");

    requestAnimationFrame(() => [container, navbar].forEach(el => el.style.maxWidth = newWidth));

    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', e => {
            if (!link.href.includes('gallery')) {
                e.preventDefault();
                [container, navbar].forEach(el => el.style.maxWidth = "800px");
                setTimeout(() => window.location.href = link.href, 500);
            }
        });
    });
}

// Trigger on page load and resize
window.addEventListener('load', updateWidth);
window.addEventListener('resize', updateWidth);


// Execute on load and on resize
window.onload = updateWidth;
window.addEventListener('resize', updateWidth);

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.nav-button');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            // Add active class to the clicked button
            button.classList.add('active');
        });
    });
});

// Gallery Fade and Hide
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.nav-button');
    const containers = {
        Photography: document.querySelector('.photography-container'),
        'AI-Generations': document.querySelector('.ai-container'),
        Forza: document.querySelector('.forza-container')
    };

    const hideAllContainers = () => {
        Object.values(containers).forEach(container => {
            if (container) { // Check if the container is found
                container.style.display = 'none';
            } else {
                console.warn('Container not found');
            }
        });
    };

    const showContainerWithTransition = (container) => {
        hideAllContainers();
        if (container) {
            container.style.display = 'flex';
            container.style.opacity = '0';

            setTimeout(() => {
                container.style.opacity = '1';
            }, 10);
        }
    };

    // Show the photography container by default
    showContainerWithTransition(containers.Photography);

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const containerToShow = containers[button.textContent];
            if (containerToShow) {
                showContainerWithTransition(containerToShow);
            }
        });
    });
});

// AI button redirect
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.nav-button');
    const containers = {
        'AI-Generations': document.querySelector('.ai-container'),
        Photography: document.querySelector('.photography-container'),
        Forza: document.querySelector('.forza-container')
    };

    const hideAll = () => {
        Object.values(containers).forEach(container => {
            container.style.display = 'none';
            container.style.opacity = '0';
        });
    };

    const setActive = (activeButton) => {
        buttons.forEach(button => button.classList.remove('active'));
        activeButton.classList.add('active');
    };

    const showContainer = (containerName) => {
        hideAll();
        const container = containers[containerName];
        container.style.display = 'flex';
        container.style.opacity = '0';
        setTimeout(() => {
            container.style.opacity = '1';
        }, 10);
        setActive(Array.from(buttons).find(button => button.textContent === containerName));
    };

    // Show container based on URL hash
    const hash = window.location.hash;
    if (hash === '#ai-container') {
        showContainer('AI-Generations');
    } else {
        showContainer('Photography');
    }

    // Handle click events on buttons
    buttons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Prevent default link behavior
            event.preventDefault();
            showContainer(button.textContent);
        });
    });
});

window.onload = function() {
    const images = document.querySelectorAll('img.lazyload');
    images.forEach(img => {
        img.src = img.getAttribute('data-src');
    });
};