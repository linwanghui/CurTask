const fs = require('node:fs');
const sharp = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base = 'assets/Game_Bundles/73_ZRSJZ_DLC/Spine/火把/';
const data = JSON.parse(fs.readFileSync(base + 'lrsc568.json')), regions = new Map(), pictures = new Map();
let region;
for (const line of fs.readFileSync(base + 'lrsc568.atlas', 'utf8').split(/\r?\n/)) {
    if (/^honghuo/.test(line)) { region = {}; regions.set(line, region); }
    else if (region && /^  /.test(line)) { const [key, value] = line.trim().split(':'); region[key] = value.trim(); }
}
const values = value => value.split(',').map(Number);
async function frames() {
    for (const [name, r] of regions) {
        const [left, top] = values(r.xy), [w, h] = values(r.size), [ow, oh] = values(r.orig), [ox, oy] = values(r.offset);
        let image = await sharp(base + 'lrsc568.png').extract({ left, top, width: r.rotate === 'true' ? h : w, height: r.rotate === 'true' ? w : h }).png().toBuffer();
        if (r.rotate === 'true') image = await sharp(image).rotate(-90).png().toBuffer();
        image = await sharp({ create: { width: ow, height: oh, channels: 4, background: '#00000000' } }).composite([{ input: image, left: ox, top: oh - oy - h }]).png().toBuffer();
        pictures.set(name, 'data:image/png;base64,' + image.toString('base64'));
    }
}
function sample(animation, time) {
    const slot = data.animations[animation].slots.honghuo2;
    let attachment = null;
    for (const key of slot.attachment) if ((key.time || 0) <= time) attachment = key.name;
    let alpha = 1;
    if (slot.color) {
        let i = 0; while (i + 1 < slot.color.length && slot.color[i + 1].time <= time) i++;
        const a = slot.color[i], b = slot.color[i + 1], from = parseInt(a.color.slice(6), 16) / 255;
        alpha = b ? from + (parseInt(b.color.slice(6), 16) / 255 - from) * Math.max(0, Math.min(1, (time - (a.time || 0)) / (b.time - (a.time || 0)))) : from;
    }
    return { attachment, alpha };
}
(async () => {
    await frames(); const all = [];
    for (let frame = 0; frame < 108; frame++) {
        const t = frame * .08, cycle = Math.floor(t / 2.825), step = t % 2.825, clock = step * .8;
        const ending = clock >= 1.3, animation = ending ? 'out' : clock < .5 ? 'in' : 'loop';
        const phase = ending ? clock - 1.3 : clock < .5 ? clock : clock - .5;
        const s = sample(animation, phase), points = [[-.20,-.18],[.18,.10],[-.14,.24],[.20,-.28],[0,-.02]];
        const [x,y] = points[cycle % points.length], h = 98, w = h * 58 / 88;
        const flames = step < 2.625 && s.attachment && s.alpha > 0
            ? `<image href="${pictures.get(s.attachment)}" x="${180 + x * 110 - w / 2}" y="${230 - y * 330 - h / 2}" width="${w}" height="${h}" opacity="${s.alpha}"/>` : '';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="430"><rect width="360" height="430" fill="#102131"/><text x="24" y="36" fill="#e4eff6" font-family="Arial" font-size="18">${ending ? 'OUT / EXTINGUISH' : t < .5 ? 'IN / IGNITION' : 'LOOP / BURNING'}</text><g fill="#31495c" stroke="#5b7a90" stroke-width="2"><circle cx="180" cy="101" r="25"/><path d="M155 135Q180 125 205 135L215 273L199 281L195 360L175 360L170 283L162 360L143 360L149 276L141 190L128 246L114 241L136 146Z"/></g>${flames}</svg>`;
        all.push(await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer());
    }
    fs.mkdirSync('artifacts/element-status-fx', { recursive: true });
    await sharp(Buffer.concat(all), { raw: { width: 360, height: 430 * all.length, channels: 4, pageHeight: 430 } })
        .gif({ delay: 80, loop: 0 }).toFile('artifacts/element-status-fx/fire-spine.gif');
    console.log('artifacts/element-status-fx/fire-spine.gif');
})().catch(error => { console.error(error); process.exitCode = 1; });
