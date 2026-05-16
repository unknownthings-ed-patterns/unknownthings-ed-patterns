function updateTranslateLink() {
  const link = document.getElementById("translate-link") as HTMLAnchorElement | null
  if (!link) return
  link.href =
    "https://translate.google.com/translate?sl=ja&tl=en&u=" +
    encodeURIComponent(window.location.href)
}

// 初回ロード時
updateTranslateLink()
// SPA遷移後
document.addEventListener("nav", updateTranslateLink)
