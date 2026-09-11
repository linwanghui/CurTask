import { EventTarget, Node } from 'cc';
import { ZRSJZ_MAP_CONFIG } from '../ZRSJZ_Constant';

export interface ZRSJZ_OnlineMember { id: string; name: string; ready: boolean; }
export interface ZRSJZ_OnlineRoom { code: string; host: string; phase: string; map: string; members: ZRSJZ_OnlineMember[]; }
export interface ZRSJZ_OnlinePose { x: number; y: number; sx: number; sy: number; skin: string; animation: string; dead?: boolean;
    weapon?: string; weaponSkin?: string; mx?: number; my?: number; aim?: boolean;
    attack?: string; attackSerial?: number; attackTime?: number; attackSpeed?: number; attackLoop?: boolean;
    outfit?: { [slot: string]: string }; }

/** 只传房间、局内战斗/特别行动及外观，不上传仓库、局外任务或存档。 */
export class ZRSJZ_OnlineService {
    public static readonly Events = new EventTarget();
    public static get Map(): string { return this.Room?.map || '五号小镇_机密行动'; }
    public static Room: ZRSJZ_OnlineRoom = null;
    public static SelfID = '';
    public static PeerPose: ZRSJZ_OnlinePose = null;
    public static Battle = false;
    /** 房主身份在开战时固定，战斗中不做房主迁移。 */
    public static BattleHost = false;
    public static BattleEnded = false;
    public static EndReason = 'disconnected';
    public static OpenDoors = new Set<string>();
    public static BreakWallAvailable = false;
    public static OperationInbox: any[] = [];
    public static CompletedTaskPoints = new Set<string>();
    public static Holds: { [id: string]: string[] } = {};
    public static LocalHolds = new Set<string>();
    public static PeerPoseAt = 0;
    public static HoldReady = false;
    public static get PeerWaiting(): boolean { return Object.keys(this.Holds).some(id => id !== this.SelfID && this.Holds[id].length > 0); }
    public static get Paused(): boolean { return this.Battle && (this.LocalHolds.size > 0 || Object.values(this.Holds).some(a => a.length > 0)); }
    public static SetHold(reason: string, active: boolean): void {
        if (!this.Battle || this.BattleEnded) return;
        if (active) this.LocalHolds.add(reason); else this.LocalHolds.delete(reason);
        this.Send('hold', { reason, active });
        this.Events.emit('hold');
    }
    /** 固定于场景加载时，不使用世界坐标、排序索引或运行时 UUID。 */
    public static SceneObjectKey(node: Node, kind: string): string {
        let path = kind;
        for (let item = node; item && !item.getComponent('ZRSJZ_Map'); item = item.parent) {
            const p = item.position;
            path += `/${item.name}:${Math.round(p.x * 10)},${Math.round(p.y * 10)}`;
        }
        let hash = 2166136261;
        for (let i = 0; i < path.length; i++) hash = Math.imul(hash ^ path.charCodeAt(i), 16777619);
        return kind + ':' + (hash >>> 0).toString(16);
    }
    public static CombatStates = new Map<string, any>();
    public static Status = '未连接服务器';
    private static socket: WebSocket = null;
    private static timer: ReturnType<typeof setInterval> = null;
    private static connecting = false;
    private static lastMessage = 0;

    public static get Address(): string { return 'ws://111.229.178.69:8765'; }
    public static get Connecting(): boolean { return this.connecting; }
    public static get Connected(): boolean { return this.socket?.readyState === 1; }
    public static get IsHost(): boolean { return !!this.Room && this.Room.host === this.SelfID; }

    public static Connect(address: string = this.Address): void {
        if (this.Connected || this.connecting) return;
        address = address.trim();
        if (!/^wss?:\/\/[^\s]+$/.test(address)) { this.SetStatus('请输入 ws://服务器IP:8765 或 wss://域名'); return; }
        if (typeof WebSocket === 'undefined') { this.SetStatus('当前平台不支持标准 WebSocket，请先用浏览器预览测试'); return; }
        if (typeof location !== 'undefined' && location.protocol === 'https:' && address.startsWith('ws://')) {
            this.SetStatus('HTTPS页面无法连接WS服务器，需要配置WSS域名');
            return;
        }
        this.Disconnect();
        this.connecting = true;
        this.SetStatus('正在连接…');
        let ws: WebSocket;
        let opened = false;
        try { ws = new WebSocket(address); } catch (error) { this.connecting = false; this.SetStatus('连接失败：' + String(error)); return; }
        this.socket = ws;
        this.lastMessage = Date.now();
        this.timer = setInterval(() => {
            if (this.socket !== ws) return;
            if (Date.now() - this.lastMessage > (this.LocalHolds.has('ad') || this.LocalHolds.has('background') ? 180000 : 15000)) { this.Disconnect(); this.SetStatus('连接超时，请检查地址、端口和防火墙'); return; }
            if (this.Connected) this.Send('ping');
        }, 3000);
        ws.onopen = () => {
            if (this.socket !== ws) return;
            opened = true;
            this.connecting = false;
            this.SetStatus('已连接，等待服务器确认');
        };
        ws.onmessage = event => {
            if (this.socket !== ws) return;
            this.lastMessage = Date.now();
            let message: any;
            try { message = JSON.parse(event.data); } catch { return; }
            if (message.type === 'welcome') {
                if (message.version !== 6) { this.Disconnect(); this.SetStatus('服务器需要更新到版本6，请替换server.py并重启'); return; }
                this.SelfID = message.id;
                this.SetStatus('已连接，可创建或加入房间');
            } else if (message.type === 'room') {
                this.Room = message.room;
                this.SetStatus(this.Room ? `房间 ${this.Room.code} · ${this.Room.members.length}/2 人` : '已离开房间');
            } else if (message.type === 'error') {
                this.SetStatus(String(message.message));
            } else if (message.type === 'start' && !this.Battle) {
                if (message.map !== this.Map || !ZRSJZ_MAP_CONFIG.has(message.map)) { this.SetStatus('地图版本不一致，请更新客户端'); return; }
                this.Battle = true;
                this.BattleHost = this.IsHost;
                this.BattleEnded = false;
                this.EndReason = 'disconnected';
                this.CombatStates.clear();
                this.OpenDoors.clear();
                this.OperationInbox = [];
                this.CompletedTaskPoints.clear();
                this.Holds = {}; this.LocalHolds.clear(); this.PeerPoseAt = Date.now();
                this.BreakWallAvailable = message.breakWall === true;
                this.PeerPose = null;
                this.Events.emit('start');
            } else if (message.type === 'pose') {
                this.PeerPose = message.pose;
                this.PeerPoseAt = Date.now();
            } else if (message.type === 'hold') {
                this.Holds = message.holds || {};
                this.HoldReady = message.ready === true;
                this.Events.emit('hold');
                if (!this.HoldReady) this.Send('hold_ready', { revision: message.revision });
            } else if (message.type === 'combat' && this.Battle && !this.BattleEnded) {
                const packet = message.packet;
                if (!packet || typeof packet !== 'object') return;
                if (packet.kind === 'states' && Array.isArray(packet.states)) {
                    for (const state of packet.states) this.CombatStates.set(state.id, state);
                }
                this.Events.emit('combat', packet);
            } else if (message.type === 'operation' && this.Battle && !this.BattleEnded) {
                if (message.packet?.kind === 'state' && message.packet.state !== '进行中') this.CompletedTaskPoints.add(message.packet.point);
                if (message.packet && this.OperationInbox.length < 256) this.OperationInbox.push(message.packet);
            } else if (message.type === 'door') {
                if (message.open) this.OpenDoors.add(message.id);
                this.Events.emit('door', message);
            } else if (message.type === 'battle_end') {
                this.BattleEnded = true;
                this.EndReason = message.reason === 'evacuated' ? 'evacuated' : message.reason === 'finished' ? 'finished' : 'disconnected';
                this.Events.emit('battle_end', this.EndReason);
            } else if (message.type === 'peer_left') {
                this.PeerPose = null;
                this.SetStatus('队友已离开');
                this.Events.emit('peer_left');
            }
        };
        ws.onerror = () => { if (this.socket === ws) this.SetStatus('连接失败，请检查服务器是否启动、地址和端口'); };
        ws.onclose = event => {
            if (this.socket !== ws) return;
            const confirmed = !!this.SelfID;
            this.Disconnect();
            console.warn('[联机] WebSocket关闭', address, event.code, event.reason, { opened, confirmed });
            this.SetStatus(!opened
                ? `连接失败(${event.code})：服务器未启动、8765端口未放行或网络不可达`
                : !confirmed
                    ? `服务器握手后断开(${event.code})，请检查Python控制台报错`
                    : `连接已断开(${event.code})，请重新连接`);
        };
    }

    public static Send(type: string, data: object = {}): void {
        if (!this.Connected) return;
        try { this.socket.send(JSON.stringify({ ...data, type })); } catch { this.SetStatus('消息发送失败'); }
    }
    public static Combat(packet: object): void {
        if (this.Battle && !this.BattleEnded) this.Send('combat', { packet });
    }
    public static Create(): void { this.Send('create'); }
    public static Join(code: string): void {
        if (!/^\d{6}$/.test(code.trim())) { this.SetStatus('请输入6位房间号'); return; }
        this.Send('join', { code: code.trim() });
    }
    public static Leave(): void { this.Send('leave'); this.Room = null; this.PeerPose = null; this.SetStatus('已离开房间'); }
    public static Disconnect(): void {
        const ws = this.socket;
        this.socket = null;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.connecting = false;
        this.Room = null;
        this.SelfID = '';
        this.PeerPose = null;
        if (ws) { ws.onclose = null; ws.onerror = null; ws.onmessage = null; ws.onopen = null; ws.close(); }
        if (this.Battle && !this.BattleEnded) { this.BattleEnded = true; this.EndReason = 'disconnected'; this.Events.emit('battle_end', this.EndReason); }
        this.SetStatus('未连接服务器');
    }
    private static SetStatus(status: string): void { this.Status = status; this.Events.emit('change'); }
}
