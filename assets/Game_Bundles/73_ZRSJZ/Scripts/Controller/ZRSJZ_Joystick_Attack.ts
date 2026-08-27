import { _decorator, Component, EventKeyboard, EventTouch, Touch, Input, input, KeyCode, Node, UITransform, Vec2, Vec3, SpriteFrame, Sprite, Label } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_KNIFE, ZRSJZ_PANEL, ZRSJZ_ROLE_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_Door } from '../Unit/ZRSJZ_Door';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_SpecialOperationsTaskIcon } from '../Unit/ZRSJZ_SpecialOperationsTaskIcon';
import { ZRSJZ_Mailbox } from '../Unit/ZRSJZ_Mailbox';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Joystick_Attack')
export class ZRSJZ_Joystick_Attack extends Component {
    PlayerIndex: number = 0;
    public static readonly WeaponType: string[] = ["枪", "刀"];
    public static readonly SlideCD: number = 3;
    public static readonly LoadingCD: number = 1.5;

    @property(SpriteFrame)
    AttackSFs: SpriteFrame[] = [];

    @property(SpriteFrame)
    SwitchSFs: SpriteFrame[] = [];

    @property(Node)
    SkillPoint: Node = null;

    private _searchButton: Node = null;
    private _targetBox: ZRSJZ_Box = null;
    private _targetMailbox: ZRSJZ_Mailbox = null;
    private _doorCardButton: Node = null;
    private _doorVideoButton: Node = null;
    private _targetDoor: ZRSJZ_Door = null;
    private _taskButton: Node = null;
    private _targetSpecialOperation: ZRSJZ_SpecialOperationsTaskIcon = null;

    private _attackSprite: Sprite = null;
    private _attackTouch: Touch = null;
    private _switchSprite: Sprite = null;
    private _curWeaponIndex: number = 0;
    private _slideSprite: Sprite = null;
    private _slideCD: number = 0;
    private _reloadingCD: number = 0;
    private _switchButton: Node = null;
    private _bulletCount: Label = null;
    /** 用于识别最后一发子弹刚刚被打出的瞬间，避免初始空弹匣误触发自动换弹。 */
    private _previousMagazineAmmoCount: number = -1;

    start() {
        this._searchButton = this.node.getChildByName('Search');
        this._doorCardButton = this.node.getChildByName('Crack');
        this._doorVideoButton = this.node.getChildByName('CrackByVideo');
        this._taskButton = this.node.getChildByName('Task');
        this._attackSprite = this.node.getChildByName('Attack').getComponent(Sprite);
        this._switchSprite = this.node.getChildByName('Switch').getComponent(Sprite);
        this._slideSprite = this.node.getChildByPath('Slide/CD').getComponent(Sprite);
        this._switchButton = this.node.getChildByPath("Reload");
        this._bulletCount = this.node.getChildByPath("Reload/Count").getComponent(Label);

        this._attackSprite.node.on(Node.EventType.TOUCH_START, this.OnTouchStart_Attack, this);
        this._attackSprite.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd_Attack, this);
        this._attackSprite.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd_Attack, this);

        this._curWeaponIndex = this.HasWeapon(0) ? 0 : 1;
        this.SwitchWeapon(false);
        this.LoadSkillButton();
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this.ShowSearch, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_DOOR, this.ShowDoor, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SPECIAL_OPERATION, this.ShowSpecialOperation, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.ShowEquipment, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshWeaponSwitchState, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this.ShowSearch, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_DOOR, this.ShowDoor, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SPECIAL_OPERATION, this.ShowSpecialOperation, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.ShowEquipment, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshWeaponSwitchState, this);
    }

    protected update(dt: number): void {
        if (this._targetMailbox && !this._targetMailbox.IsAvailable) {
            this.ShowSearch(null);
        }

        const player = ZRSJZ_Game.Instance?.GetPlayer(this.PlayerIndex);
        if (this._bulletCount && player) {
            this._bulletCount.string =
                `${player.MagazineAmmoCount}/${player.WarehouseAmmoCount}`;
        }

        if (player) {
            const magazineAmmoCount = player.MagazineAmmoCount;
            const magazineJustEmptied = this._previousMagazineAmmoCount > 0
                && magazineAmmoCount <= 0;
            this._previousMagazineAmmoCount = magazineAmmoCount;

            if (
                magazineJustEmptied
                && !ZRSJZ_Game.Instance.UnlimitedFirepower
                && player.WeaponType === "枪"
                && player.WarehouseAmmoCount > 0
            ) {
                this.Reload();
            }
        }

        if (this._slideCD > 0) {
            this._slideCD -= dt;
            if (this._slideCD <= 0) {
                this._slideCD = 0;
                this._slideSprite.node.active = false;
            }
            this._slideSprite.fillRange = this._slideCD / ZRSJZ_Joystick_Attack.SlideCD;
        }

        if (this._reloadingCD > 0) {
            this._reloadingCD -= dt;
            if (this._reloadingCD <= 0) {
                this._reloadingCD = 0;
            }
            const reloadProgress = (ZRSJZ_Joystick_Attack.LoadingCD - this._reloadingCD)
                / ZRSJZ_Joystick_Attack.LoadingCD;
            ZRSJZ_EventManager.Emit(
                ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD,
                reloadProgress,
                false,
                this.PlayerIndex,
            );

            // 换弹结束时攻击键仍被按住，则从首发开始继续攻击。
            if (
                this._reloadingCD <= 0
                && this._attackTouch != null
                && player?.WeaponType === "枪"
                && (ZRSJZ_Game.Instance.UnlimitedFirepower || player.MagazineAmmoCount > 0)
            ) {
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, true, this.PlayerIndex);
            }
        }
    }

    //#region 射击
    OnTouchStart_Attack(event: EventTouch) {
        // 使用当前变更的触点，避免快速点击时 getTouches() 的活动触点列表为空或发生错配。
        if (!this._attackTouch && event.touch) this._attackTouch = event.touch;

        if (this._reloadingCD > 0) return;
        const player = ZRSJZ_Game.Instance?.GetPlayer(this.PlayerIndex);
        if (!ZRSJZ_Game.Instance.UnlimitedFirepower && player?.WeaponType === "枪" && player.MagazineAmmoCount <= 0) {
            if (player.WarehouseAmmoCount > 0) {
                this.Reload();
            } else {
                ZRSJZ_UIManager.Instance.ShowTip("没有子弹");
            }
            return;
        }

        if (this._attackTouch) {
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, true, this.PlayerIndex);
            // 首发可能正好耗尽弹匣；首帧 update 尚未记录旧弹量时也要自动换弹。
            if (
                !ZRSJZ_Game.Instance.UnlimitedFirepower
                && player?.WeaponType === "枪"
                && player.MagazineAmmoCount <= 0
                && player.WarehouseAmmoCount > 0
            ) {
                this.Reload();
            }
        }
    }


    OnTouchEnd_Attack(event: EventTouch) {
        const changedTouch = event.touch;
        if (!this._attackTouch || !changedTouch) return;
        if (changedTouch.getID() !== this._attackTouch.getID()) return;

        this._attackTouch = null;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false, this.PlayerIndex);
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        switch (event.getCurrentTarget().name) {
            case "Switch":
                this.SwitchWeapon(true, (this._curWeaponIndex + 1) % 2);
                break;
            case "Slide":
                this.Slide();
                break;
            case "Reload":
                this.Reload();
                break;
            case "Search":
                this.Search();
                break;
            case "Crack":
                if (this._targetDoor?.TryOpenWithRoomCard(this.PlayerIndex)) {
                    this.ShowDoor(null);
                }
                break;
            case "CrackByVideo": {
                const targetDoor = this._targetDoor;
                if (!targetDoor?.CanOpenManually) {
                    this.ShowDoor(null);
                    break;
                }
                Banner.Instance.ShowVideoAd(() => {
                    targetDoor.Open();
                    if (this._targetDoor === targetDoor) {
                        this.ShowDoor(null);
                    }
                })
                break;
            }
            case "Task":
                if (!this._targetSpecialOperation?.IsAvailable) {
                    this.ShowSpecialOperation(null);
                    break;
                }
                if (ZRSJZ_Game.Instance?.IsSpecialOperationInProgress()) {
                    void ZRSJZ_UIManager.Instance.ShowTip("任务正在进行中");
                    break;
                }
                ZRSJZ_UIManager.Instance.ShowPlayerPanel(
                    ZRSJZ_PANEL.特别行动弹窗,
                    this.PlayerIndex,
                    ZRSJZ_GameData.Instance.CurMap,
                    this._targetSpecialOperation,
                    this.PlayerIndex,
                );
                break;
        }
    }

    // 切换武器
    SwitchWeapon(showTip: boolean = false, targetWeaponIndex: number = this._curWeaponIndex): boolean {
        const normalizedIndex = targetWeaponIndex % 2;
        if (!this.HasWeapon(normalizedIndex)) {
            this.RefreshWeaponSwitchState();
            if (showTip) {
                ZRSJZ_UIManager.Instance.ShowTip(
                    normalizedIndex === 0 ? "未装备枪械" : "未装备近战武器",
                );
            }
            return false;
        }
        if (!ZRSJZ_Game.Instance.GetPlayer(this.PlayerIndex)?.IsSwitch) return;

        this._curWeaponIndex = normalizedIndex;
        if (this._reloadingCD > 0) {
            this._reloadingCD = 0;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, 1, true, this.PlayerIndex);
        }
        if (this._attackTouch != null) {
            this._attackTouch = null;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false, this.PlayerIndex);
        }
        this._switchSprite.spriteFrame = this.SwitchSFs[this._curWeaponIndex % 2];
        this._attackSprite.spriteFrame = this.AttackSFs[this._curWeaponIndex % 2];
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, ZRSJZ_Joystick_Attack.WeaponType[this._curWeaponIndex % 2], this.PlayerIndex);
        this._switchButton.active = this._curWeaponIndex % 2 == 0;
        this.RefreshWeaponSwitchState();
        return true;
    }

    /** index 0 对应枪，index 1 对应刀；ID 和道具实例必须同时存在。 */
    private HasWeapon(index: number): boolean {
        const weaponryIndex = index === 0 ? 0 : 4;
        const propID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex)[weaponryIndex];
        return !!propID && !!ZRSJZ_GameData.Instance.PropData[propID];
    }

    /** 只要仍装备任一武器就显示切换按钮，缺少目标武器时由点击提示说明。 */
    private RefreshWeaponSwitchState(): void {
        if (!this._switchSprite?.node?.isValid) return;

        const hasGun = this.HasWeapon(0);
        const hasKnife = this.HasWeapon(1);
        this._switchSprite.node.active = hasGun || hasKnife;
        if (this._attackSprite?.node?.isValid) {
            this._attackSprite.node.active = hasGun || hasKnife;
        }

        if (this.HasWeapon(this._curWeaponIndex)) return;
        const fallbackIndex = hasGun ? 0 : (hasKnife ? 1 : -1);
        if (fallbackIndex >= 0) {
            this.SwitchWeapon(false, fallbackIndex);
        } else if (this._switchButton?.isValid) {
            this._switchButton.active = false;
        }
    }

    //滑铲
    Slide() {
        if (this._slideCD > 0 || !ZRSJZ_Game.Instance.GetPlayer(this.PlayerIndex)?.IsSlide) return;
        if (this._attackTouch != null) {
            this._attackTouch = null;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false, this.PlayerIndex);
        }
        this._slideCD = ZRSJZ_Joystick_Attack.SlideCD;
        this._slideSprite.node.active = true;
        this._slideSprite.fillRange = 1;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE, this.PlayerIndex);
    }

    //换弹
    Reload() {
        if (this._reloadingCD > 0 || !ZRSJZ_Game.Instance.GetPlayer(this.PlayerIndex)?.CanReload()) return;
        if (this._attackTouch != null) {
            // 暂停射击但保留按住状态，换弹完成后可自动续射。
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false, this.PlayerIndex);
        }
        this._reloadingCD = ZRSJZ_Joystick_Attack.LoadingCD;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, 0, false, this.PlayerIndex);
        ZRSJZ_AudioManager.Instance.PlaySound("换弹音效");
    }

    //搜索
    Search() {
        if (this._targetMailbox) {
            ZRSJZ_InventoryService.SetActivePlayerIndex(this.PlayerIndex);
            this._targetMailbox.TryOpenNext(this.PlayerIndex);
            return;
        }
        if (!this._targetBox) return;
        if (this._targetBox.IsBeingSearchedByOther(this.PlayerIndex)) {
            ZRSJZ_UIManager.Instance.ShowTip("另一名玩家正在搜索该箱子");
            return;
        }
        if (!this._targetBox.TryBeginSearch(this.PlayerIndex)) {
            ZRSJZ_UIManager.Instance.ShowTip("另一名玩家正在搜索该箱子");
            return;
        }
        ZRSJZ_InventoryService.SetActivePlayerIndex(this.PlayerIndex);
        if (this._targetBox?.RequiresRewardVideo()) {
            if (this._targetBox.IsOpened()) {
                ZRSJZ_UIManager.Instance.ShowTip("医疗箱已经打开");
                this._targetBox.EndSearch(this.PlayerIndex);
            } else {
                ZRSJZ_UIManager.Instance.ShowPlayerPanel(
                    ZRSJZ_PANEL.医疗箱弹窗,
                    this.PlayerIndex,
                    this._targetBox,
                    this.PlayerIndex,
                );
            }
            return;
        }
        if (this._targetBox?.RequiresPassword() && !this._targetBox.IsPasswordUnlocked()) {
            ZRSJZ_UIManager.Instance.ShowPlayerPanel(
                ZRSJZ_PANEL.密码箱弹窗,
                this.PlayerIndex,
                this._targetBox,
                this.PlayerIndex,
            );
            return;
        }
        ZRSJZ_UIManager.Instance.ShowPlayerPanel(
            ZRSJZ_PANEL.物资弹窗,
            this.PlayerIndex,
            this._targetBox,
            this.PlayerIndex,
        );
    }

    //加载技能按钮
    LoadSkillButton() {
        ZRSJZ_PoolManager.Instance.GetNode(ZRSJZ_ROLE_CONFIG.get(ZRSJZ_GameData.Instance.CurRole[this.PlayerIndex]).SkillPath).then((skillButton: Node) => {
            skillButton.parent = this.node;
            const skill = skillButton.getComponent('ZRSJZ_Skill_Button') as any;
            if (skill) skill.PlayerIndex = this.PlayerIndex;
            skillButton.active = true;
            if (this.SkillPoint) skillButton.setWorldPosition(this.SkillPoint.worldPosition.clone());
        })
    }

    ShowSearch(source: ZRSJZ_Box | ZRSJZ_Mailbox, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        const availableSource = source instanceof ZRSJZ_Mailbox && !source.IsAvailable
            ? null
            : source;
        this._targetBox = availableSource instanceof ZRSJZ_Box ? availableSource : null;
        this._targetMailbox = availableSource instanceof ZRSJZ_Mailbox ? availableSource : null;
        this._searchButton.active = availableSource != null;
    }

    ShowDoor(door: ZRSJZ_Door, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        this._targetDoor = door?.CanOpenManually ? door : null;
        this._doorCardButton.active = this._targetDoor != null;
        this._doorVideoButton.active = this._targetDoor != null;
    }

    ShowSpecialOperation(taskPoint: ZRSJZ_SpecialOperationsTaskIcon, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        this._targetSpecialOperation = taskPoint?.IsAvailable ? taskPoint : null;
        if (this._taskButton?.isValid) this._taskButton.active = this._targetSpecialOperation != null;
    }

    //装备切换
    ShowEquipment(equipmentName: string, isEquipment: boolean = true, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        //枪
        for (let key of ZRSJZ_WEAPONRY_TYPE.keys()) {
            const flag = ZRSJZ_WEAPONRY_TYPE.get(key).includes(equipmentName);
            if (flag) {
                this._curWeaponIndex = isEquipment ? 0 : 1;
                this.SwitchWeapon(false);
                return;
            }
        }

        //刀
        if (ZRSJZ_KNIFE.includes(equipmentName)) {
            this._curWeaponIndex = isEquipment ? 1 : 0;
            this.SwitchWeapon(false);
            return;
        }

    }
}


