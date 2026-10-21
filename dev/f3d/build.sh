cd "$(dirname "$0")" && cat 01-core.js 02-render.js 03-weapon.js 04-scene.js 045-duel.js 05-api.js > ../../public/forge3d.js && node --check ../../public/forge3d.js && echo BUILD_OK
