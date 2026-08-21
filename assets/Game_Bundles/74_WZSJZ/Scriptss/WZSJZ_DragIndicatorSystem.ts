import { _decorator, Color, Component, Node, Sprite, SpriteFrame, UITransform, Vec2, Vec3 } from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_Incident } from './WZSJZ_Incident';

const { ccclass } = _decorator;

/** 绘制拖拽起点、虚线路径、有效落点以及落点处的攻击范围预览。 */
@ccclass('WZSJZ_DragIndicatorSystem')
export class WZSJZ_DragIndicatorSystem extends Component {
    private _layer: Node = null;
    private _root: Node = null;
    private _origin: Node = null;
    private _target: Node = null;
    private _attackRange: Node = null;
    private _dashNodes: Node[] = [];
    private _draggingNode: WZSJZ_GameNode = null;
    private _isSkillTargeting: boolean = false;
    private _sourceWorldPosition: Vec3 = new Vec3();
    private _originSprite: SpriteFrame = null;
    private _dashSprite: SpriteFrame = null;
    private _targetSprite: SpriteFrame = null;
    private _rangeSprite: SpriteFrame = null;

    public Configure(layer: Node): void {
        this._layer = layer;
        void this.LoadSprites();
    }

    public Begin(gameNode: WZSJZ_GameNode): void {
        if (!gameNode?.CurrentCell || !this._layer) return;
        this.Clear();
        this._draggingNode = gameNode;
        this._sourceWorldPosition.set(gameNode.CurrentCell.node.worldPosition);
        this.EnsureNodes();
        this._root.active = true;
        this._origin.setWorldPosition(this._sourceWorldPosition);
        this._origin.active = true;
        this._attackRange.getComponent(Sprite).color = Color.WHITE;
    }

    public Update(uiPosition: Vec2, targetCell: WZSJZ_Cell): void {
        if (!this._draggingNode || !this._root) return;
        const endWorld = targetCell
            ? targetCell.node.worldPosition
            : new Vec3(uiPosition.x, uiPosition.y, this._sourceWorldPosition.z);
        this.RefreshDashes(this._sourceWorldPosition, endWorld);
        this._target.active = !!targetCell;
        if (targetCell) this._target.setWorldPosition(endWorld);
        this.RefreshAttackRange(targetCell, endWorld);
    }

    public Clear(): void {
        this._draggingNode = null;
        this._isSkillTargeting = false;
        if (this._root?.isValid) this._root.active = false;
    }

    /** 技能按钮拖拽瞄准：复用路径虚线，在落点显示指定半径的红色范围。 */
    public BeginSkill(sourceWorldPosition: Vec3, radius: number): void {
        if (!this._layer || radius <= 0) return;
        this.Clear();
        this._isSkillTargeting = true;
        this._sourceWorldPosition.set(sourceWorldPosition);
        this.EnsureNodes();
        this._root.active = true;
        this._origin.setWorldPosition(this._sourceWorldPosition);
        // 技能拖拽只显示路径和落点范围，按钮本身不显示单位拖拽用的起点圆环。
        this._origin.active = false;
        this._target.active = false;
        this._attackRange.getComponent(UITransform).setContentSize(radius * 2, radius * 2);
        const color = WZSJZ_Constant.DragIndicator.SkillRangeColor;
        this._attackRange.getComponent(Sprite).color = new Color(
            color.R,
            color.G,
            color.B,
            color.A,
        );
        this._attackRange.active = true;
        this._root.setSiblingIndex(this._layer.children.length - 1);
    }

    public UpdateSkill(uiPosition: Vec2): void {
        if (!this._isSkillTargeting || !this._root) return;
        const endWorld = new Vec3(
            uiPosition.x,
            uiPosition.y,
            this._sourceWorldPosition.z,
        );
        this.RefreshDashes(this._sourceWorldPosition, endWorld);
        this._attackRange.setWorldPosition(endWorld);
        this._attackRange.active = true;
    }

    private async LoadSprites(): Promise<void> {
        const config = WZSJZ_Constant.DragIndicator;
        const [origin, dash, target, range] = await Promise.all([
            WZSJZ_Incident.LoadSprite(config.OriginSpritePath),
            WZSJZ_Incident.LoadSprite(config.DashSpritePath),
            WZSJZ_Incident.LoadSprite(config.TargetSpritePath),
            WZSJZ_Incident.LoadSprite(config.AttackRangeSpritePath),
        ]) as SpriteFrame[];
        this._originSprite = origin;
        this._dashSprite = dash;
        this._targetSprite = target;
        this._rangeSprite = range;
        if (this._root?.isValid) this.ApplySprites();
    }

    private EnsureNodes(): void {
        if (this._root?.isValid) {
            this.ApplySprites();
            return;
        }
        this._root = new Node('拖拽落点提示');
        this._root.layer = this._layer.layer;
        this._root.setParent(this._layer);
        // 提示根节点放在拖拽物体下面；拖拽物体始终在BeginDrag最后重新置顶。
        this._root.setSiblingIndex(Math.max(0, this._layer.children.length - 1));
        this._attackRange = this.CreateSpriteNode('落点攻击范围', 1, 1);
        this._origin = this.CreateSpriteNode('拖拽起点', WZSJZ_Constant.DragIndicator.OriginSize, WZSJZ_Constant.DragIndicator.OriginSize);
        this._target = this.CreateSpriteNode('拖拽目的地', WZSJZ_Constant.DragIndicator.TargetSize, WZSJZ_Constant.DragIndicator.TargetSize);
        this.ApplySprites();
    }

    private CreateSpriteNode(name: string, width: number, height: number): Node {
        const node = new Node(name);
        node.layer = this._layer.layer;
        node.setParent(this._root);
        node.addComponent(UITransform).setContentSize(width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        return node;
    }

    private ApplySprites(): void {
        if (this._origin) this._origin.getComponent(Sprite).spriteFrame = this._originSprite;
        if (this._target) this._target.getComponent(Sprite).spriteFrame = this._targetSprite;
        if (this._attackRange) this._attackRange.getComponent(Sprite).spriteFrame = this._rangeSprite;
        for (const dash of this._dashNodes) dash.getComponent(Sprite).spriteFrame = this._dashSprite;
    }

    private RefreshDashes(start: Vec3, end: Vec3): void {
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const config = WZSJZ_Constant.DragIndicator;
        const count = Math.min(config.MaxDashCount, Math.max(0, Math.floor(distance / config.DashSpacing) - 1));
        while (this._dashNodes.length < count) {
            const dash = this.CreateSpriteNode('路径虚线', config.DashWidth, config.DashHeight);
            dash.getComponent(Sprite).spriteFrame = this._dashSprite;
            this._dashNodes.push(dash);
        }
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI - 90;
        for (let index = 0; index < this._dashNodes.length; index++) {
            const dash = this._dashNodes[index];
            dash.active = index < count;
            if (!dash.active) continue;
            const progress = (index + 1) / (count + 1);
            dash.setWorldPosition(
                start.x + deltaX * progress,
                start.y + deltaY * progress,
                start.z,
            );
            dash.angle = angle;
        }
    }

    private RefreshAttackRange(targetCell: WZSJZ_Cell, endWorld: Vec3): void {
        const levelConfig = this._draggingNode
            ? WZSJZ_Constant.GetMaterialLevelConfig(this._draggingNode.Name, this._draggingNode.Level)
            : null;
        const attackRange = levelConfig?.AttackRange || 0;
        if (!targetCell || targetCell.Zone !== 'formation' || attackRange <= 0) {
            this._attackRange.active = false;
            return;
        }
        const radius = Math.min(attackRange, WZSJZ_Constant.DragIndicator.MaxDisplayedAttackRange);
        this._attackRange.getComponent(UITransform).setContentSize(radius * 2, radius * 2);
        this._attackRange.setWorldPosition(endWorld);
        this._attackRange.active = true;
    }
}
