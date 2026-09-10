import { _decorator, Button, EventTouch, Label, Node } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_MAP_CONFIG, ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_SelectPanel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_SelectPanel';
import { ZRSJZ_OnlineService as Online } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_OnlineService';
import { ZRSJZ_OnlineBattle } from '../../../73_ZRSJZ/Scripts/Controller/ZRSJZ_OnlineBattle';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_OnlinePanel')
export class ZRSJZ_OnlinePanel extends ZRSJZ_Panel {
    private code = '';
    private readonly maps = ['五号小镇', '沙漠古迹', '极北之地'];
    private readonly modes = ['机密行动', '绝密行动'];
    private N(path: string): Node { return this.node.getChildByPath('Panel/' + path); }
    private Text(path: string, value: string): void { this.N(path).getComponent(Label).string = value; }
    private Enable(path: string, enabled: boolean): void { this.N(path).getComponent(Button).interactable = enabled; }
    protected onEnable(): void {
        Online.Events.on('change', this.Refresh, this);
        Online.Events.on('start', this.StartBattle, this);
        this.N('数字键盘').active = false;
        this.Refresh();
        this.schedule(this.CheckReadiness, 0.5);
        Online.Connect();
    }
    protected onDisable(): void {
        Online.Events.off('change', this.Refresh, this);
        Online.Events.off('start', this.StartBattle, this);
        this.unschedule(this.CheckReadiness);
    }
    private Value(value: number): string { return value >= 10000 ? (value / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(Math.floor(value)); }
    private CanReady(showTip: boolean): boolean {
        const config = ZRSJZ_MAP_CONFIG.get(Online.Map);
        const value = ZRSJZ_SelectPanel.GetLoadoutValue([0]);
        const valid = !!config && value >= config.RequiredLoadoutValue;
        if (!valid && showTip) ZRSJZ_UIManager.Instance.ShowTip(config
            ? '配置价值不足，还需' + this.Value(config.RequiredLoadoutValue - value)
            : '该关卡暂未开放');
        return valid;
    }
    private CheckReadiness(): void {
        const me = Online.Room?.members.find(m => m.id === Online.SelfID);
        if (me?.ready && Online.Room.phase === 'lobby' && !this.CanReady(false)) {
            Online.Send('ready', { ready: false, map: Online.Map });
        }
        this.Refresh();
    }
    private Refresh(): void {
        const room = Online.Room;
        const me = room?.members.find(m => m.id === Online.SelfID);
        const [map, mode] = Online.Map.split('_');
        const config = ZRSJZ_MAP_CONFIG.get(Online.Map);
        this.Text('状态', Online.Status);
        this.Text('房间信息', room ? '房间号：' + room.code + '    ' + room.members.length + '/2 人' : '创建房间后，将六位房间号告诉好友');
        this.Text('成员信息', room ? room.members.map(m => (m.id === room.host ? '房主' : '队友') + '  ' + (m.id === Online.SelfID ? '你' : m.name) + '  ·  ' + (m.ready ? '已准备' : '未准备')).join('\n') : '等待组队\n最多两人 · 掉落各自独立');
        this.Text('战备信息', '战备：' + this.Value(ZRSJZ_SelectPanel.GetLoadoutValue([0])) + ' / ' + this.Value(config?.RequiredLoadoutValue || 0)
            + '  ·  ' + (this.CanReady(false) ? '已达标' : '未达标') + '  ·  时限 ' + (config?.TimeLimitMinutes || '--') + '分钟');
        this.Text('准备/文字', me?.ready ? '取消准备' : '准备');
        this.Text('房间号输入/文字', this.code || '点击输入房间号');
        this.Text('数字键盘/号码', this.code.padEnd(6, '＿').split('').join('  '));
        this.Enable('连接', !Online.Connected && !Online.Connecting);
        this.Enable('创建房间', !!Online.SelfID && !room);
        this.Enable('加入房间', !!Online.SelfID && !room && this.code.length === 6);
        this.Enable('房间号输入', !room);
        this.Enable('离开房间', !!room);
        this.Enable('准备', !!room && room.phase === 'lobby');
        this.Enable('开始游戏', Online.IsHost && room?.members.length === 2 && room.members.every(m => m.ready) && room.phase === 'lobby');
        for (const name of [...this.maps, ...this.modes]) {
            this.Enable(name, Online.IsHost && room?.phase === 'lobby');
            this.Text(name + '/文字', (name === map || name === mode ? '✓ ' : '') + name);
            const selected = this.N(name + '/' + name + '选中标记');
            if (selected) selected.active = name === map;
        }
        if (room) this.N('数字键盘').active = false;
    }
    public OnButtonClick(event: EventTouch): void {
        const name = event.getCurrentTarget().name;
        if (/^数字[0-9]$/.test(name)) {
            if (this.code.length < 6) this.code += name.slice(-1);
            this.Refresh(); return;
        }
        if (this.maps.includes(name) || this.modes.includes(name)) {
            if (!Online.IsHost) return;
            const [map, mode] = Online.Map.split('_');
            Online.Send('select_map', { map: this.maps.includes(name) ? name + '_' + mode : map + '_' + name });
            return;
        }
        switch (name) {
            case '关闭': Online.Disconnect(); ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.联机界面); break;
            case '连接': Online.Connect(); break;
            case '创建房间': Online.Create(); break;
            case '加入房间': Online.Join(this.code); break;
            case '房间号输入': this.N('数字键盘').active = true; break;
            case '退格': this.code = this.code.slice(0, -1); this.Refresh(); break;
            case '清空': this.code = ''; this.Refresh(); break;
            case '完成输入':
            case '取消输入': this.N('数字键盘').active = false; break;
            case '离开房间': Online.Leave(); break;
            case '准备': {
                const ready = Online.Room?.members.find(m => m.id === Online.SelfID)?.ready;
                if (ready || this.CanReady(true)) Online.Send('ready', { ready: !ready, map: Online.Map });
                break;
            }
            case '开始游戏':
                if (this.CanReady(true)) Online.Send('start');
                else Online.Send('ready', { ready: false, map: Online.Map });
                break;
        }
    }
    private StartBattle(): void {
        if (!this.CanReady(true)) { Online.Battle = false; Online.Leave(); return; }
        ZRSJZ_OnlineBattle.PreviousModel = ZRSJZ_GameData.Instance.CurModel;
        ZRSJZ_GameData.Instance.CurModel = '1p';
        ZRSJZ_GameData.Instance.CurMap = Online.Map;
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.联机界面);
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.加载界面, 'ZRSJZ_Game');
    }
}
