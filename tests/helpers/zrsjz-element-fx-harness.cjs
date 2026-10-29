const fs = require('node:fs'), vm = require('node:vm');
const ts = require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
class V3 {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    clone() { return new V3(this.x, this.y, this.z); }
    set(v) { Object.assign(this, v); return this; }
    static distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    static transformMat4(out, point, node) { const p = node.worldPosition, s = node.worldScale; return out.set(new V3(p.x + point.x * s.x, p.y + point.y * s.y)); }
}
class Node {
    constructor(name = '') { this.name = name; this.children = []; this.position = new V3(); this.scale = new V3(1, 1, 1); this.components = new Map(); this.isValid = true; this._active = true; }
    set active(value) { const was = this._active; this._active = value; if (was && !value) for (const c of this.components.values()) c.onDisable?.(); }
    get active() { return this._active; }
    get activeInHierarchy() { return this.active && (!this.parent || this.parent.activeInHierarchy); }
    get worldPosition() { const p = this.parent?.worldPosition ?? new V3(), s = this.parent?.worldScale ?? new V3(1, 1, 1); return new V3(p.x + this.position.x * s.x, p.y + this.position.y * s.y); }
    get worldScale() { const p = this.parent?.worldScale ?? new V3(1, 1, 1); return new V3(this.scale.x * p.x, this.scale.y * p.y, 1); }
    get worldMatrix() { return this; }
    set parent(value) { this.removeFromParent(); this._parent = value; if (value) value.children.push(this); }
    get parent() { return this._parent; }
    removeFromParent() { if (this._parent) this._parent.children.splice(this._parent.children.indexOf(this), 1); this._parent = null; }
    getChildByName(name) { return this.children.find(n => n.name === name); }
    getComponent(key) { return this.components.get(key); }
    addComponent(Type) { const c = new Type(); c.node = this; this.components.set(Type, c); if (Type.name === 'ZRSJZ_ElementStatusFX') this.components.set(Type.name, c); return c; }
    setPosition(x, y, z = 0) { this.position = typeof x === 'object' ? x.clone() : new V3(x, y, z); }
    setScale(x, y, z) { this.scale = new V3(x, y, z); }
    setWorldPosition(p) { const parent = this.parent?.worldPosition ?? new V3(), s = this.parent?.worldScale ?? new V3(1, 1, 1); this.position = new V3((p.x - parent.x) / s.x, (p.y - parent.y) / s.y); }
    setWorldScale(x, y, z) { const p = this.parent?.worldScale ?? new V3(1, 1, 1); this.setScale(x / p.x, y / p.y, z); }
    getSiblingIndex() { return this.parent?.children.indexOf(this) ?? 0; }
    setSiblingIndex(index) { const p = this.parent; if (p) { p.children.splice(p.children.indexOf(this), 1); p.children.splice(index, 0, this); } }
}
class Component { getComponent(t) { return this.node.getComponent(t); } addComponent(t) { return this.node.addComponent(t); } }
class UITransform { setContentSize(w, h) { this.width = w; this.height = h; } }
class Color { constructor(r, g, b, a = 255) { this.set(r, g, b, a); } set(r, g, b, a = 255) { Object.assign(this, { r, g, b, a }); } }
class Sprite extends Component { static SizeMode = { CUSTOM: 0 }; }
class UIOpacity extends Component { constructor() { super(); this.opacity = 255; } }
class Skeleton extends Component {
    setAnimation(track, name, loop) { if (!this.skeletonData) throw Error('Missing Spine data'); this.queue = []; this.entry = { trackTime: 0, loop, name, animation: { name }, complete: false, isComplete() { return this.complete; } }; return this.entry; }
    addAnimation(track, name, loop, delay) { const entry = { name, loop, delay }; this.queue.push(entry); return entry; }
    clearTrack() { this.entry = null; this.queue = []; }
    setToSetupPose() { this.setupCount = (this.setupCount || 0) + 1; }
    getCurrent() { return this.entry; }
}
class Graphics {
    constructor() { this.clear(); }
    clear() { this.calls = []; this.path = []; }
    moveTo(...p) { this.path.push(['M', ...p]); } lineTo(...p) { this.path.push(['L', ...p]); }
    bezierCurveTo(...p) { this.path.push(['C', ...p]); } close() { this.path.push(['Z']); }
    ellipse(...p) { this.path.push(['E', ...p]); } circle(x, y, r) { this.ellipse(x, y, r, r); }
    fill() { this.calls.push({ path: this.path, fill: { ...this.fillColor } }); this.path = []; }
    stroke() { this.calls.push({ path: this.path, stroke: { ...this.strokeColor }, width: this.lineWidth }); this.path = []; }
}
function svg(graphics) {
    const color = c => `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
    return graphics.calls.map(call => {
        const d = call.path.map(([op, ...v]) => {
            if (op !== 'E') return op + v.join(' ');
            const [x, y, rx, ry] = v;
            return `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
        }).join(' ');
        return `<path d="${d}" fill="${call.fill ? color(call.fill) : 'none'}" stroke="${call.stroke ? color(call.stroke) : 'none'}" stroke-width="${call.width || 0}"/>`;
    }).join('');
}
function environment() {
    const UI = { ZRSJZ_DLC: true }, game = { GamePaused: false, IsGameFinished: false }, Online = { Battle: false }, Coop = { Stopped: false };
    const requests = [], recycled = [], pool = {
        GetNode: path => new Promise(resolve => requests.push({ path, resolve })),
        PutNode: node => { node.active = false; node.removeFromParent(); recycled.push(node); },
    };
    const cc = { _decorator: { ccclass: () => cls => cls, property(...args) { if (args.length === 1) return () => {}; } },
        Color, Component, Graphics, Node, Sprite, SpriteFrame: class {}, UIOpacity, sp: { Skeleton, SkeletonData: class {} },
        Vec3: V3, UITransform, isValid: node => !!node && node.isValid !== false };
    const load = path => {
        const exports = {};
        vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText, {
            exports, console, require(name) {
                if (name === 'cc') return cc;
                if (name.includes('UIManager')) return { ZRSJZ_UIManager: UI };
                if (name.includes('PoolManager')) return { ZRSJZ_PoolManager: { Instance: pool } };
                if (name.includes('OnlineCombat')) return { ZRSJZ_OnlineCombat: Coop };
                if (name.includes('OnlineService')) return { ZRSJZ_OnlineService: Online };
                if (name.includes('ZRSJZ_Game')) return { ZRSJZ_Game: { Instance: game } };
                throw Error('Unexpected module: ' + name);
            },
        });
        return exports;
    };
    const FX = load('assets/Game_Bundles/73_ZRSJZ_DLC/Scripts/Effect/ZRSJZ_ElementStatusFX.ts').ZRSJZ_ElementStatusFX;
    const Visual = load('assets/Game_Bundles/73_ZRSJZ/Scripts/Effect/ZRSJZ_ElementStatusVisual.ts').ZRSJZ_ElementStatusVisual;
    const createFX = mode => {
        const node = new Node(mode), controller = node.addComponent(FX); controller.Mode = mode;
        const name = { frost: '寒霜环绕', fire: '灼甲烈焰', poison: '毒素气泡', trail: '冰霜残留' }[mode];
        const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/元素减益/' + name + '.prefab'));
        const config = prefab.find(item => item.Mode === mode);
        Object.assign(controller, { ElementFrame: config.ElementFrame, HitFrames: config.HitFrames, BubbleData: config.BubbleData, FireData: config.FireData });
        return { node, controller };
    };
    return { UI, game, Online, Coop, requests, recycled, pool, FX, Visual, createFX, Node, V3, Graphics, Sprite, UIOpacity, Skeleton, svg };
}
module.exports = { environment };
