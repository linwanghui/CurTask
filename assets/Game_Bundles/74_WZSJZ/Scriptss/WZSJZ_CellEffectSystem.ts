import { _decorator, Component, instantiate, Node, NodePool, Prefab, sp, UITransform } from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Incident } from './WZSJZ_Incident';
const { ccclass } = _decorator;

/** 格子表现域：移动、升级特效的加载、播放和对象池。 */
@ccclass('WZSJZ_CellEffectSystem')
export class WZSJZ_CellEffectSystem extends Component {
    private _canvas: Node = null;
    private _dragLayer: Node = null;
    private _effectLayer: Node = null;
    private _movePrefab: Prefab = null;
    private _upgradePrefab: Prefab = null;
    private _movePool: NodePool = new NodePool();
    private _upgradePool: NodePool = new NodePool();

    protected onDestroy(): void {
        this._movePool.clear();
        this._upgradePool.clear();
    }

    public Configure(canvas: Node, dragLayer: Node): void {
        this._canvas = canvas;
        this._dragLayer = dragLayer;
        this.SetupEffectLayer();
        void this.PrepareEffects();
    }

    public PlayMove(cell: WZSJZ_Cell): void {
        this.PlayEffect(
            cell,
            this._movePrefab,
            this._movePool,
            WZSJZ_Constant.CellEffect.MoveFallbackDuration,
        );
    }

    public PlayUpgrade(cell: WZSJZ_Cell): void {
        this.PlayEffect(
            cell,
            this._upgradePrefab,
            this._upgradePool,
            WZSJZ_Constant.CellEffect.UpgradeFallbackDuration,
        );
    }

    private async PrepareEffects(): Promise<void> {
        try {
            [this._movePrefab, this._upgradePrefab] = await Promise.all([
                WZSJZ_Incident.Loadprefab(WZSJZ_Constant.CellEffect.MovePrefabPath),
                WZSJZ_Incident.Loadprefab(WZSJZ_Constant.CellEffect.UpgradePrefabPath),
            ]);
        } catch (error) {
            console.error("[WZSJZ] 格子移动/升级特效加载失败。", error);
            return;
        }
        if (!this.node?.isValid) {
            return;
        }
        while (this._movePool.size() < WZSJZ_Constant.ObjectPool.CellMoveEffectPrewarm) {
            this._movePool.put(instantiate(this._movePrefab));
        }
        while (this._upgradePool.size() < WZSJZ_Constant.ObjectPool.CellUpgradeEffectPrewarm) {
            this._upgradePool.put(instantiate(this._upgradePrefab));
        }
    }

    private PlayEffect(
        cell: WZSJZ_Cell,
        prefab: Prefab,
        pool: NodePool,
        fallbackDuration: number,
    ): void {
        if (!cell?.node?.isValid || !prefab || !this._effectLayer) {
            return;
        }
        const effectNode = pool.get() || instantiate(prefab);
        effectNode.active = true;
        effectNode.setParent(this._effectLayer);
        effectNode.setWorldPosition(cell.node.worldPosition);
        effectNode.angle = 0;
        this.SetLayerRecursively(effectNode, this._effectLayer.layer);
        const skeleton = effectNode.getComponent(sp.Skeleton)
            || effectNode.getComponentInChildren(sp.Skeleton);
        skeleton?.setAnimation(0, WZSJZ_Constant.CellEffect.AnimationName, false);
        const duration = skeleton
            ?.findAnimation(WZSJZ_Constant.CellEffect.AnimationName)
            ?.duration || fallbackDuration;
        this.scheduleOnce(() => {
            if (effectNode.isValid) {
                pool.put(effectNode);
            }
        }, duration);
        this.KeepLayerAboveUnits();
    }

    private SetupEffectLayer(): void {
        if (!this._canvas) {
            return;
        }
        this._effectLayer = this._canvas.getChildByName("格子特效层");
        if (!this._effectLayer) {
            this._effectLayer = new Node("格子特效层");
            this._effectLayer.layer = this._canvas.layer;
            this._effectLayer.setParent(this._canvas);
            const transform = this._effectLayer.addComponent(UITransform);
            const canvasTransform = this._canvas.getComponent(UITransform);
            if (canvasTransform) {
                transform.setContentSize(canvasTransform.contentSize);
                transform.setAnchorPoint(canvasTransform.anchorPoint);
            }
        }
        this.KeepLayerAboveUnits();
    }

    private KeepLayerAboveUnits(): void {
        if (this._effectLayer?.parent) {
            this._effectLayer.setSiblingIndex(this._effectLayer.parent.children.length - 1);
        }
        if (this._dragLayer?.parent) {
            this._dragLayer.setSiblingIndex(this._dragLayer.parent.children.length - 1);
        }
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }
}
