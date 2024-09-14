const hamMenu = document.querySelector(".hamburger");
const offScreenMenu = document.querySelector(".off-screen-menu");
const dropdown = document.querySelector("#theme-menu.dropdown-content");

hamMenu.addEventListener("click", () => {
    hamMenu.classList.toggle("active");
    offScreenMenu.classList.toggle("active");
});


document.getElementById("theme-switch").addEventListener("click", function() {
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
    } else {
        dropdown.style.display = "block";
    }
});

window.addEventListener("click", function(event) {
    if (!event.target.closest("#theme-switch") && !event.target.closest(".dropdown-content")) {
        dropdown.style.display = "none";
    }
});

const themeOptions = document.querySelectorAll(".dropdown-content a");

themeOptions.forEach(option => {
    option.addEventListener("click", function(event) {
        const selectedTheme = event.target.getAttribute("data-theme");
        document.body.className = selectedTheme; // Set the body class to the selected theme
    });
});