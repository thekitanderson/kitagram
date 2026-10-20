import { esc, html, page } from "../lib/render.js";
import config from "../site.config.js";

// How to put the site on a home screen. The button only appears if the browser offers a one-tap install; it never appears on its own elsewhere.
function handler() {
  return html(
    page(
      `Add to Home Screen · ${config.name}`,
      `<div class="pad"><h2 class="text-title">Add ${esc(config.name)} to your home screen</h2>
<p><button type="button" id="install" hidden>Add to Home Screen</button></p>
<p><strong>Android (Chrome):</strong> tap the ⋮ menu, then <em>Add to Home screen</em>.</p>
<p><strong>iPhone (Safari):</strong> tap Share, then <em>Add to Home Screen</em>.</p>
<p class="end"><a href="/">← Back</a></p></div>
<script>var e;addEventListener("beforeinstallprompt",function(v){v.preventDefault();e=v;var b=document.getElementById("install");b.hidden=false;b.onclick=function(){e.prompt()}})</script>`
    )
  );
}

export default { fetch: handler };
