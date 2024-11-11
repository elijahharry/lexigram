import { defineConfig } from "rollup";
import typescript from "rollup-plugin-typescript2";
import del from "rollup-plugin-delete";
import dts from "rollup-plugin-dts";
import { copyFileSync, readFileSync, writeFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));

export default defineConfig([
  {
    input: "src/index.ts",
    output: [
      {
        format: "cjs",
        file: packageJson.main,
      },
      {
        format: "es",
        file: packageJson.module,
      },
    ].map((output) => ({
      ...output,
      file: `dist/${output.file}`,
    })),
    plugins: [
      del({ targets: "dist/*", runOnce: true }),
      typescript({
        tsconfig: "tsconfig.json",
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            declaration: true,
            declarationDir: "dist/types",
            outDir: "dist/types",
            rootDir: "src",
            target: "esnext",
          },
        },
      }),
    ],
  },
  {
    input: "dist/types/index.d.ts",
    output: {
      format: "es",
      file: `dist/${packageJson.types}`,
    },
    plugins: [
      dts(),
      del({
        targets: "dist/types",
        hook: "writeBundle",
      }),
      {
        name: "copy-package",
        writeBundle() {
          const pick = (...keys) => {
            const json = {};
            keys.forEach((key) => {
              if (key in packageJson) json[key] = packageJson[key];
            });
            return json;
          };

          const json = pick(
            "name",
            "version",
            "description",
            "author",
            "license",
            "types",
            "main",
            "module",
            "files",
            "repository"
          );

          writeFileSync(
            "dist/package.json",
            JSON.stringify(json, null, 2),
            "utf-8"
          );

          copyFileSync("README.md", "dist/README.md");
        },
      },
    ],
  },
]);
