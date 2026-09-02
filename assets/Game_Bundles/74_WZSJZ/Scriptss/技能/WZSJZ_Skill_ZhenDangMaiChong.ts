import { _decorator, Component, Node, sp, UITransform, Vec3 } from 'cc';
import { WZSJZ_Enemy } from '../WZSJZ_Enemy';

const { ccclass } = _decorator;

/** 震荡脉冲投掷物运行组件；节点的创建与回收由技能系统负责。 */
@ccclass('WZSJZ_Skill_ZhenDangMaiChong')
export class WZSJZ_Skill_ZhenDangMaiChong extends Component {
    private _enemyArea: Node = null;
    private _direction: Vec3 = new Vec3(1, 0, 0);
    private _rangeTransform: UITransform = null;
    private _hitTriggerDelay = 0;
    private _effectDuration = 0;
    private _elapsed = 0;
    private _hasAppliedHit = false;
    private _knockbackDistance = 0;
    private _stunDuration = 0;
    private _bossTenacityDamage = 0;
    private _recycle: (projectile: WZSJZ_Skill_ZhenDangMaiChong) => void = null;
    private _running = false;
    public Initialize(
        enemyArea: Node,
        direction: Vec3,
        hitTriggerDelay: number,
        effectDuration: number,
        knockbackDistance: number,
        stunDuration: number,
        bossTenacityDamage: number,
        animationName: string,
        recycle: (projectile: WZSJZ_Skill_ZhenDangMaiChong) => void,
    ): boolean {
        const rangeTransform = this.node.getChildByName("范围")?.getComponent(UITransform);
        if (!enemyArea?.isValid || !rangeTransform || !recycle) {
            if (!rangeTransform) {
                console.error("[WZSJZ] 技能震荡脉冲特效缺少带UITransform的“范围”节点。");
            }
            return false;
        }
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (length <= 0.0001) {
            return false;
        }
        this._enemyArea = enemyArea;
        this._direction.set(direction.x / length, direction.y / length, 0);
        this._rangeTransform = rangeTransform;
        this._hitTriggerDelay = Math.max(0, hitTriggerDelay);
        this._effectDuration = Math.max(this._hitTriggerDelay, effectDuration);
        this._elapsed = 0;
        this._hasAppliedHit = false;
        this._knockbackDistance = Math.max(0, knockbackDistance);
        this._stunDuration = Math.max(0, stunDuration);
        this._bossTenacityDamage = Math.max(0, bossTenacityDamage);
        this._recycle = recycle;
        this._running = true;
        this.node.active = true;
        const skeleton = this.node.getComponent(sp.Skeleton)
            || this.node.getComponentInChildren(sp.Skeleton);
        if (skeleton && animationName) {
            skeleton.setAnimation(0, animationName, false);
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._running || !this.node?.isValid) {
            return;
        }
        this._elapsed += deltaTime;
        if (!this._hasAppliedHit && this._elapsed >= this._hitTriggerDelay) {
            this._hasAppliedHit = true;
            this.ApplyRangeHit();
        }
        if (this._elapsed >= this._effectDuration) {
            this.Recycle();
        }
    }

    private ApplyRangeHit(): void {
        if (!this._enemyArea?.isValid || !this._rangeTransform?.node?.isValid) {
            return;
        }
        const size = this._rangeTransform.contentSize;
        const anchor = this._rangeTransform.anchorPoint;
        const minX = -size.width * anchor.x;
        const maxX = size.width * (1 - anchor.x);
        const minY = -size.height * anchor.y;
        const maxY = size.height * (1 - anchor.y);
        for (const enemyNode of this._enemyArea.children) {
            const enemy = enemyNode.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) {
                continue;
            }
            const localPosition = this._rangeTransform.convertToNodeSpaceAR(
                enemyNode.worldPosition,
            );
            if (localPosition.x < minX || localPosition.x > maxX
                || localPosition.y < minY || localPosition.y > maxY) {
                continue;
            }
            enemy.ApplyKnockback(this._direction, this._knockbackDistance);
            enemy.ApplyStun(this._stunDuration, this._bossTenacityDamage);
        }
    }

    private Recycle(): void {
        if (!this._running) {
            return;
        }
        this._running = false;
        this._rangeTransform = null;
        const recycle = this._recycle;
        this._recycle = null;
        recycle?.(this);
    }
}
