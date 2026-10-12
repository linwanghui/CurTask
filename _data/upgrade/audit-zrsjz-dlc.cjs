const fs = require('fs'), path = require('path');
const main = 'assets/Game_Bundles/73_ZRSJZ', dlc = main + '_DLC';
const files = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(folder, entry.name);
    return entry.isDirectory() ? files(name) : [name];
});
const ids = new Map();
for (const file of files(dlc).filter(file => file.endsWith('.meta'))) {
    const visit = value => {
        if (!value || typeof value !== 'object') return;
        if (value.uuid) ids.set(value.uuid, file.slice(0, -5).replace(/\\/g, '/'));
        Object.values(value).forEach(visit);
    };
    visit(JSON.parse(fs.readFileSync(file, 'utf8')));
}
const staticReferences = [], runtimeReferences = [];
let scannedFiles = 0;
for (const file of files(main)) {
    if (file.endsWith('.ts')) {
        fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((text, index) => {
            if (text.includes('73_ZRSJZ_DLC')) runtimeReferences.push({ file: file.replace(/\\/g, '/'), line: index + 1, text: text.trim() });
        });
        continue;
    }
    if (!/\.(prefab|scene|json|meta|mtl|mat|material|anim|spriteatlas|asset)$/.test(file)) continue;
    let data;
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    scannedFiles++;
    const visit = (value, field) => {
        if (typeof value === 'string') {
            const resource = ids.get(value) || ids.get(value.split('@')[0]);
            if (resource) staticReferences.push({ file: file.replace(/\\/g, '/'), field, resource, uuid: value });
        } else if (value && typeof value === 'object') {
            Object.entries(value).forEach(([key, next]) => visit(next, field ? field + '.' + key : key));
        }
    };
    visit(data, '');
}
const report = { mainBundle: main, dlcBundle: dlc, scannedFiles, staticReferences,
    runtimeReferenceNote: '脚本字符串为运行时分包加载路径；序列化UUID/元数据引用列在staticReferences中。', runtimeReferences };
fs.writeFileSync('_data/upgrade/zrsjz-dlc-reference-audit.json', JSON.stringify(report, null, 2));
console.log('Scanned JSON assets/metadata: ' + scannedFiles);
console.log('Direct DLC references: ' + staticReferences.length);
staticReferences.forEach(ref => console.log(ref.file + ' -> ' + ref.resource));
