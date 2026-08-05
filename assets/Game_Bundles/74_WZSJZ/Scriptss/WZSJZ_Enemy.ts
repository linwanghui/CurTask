import { _decorator, Component, sp } from 'cc';
import { WZSJZ_Constant, WZSJZ_EnemyConfig } from './WZSJZ_Constant';
import { WZSJZ_Wall } from './WZSJZ_Wall';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_Enemy')
export class WZSJZ_Enemy extends Component {
    private _wall: WZSJZ_Wall = null;
    private _config: WZSJZ_EnemyConfig = null;
    private _skeleton: sp.Skeleton = null;
    private _currentAnimation: string = "";
    private _attackTimer: number = 0;

    public Initialize(wall: WZSJZ_Wall): boolean {
        this._wall = wall;
        this._config = WZSJZ_Constant.GetEnemyConfig(this.node.name);
        this._skeleton = this.getComponentInChildren(sp.Skeleton);
        if (!this._config || !this._wall) {
            console.error(`[WZSJZ] ${this.node.name} 缺少敌人数值配置或城墙目标。`);
            return false;
        }
        this.PlayAnimation(this._config.MoveAnimation);
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._config || !this._wall?.IsAlive) {
            return;
        }

        const current = this.node.worldPosition;
        const target = this._wall.node.worldPosition;
        const distanceX = Math.abs(current.x - target.x);
        if (distanceX > this._config.AttackRange) {
            this.PlayAnimation(this._config.MoveAnimation);
            const maxMove = this._config.MoveSpeed * deltaTime;
            const moveX = Math.min(maxMove, distanceX - this._config.AttackRange);
            const direction = target.x < current.x ? -1 : 1;
            this.node.setWorldPosition(current.x + direction * moveX, current.y, current.z);
            this._attackTimer = 0;
            return;
        }

        this.PlayAnimation(this._config.AttackAnimation);
        this._attackTimer -= deltaTime;
        if (this._attackTimer <= 0) {
            this._wall.TakeDamage(this._config.AttackDamage);
            this._attackTimer = this._config.AttackInterval;
        }
    }

    private PlayAnimation(animationName: string): void {
        if (!animationName || animationName === this._currentAnimation || !this._skeleton) {
            return;
        }
        this._currentAnimation = animationName;
        this._skeleton.setAnimation(0, animationName, true);
    }
}


