import { _decorator, EventTouch, find, Label, Node, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_INVENTORY, ZRSJZ_MAP_CONFIG, ZRSJZ_MapConfig, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
const { ccclass, property } = _decorator;

export interface ZRSJZ_LevelEntryResult {
    CanEnter: boolean;
    CurrentValue: number;
    RequiredValue: number;
    Reason: string;
}

@ccclass('ZRSJZ_SelectPanel')
export class ZRSJZ_SelectPanel extends ZRSJZ_Panel {

    @property(SpriteFrame)
    BGSFs: SpriteFrame[] = [];

    @property(SpriteFrame)
    MapSFs: SpriteFrame[] = [];

    private readonly _mapNames: string[] = ["五号小镇", "沙漠古迹", "极北之地"];
    private readonly _actionNames: string[] = ["机密行动", "绝密行动"];
    private _selectedMapName: string = "五号小镇";
    private _selectedActionName: string = "机密行动";
    private _exclusiveDropRefreshVersion: number = 0;

    protected onLoad(): void {
        this.BindSelectEvents();
        this.RestoreSelection();
        this.RefreshSelection();
    }

    /**
     * 预制体中的地图和行动卡片没有 Button 组件，在这里统一绑定点击事件。
     * 使用固定回调引用，保证节点销毁时能够正确解除监听。
     */
    private BindSelectEvents(): void {
        for (const mapName of this._mapNames) {
            find(`Panel/${mapName}`, this.node)?.on(Node.EventType.TOUCH_END, this.OnMapSelected, this);
        }
        for (const actionName of this._actionNames) {
            find(`Panel/${actionName}`, this.node)?.on(Node.EventType.TOUCH_END, this.OnActionSelected, this);
        }
    }

    protected onDestroy(): void {
        this._exclusiveDropRefreshVersion++;
        this.ClearExclusiveDrops();
        for (const mapName of this._mapNames) {
            find(`Panel/${mapName}`, this.node)?.off(Node.EventType.TOUCH_END, this.OnMapSelected, this);
        }
        for (const actionName of this._actionNames) {
            find(`Panel/${actionName}`, this.node)?.off(Node.EventType.TOUCH_END, this.OnActionSelected, this);
        }
    }

    public OnButtonClick(event: EventTouch): void {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.选关界面);
                break;
            case "开始行动":
                this.TryEnterSelectedLevel();
                break;
        }
    }

    private OnMapSelected(event: EventTouch): void {
        const mapName = event.getCurrentTarget().name;
        if (!this._mapNames.includes(mapName)) return;

        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        this._selectedMapName = mapName;
        this.RefreshSelection();
    }

    private OnActionSelected(event: EventTouch): void {
        const actionName = event.getCurrentTarget().name;
        if (!this._actionNames.includes(actionName)) return;

        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        this._selectedActionName = actionName;
        this.RefreshSelection();
    }

    private RestoreSelection(): void {
        const config = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        if (!config) return;

        this._selectedMapName = config.DisplayName;
        this._selectedActionName = config.ActionName;
    }

    private RefreshSelection(): void {
        this._mapNames.forEach((mapName, index) => {
            const mapNode = find(`Panel/${mapName}`, this.node);
            const checked = mapNode?.getChildByName("Checked");
            if (checked) checked.active = mapName === this._selectedMapName;
            if (mapName === this._selectedMapName && this.MapSFs[index]) {
                const mapSprite = find("Panel/Desc/Map", this.node)?.getComponent(Sprite);
                if (mapSprite) mapSprite.spriteFrame = this.MapSFs[index];
            }
        });

        this._actionNames.forEach((actionName, index) => {
            const actionNode = find(`Panel/${actionName}`, this.node);
            const selected = actionName === this._selectedActionName;
            const checked = actionNode?.getChildByName("Checked");
            if (checked) checked.active = selected;
            if (actionNode && this.BGSFs.length >= 2) {
                // const actionSprite = actionNode.getComponent(Sprite);
                // if (actionSprite) actionSprite.spriteFrame = this.BGSFs[selected ? 1 : 0];
                find("Mask", this.node).getComponent(Sprite).spriteFrame = this.BGSFs[selected ? 1 : 0];
            }
        });

        const config = this.GetSelectedConfig();
        this.RefreshLevelInfo(config);
        void this.RefreshExclusiveDrops(config);
    }

    private RefreshLevelInfo(config: Readonly<ZRSJZ_MapConfig> | null): void {
        const difficulty = Math.max(0, Math.min(5, Math.floor(config?.Difficulty ?? 0)));
        const difficultyNode = find("Panel/Desc/难度", this.node);
        difficultyNode?.children.forEach((star, index) => star.active = index < difficulty);

        this.SetLabel("Panel/Desc/准入价值", config
            ? this.FormatValue(config.RequiredLoadoutValue)
            : "--");
        this.SetLabel("Panel/Desc/行动时限", config
            ? (config.TimeLimitMinutes > 0 ? `${config.TimeLimitMinutes}分钟` : "不限时")
            : "--");
    }

    /** 使用任务系统的 TaskAward 预制体展示当前关卡专属大红。 */
    private async RefreshExclusiveDrops(config: Readonly<ZRSJZ_MapConfig> | null): Promise<void> {
        const refreshVersion = ++this._exclusiveDropRefreshVersion;
        const content = find("Panel/Desc/专属掉落/View/Content", this.node);
        if (!content) {
            console.warn("[ZRSJZ_SelectPanel] 未找到专属掉落展示节点");
            return;
        }

        this.ClearExclusiveDrops(content);
        for (const propName of config?.ExclusiveRedProps ?? []) {
            const awardNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/TaskAward");
            if (!awardNode) continue;
            if (
                refreshVersion !== this._exclusiveDropRefreshVersion
                || !content.isValid
                || !this.node.isValid
            ) {
                ZRSJZ_PoolManager.Instance.PutNode(awardNode);
                return;
            }

            const taskAward = awardNode.getComponent(ZRSJZ_TaskAward);
            if (!taskAward) {
                console.warn("[ZRSJZ_SelectPanel] TaskAward 预制体缺少 ZRSJZ_TaskAward 组件");
                ZRSJZ_PoolManager.Instance.PutNode(awardNode);
                continue;
            }
            awardNode.parent = content;
            awardNode.active = true;
            taskAward.Init(propName, 1);
        }
    }

    private ClearExclusiveDrops(content: Node = find("Panel/Desc/专属掉落/View/Content", this.node)): void {
        if (!content?.isValid) return;
        for (const child of [...content.children]) {
            if (child.getComponent(ZRSJZ_TaskAward)) {
                ZRSJZ_PoolManager.Instance.PutNode(child);
            } else {
                child.removeFromParent();
                child.destroy();
            }
        }
    }

    private SetLabel(path: string, value: string): void {
        const label = find(path, this.node)?.getComponent(Label);
        if (label) label.string = value;
    }

    private GetSelectedMapKey(): string {
        return `${this._selectedMapName}_${this._selectedActionName}`;
    }

    private GetSelectedConfig(): Readonly<ZRSJZ_MapConfig> | null {
        return ZRSJZ_MAP_CONFIG.get(this.GetSelectedMapKey()) ?? null;
    }

    /**
     * 计算玩家真正会带入局内的全部配置价值。
     * 不统计仓库和上一局尚未结算的物资，且按实例 ID 去重，避免装备数组与库存重复计价。
     */
    public GetPlayerLoadoutValue(): number {
        const carriedInventories = new Set<ZRSJZ_INVENTORY>([
            ZRSJZ_INVENTORY.卡包,
            ZRSJZ_INVENTORY.弹药,
            ZRSJZ_INVENTORY.武器_枪,
            ZRSJZ_INVENTORY.武器_头盔,
            ZRSJZ_INVENTORY.武器_防弹衣,
            ZRSJZ_INVENTORY.武器_背包,
            ZRSJZ_INVENTORY.武器_刀,
        ]);
        const playerIndexes = ZRSJZ_GameData.Instance.CurModel === "2p" ? [0, 1] : [0];
        const playerIndexSet = new Set(playerIndexes);
        const propIDs = new Set<string>();
        for (const playerIndex of playerIndexes) {
            ZRSJZ_InventoryService.GetWeaponryIDs(playerIndex).filter(Boolean).forEach(id => propIDs.add(id));
            ZRSJZ_InventoryService.GetAmmoIDs(playerIndex).filter(Boolean).forEach(id => propIDs.add(id));
        }

        for (const propID in ZRSJZ_GameData.Instance.PropData) {
            const propData = ZRSJZ_GameData.Instance.PropData[propID];
            if (
                propData
                && carriedInventories.has(propData.CurInventory)
                && playerIndexSet.has(propData.OwnerPlayerIndex ?? 0)
            ) {
                propIDs.add(propID);
            }
        }

        let totalValue = 0;
        propIDs.forEach(propID => {
            const propData = ZRSJZ_GameData.Instance.PropData[propID];
            if (!propData) return;
            totalValue += Math.max(0, propData.UnitPrice || 0) * Math.max(0, propData.CurCount || 0);
        });
        return totalValue;
    }

    /** 可供界面和自动化测试复用的纯准入判断，不会切换场景。 */
    public CanEnterLevel(mapKey: string = this.GetSelectedMapKey()): ZRSJZ_LevelEntryResult {
        const config = ZRSJZ_MAP_CONFIG.get(mapKey);
        const currentValue = this.GetPlayerLoadoutValue();
        if (!config) {
            return { CanEnter: false, CurrentValue: currentValue, RequiredValue: 0, Reason: "该关卡暂未开放" };
        }

        const requiredValue = Math.max(0, config.RequiredLoadoutValue || 0);
        if (currentValue < requiredValue) {
            return {
                CanEnter: false,
                CurrentValue: currentValue,
                RequiredValue: requiredValue,
                Reason: `配置价值不足，还需${this.FormatValue(requiredValue - currentValue)}`,
            };
        }
        return { CanEnter: true, CurrentValue: currentValue, RequiredValue: requiredValue, Reason: "" };
    }

    private async TryEnterSelectedLevel(): Promise<void> {
        const mapKey = this.GetSelectedMapKey();
        const config = ZRSJZ_MAP_CONFIG.get(mapKey);
        if (!config) {
            ZRSJZ_UIManager.Instance.ShowTip("该关卡暂未开放");
            return;
        }
        if (ZRSJZ_UIManager.ZRSJZ_DLC) {
            ZRSJZ_UIManager.Instance.ShowPanel(
                ZRSJZ_PANEL.助战礼包弹窗,
                mapKey,
                () => void this.EnterSelectedLevel(mapKey),
            );
        } else {
            this.EnterSelectedLevel(mapKey)
        }
    }

    /** 礼包领取完成后再次校验战备价值，再正式进入关卡。 */
    private async EnterSelectedLevel(mapKey: string): Promise<void> {
        const result = this.CanEnterLevel(mapKey);
        if (!result.CanEnter) {
            ZRSJZ_UIManager.Instance.ShowTip(result.Reason);
            return;
        }
        ZRSJZ_GameData.Instance.CurMap = mapKey;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.加载界面, "ZRSJZ_Game", () => ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.选关界面));

    }

    private FormatValue(value: number): string {
        const safeValue = Math.max(0, Math.floor(value || 0));
        if (safeValue >= 10_000) {
            const wan = safeValue / 10_000;
            return `${Number.isInteger(wan) ? wan : wan.toFixed(1)}万`;
        }
        return `${safeValue}`;
    }

}
