import { FormatMoney } from "../ZRSJZ_NumberFormat";
import { _decorator, EventTouch, find, Label, Node, Sprite, SpriteFrame, UIOpacity, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_INVENTORY, ZRSJZ_MAP_CONFIG, ZRSJZ_MapConfig, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
import { ZRSJZ_LevelProgressService } from '../Service/ZRSJZ_LevelProgressService';
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

    @property(SpriteFrame)
    MapTypeSFs: SpriteFrame[] = [];

    private readonly _mapNames: string[] = ["五号小镇", "沙漠古迹", "极北之地"];
    private readonly _actionNames: string[] = ["机密行动", "绝密行动"];
    private _selectedMapName: string = "五号小镇";
    private _selectedActionName: string = "机密行动";
    private _exclusiveDropRefreshVersion: number = 0;

    private _mapEffectTime = 0;
    private _mapEffects: {
        node: Node; origin: Vec3; opacity: UIOpacity;
        ripple: Node; rippleOpacity: UIOpacity; selected: boolean; burstTime: number;
    }[] = [];

    private InitMapEffects(): void {
        for (const mapName of this._mapNames) {
            const node = find(`Panel/${mapName}`, this.node);
            const checked = node?.getChildByName("Checked");
            const source = checked?.getComponent(Sprite);
            if (!node || !checked || !source) continue;
            // 只复制描边图片，不复制锁图标、按钮和点击事件。
            const ripple = new Node("SelectionRipple");
            ripple.layer = node.layer;
            ripple.parent = node;
            ripple.setSiblingIndex(checked.getSiblingIndex());
            ripple.setPosition(checked.position);
            const transform = ripple.addComponent(UITransform);
            const sourceTransform = checked.getComponent(UITransform);
            transform.setAnchorPoint(sourceTransform.anchorPoint);
            const sprite = ripple.addComponent(Sprite);
            sprite.spriteFrame = source.spriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            transform.setContentSize(sourceTransform.contentSize);
            ripple.active = false;
            this._mapEffects.push({
                node, origin: node.position.clone(),
                opacity: checked.getComponent(UIOpacity) ?? checked.addComponent(UIOpacity),
                ripple, rippleOpacity: ripple.addComponent(UIOpacity), selected: false, burstTime: 1,
            });
        }
    }

    protected update(dt: number): void {
        this._mapEffectTime += dt;
        this._mapEffects.forEach((effect, index) => {
            const phase = this._mapEffectTime * Math.PI * 2 / 3.2;
            const offset = index * Math.PI * 2 / 3;
            // 相对固定原点计算，反复开关面板也不会累积位置偏移。
            const y = 9 * (Math.sin(phase + offset) - Math.sin(offset));
            effect.node.setPosition(effect.origin.x, effect.origin.y + y, effect.origin.z);
            effect.opacity.opacity = effect.selected
                ? 205 + 50 * Math.sin(this._mapEffectTime * Math.PI * 2 / 1.6) : 255;
            if (effect.ripple.active) {
                effect.burstTime = Math.min(1, effect.burstTime + dt / 0.65);
                const progress = effect.burstTime;
                const scale = 1 + 0.18 * (1 - (1 - progress) ** 2);
                effect.ripple.setScale(scale, scale, 1);
                effect.rippleOpacity.opacity = 210 * (1 - progress);
                if (progress >= 1) effect.ripple.active = false;
            }
        });
    }

    protected onDisable(): void {
        this._mapEffectTime = 0;
        for (const effect of this._mapEffects) {
            effect.node.setPosition(effect.origin);
            effect.opacity.opacity = 255;
            effect.ripple.active = false;
            effect.selected = false;
        }
    }

    private RefreshMapEffects(): void {
        for (const effect of this._mapEffects) {
            const selected = effect.node.name === this._selectedMapName;
            if (selected && !effect.selected) {
                effect.burstTime = 0;
                effect.ripple.setScale(1, 1, 1);
                effect.rippleOpacity.opacity = 210;
                effect.ripple.active = true;
            } else if (!selected) {
                effect.ripple.active = false;
                effect.opacity.opacity = 255;
            }
            effect.selected = selected;
        }
    }

    protected onLoad(): void {
        this.InitMapEffects();
        this.BindSelectEvents();
        this.RestoreSelection();
        this.RefreshSelection();
    }

    public Show(...args: any[]): void {
        super.Show(...args);
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
        // 当前地图已选中时，不重复刷新关卡信息和专属掉落。
        if (!this._mapNames.includes(mapName) || mapName === this._selectedMapName) return;

        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        this._selectedMapName = mapName;
        this.RefreshSelection();
    }

    private OnActionSelected(event: EventTouch): void {
        const actionName = event.getCurrentTarget().name;
        // 当前行动难度已选中时，不重复刷新关卡信息和专属掉落。
        if (!this._actionNames.includes(actionName) || actionName === this._selectedActionName) return;

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
            const mapKey = `${mapName}_${this._selectedActionName}`;
            const isLocked = !!ZRSJZ_LevelProgressService.GetLockReason(mapKey);
            if (checked) checked.active = mapName === this._selectedMapName && !isLocked;
            const lock = mapNode?.getChildByName("Lock");
            if (lock) lock.active = isLocked;
            const checkedLock = checked?.getChildByName("锁");
            if (checkedLock) checkedLock.active = false;
            this.SetDifficultyIcon(`Panel/${mapName}/难度`, ZRSJZ_MAP_CONFIG.get(mapKey)?.Difficulty);
            if (mapName === this._selectedMapName && this.MapSFs[index]) {
                const mapSprite = find("Panel/Desc/Map", this.node)?.getComponent(Sprite);
                if (mapSprite) mapSprite.spriteFrame = this.MapSFs[index];
            }
        });

        this.RefreshMapEffects();
        this._actionNames.forEach(actionName => {
            const actionNode = find(`Panel/${actionName}`, this.node);
            const selected = actionName === this._selectedActionName;
            const checked = actionNode?.getChildByName("Checked");
            if (checked) checked.active = selected;
        });
        const background = find("Mask", this.node)?.getComponent(Sprite);
        const backgroundFrame = this.BGSFs[this._actionNames.indexOf(this._selectedActionName)];
        if (background && backgroundFrame) background.spriteFrame = backgroundFrame;

        const config = this.GetSelectedConfig();
        const isLocked = !!ZRSJZ_LevelProgressService.GetLockReason(this.GetSelectedMapKey());
        const lock = find("Panel/Desc/Lock", this.node);
        if (lock) lock.active = isLocked;
        const startButton = find("Panel/开始行动", this.node);
        if (startButton) startButton.active = !!config && !isLocked;
        const previousLevel = ZRSJZ_LevelProgressService.GetPreviousLevel(this.GetSelectedMapKey());
        this.SetDifficultyIcon("Panel/Desc/Lock/难度", ZRSJZ_MAP_CONFIG.get(previousLevel)?.Difficulty);
        this.RefreshLevelInfo(config);
        void this.RefreshExclusiveDrops(config);
    }

    /** MapTypeSFs 依次为简单、普通、困难、专家、炼狱、末日。 */
    private SetDifficultyIcon(path: string, difficulty: number | undefined): void {
        const sprite = find(path, this.node)?.getComponent(Sprite);
        if (!sprite) return;
        const frame = difficulty ? this.MapTypeSFs[difficulty - 1] : null;
        sprite.node.active = !!frame;
        if (frame) sprite.spriteFrame = frame;
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
        return ZRSJZ_SelectPanel.GetLoadoutValue(ZRSJZ_GameData.Instance.CurModel === "2p" ? [0, 1] : [0]);
    }

    /** 联机每台设备只带入玩家一的配置，不能计入本地玩家二的装备。 */
    public static GetLoadoutValue(playerIndexes: number[] = [0]): number {
        return ZRSJZ_InventoryService.GetLoadoutValue(playerIndexes);
    }

    /** 可供界面和自动化测试复用的纯准入判断，不会切换场景。 */
    public CanEnterLevel(mapKey: string = this.GetSelectedMapKey()): ZRSJZ_LevelEntryResult {
        const config = ZRSJZ_MAP_CONFIG.get(mapKey);
        const currentValue = this.GetPlayerLoadoutValue();
        if (!config) {
            return { CanEnter: false, CurrentValue: currentValue, RequiredValue: 0, Reason: "该关卡暂未开放" };
        }

        const requiredValue = Math.max(0, config.RequiredLoadoutValue || 0);
        const lockReason = ZRSJZ_LevelProgressService.GetLockReason(mapKey);
        if (lockReason) {
            return { CanEnter: false, CurrentValue: currentValue, RequiredValue: requiredValue, Reason: lockReason };
        }
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
        const lockReason = ZRSJZ_LevelProgressService.GetLockReason(mapKey);
        if (lockReason) {
            ZRSJZ_UIManager.Instance.ShowTip(lockReason);
            return;
        }
        if (ZRSJZ_UIManager.ZRSJZ_DLC && mapKey === "五号小镇_机密行动") {
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

    private FormatValue(value: number): string { return FormatMoney(value); }

}
