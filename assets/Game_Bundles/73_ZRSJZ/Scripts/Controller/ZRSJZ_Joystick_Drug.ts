import { _decorator, Component, EventTouch, Label } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_Joystick_Drug')
export class ZRSJZ_Joystick_Drug extends Component {
    PlayerIndex: number = 0;
    /** 与 Drug 数组一致：高级 80%、中级 50%、初级 20%。 */
    private static readonly RECOVER_RATES: readonly number[] = [0.8, 0.5, 0.2];
    private static readonly DRUG_NODE_NAMES: readonly string[] = ["药品3", "药品2", "药品1"];

    /** 顺序与 ZRSJZ_Game.Drug 一致：高级、中级、初级。 */
    private readonly _countLabels: Array<Label | null> = [];
    private readonly _lastCounts: number[] = [-1, -1, -1];

    protected onLoad(): void {
        this._countLabels.push(
            this.node.getChildByName("药品3")?.getChildByName("Count")?.getComponent(Label) ?? null,
            this.node.getChildByName("药品2")?.getChildByName("Count")?.getComponent(Label) ?? null,
            this.node.getChildByName("药品1")?.getChildByName("Count")?.getComponent(Label) ?? null,
        );
    }

    protected start(): void {
        this.RefreshDrugCount(true);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_DRUG_CHANGE, this.RefreshDrugCount, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_DRUG_ADD, this.AddDrug, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_DRUG_CHANGE, this.RefreshDrugCount, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_DRUG_ADD, this.AddDrug, this);
    }


    /** 根据 ZRSJZ_Game 中的当前药品数量刷新摇杆 UI。 */
    public RefreshDrugCount(force: boolean = false, playerIndex?: number): void {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        const drug = ZRSJZ_Game.Instance?.Drug[this.PlayerIndex];
        if (!drug) return;

        for (let index = 0; index < this._countLabels.length; index++) {
            const count = Math.max(0, Math.floor(drug[index] ?? 0));
            if (!force && this._lastCounts[index] === count) continue;
            this._lastCounts[index] = count;
            if (this._countLabels[index]) {
                this._countLabels[index].string = `x${count}`;
            }
            const drugNode = this.node.getChildByName(ZRSJZ_Joystick_Drug.DRUG_NODE_NAMES[index]);
            const videoMask = drugNode?.getChildByName("Mask");
            if (videoMask) videoMask.active = count <= 0;
        }
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        const target = event.getCurrentTarget();
        if (target.name === "背包") {
            ZRSJZ_UIManager.Instance.ShowPlayerPanel(
                ZRSJZ_PANEL.背包弹窗,
                this.PlayerIndex,
                this.PlayerIndex,
            );
            return;
        }

        const drugNode = target.name === "Mask" ? target.parent : target;
        const drugIndex = ZRSJZ_Joystick_Drug.DRUG_NODE_NAMES.indexOf(drugNode?.name ?? "");
        if (drugIndex < 0) return;
        this.UseDrug(drugIndex);
    }

    private UseDrug(drugIndex: number): void {
        const game = ZRSJZ_Game.Instance;
        const player = game?.GetPlayer(this.PlayerIndex);
        if (!game || !player) return;

        const drug = game.Drug[this.PlayerIndex];
        const count = Math.max(0, Math.floor(drug[drugIndex] ?? 0));
        if (count <= 0) {
            // ZRSJZ_UIManager.Instance.ShowTip("药品数量不足");
            ZRSJZ_UIManager.Instance.ShowPlayerPanel(
                ZRSJZ_PANEL.医疗箱弹窗,
                this.PlayerIndex,
                null,
                this.PlayerIndex,
            );
            return;
        }
        if (player.CurHP >= player.MaxHP) {
            ZRSJZ_UIManager.Instance.ShowTip("当前生命值已满");
            return;
        }

        drug[drugIndex] = count - 1;
        this.RefreshDrugCount(true);
        const recoverHP = player.MaxHP * ZRSJZ_Joystick_Drug.RECOVER_RATES[drugIndex];
        void player.Recover(recoverHP);
    }

    AddDrug(playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        const drug = ZRSJZ_Game.Instance.Drug[this.PlayerIndex];
        drug[0] += 1;
        drug[1] += 1;
        drug[2] += 1;

        this.RefreshDrugCount(true);
    }
}
