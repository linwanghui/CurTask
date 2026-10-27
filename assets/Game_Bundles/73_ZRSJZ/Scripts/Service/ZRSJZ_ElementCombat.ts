export type ZRSJZ_Element = '冰' | '火' | '毒';
export interface ZRSJZ_ElementShot {
    weapon: string;
    source: string;
    attack: number;
}

/** 每发子弹保存独立快照；元素只由三把专属武器决定。 */
export function ZRSJZ_GetElement(weapon: string): ZRSJZ_Element | null {
    return weapon === '冰霜裁决' ? '冰' : weapon === '烈焰破军' ? '火' : weapon === '蚀骨毒牙' ? '毒' : null;
}
export function ZRSJZ_ElementBulletPath(weapon: string): string {
    return ZRSJZ_GetElement(weapon) ? '73_ZRSJZ_DLC/Prefabs/Unit/元素子弹' : 'Prefabs/Unit/PlayerBullet';
}
export function ZRSJZ_CopyElementShot(shot: ZRSJZ_ElementShot): ZRSJZ_ElementShot | null {
    if (!shot || !ZRSJZ_GetElement(shot.weapon) || typeof shot.source !== 'string'
        || !shot.source || !Number.isFinite(shot.attack) || shot.attack <= 0) return null;
    return { weapon: shot.weapon, source: shot.source, attack: shot.attack };
}

interface FireStack { stacks: number; until: number }
interface PoisonStack { stacks: number; until: number; next: number; attack: number }

/** 敌人局部战斗时钟：不使用真实时间或逐层定时器，暂停不消耗状态。 */
export class ZRSJZ_ElementState {
    public time = 0;
    public cold = 0;
    public coldUntil = 0;
    public frozenUntil = 0;
    public immuneUntil = 0;
    public readonly fire = new Map<string, FireStack>();
    public readonly poison = new Map<string, PoisonStack>();
    public get frozen(): boolean { return this.frozenUntil > this.time; }
    public get fireStacks(): number { return Math.max(0, ...Array.from(this.fire.values(), s => s.stacks)); }
    public get poisonStacks(): number { return Array.from(this.poison.values()).reduce((n, s) => n + s.stacks, 0); }
    public slow(boss: boolean): number { return Math.min(boss ? .15 : .30, this.cold * .06); }
    public armorShred(): number { return this.fireStacks * .02; }
    public growth(source: string): number { return (this.fire.get(source)?.stacks ?? 0) * .025; }

    /** 必须先扣本次枪伤，再调用 hit；死亡目标不调用。返回是否刚触发冻结。 */
    public hit(shot: ZRSJZ_ElementShot, boss: boolean, elite: boolean): boolean {
        const element = ZRSJZ_GetElement(shot.weapon);
        if (element === '冰') {
            if (this.frozen) return false;
            if (this.cold && this.time >= this.coldUntil) this.cold = 0;
            if (this.cold >= 5 && !boss && this.time >= this.immuneUntil) {
                this.cold = 0; this.coldUntil = 0;
                this.frozenUntil = this.time + (elite ? .4 : .8);
                this.immuneUntil = this.frozenUntil + 3;
                return true;
            }
            this.cold = Math.min(5, this.cold + 1);
            this.coldUntil = this.time + 2;
        } else if (element === '火') {
            const old = this.fire.get(shot.source);
            this.fire.set(shot.source, { stacks: Math.min(20, (old?.stacks ?? 0) + 1), until: this.time + 3 });
        } else if (element === '毒') {
            const old = this.poison.get(shot.source);
            this.poison.set(shot.source, { stacks: Math.min(50, (old?.stacks ?? 0) + 1),
                until: this.time + 4, next: old?.next ?? this.time + .25, attack: shot.attack });
        }
        return false;
    }

    public advance(dt: number, damage: (amount: number) => void): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        this.time += dt;
        if (this.cold && this.time + 1e-8 >= this.coldUntil) { this.cold = 0; this.coldUntil = 0; }
        for (const [source, state] of this.fire) if (this.time + 1e-8 >= state.until) this.fire.delete(source);
        // 先补齐所有应发生的跳伤，再清除到期毒素。大 dt 也不会漏跳。
        for (const [source, state] of this.poison) {
            while (state.next <= Math.min(this.time, state.until) + 1e-8) {
                state.next += .25;
                damage(state.attack * .02 * state.stacks);
                if (!this.poison.has(source)) break; // 致死清理期间停止本组后续跳伤。
            }
            if (this.time + 1e-8 >= state.until) this.poison.delete(source);
        }
    }
    public clear(): void {
        this.time = this.cold = this.coldUntil = this.frozenUntil = this.immuneUntil = 0;
        this.fire.clear(); this.poison.clear();
    }
}
