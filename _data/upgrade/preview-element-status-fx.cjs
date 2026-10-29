const fs = require('node:fs');
const sharp = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const { environment } = require('../../tests/helpers/zrsjz-element-fx-harness.cjs');
const e = environment(), titles = ['FROST / SLOW', 'BURN / ARMOR SHRED', 'POISON / BUBBLES', 'FROST RESIDUE'];
const panels = ['frost', 'fire', 'poison', 'trail'].map((mode, i) => {
    const fx = e.createFX(mode); fx.controller.Configure(200, mode === 'frost' || mode === 'trail' ? 70 : 600, mode === 'trail' ? 1.7 : 0);
    fx.controller.seed = .7; fx.controller.clock = .45; fx.controller.Draw();
    let body = '';
    if (mode !== 'trail') body = '<g fill="#304256" stroke="#576c82" stroke-width="2"><circle cx="190" cy="123" r="27"/><path d="M162 157Q190 145 218 157L228 298L209 303L205 385L184 385L180 306L173 385L152 385L158 294L150 213L134 279L119 274L141 170Z"/></g>';
    const art = mode === 'frost' ? `<g transform="translate(190 389) scale(.85 -.85)">${e.svg(fx.node.getComponent(e.Graphics))}</g>`
        : mode === 'trail' ? [.05,.3,.7,1.1].map((age, j) => { fx.controller.clock = age; fx.controller.Draw(); return `<g transform="translate(${80 + j * 70} ${320 - j * 32}) scale(.45 -.45)">${e.svg(fx.node.getComponent(e.Graphics))}</g>`; }).join('')
        : `<g transform="translate(190 244) scale(.52 -.52)">${e.svg(fx.node.getComponent(e.Graphics))}</g>`;
    return `<g transform="translate(${i * 400} 0)"><rect x="12" y="20" width="376" height="480" rx="18" fill="#172634" stroke="#334a5f"/><text x="32" y="58" fill="#d3e7f4" font-size="18" font-family="Arial">${titles[i]}</text><ellipse cx="190" cy="390" rx="142" ry="44" fill="#0b1822"/>${body}${art}</g>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="520" viewBox="0 0 1600 520"><rect width="1600" height="520" fill="#0e1923"/>${panels.join('')}</svg>`;
fs.mkdirSync('artifacts/element-status-fx', { recursive: true });
fs.writeFileSync('artifacts/element-status-fx/preview.svg', svg);
sharp(Buffer.from(svg)).png().toFile('artifacts/element-status-fx/preview.png').then(() => console.log('artifacts/element-status-fx/preview.png')).catch(error => { console.error(error); process.exitCode = 1; });
