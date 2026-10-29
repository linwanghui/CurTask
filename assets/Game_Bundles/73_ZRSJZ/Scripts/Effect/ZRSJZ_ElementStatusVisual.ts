import { isValid, Node, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';

type Kind = 'fire' | 'poison';
type Slot = { node: Node; loading: boolean; failed: boolean; version: number };
type Bounds = { x: number; y: number; width: number; height: number };
type FX = { Configure(width: number, height: number, lifetime?: number): void; End(): void; Resume(): void };
const paths = { fire: '灼甲烈焰', poison: '毒素气泡', trail: '冰霜残留' };

/** 主包仅按路径加载 DLC 表现，不静态引用 DLC 脚本或预制体。 */
export class ZRSJZ_ElementStatusVisual {
    private readonly slots: Record<Kind, Slot> = {
        fire: { node: null, loading: false, failed: false, version: 0 },
        poison: { node: null, loading: false, failed: false, version: 0 },
    };
    private state: any = null;
    private generation = 0;
    private lastFoot: Vec3 = null;
    private trailElapsed = 0;
    private trailLoading = 0;

    constructor(private readonly root: Node, private readonly bounds: Bounds) { }
    public UpdateState(state: any): void { this.state = state; }
    private Wanted(kind: Kind): boolean {
        return this.state?.[kind] > 0;
    }
    public Tick(dt: number, paused: boolean, alive = true): void {
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || !alive || !isValid(this.root, true) || !this.root.activeInHierarchy) {
            this.Clear(); return;
        }
        for (const kind of ['fire', 'poison'] as Kind[]) {
            if (this.Wanted(kind)) { if (!paused) this.Ensure(kind); }
            else this.Release(this.slots[kind]);
        }
        if (paused) return;
        if (!(this.state?.cold > 0) || this.state?.frozen) { this.lastFoot = null; this.trailElapsed = 0; return; }
        const foot = Vec3.transformMat4(new Vec3(), new Vec3(this.bounds.x, this.bounds.y - this.bounds.height / 2, 0), this.root.worldMatrix);
        if (!this.lastFoot) { this.lastFoot = foot.clone(); return; }
        this.trailElapsed += Math.max(0, dt);
        const width = Math.max(12, this.bounds.width * Math.abs(this.root.worldScale.x));
        const distance = Vec3.distance(foot, this.lastFoot);
        if (distance > Math.max(500, width * 8)) { this.lastFoot.set(foot); this.trailElapsed = 0; return; } // 传送不连线。
        if (this.trailElapsed >= .18 && distance >= Math.max(8, width * .3) && this.trailLoading < 2) {
            this.SpawnTrail(this.lastFoot.clone(), width);
            this.lastFoot.set(foot); this.trailElapsed = 0;
        }
    }
    private Ensure(kind: Kind): void {
        const slot = this.slots[kind];
        if (isValid(slot.node, true) && slot.node.parent === this.root) {
            (slot.node.getComponent('ZRSJZ_ElementStatusFX') as unknown as FX)?.Resume(); return;
        }
        if (slot.loading || slot.failed) return;
        slot.loading = true;
        const version = ++slot.version;
        void ZRSJZ_PoolManager.Instance.GetNode('73_ZRSJZ_DLC/Prefabs/Effect/元素减益/' + paths[kind]).then(node => {
            if (version !== slot.version || !this.Wanted(kind) || !ZRSJZ_UIManager.ZRSJZ_DLC
                || !isValid(this.root, true) || !this.root.activeInHierarchy) {
                if (isValid(node, true)) ZRSJZ_PoolManager.Instance.PutNode(node);
                return;
            }
            slot.loading = false;
            const fx = node?.getComponent('ZRSJZ_ElementStatusFX') as unknown as FX;
            if (!isValid(node, true) || !fx) {
                if (isValid(node, true)) ZRSJZ_PoolManager.Instance.PutNode(node);
                slot.failed = true; return;
            }
            node.parent = this.root; node.layer = this.root.layer;
            node.setPosition(this.bounds.x, this.bounds.y, 0);
            node.setScale(1, 1, 1);
            node.active = true; slot.node = node;
            fx.Configure(this.bounds.width * 1.1, this.bounds.height * .95);
        }).catch(error => {
            if (version !== slot.version) return;
            slot.loading = false; slot.failed = true;
            console.warn('[元素持续特效] 加载失败', kind, error);
        });
    }
    private SpawnTrail(position: Vec3, width: number): void {
        const units = this.root.parent, map = units?.parent;
        if (!isValid(map, true)) return;
        let ground = map.getChildByName('元素冰霜残留层');
        if (!ground) {
            ground = new Node('元素冰霜残留层'); ground.layer = this.root.layer; ground.parent = map;
            ground.setSiblingIndex(units.getSiblingIndex());
        }
        const parent = ground, generation = this.generation;
        this.trailLoading++;
        void ZRSJZ_PoolManager.Instance.GetNode('73_ZRSJZ_DLC/Prefabs/Effect/元素减益/' + paths.trail).then(node => {
            const fx = node?.getComponent('ZRSJZ_ElementStatusFX') as unknown as FX;
            if (generation !== this.generation || !ZRSJZ_UIManager.ZRSJZ_DLC || !isValid(parent, true)
                || !parent.activeInHierarchy || !isValid(node, true) || !fx) {
                if (isValid(node, true)) ZRSJZ_PoolManager.Instance.PutNode(node);
                return;
            }
            node.parent = parent; node.layer = this.root.layer;
            node.setWorldPosition(position); node.setWorldScale(1, 1, 1); node.active = true;
            fx.Configure(width * 1.1, width * .34, 1.7);
        }).catch(error => console.warn('[冰霜残留] 加载失败', error))
            .finally(() => this.trailLoading--);
    }
    private Release(slot: Slot, immediately = false): void {
        if (slot.loading) slot.version++;
        slot.loading = slot.failed = false;
        if (isValid(slot.node, true) && slot.node.parent === this.root) {
            const fx = slot.node.getComponent('ZRSJZ_ElementStatusFX') as unknown as FX;
            if (!immediately && fx) { fx.End(); return; }
            ZRSJZ_PoolManager.Instance.PutNode(slot.node);
        }
        slot.node = null;
    }
    public Clear(): void {
        this.generation++; this.state = null; this.lastFoot = null; this.trailElapsed = 0;
        for (const kind of ['fire', 'poison'] as Kind[]) this.Release(this.slots[kind], true);
    }
}
