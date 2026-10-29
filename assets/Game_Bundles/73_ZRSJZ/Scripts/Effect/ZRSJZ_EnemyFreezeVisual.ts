import { Director, director, instantiate, isValid, Node, sp } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_ICE_BUTTERFLY_CONFIG as C } from '../ZRSJZ_Constant';

/** 与玩家共用冰冻资源；表现跟随敌人冻结状态，不用动画时长控制解冻。 */
export class ZRSJZ_EnemyFreezeVisual {
    private effect: Node = null;
    private skeleton: sp.Skeleton = null;
    private version = 0;
    private loading = false;
    private remaining = 0;
    private paused = false;
    private center = { x: 0, y: 0 };

    constructor(private readonly root: Node) { }

    public SetPaused(paused: boolean): void {
        this.paused = paused;
        if (isValid(this.skeleton, true)) this.skeleton.paused = paused;
    }
    public Update(frozen: boolean, remaining: number, center: { x: number; y: number }, paused: boolean): void {
        this.SetPaused(paused);
        if (!frozen || !Number.isFinite(remaining) || remaining <= 0 || !ZRSJZ_UIManager.ZRSJZ_DLC
            || !isValid(this.root, true) || !this.root.activeInHierarchy) { this.Clear(); return; }
        this.remaining = remaining;
        this.center = { x: center.x, y: center.y };
        if (this.loading || isValid(this.effect, true)) return;
        const version = ++this.version;
        this.loading = true;
        void ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', C.EffectPath).then(prefab => {
            if (version !== this.version || !isValid(this.root, true) || !this.root.activeInHierarchy
                || !ZRSJZ_UIManager.ZRSJZ_DLC || this.remaining <= 0) return;
            this.loading = false;
            const effect = instantiate(prefab);
            this.effect = effect;
            effect.parent = this.root;
            effect.setPosition(0, 0, 0);
            const visual = effect.getChildByName('Spine');
            if (visual) visual.setPosition(this.center.x - C.EffectCenter.x * visual.scale.x,
                this.center.y - C.EffectCenter.y * visual.scale.y, 0);
            const setLayer = (node: Node): void => { node.layer = this.root.layer; node.children.forEach(setLayer); };
            setLayer(effect);
            const skeleton = effect.getComponentInChildren(sp.Skeleton);
            const animation = skeleton?.findAnimation(C.AnimationName);
            if (!animation) throw new Error('冰冻特效缺少动画：' + C.AnimationName);
            this.skeleton = skeleton;
            // 将完整冰冻动画压缩到剩余控制时间，异步加载不会延长冻结。
            skeleton.timeScale = animation.duration > 0 ? animation.duration / this.remaining : 1;
            skeleton.paused = this.paused;
            skeleton.setAnimation(0, C.AnimationName, false);
        }).catch(error => {
            if (version !== this.version) return;
            this.Clear();
            console.warn('[冰霜裁决] 冰冻表现加载失败', error);
        });
    }

    public Clear(): void {
        ++this.version;
        this.loading = false; this.remaining = 0; this.skeleton = null;
        const effect = this.effect;
        this.effect = null;
        if (!isValid(effect, true)) return;
        // 与玩家一致：原生 Spine 跨过本帧渲染后销毁，避免 entity 提前释放。
        effect.active = false;
        effect.removeFromParent();
        director.once(Director.EVENT_AFTER_DRAW, () => {
            if (isValid(effect, true)) effect.destroy();
        });
    }
}
