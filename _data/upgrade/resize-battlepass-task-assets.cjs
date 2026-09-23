const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const directory = path.resolve('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/战令界面/任务');
const files = fs.readdirSync(directory).filter(name => /^任务类型-.*\.png$/u.test(name));

(async () => {
    for (const name of files) {
        const source = path.join(directory, name);
        const output = await sharp(source).resize(80, 80, { fit: 'fill' }).png().toBuffer();
        fs.writeFileSync(source, output);
    }
    console.log(`Resized ${files.length} task type images to 80x80 pixels.`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
