const fs = require('node:fs');
const sharp = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const { environment } = require('../../tests/helpers/zrsjz-element-fx-harness.cjs');
const base = 'assets/Game_Bundles/73_ZRSJZ_DLC/', e = environment(), images = new Map();
for (const entry of fs.readdirSync(base + 'Sprites/铸枪界面/三元素枪', { recursive: true })) {
    if (!entry.endsWith('.png.meta')) continue;
    const path = base + 'Sprites/铸枪界面/三元素枪/' + entry, meta = JSON.parse(fs.readFileSync(path));
    for (const part of Object.values(meta.subMetas || {})) if (part.importer === 'sprite-frame') images.set(part.uuid, 'data:image/png;base64,' + fs.readFileSync(path.slice(0, -5)).toString('base64'));
}
const bubble = JSON.parse(fs.readFileSync(base + 'Spine/元素减益/毒素气泡.json'));
const atlas = fs.readFileSync(base + 'Spine/沼泽/FX_CC_poisoning.atlas', 'utf8'), regions = new Map();
const number = v => v.split(',').map(Number);
let region;
for (const line of atlas.split(/\r?\n/)) {
    if (/^39_/.test(line)) { region = {}; regions.set(line, region); }
    else if (region && /^\S/.test(line) && line) region = null;
    else if (region && /^  /.test(line)) { const [key, ...value] = line.trim().split(':'); region[key] = value.join(':').trim(); }
}
function timeline(frames, time, field, fallback) {
    if (!frames?.length || time < (frames[0].time || 0)) return fallback;
    let i = 0; while (i + 1 < frames.length && (frames[i + 1].time || 0) <= time) i++;
    const a = frames[i], b = frames[i + 1];
    if (typeof a[field] !== 'number' || !b || a.curve === 'stepped') return a[field] ?? fallback;
    return a[field] + ((b[field] ?? a[field]) - a[field]) * (time - (a.time || 0)) / (b.time - (a.time || 0));
}
async function bubbleImages() {
    for (const [name, r] of regions) {
        const [left, top] = number(r.xy), [w, h] = number(r.size), [ow, oh] = number(r.orig), [ox, oy] = number(r.offset);
        let patch = await sharp(base + 'Spine/沼泽/FX_CC_poisoning.png').extract({ left, top, width: r.rotate === 'true' ? h : w, height: r.rotate === 'true' ? w : h }).png().toBuffer();
        if (r.rotate === 'true') patch = await sharp(patch).rotate(-90).png().toBuffer();
        const image = await sharp({ create: { width: ow, height: oh, channels: 4, background: '#00000000' } }).composite([{ input: patch, left: ox, top: oh - oy - h }]).png().toBuffer();
        images.set(name, 'data:image/png;base64,' + image.toString('base64'));
    }
}
function spine(skeleton, clock) {
    const time = (clock * skeleton.timeScale + skeleton.entry.trackTime) % .9634, anim = bubble.animations['气泡'];
    return bubble.slots.map(slot => {
        const frames = anim.slots[slot.name], name = timeline(frames.attachment, time, 'name', null); if (!name) return '';
        const color = timeline(frames.color, time, 'color', 'ffffffff'), alpha = parseInt(color.slice(6, 8), 16) / 255;
        const bone = anim.bones[slot.bone], parent = anim.bones.bone7;
        const x = timeline(bone.translate, time, 'x', 0), y = timeline(bone.translate, time, 'y', 0), angle = timeline(bone.rotate, time, 'angle', 0);
        const sx = timeline(bone.scale, time, 'x', 1), sy = timeline(bone.scale, time, 'y', 1), px = -timeline(parent.scale, time, 'x', -1), py = timeline(parent.scale, time, 'y', 1);
        return `<g opacity="${alpha}" transform="translate(0 ${timeline(parent.translate, time, 'y', 0)}) scale(${px} ${py}) translate(${x} ${y}) rotate(${angle}) scale(${sx} ${sy}) translate(25.12 0)"><image href="${images.get(name)}" x="-150" y="-150" width="300" height="300" transform="scale(1 -1)"/></g>`;
    }).join('');
}
function art(fx) {
    const c = fx.controller, alpha = c.opacity.opacity / 255;
    if (c.Mode === 'poison') return `<g opacity="${alpha}">` + c.bubbles.map(s => `<g transform="translate(${s.node.position.x} ${s.node.position.y}) scale(${s.node.scale.x})">${spine(s, c.clock)}</g>`).join('') + '</g>';
    return `<g opacity="${alpha}">` + c.parts.concat(c.burst || []).filter(p => p.node.active).map(p => {
        const size = p.node.getComponent([...p.node.components.keys()].find(k => k.name === 'UITransform'));
        return `<g opacity="${p.opacity.opacity / 255}" transform="translate(${p.node.position.x} ${p.node.position.y}) rotate(${p.node.angle || 0}) scale(${p.node.scale.x} ${p.node.scale.y})"><image href="${images.get(p.sprite.spriteFrame.__uuid__)}" x="${-size.width / 2}" y="${-size.height / 2}" width="${size.width}" height="${size.height}" transform="scale(1 -1)"/></g>`;
    }).join('') + '</g>';
}
function panel(mode, x, time, ended) {
    const fx = e.createFX(mode); fx.controller.Configure(200, mode === 'frost' || mode === 'trail' ? 70 : 600, mode === 'trail' ? 1.7 : 0);
    fx.controller.clock = time; if (ended !== undefined) fx.controller.ending = ended; fx.controller.Render();
    const body = mode === 'trail' ? '' : '<g fill="#31495c" stroke="#5b7a90" stroke-width="2"><circle cx="180" cy="101" r="25"/><path d="M155 135Q180 125 205 135L215 273L199 281L195 360L175 360L170 283L162 360L143 360L149 276L141 190L128 246L114 241L136 146Z"/></g>';
    const label = { frost: 'FROST', fire: ended === undefined ? 'FIRE / BURNING' : 'FIRE / EXTINGUISH', poison: 'SWAMP SPINE BUBBLES', trail: 'ICE RESIDUE' }[mode];
    return `<g transform="translate(${x} 0)"><rect x="8" y="8" width="344" height="410" rx="16" fill="#152536" stroke="#35516b"/><text x="24" y="42" fill="#deecf5" font-family="Arial" font-size="16">${label}</text><ellipse cx="180" cy="362" rx="128" ry="35" fill="#0b1927"/>${body}<g transform="translate(180 ${mode === 'frost' || mode === 'trail' ? 355 : 230}) scale(.58 -.58)">${art(fx)}</g></g>`;
}
(async () => {
    await bubbleImages();
    const content = panel('frost', 0, .65) + panel('fire', 360, .65) + panel('poison', 720, .65) + panel('trail', 1080, .65) + panel('fire', 1440, 1, .30);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="430"><rect width="1800" height="430" fill="#0a1420"/>${content}</svg>`;
    fs.mkdirSync('artifacts/element-status-fx', { recursive: true }); fs.writeFileSync('artifacts/element-status-fx/preview-v2.svg', svg);
    await sharp(Buffer.from(svg)).png().toFile('artifacts/element-status-fx/preview-v2.png');
    const frames = [];
    for (let i = 0; i < 24; i++) {
        const time = i * .065;
        const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="430"><rect width="360" height="430" fill="#0a1420"/>${panel('fire', 0, time, time >= 1 ? time - 1 : undefined)}</svg>`;
        frames.push(await sharp(Buffer.from(frame)).ensureAlpha().raw().toBuffer());
    }
    await sharp(Buffer.concat(frames), { raw: { width: 360, height: 430 * frames.length, channels: 4, pageHeight: 430 } })
        .gif({ delay: 65, loop: 0 }).toFile('artifacts/element-status-fx/fire-v2.gif');
    fs.copyFileSync('artifacts/element-status-fx/preview-v2.png', 'artifacts/element-status-fx/preview.png');
    console.log('artifacts/element-status-fx/preview-v2.png');
})().catch(error => { console.error(error); process.exitCode = 1; });
