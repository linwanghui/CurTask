import { _decorator, EventTouch, find, Label, Node, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_GradeService } from '../Service/ZRSJZ_GradeService';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ProfileAppearance } from '../UI/ZRSJZ_ProfileAppearance';
import { ZRSJZ_TitleShine } from '../UI/ZRSJZ_TitleShine';
import { ZRSJZ_ProfileSelector, ZRSJZ_ProfileTab } from '../UI/ZRSJZ_ProfileSelector';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GradePanel')
export class ZRSJZ_GradePanel extends ZRSJZ_Panel {
    private _appearance: ZRSJZ_ProfileAppearance = null;
    private _selector: ZRSJZ_ProfileSelector = null;
    private _roleName: Label = null;
    private _grade: Label = null;
    private _progress: Sprite = null;
    private _experience: Label = null;
    private _totalAssets: Label = null;
    private _totalGames: Label = null;
    private _evacuationRate: Label = null;
    private _playTime: Label = null;
    private _optimumEvacuation: Label = null;

    protected onLoad(): void {
        const panel = this.node.getChildByName('Panel');
        this._selector = new ZRSJZ_ProfileSelector(panel);
        this._appearance = new ZRSJZ_ProfileAppearance(panel, ZRSJZ_PANEL.等级弹窗, tab => this._selector.SelectTab(tab));
        const title = find('Panel/称号', this.node);
        if (title && !title.getComponent(ZRSJZ_TitleShine)) title.addComponent(ZRSJZ_TitleShine);
        this._roleName = find("Panel/RoleName", this.node)?.getComponent(Label) ?? null;
        this._grade = find("Panel/等级/RoleName", this.node)?.getComponent(Label) ?? null;
        this._progress = find("Panel/等级/进度", this.node)?.getComponent(Sprite) ?? null;
        this._experience = find("Panel/等级/经验值", this.node)?.getComponent(Label) ?? null;
        this._totalAssets = find("Panel/总资产/总资产/Count", this.node)?.getComponent(Label) ?? null;
        this._totalGames = find("Panel/Layout/总战局/Content", this.node)?.getComponent(Label) ?? null;
        this._evacuationRate = find("Panel/Layout/撤离率/Content", this.node)?.getComponent(Label) ?? null;
        this._playTime = find("Panel/Layout/游戏时长/Content", this.node)?.getComponent(Label) ?? null;
        this._optimumEvacuation = find(
            "Panel/Layout/最佳单局撤离/Content",
            this.node,
        )?.getComponent(Label) ?? null;
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.RefreshAssets, this);
        this.schedule(this.Refresh, 1);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_DLC, this.Refresh, this);
        ZRSJZ_EventManager.OnPersist(
            ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE,
            this.Refresh,
            this,
        );
        ZRSJZ_EventManager.OnPersist(
            ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE,
            this.RefreshAssets,
            this,
        );
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.RefreshAssets, this);
        this.unschedule(this.Refresh);
        this._appearance?.Suspend();
        this._selector?.Suspend();
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_DLC, this.Refresh, this);
        ZRSJZ_EventManager.OffPersist(
            ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE,
            this.Refresh,
            this,
        );
        ZRSJZ_EventManager.OffPersist(
            ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE,
            this.RefreshAssets,
            this,
        );
    }

    public Show(...args: any[]): void {
        super.Show(...args);
        this._selector?.SelectTab(['avatar', 'frame', 'title'].includes(args[0]) ? args[0] as ZRSJZ_ProfileTab : 'info');
        this.Refresh();
    }

    public Refresh(): void {
        const data = ZRSJZ_GameData.Instance;
        const roleName = data.CurRole?.[0] || "威蓝";
        const gradeInfo = ZRSJZ_GradeService.GetGradeInfo();
        if (this._roleName) this._roleName.string = roleName;
        if (this._grade) this._grade.string = `${gradeInfo.Level}级`;
        if (this._progress) this._progress.fillRange = gradeInfo.Progress;
        if (this._experience) {
            this._experience.string = gradeInfo.IsMaxLevel
                ? "MAX"
                : `${gradeInfo.CurrentExperience} / ${gradeInfo.RequiredExperience}`;
        }
        this.RefreshAssets();
        if (this._totalGames) {
            this._totalGames.string = Math.max(0, Math.floor(data.TotalGamePlayed ?? 0)).toString() + '场';
        }
        if (this._evacuationRate) {
            this._evacuationRate.string = ZRSJZ_GradeService.FormatEvacuationRate(
                data.TotalEvacuation,
                data.TotalGamePlayed,
            );
        }
        if (this._playTime) {
            this._playTime.string = ZRSJZ_GradeService.FormatPlayTime(data.TotalTimePlayed).replace('h', '小时').replace('m', '分钟');
        }
        if (this._optimumEvacuation) {
            this._optimumEvacuation.string = ZRSJZ_GradeService.FormatAssetValue(
                data.OptimumEvacuation,
            );
        }
        this._appearance?.Refresh();
        this._selector?.Refresh();
    }

    protected onDestroy(): void { this._appearance?.Dispose(); this._selector?.Dispose(); }

    private RefreshAssets(): void {
        if (!this._totalAssets) return;
        const text = ZRSJZ_GradeService.FormatAssetValue(ZRSJZ_GradeService.GetTotalAssetValue());
        if (this._totalAssets.string !== text) this._totalAssets.string = text;
    }


    public OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.等级弹窗);
                break;
        }
    }

}
