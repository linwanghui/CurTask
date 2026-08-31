import { _decorator, Component, Node, tween, Tween, Vec3 } from 'cc';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';

const { ccclass } = _decorator;
type AnnouncementName = "Boss来袭" | "Boss暂退";

/** 回合横幅公告：从左侧滑入、居中停留，再滑向右侧并关闭遮罩。 */
@ccclass('WZSJZ_RoundAnnouncementSystem')
export class WZSJZ_RoundAnnouncementSystem extends Component {
    private _panel: Node = null;
    private _incoming: Node = null;
    private _retreat: Node = null;
    private _playToken: number = 0;

    protected onLoad(): void {
        this.node.on(WZSJZ_EventManager.回合公告, this.OnAnnouncement, this);
    }

    public Configure(canvas: Node): void {
        this._panel = canvas?.getChildByName("弹窗界面") || null;
        this._incoming = this._panel?.getChildByName("Boss来袭") || null;
        this._retreat = this._panel?.getChildByName("Boss暂退") || null;
        if (!this._panel || !this._incoming || !this._retreat) {
            console.warn("[WZSJZ] 弹窗界面需要包含Boss来袭和Boss暂退节点。");
            return;
        }
        this.ResetView();
    }

    private OnAnnouncement = (name: AnnouncementName): void => {
        const target = name === "Boss来袭" ? this._incoming : this._retreat;
        if (!target?.isValid || !this._panel?.isValid) return;
        const config = WZSJZ_Constant.RoundAnnouncement;
        const token = ++this._playToken;
        Tween.stopAllByTarget(this._incoming);
        Tween.stopAllByTarget(this._retreat);
        this._incoming.active = target === this._incoming;
        this._retreat.active = target === this._retreat;
        this._panel.active = true;

        const y = target.position.y;
        const z = target.position.z;
        target.setPosition(config.EnterX, y, z);
        WZSJZ_AudioManager.Play(
            name === "Boss来袭" ? config.IncomingAudio : config.RetreatAudio,
            config.AudioVolume,
            0.05,
        );
        tween(target)
            .to(
                config.EnterDuration,
                { position: new Vec3(config.CenterX, y, z) },
                { easing: "backOut" },
            )
            .delay(config.HoldDuration)
            .to(
                config.ExitDuration,
                { position: new Vec3(config.ExitX, y, z) },
                { easing: "quadIn" },
            )
            .call(() => {
                if (token !== this._playToken) return;
                target.active = false;
                this._panel.active = false;
            })
            .start();
    };

    private ResetView(): void {
        this._playToken++;
        if (this._incoming) {
            Tween.stopAllByTarget(this._incoming);
            this._incoming.active = false;
        }
        if (this._retreat) {
            Tween.stopAllByTarget(this._retreat);
            this._retreat.active = false;
        }
        if (this._panel) this._panel.active = false;
    }
}
