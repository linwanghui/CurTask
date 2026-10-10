import { ZRSJZ_FISHING_CONFIG } from '../ZRSJZ_Constant';

/** 归一化进度；点击收杆产生一次拉扯，长按不重复。 */
export class ZRSJZ_FishingRound {
    Pointer = 0.5;
    Progress = ZRSJZ_FISHING_CONFIG.InitialProgress;
    WindowWidth: number;
    WindowStart: number;
    Result: 'playing' | 'success' | 'escaped' = 'playing';
    private _elapsed = 0;

    constructor(random: () => number = Math.random) {
        const config = ZRSJZ_FISHING_CONFIG;
        this.WindowWidth = config.MinWidth + random() * (config.MaxWidth - config.MinWidth);
        // 每次抛竿在进度底左半边随机生成有效区，本轮保持固定。
        this.WindowStart = random() * (0.5 - this.WindowWidth);
    }

    Pull(): void {
        if (this.Result !== 'playing') return;
        this.Pointer = Math.max(0, this.Pointer - ZRSJZ_FISHING_CONFIG.ClickPull);
    }

    Update(dt: number): void {
        if (this.Result !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
        // 小步积分，避免帧率影响窄有效区的收益与脱钩判定。
        let remaining = Math.min(dt, 0.25);
        while (remaining > 0 && this.Result === 'playing') {
            const step = Math.min(remaining, 1 / 120);
            remaining -= step;
            this.Pointer = Math.min(1, this.Pointer + ZRSJZ_FISHING_CONFIG.FishPullSpeed * step);
            const inside = this.Pointer >= this.WindowStart && this.Pointer <= this.WindowStart + this.WindowWidth;
            const config = ZRSJZ_FISHING_CONFIG;
            const rate = this._elapsed < config.WarmupSeconds ? config.WarmupProgressRate : 1;
            this._elapsed += step;
            this.Progress = Math.max(0, Math.min(1, this.Progress + step * rate * (inside
                ? config.GainPerSecond : -config.LossPerSecond)));
            if (this.Progress >= 1) this.Result = 'success';
            else if (this.Progress <= 0) this.Result = 'escaped';
        }
    }
}
