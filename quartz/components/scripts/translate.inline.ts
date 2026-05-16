document.addEventListener("nav", () => {
  if ((window as any).__googleTranslateInitialized) return
  const el = document.getElementById("google_translate_element")
  if (!el) return

  ;(window as any).__googleTranslateInitialized = true

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
})
