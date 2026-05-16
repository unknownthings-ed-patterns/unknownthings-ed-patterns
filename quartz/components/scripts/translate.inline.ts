document.addEventListener("nav", () => {
  const el = document.getElementById("google_translate_element")
  if (!el) return

  // Clear the element so it can be re-rendered on each navigation
  el.innerHTML = ""

  if (!(window as any).google?.translate?.TranslateElement) {
    // First load: fetch the script and initialize
    ;(window as any).googleTranslateElementInit = function () {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "ja",
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element",
      )
    }
    const script = document.createElement("script")
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
    script.async = true
    document.body.appendChild(script)
  } else {
    // Script already loaded: just re-initialize the widget
    new (window as any).google.translate.TranslateElement(
      {
        pageLanguage: "ja",
        layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
      },
      "google_translate_element",
    )
  }
})
