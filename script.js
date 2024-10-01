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
