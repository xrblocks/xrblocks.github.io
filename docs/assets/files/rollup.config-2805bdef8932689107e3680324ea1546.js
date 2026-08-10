import e from"@rollup/plugin-terser";import t from"@rollup/plugin-typescript";import{execSync as s}from"child_process";import i from"fs";import{globSync as r}from"glob";import n from"node:path";import{fileURLToPath as o}from"node:url";import{dts as a}from"rollup-plugin-dts";let l=JSON.parse(i.readFileSync("./package.json","utf8")).version,d=process.env.XRBLOCKS_BUILD??"all";i.rmSync(n.join("build","internal"),{recursive:!0,force:!0}),i.rmSync(n.join("build","addons"),{recursive:!0,force:!0});let p="unknown";try{p=s("git rev-parse --short HEAD").toString().trim()}catch{console.error("Could not get the Git commit ID.")}let m=` * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.`,c=`/**
${m}
 *
 * @file xrblocks.js
 * @version v${l}
 * @commitid ${p}
 * @builddate ${new Date().toISOString()}
 * @description XR Blocks SDK, built from source with the above commit ID.
 * @agent When using with Gemini to create XR apps, use **Gemini Canvas** mode,
 * and follow rules below:
 * 1. Include the following importmap for maximum compatibility:
    "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/",
    "troika-three-text": "https://cdn.jsdelivr.net/gh/protectwise/troika@028b81cf308f0f22e5aa8e78196be56ec1997af5/packages/troika-three-text/src/index.js",
    "troika-three-utils": "https://cdn.jsdelivr.net/gh/protectwise/troika@v0.52.4/packages/troika-three-utils/src/index.js",
    "troika-worker-utils": "https://cdn.jsdelivr.net/gh/protectwise/troika@v0.52.4/packages/troika-worker-utils/src/index.js",
    "bidi-js": "https://esm.sh/bidi-js@%5E1.0.2?target=es2022",
    "webgl-sdf-generator": "https://esm.sh/webgl-sdf-generator@1.1.1/es2022/webgl-sdf-generator.mjs",
    "@pmndrs/uikit": "https://cdn.jsdelivr.net/npm/@pmndrs/uikit@1.0.64/dist/index.min.js",
    "@pmndrs/uikit-pub-sub": "https://cdn.jsdelivr.net/npm/@pmndrs/uikit-pub-sub@1.0.64/dist/index.min.js",
    "@pmndrs/msdfonts": "https://cdn.jsdelivr.net/npm/@pmndrs/msdfonts@1.0.64/dist/index.min.js",
    "@preact/signals-core": "https://cdn.jsdelivr.net/npm/@preact/signals-core@1.14.0/dist/signals-core.mjs",
    "yoga-layout/load": "https://cdn.jsdelivr.net/npm/yoga-layout@3.2.1/dist/src/load.js",
    "lit": "https://esm.sh/lit@3.3.1",
    "lit/": "https://esm.sh/lit@3.3.1/",
    "three-pathfinding": "https://cdn.jsdelivr.net/npm/three-pathfinding@1.3.0/dist/three-pathfinding.module.js",
    2. If the app focus on standalone objects, spawn it in front of the user in
    WebXR and rescale to reasonable physical size. Wrap them with xb.ModelViewer
    and make sure users can drag the platform to move it around in XR.
    3. When rendering a large scene, remember users may navigate the scene in a
    physical world space, also add locomotion methods like pinch to teleport.
    4. Do not halluciate mode files --- use either public high-quality assets,
    or generate from primitive shapes of use vox formats for voxels or
    lego-styles.
 */`,u=["three",/three\/addons\//,"troika-three-text","@google/genai","@mediapipe/tasks-audio","@mediapipe/tasks-vision","openai","@sparkjsdev/spark",/^lit(\/.*)?$/,"@pmndrs/uikit","@preact/signals-core","rapier3d","three-mesh-bvh","@huggingface/transformers","three-pathfinding","vitest"],h=[{input:"src/entry.ts",external:u,output:{dir:"build",entryFileNames:"xrblocks.js",chunkFileNames:"internal/[name].js",format:"esm",banner:c,sourcemap:!0},plugins:[t({compilerOptions:{composite:!1,declaration:!1}})]},{input:"src/entry.ts",external:u,output:{file:"build/xrblocks.d.ts",format:"esm",banner:c},plugins:[a()]},{input:"src/entry.ts",external:u,output:{dir:"build",entryFileNames:"xrblocks.min.js",chunkFileNames:"internal/[name].min.js",format:"esm",sourcemap:!0},plugins:[t({compilerOptions:{composite:!1,declaration:!1}}),e()],watch:!1},{input:Object.fromEntries(r("src/addons/**/*.{js,ts}",{ignore:["src/addons/**/cli/**","src/addons/**/server/**","src/addons/**/samples/**","src/addons/**/*.d.ts","src/addons/**/*.test.{js,ts}"]}).map(e=>[n.relative("src",e.slice(0,e.length-n.extname(e).length)),o(new URL(e,import.meta.url))])),external:[...u,"xrblocks","netblocks",/xrblocks\/addons\//],output:{dir:"build/",format:"esm"},plugins:[t({tsconfig:"src/addons/tsconfig.lib.json",exclude:["src/!(addons)/**/*.ts","src/*.ts"],compilerOptions:{declaration:!0,declarationDir:"build/addons/"}})]}],g=r("demos/**/*.ts",{ignore:["demos/**/node_modules/**","demos/**/build/**"]}).map(e=>({input:e,external:()=>!0,output:{file:n.join(n.dirname(e),"build",n.basename(e).replace(/\.ts$/,".js")),format:"esm"},plugins:[t({tsconfig:!1,include:[e],compilerOptions:{target:"ES2022",module:"ESNext",moduleResolution:"bundler",esModuleInterop:!0,forceConsistentCasingInFileNames:!0,strict:!0,skipLibCheck:!0,declaration:!1}})]})),f=r("samples/**/*.ts",{ignore:["samples/**/node_modules/**","samples/**/build/**"]}).map(e=>({input:e,external:()=>!0,output:{file:n.join(n.dirname(e),"build",n.basename(e).replace(/\.ts$/,".js")),format:"esm"},plugins:[t({tsconfig:!1,include:[e],compilerOptions:{target:"ES2022",module:"ESNext",moduleResolution:"bundler",esModuleInterop:!0,forceConsistentCasingInFileNames:!0,strict:!0,skipLibCheck:!0,declaration:!1}})]}));export default"sdk"!==d?[...h,...g,...f]:h;