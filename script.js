const hamMenu = document.querySelector(".hamburger");
const offScreenMenu = document.querySelector(".off-screen-menu");
const dropdown = document.querySelector("#theme-menu.dropdown-content");

// Toggle hamburger menu
hamMenu.addEventListener("click", () => {
    hamMenu.classList.toggle("active");
    offScreenMenu.classList.toggle("active");
});

// Theme dropdown toggle
document.getElementById("theme-switch").addEventListener("click", function() {
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});

// Close theme dropdown when clicking outside
window.addEventListener("click", function(event) {
    if (!event.target.closest("#theme-switch") && !event.target.closest(".dropdown-content")) {
        dropdown.style.display = "none";
    }
});

// Theme switching for the dropdown
const themeOptions = document.querySelectorAll(".dropdown-content a");

// Load saved theme from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.body.className = savedTheme;
}

// Apply the selected theme
themeOptions.forEach(option => {
    option.addEventListener("click", function(event) {
        const selectedTheme = event.target.getAttribute("data-theme");
        document.body.className = selectedTheme; // Set the body class to the selected theme

        // Save the selected theme in localStorage
        localStorage.setItem('theme', selectedTheme);
    });
});

// Toggle between showing nav items and theme options in hamburger menu (for mobile)
const themeSwitchHam = document.getElementById("theme-switch-ham");
const navItems = document.querySelectorAll(".nav-item");  // Select all nav items
const themeOptionsHam = document.querySelector(".theme-options");  // Theme options container

let themeVisible = false;

themeSwitchHam.addEventListener("click", function() {
    if (themeVisible) {
        // Show navigation buttons and hide theme options
        themeOptionsHam.style.display = "none";
        navItems.forEach(item => item.style.display = "block");
    } else {
        // Hide navigation buttons and show theme options
        navItems.forEach(item => item.style.display = "none");
        themeOptionsHam.style.display = "block";
        themeOptionsHam.style.opacity = "1";
    }

    themeVisible = !themeVisible;
});