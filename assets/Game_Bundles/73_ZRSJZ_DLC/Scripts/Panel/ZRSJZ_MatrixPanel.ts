import { _decorator, Color, EventTouch, find, instantiate, isValid, Label, Node, Sprite, Tween, tween, UIOpacity, UITransform, v3 } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
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
    private lampTime = 0;
    private lamps: UIOpacity[] = [];
    private slots: Node[] = [];
    private slotArtReady = false;
    private slotArtLoading = false;
    private layout: { node: Node; x: number; y: number; width: number; height: number;
        label: Label | null; font: number; line: number; outline: number }[] = [];
    public get CanClose(): boolean { return !this.busy; }
    private N(path: string): Node { return find(path, this.Panel); }
    private Text(path: string, value: string): void { this.N(path).getComponent(Label).string = value; }
    Show(): void {
        Matrix.Settle();
        this.PlayerIndex = -1;
        this.Panel = find('Panel', this.node);
        this.InitializeSlots();
        void this.LoadSlotArt();
        this.lampTime = 0;
        this.lamps = Array.from({ length: MATRIX_CONFIG.maxCards }, (_, i) =>
            this.N(`算力中心/机柜组/机柜${Math.floor(i / 4) + 1}/显卡${i % 4 + 1}/工作灯`).getComponent(UIOpacity));
        Tween.stopAllByTarget(this.Panel);
        // Recover a cached instance closed by the former inherited scale-to-zero Hide.
        this.Panel.setScale(1, 1, 1);
        this.node.active = true;
        this.FitScreen();
        this.N('装卡确认').active = false;
        this.Switch('算力中心', false);
        this.Refresh();
    }
    private InitializeSlots(): void {
        if (this.slots.length) return;
        const container = this.N('算力中心/显卡槽');
        const template = container.getChildByName('槽模板');
        const size = template.getComponent(UITransform).contentSize;
        // Column-major: four slots per rack; copy once before capturing adaptive layout.
        for (let i = 0; i < MATRIX_CONFIG.maxCards; i++) {
            const slot = instantiate(template);
            slot.name = `槽${i + 1}`;
            container.addChild(slot);
            slot.setPosition(template.position.x + Math.floor(i / 4) * size.width * 92 / 83,
                template.position.y - (i % 4) * size.height * 86 / 83, 0);
            slot.active = true;
            this.slots.push(slot);
        }
        template.active = false;
    }
    private async LoadSlotArt(): Promise<void> {
        if (this.slotArtReady || this.slotArtLoading) return;
        this.slotArtLoading = true;
        try {
            const quality = ZRSJZ_PROP_CONFIG.get('显卡')?.Quality;
            if (!quality) return;
            const ui = ZRSJZ_UIManager.Instance;
            const [frame, icon] = await Promise.all([ui.GetPropGridUI(quality + '1_1'), ui.GetPropUI('显卡')]);
            if (!isValid(this.node) || !frame || !icon) return;
            for (const slot of this.slots) {
                const installed = slot.getChildByName('已装');
                installed.getComponent(Sprite).spriteFrame = frame;
                installed.getChildByName('图标').getComponent(Sprite).spriteFrame = icon;
            }
            this.slotArtReady = true;
        } catch (error) {
            console.warn('[超算矩阵] 显卡槽图片加载失败，下次打开重试', error);
        } finally { this.slotArtLoading = false; }
    }
    Hide(...args: any[]): void {
        if (!this.Panel) this.Panel = find('Panel', this.node);
        Tween.stopAllByTarget(this.Panel);
        this.Panel.setScale(1, 1, 1);
        this.node.active = false;
        if (typeof args[0] === 'function') args[0]();
    }
    private FitScreen(): void {
        const size = this.node.getComponent(UITransform).contentSize;
        if (!size.width || !size.height) return;
        this.screenSize = `${size.width}/${size.height}`;
        // Cache the authored 2340×1080 geometry once. Resize dimensions, never node scales.
        if (!this.layout.length) {
            const capture = (node: Node) => {
                const tr = node.getComponent(UITransform), label = node.getComponent(Label);
                if (tr) this.layout.push({ node, x: node.position.x, y: node.position.y,
                    width: tr.contentSize.width, height: tr.contentSize.height, label,
                    font: label?.fontSize ?? 0, line: label?.lineHeight ?? 0, outline: label?.outlineWidth ?? 0 });
                node.children.forEach(capture);
            };
            this.Panel.children.forEach(capture);
            capture(this.node.getChildByName('返回'));
        }
        const ratio = Math.min(size.width / 2340, size.height / 1080);
        this.Panel.getComponent(UITransform).setContentSize(size.width, size.height);
        for (const item of this.layout) {
            item.node.setPosition(item.x * ratio, item.y * ratio, 0);
            item.node.getComponent(UITransform).setContentSize(item.width * ratio, item.height * ratio);
            if (item.label) {
                item.label.fontSize = item.font * ratio;
                item.label.lineHeight = item.line * ratio;
                item.label.outlineWidth = item.outline * ratio;
            }
        }
        const bg = this.node.getChildByName('Mask');
        const cover = Math.max(size.width / 2340, size.height / 1080);
        bg.getComponent(UITransform).setContentSize(2340 * cover, 1080 * cover);
        const back = this.node.getChildByName('返回');
        const backLayout = this.layout.find(item => item.node === back)!;
        back.setPosition(-size.width / 2 + (1170 + backLayout.x) * ratio,
            size.height / 2 - (540 - backLayout.y) * ratio, 0);
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
        for (const name of ['算力中心', '货币市场']) {
            const tab = this.N('左侧/' + name);
            tab.getChildByName('普通底').active = name !== page;
            tab.getChildByName('普通图').active = name !== page;
            tab.getChildByName('选中图').active = name === page;
        }
    }
    protected update(dt: number): void {
        if (!this.Panel || !this.node.activeInHierarchy) return;
        const size = this.node.getComponent(UITransform).contentSize;
        if (this.screenSize !== `${size.width}/${size.height}`) {
            this.FitScreen();
            this.Switch(this.page, false);
            this.DrawChart();
        }
        // Phase offsets give each installed GPU its own activity light, without runtime components.
        this.lampTime += dt;
        if (this.page === '算力中心') this.lamps.forEach((lamp, i) => {
            lamp.opacity = Math.round(40 + 215 * (0.5 + 0.5 * Math.sin(this.lampTime * 6 + i * 1.7)));
        });
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
        this.Text('算力中心/倒计时', `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        this.Text('算力中心/待领取', `待领取  ${view.pending} 枚`);
        this.N('算力中心/产出进度/进度').getComponent(Sprite).fillRange = view.progress;
        this.Text('算力中心/百分比', `${Math.floor(view.progress * 100)}%`);
        this.Text('算力中心/领取/文字', view.pending > 0 ? '点击领取' : '生产中');
    }
    private Refresh(): void {
        const s = Matrix.State;
        this.day = Matrix.Day();
        this.Text('货币市场/余额', `${s.coins}枚`);
        this.Text('算力中心/显卡数量', `已装 ${s.cards} / ${MATRIX_CONFIG.maxCards} · 点击显卡可取回`);
        this.Text('算力中心/周期', `${Matrix.Hours()}小时/枚`);
        this.Text('算力中心/仓库数量', `仓库可用显卡:${Matrix.CardsAvailable()}`);
        for (let i = 0; i < MATRIX_CONFIG.maxCards; i++) {
            const slot = this.N(`算力中心/显卡槽/槽${i + 1}`);
            slot.getChildByName('已装').active = s.slots[i];
            slot.getChildByName('空槽').active = !s.slots[i];
            this.N(`算力中心/机柜组/机柜${Math.floor(i / 4) + 1}/显卡${i % 4 + 1}`).active = s.slots[i];
        }
        this.N('算力中心/安装/图文').active = s.cards < MATRIX_CONFIG.maxCards;
        this.N('算力中心/安装/文字').active = s.cards >= MATRIX_CONFIG.maxCards;
        this.Text('算力中心/安装/文字', '显卡已装满');
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
        const { width, height } = this.N('货币市场/K线').getComponent(UITransform).contentSize;
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
            const pixel = width / 930;
            body.getComponent(UITransform).setContentSize(24 * pixel, Math.max(3 * pixel, Math.abs(y(c.close) - y(c.open))));
            wick.setPosition(0, (y(c.low) + y(c.high)) / 2 - height / 2, 0);
            wick.getComponent(UITransform).setContentSize(3 * pixel, Math.max(3 * pixel, y(c.high) - y(c.low)));
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
