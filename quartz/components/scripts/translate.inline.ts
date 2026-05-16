document.addEventListener("nav", () => {
  const link = document.getElementById("translate-link") as HTMLAnchorElement | null
  if (!link) return
  link.href =
    "https://translate.google.com/translate?sl=ja&u=" + encodeURIComponent(window.location.href)
})
