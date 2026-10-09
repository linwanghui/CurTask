import { _decorator, Button, Color, EventTouch, find, Label, Node, Sprite, Tween, tween, UITransform, v3 } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_EventManager';
import { MATRIX_CONFIG, ZRSJZ_MatrixService as Matrix } from '../Service/ZRSJZ_MatrixService';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_MatrixPanel')
export class ZRSJZ_MatrixPanel extends ZRSJZ_Panel {
    private page = '算力中心';
    private day = 0;
    private clock = 0;
    private busy = false;
    private installSlot = -1;
    private selectedCandle = 13;
    private screenSize = '';
    public get CanClose(): boolean { return !this.busy; }
    private N(path: string): Node { return find(path, this.Panel); }
    private Text(path: string, value: string): void { this.N(path).getComponent(Label).string = value; }
    Show(): void {
        Matrix.Settle();
        this.PlayerIndex = -1;
        this.Panel = find('Panel', this.node);
        Tween.stopAllByTarget(this.Panel);
        this.node.active = true;
        this.FitScreen();
        this.N('装卡确认').active = false;
        this.Switch('算力中心', false);
        this.Refresh();
    }
    private FitScreen(): void {
        const size = this.node.getComponent(UITransform).contentSize;
        if (!size.width || !size.height) return;
        this.screenSize = `${size.width}/${size.height}`;
        const scale = Math.min(size.width / 1280, size.height / 720);
        this.Panel.setScale(scale, scale, 1);
        const bg = this.node.getChildByName('Mask');
        const cover = Math.max(size.width / 1280, size.height / 720);
        bg.getComponent(UITransform).setContentSize(1280 * cover, 720 * cover);
        const back = this.node.getChildByName('返回');
        back.setScale(scale, scale, 1);
        back.setPosition(-size.width / 2 + 145 * scale, size.height / 2 - 48 * scale, 0);
    }
    private Switch(page: string, animate = true): void {
        this.page = page;
        this.N('算力中心').active = page === '算力中心';
        this.N('货币市场').active = page === '货币市场';
        const mark = this.N('左侧/选中');
        const target = this.N('左侧/' + page).position;
        Tween.stopAllByTarget(mark);
        if (animate) tween(mark).to(0.18, { position: v3(target.x, target.y, 0) }, { easing: 'quadOut' }).start();
        else mark.setPosition(target);
        for (const name of ['算力中心', '货币市场'])
            this.N('左侧/' + name + '/文字').getComponent(Label).color = name === page
                ? new Color(255, 224, 95) : new Color(187, 217, 230);
    }
    protected update(dt: number): void {
        if (!this.Panel || !this.node.activeInHierarchy) return;
        const size = this.node.getComponent(UITransform).contentSize;
        if (this.screenSize !== `${size.width}/${size.height}`) this.FitScreen();
        this.clock += dt;
        if (this.clock < 0.5) return;
        this.clock = 0;
        if (this.day !== Matrix.Day()) { Matrix.Settle(); this.Refresh(); }
        else this.RefreshMining();
    }
    private RefreshMining(): void {
        const view = Matrix.Preview();
        const hours = Math.floor(view.seconds / 3600), minutes = Math.floor(view.seconds % 3600 / 60);
        const seconds = view.seconds % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        this.Text('算力中心/倒计时', `下枚产出  ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        this.Text('算力中心/待领取', `待领取  ${view.pending} 枚`);
        this.N('算力中心/产出进度/进度').getComponent(Sprite).fillRange = view.progress;
        this.N('算力中心/领取/文字').getComponent(Label).string = view.pending > 0 ? '领取产出' : '生产中';
    }
    private Refresh(): void {
        const s = Matrix.State;
        this.day = Matrix.Day();
        this.Text('余额', `加密货币  ${s.coins} 枚    |    货币  ${ZRSJZ_GameData.Instance.Gold.toLocaleString()}`);
        this.Text('算力中心/显卡数量', `已装显卡  ${s.cards} / ${MATRIX_CONFIG.maxCards}`);
        this.Text('算力中心/周期', `${Matrix.Hours()} 小时 / 枚`);
        this.Text('算力中心/仓库数量', `仓库可用显卡：${Matrix.CardsAvailable()} 张`);
        for (let i = 0; i < MATRIX_CONFIG.maxCards; i++) {
            const slot = this.N(`算力中心/显卡槽/槽${i + 1}`);
            slot.getChildByName('已装').active = s.slots[i];
            slot.getChildByName('空槽').active = !s.slots[i];
        }
        this.Text('算力中心/安装/文字', s.cards >= MATRIX_CONFIG.maxCards ? '显卡已装满' : '放置显卡');
        const price = Matrix.Price(this.day), yesterday = Matrix.Price(this.day - 1);
        this.Text('货币市场/今日价格', `今日价格  ${price.toLocaleString()}`);
        const change = (price - yesterday) / yesterday * 100;
        this.Text('货币市场/涨跌', `较昨日 ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
        this.N('货币市场/涨跌').getComponent(Label).color = change >= 0 ? new Color(255, 104, 97) : new Color(76, 227, 170);
        this.Text('货币市场/次数', `今日可买 ${Math.max(0, MATRIX_CONFIG.dailyBuyLimit - s.purchased)} / 5 枚 · 每日零点更新`);
        this.Text('货币市场/持有', `持有 ${s.coins} 枚 · 买卖同价 · 出售不限次数`);
        this.Text('货币市场/日期', new Date().toLocaleDateString());
        this.DrawChart();
        this.RefreshMining();
    }
    private DrawChart(): void {
        const history = Matrix.History(this.day);
        const low = Math.floor(Math.min(...history.map(c => c.low)) / 10000) * 10000;
        const high = Math.ceil(Math.max(...history.map(c => c.high)) / 10000) * 10000;
        const height = 180, width = 680;
        const y = (price: number) => (price - low) / Math.max(1, high - low) * height;
        for (let i = 0; i <= 3; i++) {
            this.Text('货币市场/刻度' + i, ((low + (high - low) * i / 3) / 10000).toFixed(1) + '万');
        }
        history.forEach((c, i) => {
            const x = (i + 0.5) * width / history.length;
            const color = c.close >= c.open ? new Color(255, 104, 97) : new Color(76, 227, 170);
            const candle = this.N(`货币市场/K线/蜡烛${i}`);
            candle.setPosition(x, height / 2, 0);
            const body = candle.getChildByName('实体'), wick = candle.getChildByName('影线');
            body.setPosition(0, (y(c.open) + y(c.close)) / 2 - height / 2, 0);
            body.getComponent(UITransform).setContentSize(24, Math.max(3, Math.abs(y(c.close) - y(c.open))));
            wick.setPosition(0, (y(c.low) + y(c.high)) / 2 - height / 2, 0);
            wick.getComponent(UITransform).setContentSize(3, Math.max(3, y(c.high) - y(c.low)));
            body.getComponent(Sprite).color = color; wick.getComponent(Sprite).color = color;
            candle.getChildByName('选中').active = i === this.selectedCandle;
            const d = new Date(c.day * 86400000);
            this.Text(`货币市场/日期${i}`, `${d.getUTCMonth() + 1}/${d.getUTCDate()}`);
        });
        const c = history[this.selectedCandle], d = new Date(c.day * 86400000);
        this.Text('货币市场/行情明细', `${d.getUTCMonth()+1}/${d.getUTCDate()}  开 ${c.open.toLocaleString()}  高 ${c.high.toLocaleString()}  低 ${c.low.toLocaleString()}  收 ${c.close.toLocaleString()}`);
    }
    public async OnButtonClick(event: EventTouch): Promise<void> {
        if (this.busy) return;
        const name = event.getCurrentTarget().name;
        ZRSJZ_AudioManager.Instance?.PlaySound('点击');
        const ui = ZRSJZ_UIManager.Instance;
        if (/^蜡烛\d+$/.test(name)) {
            this.selectedCandle = Math.min(13, Number(name.slice(2))); this.DrawChart(); return;
        }
        if (/^槽\d+$/.test(name)) {
            const slot = Number(name.slice(1)) - 1;
            if (!Matrix.State.slots[slot]) {
                if (!Matrix.CardsAvailable()) ui.ShowTip('仓库显卡不足');
                else { this.installSlot = slot; this.N('装卡确认').active = true; }
            } else {
                this.busy = true;
                try {
                    const result = Matrix.Remove(slot);
                    if (result.error) ui.ShowTip(result.error);
                    else {
                        const mail = await ui.ReceiveExistingProps([result.id]);
                        ZRSJZ_GameData.SaveData();
                        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
                        ui.ShowTip(mail.length ? '显卡已取下，仓库已满，已通过邮件返还' : '显卡已取下并返还仓库');
                    }
                } catch (error) {
                    console.error('[超算矩阵] 显卡返还布局失败', error);
                    ui.ShowTip('显卡已保存，请重新打开仓库检查');
                } finally { this.busy = false; }
            }
            this.Refresh(); return;
        }
        switch (name) {
            case '返回':
                if (this.N('装卡确认').active) this.N('装卡确认').active = false;
                else { Matrix.Settle(); ui.HidePanel(ZRSJZ_PANEL.超算矩阵界面); }
                return;
            case '算力中心': case '货币市场': this.Switch(name); break;
            case '安装':
                this.installSlot = -1;
                if (Matrix.State.cards >= MATRIX_CONFIG.maxCards) ui.ShowTip('显卡已装满（20/20）');
                else if (!Matrix.CardsAvailable()) ui.ShowTip('仓库显卡不足');
                else this.N('装卡确认').active = true;
                break;
            case '确认安装': {
                this.N('装卡确认').active = false;
                const error = Matrix.Install(Date.now(), this.installSlot); ui.ShowTip(error || '显卡安装成功，生产加速！'); break;
            }
            case '取消安装': this.N('装卡确认').active = false; break;
            case '领取': {
                const count = Matrix.Claim(); ui.ShowTip(count ? `获得加密货币 ×${count}` : '尚无可领取产出'); break;
            }
            case '购买': { const error = Matrix.Buy(); ui.ShowTip(error || '购买成功，获得加密货币 ×1'); break; }
            case '出售': case '全部出售': {
                const result = Matrix.Sell(name === '全部出售');
                ui.ShowTip(result.error || `售出 ${result.count} 枚，获得货币 ${result.gold.toLocaleString()}`); break;
            }
        }
        this.Refresh();
    }
    protected onDisable(): void {
        if (this.Panel) Tween.stopAllByTarget(this.N('左侧/选中'));
    }
}
