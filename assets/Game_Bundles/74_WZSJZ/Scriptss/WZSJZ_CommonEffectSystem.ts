import { _decorator, Animation, Component, instantiate, Node, NodePool, Prefab, sp, UITransform, Vec3 } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Incident } from './WZSJZ_Incident';

const { ccclass } = _decorator;

interface WZSJZ_CommonEffectRuntime {
    Prefab: Prefab;
    Pool: NodePool;
    FallbackDuration: number;
}

interface WZSJZ_AttachedEffectRuntime {
    EffectNode: Node;
    Token: number;
    Runtime: WZSJZ_CommonEffectRuntime;
}

/** 通用特效入口，负责动态注册、定时播放回池以及层级维护。 */
@ccclass('WZSJZ_CommonEffectSystem')
export class WZSJZ_CommonEffectSystem extends Component {
    private static _instance: WZSJZ_CommonEffectSystem = null;
    public static get Instance(): WZSJZ_CommonEffectSystem {
        return this._instance;
    }

    private _canvas: Node = null;
    private _dragLayer: Node = null;
    private _effectLayer: Node = null;
    private _effects: Map<string, WZSJZ_CommonEffectRuntime> = new Map();
    private _effectLoads: Map<string, Promise<boolean>> = new Map();
    private _attachedEffects: Map<Node, Map<string, WZSJZ_AttachedEffectRuntime>> = new Map();

    protected onLoad(): void {
        WZSJZ_CommonEffectSystem._instance = this;
    }

    protected onDestroy(): void {
        for (const runtime of this._effects.values()) {
            runtime.Pool.clear();
        }
        this._effects.clear();
        this._effectLoads.clear();
        this._attachedEffects.clear();
        if (WZSJZ_CommonEffectSystem._instance === this) {
            WZSJZ_CommonEffectSystem._instance = null;
        }
    }

    public Configure(canvas: Node, dragLayer: Node): void {
        this._canvas = canvas;
        this._dragLayer = dragLayer;
        this.SetupEffectLayer();
        void this.PrepareBlueExplosion();
        void this.PrepareStunEffect();
    }

    public PlayBlueExplosion(worldPosition: Vec3): boolean {
        return this.Play("蓝色爆炸", worldPosition);
    }

    public Play(effectName: string, worldPosition: Vec3, durationOverride?: number): boolean {
        const runtime = this._effects.get(effectName);
        if (!runtime || !this._effectLayer) {
            return false;
        }
        const effectNode = runtime.Pool.get() || instantiate(runtime.Prefab);
        effectNode.active = true;
        effectNode.setParent(this._effectLayer);
        effectNode.setWorldPosition(worldPosition);
        effectNode.angle = 0;
        this.SetLayerRecursively(effectNode, this._effectLayer.layer);

        const animation = effectNode.getComponent(Animation)
            || effectNode.getComponentInChildren(Animation);
        animation?.stop();
        animation?.play();
        const skeleton = effectNode.getComponent(sp.Skeleton)
            || effectNode.getComponentInChildren(sp.Skeleton);
        if (skeleton) {
            skeleton.clearTracks();
            const defaultAnimation = (skeleton as any).defaultAnimation || "animation";
            skeleton.setAnimation(0, defaultAnimation, false);
        }
        const duration = durationOverride && durationOverride > 0
            ? durationOverride
            : animation?.defaultClip?.duration || runtime.FallbackDuration;
        this.scheduleOnce(() => {
            if (effectNode?.isValid) {
                animation?.stop();
                skeleton?.clearTracks();
                effectNode.active = false;
                runtime.Pool.put(effectNode);
            }
        }, duration);
        this.KeepEffectLayerOnTop();
        return true;
    }

    /** 循环特效挂在目标节点上，移动或拖拽时会跟随目标，时间到自动回池。 */
    public PlayAttached(
        effectName: string,
        target: Node,
        duration: number,
        loopSpine: boolean = true,
    ): boolean {
        const runtime = this._effects.get(effectName);
        if (!runtime || !target?.isValid || duration <= 0) {
            return false;
        }
        let targetEffects = this._attachedEffects.get(target);
        if (!targetEffects) {
            targetEffects = new Map();
            this._attachedEffects.set(target, targetEffects);
        }
        const existing = targetEffects.get(effectName);
        if (existing?.EffectNode?.isValid) {
            existing.Token++;
            this.ScheduleAttachedRecycle(target, effectName, existing, duration);
            return true;
        }
        const effectNode = runtime.Pool.get() || instantiate(runtime.Prefab);
        effectNode.active = true;
        effectNode.setParent(target);
        effectNode.setPosition(0, 0, 0);
        effectNode.angle = 0;
        effectNode.setSiblingIndex(target.children.length - 1);
        this.SetLayerRecursively(effectNode, target.layer);

        const animation = effectNode.getComponent(Animation)
            || effectNode.getComponentInChildren(Animation);
        animation?.stop();
        animation?.play();
        const skeleton = effectNode.getComponent(sp.Skeleton)
            || effectNode.getComponentInChildren(sp.Skeleton);
        if (skeleton) {
            skeleton.clearTracks();
            const defaultAnimation = (skeleton as any).defaultAnimation || "animation";
            skeleton.setAnimation(0, defaultAnimation, loopSpine);
        }
        const attached: WZSJZ_AttachedEffectRuntime = {
            EffectNode: effectNode,
            Token: 1,
            Runtime: runtime,
        };
        targetEffects.set(effectName, attached);
        this.ScheduleAttachedRecycle(target, effectName, attached, duration);
        return true;
    }

    /** 对象池单位重新启用或死亡时，可立即清掉旧状态，避免特效跟到下一次复用。 */
    public StopAttached(effectName: string, target: Node): void {
        const targetEffects = this._attachedEffects.get(target);
        const attached = targetEffects?.get(effectName);
        if (!attached) {
            return;
        }
        attached.Token++;
        targetEffects.delete(effectName);
        if (targetEffects.size <= 0) {
            this._attachedEffects.delete(target);
        }
        this.RecycleAttachedEffect(attached);
    }

    /** 同一目标的同名状态特效只保留一个；重复施加只刷新持续时间。 */
    private ScheduleAttachedRecycle(
        target: Node,
        effectName: string,
        attached: WZSJZ_AttachedEffectRuntime,
        duration: number,
    ): void {
        const token = attached.Token;
        this.scheduleOnce(() => {
            if (attached.Token !== token) {
                return;
            }
            const targetEffects = this._attachedEffects.get(target);
            if (targetEffects?.get(effectName) !== attached) {
                return;
            }
            targetEffects.delete(effectName);
            if (targetEffects.size <= 0) {
                this._attachedEffects.delete(target);
            }
            this.RecycleAttachedEffect(attached);
        }, duration);
    }

    private RecycleAttachedEffect(attached: WZSJZ_AttachedEffectRuntime): void {
        const effectNode = attached.EffectNode;
        if (!effectNode?.isValid) {
            return;
        }
        effectNode.getComponent(Animation)?.stop();
        effectNode.getComponentInChildren(Animation)?.stop();
        effectNode.getComponent(sp.Skeleton)?.clearTracks();
        effectNode.getComponentInChildren(sp.Skeleton)?.clearTracks();
        effectNode.active = false;
        attached.Runtime.Pool.put(effectNode);
    }

    public RegisterEffect(
        effectName: string,
        prefabPath: string,
        fallbackDuration: number,
        prewarm: number = 0,
    ): Promise<boolean> {
        if (this._effects.has(effectName)) {
            return Promise.resolve(true);
        }
        const loading = this._effectLoads.get(effectName);
        if (loading) {
            return loading;
        }
        const loadPromise = this.LoadEffect(
            effectName,
            prefabPath,
            fallbackDuration,
            prewarm,
        );
        this._effectLoads.set(effectName, loadPromise);
        void loadPromise.finally(() => this._effectLoads.delete(effectName));
        return loadPromise;
    }

    private async PrepareBlueExplosion(): Promise<void> {
        const config = WZSJZ_Constant.CommonEffect.BlueExplosion;
        await this.RegisterEffect(
            "蓝色爆炸",
            config.PrefabPath,
            config.FallbackDuration,
            WZSJZ_Constant.ObjectPool.BlueExplosionPrewarm,
        );
    }

    private async PrepareStunEffect(): Promise<void> {
        const config = WZSJZ_Constant.CommonEffect.Stun;
        await this.RegisterEffect(
            config.EffectName,
            config.PrefabPath,
            config.FallbackDuration,
            1,
        );
    }

    private async LoadEffect(
        effectName: string,
        prefabPath: string,
        fallbackDuration: number,
        prewarm: number,
    ): Promise<boolean> {
        try {
            const prefab = await WZSJZ_Incident.Loadprefab(prefabPath);
            if (!this.node?.isValid) {
                return false;
            }
            const runtime: WZSJZ_CommonEffectRuntime = {
                Prefab: prefab,
                Pool: new NodePool(),
                FallbackDuration: Math.max(0, fallbackDuration),
            };
            while (runtime.Pool.size() < Math.max(0, prewarm)) {
                runtime.Pool.put(instantiate(prefab));
            }
            this._effects.set(effectName, runtime);
            return true;
        } catch (error) {
            console.error(`[WZSJZ] 通用特效预制体加载失败：${effectName}`, error);
            return false;
        }
    }

    private SetupEffectLayer(): void {
        if (!this._canvas) {
            return;
        }
        this._effectLayer = this._canvas.getChildByName("通用特效层");
        if (!this._effectLayer) {
            this._effectLayer = new Node("通用特效层");
            this._effectLayer.layer = this._canvas.layer;
            this._effectLayer.setParent(this._canvas);
            const transform = this._effectLayer.addComponent(UITransform);
            const canvasTransform = this._canvas.getComponent(UITransform);
            if (canvasTransform) {
                transform.setContentSize(canvasTransform.contentSize);
                transform.setAnchorPoint(canvasTransform.anchorPoint);
            }
        }
        this.KeepEffectLayerOnTop();
    }

    private KeepEffectLayerOnTop(): void {
        this._effectLayer?.setSiblingIndex(this._effectLayer.parent.children.length - 1);
        this._dragLayer?.setSiblingIndex(this._dragLayer.parent.children.length - 1);
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }
}
