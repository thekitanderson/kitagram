import config from "../site.config.js";

const vars = (c) => Object.entries(c).map(([k, v]) => `--${k}:${v};`).join("");

// Theme -> CSS variables. Light by default, dark via the visitor's device setting.
export default function themeCss() {
  const t = config.theme;
  return (
    `:root{${vars(t.light)}--font-body:${t.fontBody};--max:${t.maxWidth};}` +
    `@media (prefers-color-scheme: dark){:root{${vars(t.dark)}}}`
  );
}
