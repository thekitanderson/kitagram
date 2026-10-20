import { esc, html, page } from "../lib/render.js";
import config from "../site.config.js";

// How to put the site on a home screen. The button only appears if the browser offers a one-tap install; it never appears on its own elsewhere.
function handler() {
  return html(
    page(
      `Add ${config.name} App to Homescreen`,
      `<div class="pad"><h2 class="text-title">Add ${esc(config.name)} App to Homescreen</h2>
<p><button type="button" id="install" hidden>Add ${esc(config.name)} App to Homescreen</button></p>
<p id="done" role="status" hidden><strong>Added.</strong> ${esc(config.name)} is on your homescreen.</p>
<p><strong>Android (Chrome):</strong> tap the ⋮ menu, then <em>Add to Home screen</em>.</p>
<p><strong>iPhone (Safari):</strong> tap Share, then <em>Add to Home Screen</em>.</p>
<p class="end"><a href="/">← Back</a></p></div>
<script>var e,b=document.getElementById("install"),n=document.getElementById("done");function ok(){b.hidden=true;n.hidden=false}
addEventListener("beforeinstallprompt",function(v){v.preventDefault();e=v;b.hidden=false;b.onclick=function(){e.prompt()}});
addEventListener("appinstalled",ok);if(matchMedia("(display-mode: standalone)").matches)ok()</script>`
    )
  );
}

export default { fetch: handler };
