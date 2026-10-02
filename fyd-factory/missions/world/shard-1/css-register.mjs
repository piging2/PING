// register.mjs: install the CSS stub hook before tsx registers its loaders.
import { register } from "node:module";
register("./css-hooks.mjs", import.meta.url);
