(function () {
  var links = window.SITE_LINKS || {};

  // Wire every element with data-link="<key>" to SITE_LINKS[key]; hide it if empty.
  document.querySelectorAll("[data-link]").forEach(function (el) {
    var url = links[el.getAttribute("data-link")];
    if (url) {
      el.href = url;
    } else if (el.hasAttribute("data-pending")) {
      // Keep visible but mark as not yet available (used for the access form).
      el.removeAttribute("href");
      el.classList.add("is-pending");
      el.setAttribute("aria-disabled", "true");
      var label = el.querySelector(".label");
      if (label) label.textContent = el.getAttribute("data-pending");
    } else {
      (el.closest("[data-link-wrap]") || el).hidden = true;
    }
  });

  // Copy BibTeX
  var btn = document.getElementById("copy-bibtex");
  if (btn) {
    btn.addEventListener("click", function () {
      var text = document.getElementById("bibtex").innerText;
      var done = function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1600);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }

  // Click a figure to view it full-size
  var lb = document.getElementById("lightbox");
  var lbImg = lb && lb.querySelector("img");
  document.querySelectorAll("figure img").forEach(function (img) {
    img.addEventListener("click", function () {
      lbImg.src = img.src; lbImg.alt = img.alt;
      lb.hidden = false; document.body.style.overflow = "hidden";
    });
  });
  if (lb) {
    var close = function () { lb.hidden = true; document.body.style.overflow = ""; };
    lb.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
})();
