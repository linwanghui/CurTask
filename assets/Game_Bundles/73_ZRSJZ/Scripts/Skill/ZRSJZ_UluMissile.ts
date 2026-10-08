import { _decorator, Component, sp, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';

const { ccclass, property } = _decorator;

/** 世界坐标飞行：短距离直飞 → 快速小角度上转 → 上抛弧线 → 落点爆炸。 */
@ccclass('ZRSJZ_UluMissile')
export class ZRSJZ_UluMissile extends Component {
    @property(sp.Skeleton)
    Missile: sp.Skeleton = null;

    @property(sp.Skeleton)
    Explosion: sp.Skeleton = null;

    @property({ displayName: '初始直飞距离', min: 0 })
    LaunchDistance = 120;

    @property({ displayName: '初始直飞速度', min: 1 })
    LaunchSpeed = 700;

    @property({ displayName: '转弯半径', min: 1 })
    TurnRadius = 45;

    @property({ displayName: '转弯额外上升高度', min: 0 })
    TurnRise = 20;

    @property({ displayName: '快速转弯角度', min: 1, max: 90 })
    TurnAngle = 60;

    @property({ displayName: '快速转弯时间（秒）', min: 0.03 })
    TurnDuration = 0.1;

    @property({ displayName: '弧线飞行时间（秒）', min: 0.1 })
    FlightDuration = 1.2;

    @property({ displayName: '上抛高度', min: 1 })
    ArcHeight = 320;

    @property({ displayName: '导弹朝向修正（度）' })
    AngleOffset = 0;

    @property({ displayName: '结束后回收到对象池' })
    RecycleToPool = true;

    private readonly _start = new Vec3();
    private readonly _direction = new Vec3();
    private readonly _launchEnd = new Vec3();
    private readonly _target = new Vec3();
    private readonly _points = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()];
    private readonly _position = new Vec3();
    private readonly _previous = new Vec3();
    private readonly _forward = new Vec3();
    private readonly _arcLengths = new Float64Array(513);
    private _arcLength = 0;
    private _arcStartRate = 1;
    private _elapsed = 0;
    private _launchTime = 0;
    private _turnTime = 0.1;
    private _turnAngle = 0;
    private _turnRadius = 45;
    private _turnRise = 20;
    private _flightTime = 1;
    private _state: 'idle' | 'flying' | 'exploding' = 'idle';
    private _onExplode: ((position: Vec3) => void) | null = null;
    private _canAdvance: (() => boolean) | null = null;
    private _movementSpeedMultiplier = 1;
    private _getTarget: (() => Vec3) | null = null;

    /**
     * 先设置父节点再调用。三个参数均使用世界坐标系；方向会自动归一化。
     * onExplode 在抵达目标并开始爆炸时触发一次，可由调用者处理伤害。
     * 支持对象池复用，以及飞行途中重新发射。
     */
    public Show(start: Vec3, initialDirection: Vec3, target: Vec3,
        onExplode: ((position: Vec3) => void) | null = null,
        canAdvance: (() => boolean) | null = null, movementSpeedMultiplier: number = 1,
        getTarget: (() => Vec3) | null = null): void {
        this.Missile = this.Missile || this.node.getChildByName('导弹')?.getComponent(sp.Skeleton);
        this.Explosion = this.Explosion || this.node.getChildByName('爆炸')?.getComponent(sp.Skeleton);
        if (!this.Missile || !this.Explosion) {
            throw new Error('技能_乌鲁缺少导弹或爆炸 Spine 节点');
        }
        this.Reset();
        this._start.set(start);
        this._target.set(target);
        this._direction.set(initialDirection.x, initialDirection.y, 0);
        if (this._direction.lengthSqr() < 0.000001) {
            this._direction.set(target.x - start.x, target.y - start.y, 0);
        }
        if (this._direction.lengthSqr() < 0.000001) this._direction.set(1, 0, 0);
        this._direction.normalize();

        const distance = Math.max(0, this.LaunchDistance);
        this._launchTime = distance / Math.max(1, this.LaunchSpeed);
        this._turnTime = Math.max(0.03, this.TurnDuration);
        this._turnAngle = Math.max(1, Math.min(90, this.TurnAngle)) * Math.PI / 180;
        this._turnRadius = Math.max(1, this.TurnRadius);
        this._turnRise = Math.max(0, this.TurnRise);
        this._flightTime = Math.max(0.1, this.FlightDuration);
        const p = this._points;
        Vec3.scaleAndAdd(this._launchEnd, this._start, this._direction, distance);
        this.SampleTurn(1, p[0]);
        // 弧线从转弯后的切线方向接出，避免小角度上转结束后弹头突然转回去。
        const handle = Math.max(1, this.LaunchSpeed) * this._flightTime / 4;
        const angle = this._turnAngle * (this._direction.x >= 0 ? 1 : -1);
        const tangent = new Vec3(this._direction.x * Math.cos(angle) - this._direction.y * Math.sin(angle),
            this._direction.x * Math.sin(angle) + this._direction.y * Math.cos(angle), 0);
        Vec3.scaleAndAdd(p[1], p[0], tangent, handle);
        const height = Math.max(1, this.ArcHeight);
        const top = Math.max(p[0].y, p[1].y, target.y);
        p[2].set((p[0].x + target.x) / 2,
            top + height * 2, (p[0].z + target.z) / 2);
        p[3].set(target.x, Math.max(top, target.y + height * 0.6), target.z);
        p[4].set(target);
        this.BuildArcLengths();
        this._onExplode = onExplode;
        this._canAdvance = canAdvance;
        this._getTarget = getTarget;
        this._movementSpeedMultiplier = Number.isFinite(movementSpeedMultiplier) ? Math.max(0.01, movementSpeedMultiplier) : 1;
        this._state = 'flying';
        this.node.active = true;
        this.node.setWorldPosition(start);
        this.Missile.node.active = true;
        this.Explosion.node.active = false;
        this.Missile.node.setWorldRotationFromEuler(0, 0,
            Math.atan2(this._direction.y, this._direction.x) * 180 / Math.PI + this.AngleOffset);
        this.Missile.setAnimation(0, 'daodan', true);
    }

    protected update(dt: number): void {
        if (this._state !== 'flying' || dt <= 0) return;
        if (this._canAdvance && !this._canAdvance()) return;
        if (this._getTarget) {
            const target = this._getTarget();
            if (!this._target.equals(target)) this._target.set(target);
        }
        // 只缩短直飞、转弯和弧线的用时；路径形状及爆炸动画速度不变。
        this._elapsed += dt * this._movementSpeedMultiplier;
        if (this._elapsed < this._launchTime) {
            Vec3.lerp(this._position, this._start, this._launchEnd, this._elapsed / this._launchTime);
            this._previous.set(0, 0, 0);
            this._forward.set(this._direction);
        } else if (this._elapsed < this._launchTime + this._turnTime) {
            const t = (this._elapsed - this._launchTime) / this._turnTime;
            this.SampleTurn(t, this._position);
            this.SampleTurn(Math.max(0, t - 0.0001), this._previous);
            this.SampleTurn(Math.min(1, t + 0.0001), this._forward);
        } else {
            const t = Math.min(1, (this._elapsed - this._launchTime - this._turnTime) / this._flightTime);
            const curveT = this.GetArcParameter(t);
            this.SampleTrackedArc(curveT, this._position);
            this.SampleTrackedArc(Math.max(0, curveT - 0.0001), this._previous);
            this.SampleTrackedArc(Math.min(1, curveT + 0.0001), this._forward);
        }
        this.node.setWorldPosition(this._position);
        const dx = this._forward.x - this._previous.x;
        const dy = this._forward.y - this._previous.y;
        if (dx * dx + dy * dy > 0.000001) {
            // 仅转动导弹，爆炸始终保持正立。
            this.Missile.node.setWorldRotationFromEuler(0, 0, Math.atan2(dy, dx) * 180 / Math.PI + this.AngleOffset);
        }
        if (this._elapsed >= this._launchTime + this._turnTime + this._flightTime) this.Explode();
    }

    private SampleTurn(t: number, out: Vec3): void {
        // 只走一小段圆弧，左右发射时镜像上转，不再绕完整圆圈。
        const angle = t * this._turnAngle;
        const along = Math.sin(angle) * this._turnRadius;
        const side = (1 - Math.cos(angle)) * this._turnRadius * (this._direction.x >= 0 ? 1 : -1);
        const rise = t * t * (3 - 2 * t) * this._turnRise;
        out.set(this._launchEnd.x + this._direction.x * along - this._direction.y * side,
            this._launchEnd.y + this._direction.y * along + this._direction.x * side + rise,
            this._launchEnd.z);
    }

    private SampleArc(t: number, out: Vec3): void {
        const u = 1 - t;
        const p = this._points;
        const a = u * u * u * u;
        const b = 4 * u * u * u * t;
        const c = 6 * u * u * t * t;
        const d = 4 * u * t * t * t;
        const e = t * t * t * t;
        out.set(a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x + e * p[4].x,
            a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y + e * p[4].y,
            a * p[0].z + b * p[1].z + c * p[2].z + d * p[3].z + e * p[4].z);
    }

    private SampleTrackedArc(t: number, out: Vec3): void {
        this.SampleArc(t, out);
        // 渐进修正弧线末端，保留发射切线和原飞行时长，无需每帧重算弧长表。
        const weight = t * t * (3 - 2 * t);
        const originalTarget = this._points[4];
        out.x += (this._target.x - originalTarget.x) * weight;
        out.y += (this._target.y - originalTarget.y) * weight;
        out.z += (this._target.z - originalTarget.z) * weight;
    }

    private BuildArcLengths(): void {
        this._arcLength = 0;
        this._arcLengths[0] = 0;
        this.SampleArc(0, this._previous);
        for (let i = 1; i < this._arcLengths.length; i++) {
            this.SampleArc(i / (this._arcLengths.length - 1), this._forward);
            this._arcLength += Math.hypot(this._forward.x - this._previous.x,
                this._forward.y - this._previous.y, this._forward.z - this._previous.z);
            this._arcLengths[i] = this._arcLength;
            this._previous.set(this._forward);
        }
        // 弧长参数化消除控制点分布引起的忽快忽慢，起速衔接小转弯末端速度。
        const entrySpeed = this._turnRadius * this._turnAngle / this._turnTime;
        this._flightTime = Math.min(this._flightTime, 2.5 * this._arcLength / entrySpeed);
        this._arcStartRate = entrySpeed * this._flightTime / Math.max(0.0001, this._arcLength);
    }

    private GetArcParameter(t: number): number {
        if (t <= 0 || t >= 1) return t <= 0 ? 0 : 1;
        // 三次 Hermite 距离曲线：平滑过渡到平均速度，终点不提前停顿。
        const progress = t + (this._arcStartRate - 1) * t * (1 - t) * (1 - t);
        const distance = this._arcLength * progress;
        let low = 0, high = this._arcLengths.length - 1;
        while (high - low > 1) {
            const mid = (low + high) >> 1;
            if (this._arcLengths[mid] < distance) low = mid;
            else high = mid;
        }
        const segmentLength = this._arcLengths[high] - this._arcLengths[low];
        const fraction = segmentLength > 0 ? (distance - this._arcLengths[low]) / segmentLength : 0;
        return (low + fraction) / (this._arcLengths.length - 1);
    }

    private Explode(): void {
        if (this._state !== 'flying') return;
        this._state = 'exploding';
        this._getTarget = null;
        this.node.setWorldPosition(this._target);
        this.Missile.node.active = false;
        this.Explosion.node.active = true;
        this.Explosion.node.setWorldRotationFromEuler(0, 0, 0);
        this.Explosion.setCompleteListener(() => this.Finish());
        this.Explosion.setAnimation(0, 'eff', false);
        const callback = this._onExplode;
        this._onExplode = null;
        callback?.(this._target.clone());
    }

    private Finish(): void {
        if (this._state !== 'exploding') return;
        this.Reset();
        if (this.RecycleToPool) ZRSJZ_PoolManager.Instance.PutNode(this.node);
        else this.node.destroy();
    }

    protected onDisable(): void {
        this.Reset();
    }

    private Reset(): void {
        this._state = 'idle';
        this._elapsed = 0;
        this._onExplode = null;
        this.Explosion?.setCompleteListener(null);
        this._canAdvance = null;
        this._getTarget = null;
        this._movementSpeedMultiplier = 1;
    }
}
