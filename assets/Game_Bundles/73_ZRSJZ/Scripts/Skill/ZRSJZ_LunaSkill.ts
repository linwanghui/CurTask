import { _decorator, Component, director, isValid, sp, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_EnemyBase } from '../Controller/ZRSJZ_EnemyBase';
import { ZRSJZ_EnhancementService } from '../Service/ZRSJZ_EnhancementService';
import { ZRSJZ_BoosterShotService } from '../Service/ZRSJZ_BoosterShotService';

const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_LunaSkill')
export class ZRSJZ_LunaSkill extends Component {
    @property({ displayName: '向前释放距离', min: 0 })
    ForwardDistance = 350;
    @property({ displayName: '吸引与伤害范围', min: 0 })
    Radius = 400;
    @property({ displayName: '拉扯速度（每秒）', min: 0 })
    PullSpeed = 600;
    @property({ displayName: '伤害间隔（秒）', min: 0.05 })
    DamageInterval = 0.3;
    @property({ displayName: '每次基础伤害', min: 0 })
    TickDamage = 5;

    private _game: ZRSJZ_Game = null;
    private _spine: sp.Skeleton = null;
    private _elapsed = 0;
    private _damageElapsed = 0;
    private _damage = 0;
    private _duration = 0;
    private _animationSpeed = 1;
    private _completed = false;

    public Show(origin: Vec3, direction: Vec3, targetCenter: Vec3 = null): void {
        this._game = ZRSJZ_Game.Instance;
        const forward = new Vec3(direction.x, direction.y, 0);
        if (forward.lengthSqr() < 0.000001) forward.set(1, 0, 0);
        forward.normalize();
        this.node.setWorldPosition(targetCenter ?? Vec3.scaleAndAdd(new Vec3(), origin, forward, Math.max(0, this.ForwardDistance)));
        this._spine = this.getComponentInChildren(sp.Skeleton);
        const animation = this._spine?.findAnimation('action');
        if (!animation || animation.duration <= 0) throw new Error('技能_露娜缺少龙卷风 action 动画');
        this._duration = animation.duration;
        this._animationSpeed = Math.max(0.01, this._spine.timeScale);
        this._completed = false;
        this._spine.setCompleteListener(() => { this._completed = true; });
        this._spine.setAnimation(0, 'action', false);
        this._elapsed = this._damageElapsed = 0;
        this._damage = ZRSJZ_EnhancementService.GetSkillDamage(Math.max(0, this.TickDamage)
            * (1 + ZRSJZ_BoosterShotService.GetBooster('攻击针')));
    }

    protected update(dt: number): void {
        if (!this._game) return;
        if (!isValid(this._game, true) || ZRSJZ_Game.Instance !== this._game
            || !this._game.node.activeInHierarchy || this._game.IsGameFinished) {
            this._game = null;
            this.node.destroy();
            return;
        }
        this._spine.timeScale = this._game.GamePaused ? 0 : this._animationSpeed;
    }

    protected lateUpdate(): void {
        if (!this._game || this._game.GamePaused || this._game.IsGameFinished) return;
        // 以 Spine 实际播放进度结算，暂停或修改动画速度时效果仍与动画同步。
        const track = this._spine.getCurrent(0);
        if (!track) return;
        const duration = this._duration;
        const time = this._completed ? duration : Math.min(duration, track.trackTime);
        const step = Math.max(0, time - this._elapsed);
        if (step <= 0) return;
        this._elapsed += step;
        this._damageElapsed += step;
        const interval = Math.max(0.05, this.DamageInterval);
        const ticks = Math.floor((this._damageElapsed + 1e-8) / interval);
        this._damageElapsed = Math.max(0, this._damageElapsed - ticks * interval);
        const center = this.node.worldPosition;
        const inRange = (point: Vec3) => Math.hypot(point.x - center.x, point.y - center.y) <= Math.max(0, this.Radius);
        for (const enemy of director.getScene()?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? []) {
            if (!isValid(enemy, true) || !enemy.node.activeInHierarchy || enemy.IsDead) continue;
            if (!inRange(enemy.node.worldPosition) && !(isValid(enemy.Other, true) && inRange(enemy.Other.worldPosition))) continue;
            // 复用已有拉扯接口，保留墙体阻挡和联机处理。
            enemy.ApplyPetPull(center, Math.max(0, this.PullSpeed) * step);
            for (let i = 0; i < ticks && isValid(enemy, true) && !enemy.IsDead; i++) {
                if (this._damage > 0) enemy.BeHit(this._damage);
            }
        }
        if (this._elapsed >= duration - 1e-8) {
            this._game = null;
            this.node.destroy();
        }
    }

    protected onDisable(): void {
        this._spine?.setCompleteListener(null);
        this._game = null;
    }
}
