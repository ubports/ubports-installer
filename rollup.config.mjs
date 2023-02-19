import svelte from "rollup-plugin-svelte";
import autoPreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import livereload from "rollup-plugin-livereload";
import css from "rollup-plugin-css-only";
import { spawn } from "child_process";

const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;
  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = spawn(
        "electron",
        [".", ...process.env.UBPORTS_INSTALLER_FLAGS.split(" ")],
        {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true
        }
      );
      server.on("exit", code => setTimeout(() => outprocess.exit(code)), 100);

      process.on("SIGTERM", toExit);
      process.on("exit", toExit);
    }
  };
}

export default {
  input: "src/svelte.mjs",
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: "public/build/bundle.js",
    inlineDynamicImports: true
  },
  plugins: [
    svelte({
      preprocess: autoPreprocess(),
      compilerOptions: {
        dev: !production
      }
    }),
    typescript({ sourceMap: !production }),
    css({ output: "theme.css" }),
    resolve({
      browser: true,
      dedupe: ["svelte"]
    }),
    commonjs(),
    json(),
    !production && serve(),
    !production && livereload("public"),
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
};
