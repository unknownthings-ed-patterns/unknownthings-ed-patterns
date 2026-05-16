import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/translate.inline"

const Translate: QuartzComponent = () => {
  return (
    <div class="translate-widget">
      <a id="translate-link" href="#" target="_blank" rel="noopener noreferrer">
        🌐 Translate this page
      </a>
    </div>
  )
}

Translate.css = `
.translate-widget {
  padding: 0.6rem 0 0.4rem;
  text-align: center;
}
.translate-widget a {
  font-size: 0.85rem;
  color: var(--secondary);
  text-decoration: none;
  border: 1px solid var(--lightgray);
  border-radius: 4px;
  padding: 0.3rem 0.8rem;
  display: inline-block;
}
.translate-widget a:hover {
  background-color: var(--lightgray);
}
`

Translate.afterDOMLoaded = script

export default (() => Translate) satisfies QuartzComponentConstructor
