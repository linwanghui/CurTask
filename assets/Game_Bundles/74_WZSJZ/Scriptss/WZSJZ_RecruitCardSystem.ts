import { _decorator, Button, Component, Label, Node, Prefab } from 'cc';
import Banner from '../../../Scripts/Banner';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_EconomySystem } from './WZSJZ_EconomySystem';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_GameData } from './WZSJZ_GameData';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';

const { ccclass } = _decorator;
type CreateRecruitCallback = (
    prefab: Prefab,
    cell: WZSJZ_Cell,
    level: number,
) => boolean;

/** 局内招募卡：消耗存档道具，生成本局开放组合角色所需的随机文字。 */
@ccclass('WZSJZ_RecruitCardSystem')
export class WZSJZ_RecruitCardSystem extends Component {
    private _slotNode: Node = null;
    private _preparationCells: WZSJZ_Cell[] = [];
    private _economySystem: WZSJZ_EconomySystem = null;
    private _createRecruit: CreateRecruitCallback = null;
    private _isRequestingAd: boolean = false;

    protected onLoad(): void {
        this.node.on(WZSJZ_EventManager.招募卡变动, this.RefreshView, this);
    }

    public Configure(
        preparationZone: Node,
        preparationCells: WZSJZ_Cell[],
        economySystem: WZSJZ_EconomySystem,
        createRecruit: CreateRecruitCallback,
    ): void {
        // 当前场景中招募卡直属操作区；同时兼容以后移入道具区的层级。
        this._slotNode = preparationZone?.getChildByName('招募卡')
            || preparationZone?.getChildByName('道具区')?.getChildByName('招募卡')
            || null;
        this._preparationCells = preparationCells || [];
        this._economySystem = economySystem;
        this._createRecruit = createRecruit;
        if (!this._slotNode) {
            console.warn('[WZSJZ] 操作区下缺少“招募卡”节点。');
            return;
        }
        this._slotNode.on(Button.EventType.CLICK, this.OnRecruitCardClick, this);
        this.RefreshView();
    }

    private OnRecruitCardClick = (): void => {
        if (this.CardCount <= 0) {
            this.WatchVideoForRecruitCard();
            return;
        }
        const emptyCell = this._preparationCells.find(
            (cell) => cell.IsUnlocked && cell.IsEmpty(),
        );
        if (!emptyCell) {
            WZSJZ_AudioManager.Play('操作失败', 0.65);
            WZSJZ_UIManager.Instance.ShowText('备战框已满');
            return;
        }
        const prefab = this._economySystem?.RollAvailableNameUnitPrefab();
        if (!prefab) {
            WZSJZ_AudioManager.Play('操作失败', 0.65);
            WZSJZ_UIManager.Instance.ShowText('暂无可招募的文字');
            return;
        }
        if (!this._createRecruit?.(
            prefab,
            emptyCell,
            WZSJZ_Constant.RecruitCard.RecruitLevel,
        )) {
            WZSJZ_AudioManager.Play('操作失败', 0.65);
            return;
        }
        WZSJZ_GameData.Instance.TryConsumeRecruitCard();
        WZSJZ_AudioManager.Play('奖励获得', 0.8);
    };

    private WatchVideoForRecruitCard(): void {
        if (this._isRequestingAd || this.CardCount > 0) return;
        this._isRequestingAd = true;
        Banner.Instance.ShowVideoAd(() => {
            this._isRequestingAd = false;
            const added = WZSJZ_GameData.Instance.AddRecruitCards(
                WZSJZ_Constant.RecruitCard.VideoReward,
            );
            WZSJZ_AudioManager.Play('奖励获得', 0.8);
            WZSJZ_UIManager.Instance.ShowText(`获得招募卡 +${added}`);
        });
    }

    private get CardCount(): number {
        return Math.max(
            0,
            Math.floor(WZSJZ_GameData.Instance.RecruitCardCount || 0),
        );
    }

    private RefreshView = (): void => {
        const label = this._slotNode?.getChildByName('数量')?.getComponent(Label);
        if (label) label.string = `${this.CardCount}`;
        const videoBadge = this._slotNode?.getChildByName('视频角标');
        if (videoBadge) videoBadge.active = this.CardCount <= 0;
    };
}
