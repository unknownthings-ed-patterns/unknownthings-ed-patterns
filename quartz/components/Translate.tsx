import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/translate.inline"

const Translate: QuartzComponent = () => {
  return (
    <div class="translate-widget">
      <div id="google_translate_element"></div>
    </div>
  )
}

Translate.css = `
.translate-widget {
  padding: 0.4rem 0 0.2rem;
  font-size: 0.85rem;
}
.translate-widget .goog-te-gadget {
  font-family: inherit;
}
`

Translate.afterDOMLoaded = script

export default (() => Translate) satisfies QuartzComponentConstructor
