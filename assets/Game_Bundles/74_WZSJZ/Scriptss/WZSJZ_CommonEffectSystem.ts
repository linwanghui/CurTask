import { _decorator, Animation, Component, instantiate, Node, NodePool, Prefab, UITransform, Vec3 } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Incident } from './WZSJZ_Incident';

const { ccclass } = _decorator;

export type WZSJZ_CommonEffectName = "蓝色爆炸";

interface WZSJZ_CommonEffectRuntime {
    Prefab: Prefab;
    Pool: NodePool;
    FallbackDuration: number;
}

/** 通用一次性特效入口，负责动态加载、播放完成回池以及层级维护。 */
@ccclass('WZSJZ_CommonEffectSystem')
export class WZSJZ_CommonEffectSystem extends Component {
    private static _instance: WZSJZ_CommonEffectSystem = null;
    public static get Instance(): WZSJZ_CommonEffectSystem {
        return this._instance;
    }

    private _canvas: Node = null;
    private _dragLayer: Node = null;
    private _effectLayer: Node = null;
    private _effects: Map<WZSJZ_CommonEffectName, WZSJZ_CommonEffectRuntime> = new Map();

    protected onLoad(): void {
        WZSJZ_CommonEffectSystem._instance = this;
    }

    protected onDestroy(): void {
        for (const runtime of this._effects.values()) {
            runtime.Pool.clear();
        }
        this._effects.clear();
        if (WZSJZ_CommonEffectSystem._instance === this) {
            WZSJZ_CommonEffectSystem._instance = null;
        }
    }

    public Configure(canvas: Node, dragLayer: Node): void {
        this._canvas = canvas;
        this._dragLayer = dragLayer;
        this.SetupEffectLayer();
        void this.PrepareBlueExplosion();
    }

    public PlayBlueExplosion(worldPosition: Vec3): boolean {
        return this.Play("蓝色爆炸", worldPosition);
    }

    public Play(effectName: WZSJZ_CommonEffectName, worldPosition: Vec3): boolean {
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
        const duration = animation?.defaultClip?.duration || runtime.FallbackDuration;
        this.scheduleOnce(() => {
            if (effectNode?.isValid) {
                animation?.stop();
                runtime.Pool.put(effectNode);
            }
        }, duration);
        this.KeepEffectLayerOnTop();
        return true;
    }

    private async PrepareBlueExplosion(): Promise<void> {
        const config = WZSJZ_Constant.CommonEffect.BlueExplosion;
        try {
            const prefab = await WZSJZ_Incident.Loadprefab(config.PrefabPath);
            if (!this.node?.isValid) {
                return;
            }
            const runtime: WZSJZ_CommonEffectRuntime = {
                Prefab: prefab,
                Pool: new NodePool(),
                FallbackDuration: config.FallbackDuration,
            };
            while (runtime.Pool.size() < WZSJZ_Constant.ObjectPool.BlueExplosionPrewarm) {
                runtime.Pool.put(instantiate(prefab));
            }
            this._effects.set("蓝色爆炸", runtime);
        } catch (error) {
            console.error("[WZSJZ] 蓝色爆炸特效预制体加载失败。", error);
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
