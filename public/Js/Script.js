(() => {
  "use strict";

  const searchToggle = document.querySelector(".mobile-search-toggle");
  const searchPanel = document.querySelector("#mobileSearchPanel");
  const navbarToggler = document.querySelector(".navbar-toggler");

  if (searchToggle && searchPanel) {
    const closeSearch = () => {
      searchPanel.hidden = true;
      searchToggle.setAttribute("aria-expanded", "false");
      searchToggle.setAttribute("aria-label", "Open destination search");
    };

    searchToggle.addEventListener("click", () => {
      const isOpening = searchPanel.hidden;
      searchPanel.hidden = !isOpening;
      searchToggle.setAttribute("aria-expanded", String(isOpening));
      searchToggle.setAttribute(
        "aria-label",
        isOpening ? "Close destination search" : "Open destination search"
      );

      if (isOpening) {
        const collapse = document.querySelector("#navbarNav");
        const Collapse = window.bootstrap?.Collapse;
        if (collapse?.classList.contains("show") && Collapse) {
          Collapse.getOrCreateInstance(collapse).hide();
        }
        searchPanel.querySelector('input[type="search"]')?.focus();
      }
    });

    navbarToggler?.addEventListener("click", closeSearch);

    document.addEventListener("click", (event) => {
      if (
        !searchPanel.hidden &&
        !searchPanel.contains(event.target) &&
        !searchToggle.contains(event.target)
      ) {
        closeSearch();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !searchPanel.hidden) {
        closeSearch();
        searchToggle.focus();
      }
    });
  }

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();
