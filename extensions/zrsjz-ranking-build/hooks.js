'use strict';
const fs = require('fs');
const path = require('path');
exports.throwError = true;
exports.onAfterBuild = async function (options, result) {
    const dest = result && result.dest || options.dest;
    if (!dest || !path.isAbsolute(dest)) throw Error('[排行榜] 无法确定构建输出目录');
    const gamePath = path.join(dest, 'game.json');
    const game = JSON.parse(fs.readFileSync(gamePath, 'utf8'));
    // 插件在 extensions/zrsjz-ranking-build 内；不依赖构建任务目录后缀。
    const project = path.resolve(__dirname, '../..');
    const template = path.join(project, 'build-templates/bytedance-mini-game');
    const copy = (from, to) => {
        if (!fs.existsSync(from)) throw Error('[排行榜] 缺少开放域资源：' + from);
        fs.mkdirSync(to, { recursive: true });
        for (const item of fs.readdirSync(from, { withFileTypes: true })) {
            const source = path.join(from, item.name), target = path.join(to, item.name);
            if (item.isDirectory()) copy(source, target); else fs.copyFileSync(source, target);
        }
    };
    copy(path.join(template, 'zrsjz-open-data'), path.join(dest, 'zrsjz-open-data'));
    if (!(game.subPackages || game.subpackages || []).some(p => p.name === '73_ZRSJZ' || p.root?.replace(/\/$/, '') === 'subpackages/73_ZRSJZ')) {
        throw Error('[排行榜] 构建中缺少73_ZRSJZ分包，请检查构建场景和资源包设置');
    }
    const key = game.subPackages ? 'subPackages' : 'subpackages';
    game[key] = (game[key] || []).filter(p => p.name !== 'zrsjz-ranking');
    const crypto = require('crypto');
    for (const item of require('./retired-files.json')) {
        const file = path.resolve(dest, item.path);
        if (!file.startsWith(path.resolve(dest) + path.sep)) throw Error('[排行榜] 非法清理路径');
        if (!fs.existsSync(file)) continue;
        const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        if (digest !== item.sha256) throw Error('[排行榜] 旧生成文件已修改，请检查：' + file);
        fs.unlinkSync(file);
        let dir=path.dirname(file);
        while(dir.startsWith(path.resolve(dest)+path.sep) && fs.existsSync(dir) && !fs.readdirSync(dir).length) { fs.rmdirSync(dir); dir=path.dirname(dir); }
    }
    game.openDataContext = 'zrsjz-open-data';
    fs.writeFileSync(gamePath, JSON.stringify(game, null, 4) + '\n');
    const roots = game[key].map(p => path.resolve(dest, p.root));
    const size = folder => fs.readdirSync(folder, { withFileTypes: true }).reduce((n, item) => {
        const file = path.join(folder, item.name);
        if (roots.some(root => file === root || file.startsWith(root + path.sep))) return n;
        return n + (item.isDirectory() ? size(file) : fs.statSync(file).size);
    }, 0);
    const mainBytes = size(dest);
    console.log('[排行榜] 主包体积（包含开放数据域）：' + (mainBytes / 1048576).toFixed(4) + ' MiB');
    if (mainBytes > 4 * 1048576) throw Error('[排行榜] 主包超过4MiB，已停止构建，请查看主包体积明细');
    console.log('[排行榜] 已配置开放数据域：' + dest);
};
