(function () {
  // The current prototype has a hidden glossary area but no glossary entries or interaction.
  const entries = [];
  function render() {
    const glossary = document.getElementById("glossary");
    const terms = document.getElementById("terms");
    if (!glossary || !terms || entries.length === 0) return;
    terms.innerHTML = entries.map(({ term, explanation }) => "<p><b>" + term + "</b><br>" + explanation + "</p>").join("");
    glossary.style.display = "block";
  }
  window.NaviGlossary = { entries, render };
})();
