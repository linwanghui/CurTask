import { ZRSJZ_BATTLE_PASS_CONFIG as Config } from '../ZRSJZ_BattlePassConfig';

/** 仅控制显示值，经验入账和领取判定始终使用存档中的真实值。 */
export class ZRSJZ_BattlePassProgress {
    private value = -1;
    private target = 0;
    private start = 0;
    private end = 0;
    private elapsed = 0;
    private hold = 0;
    public SetTarget(exp: number): void {
        this.target = Math.max(0, Math.min(Config.maxLevel * Config.expPerLevel, exp));
        if (this.value < 0 || this.target < this.value) {
            this.value = this.start = this.end = this.target;
            this.elapsed = this.hold = 0;
        }
    }
    public Advance(dt: number): { level: number; exp: number; fill: number } {
        dt = Math.max(0, Math.min(dt, 0.1));
        if (this.hold > 0) this.hold = Math.max(0, this.hold - dt);
        else if (this.value < this.target) {
            if (this.value >= this.end) {
                this.start = this.value;
                this.end = Math.min(this.target, (Math.floor(this.value / Config.expPerLevel) + 1) * Config.expPerLevel);
                this.elapsed = 0;
            }
            this.elapsed += dt;
            const t = Math.min(1, this.elapsed / Config.progressAnimationSeconds);
            this.value = this.start + (this.end - this.start) * (1 - (1 - t) ** 3);
            if (t === 1 && this.end % Config.expPerLevel === 0) this.hold = 0.12;
        }
        const max = this.value >= Config.maxLevel * Config.expPerLevel;
        const boundary = !max && this.hold > 0 && this.value > 0 && this.value % Config.expPerLevel === 0;
        const level = Math.min(Config.maxLevel, Math.floor(this.value / Config.expPerLevel) - (boundary ? 1 : 0));
        const exp = max || boundary ? Config.expPerLevel : Math.floor(this.value % Config.expPerLevel);
        return { level, exp, fill: max || boundary ? 1 : (this.value % Config.expPerLevel) / Config.expPerLevel };
    }
}
