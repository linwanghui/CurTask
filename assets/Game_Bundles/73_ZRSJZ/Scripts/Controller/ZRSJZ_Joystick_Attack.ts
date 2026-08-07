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
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Joystick_Attack')
export class ZRSJZ_Joystick_Attack extends Component {
    public static readonly WeaponType: string[] = ["枪", "刀"];
    public static readonly SlideCD: number = 3;
    public static readonly LoadingCD: number = 3;

    @property(SpriteFrame)
    AttackSFs: SpriteFrame[] = [];

    @property(SpriteFrame)
    SwitchSFs: SpriteFrame[] = [];

    private _searchButton: Node = null;
    private _targetBox: ZRSJZ_Box = null;
    private _doorCardButton: Node = null;
    private _doorVideoButton: Node = null;
    private _targetDoor: ZRSJZ_Door = null;

    private _attackSprite: Sprite = null;
    private _attackTouch: Touch = null;
    private _switchSprite: Sprite = null;
    private _curWeaponIndex: number = 0;
    private _slideSprite: Sprite = null;
    private _slideCD: number = 0;
    private _reloadingCD: number = 0;
    private _switchButton: Node = null;
    private _bulletCount: Label = null;

    start() {
        this._searchButton = this.node.getChildByName('Search');
        this._doorCardButton = this.node.getChildByName('Crack');
        this._doorVideoButton = this.node.getChildByName('CrackByVideo');
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
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.ShowEquipment, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshWeaponSwitchState, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this.ShowSearch, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_DOOR, this.ShowDoor, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.ShowEquipment, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshWeaponSwitchState, this);
    }

    protected update(dt: number): void {
        const player = ZRSJZ_Game.Instance?.CurPlayer;
        if (this._bulletCount && player) {
            this._bulletCount.string =
                `${player.MagazineAmmoCount}/${player.WarehouseAmmoCount}`;
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
            );
        }
    }

    //#region 射击
    OnTouchStart_Attack(event: EventTouch) {
        if (this._reloadingCD > 0) return;
        const player = ZRSJZ_Game.Instance?.CurPlayer;
        if (!ZRSJZ_Game.Instance.UnlimitedFirepower && player?.WeaponType === "枪" && player.MagazineAmmoCount <= 0) {
            if (player.WarehouseAmmoCount > 0) {
                this.Reload();
            } else {
                ZRSJZ_UIManager.Instance.ShowTip("没有子弹");
            }
            return;
        }

        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (!this._attackTouch) {
                this._attackTouch = touch;
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, true);
            }
        }
    }


    OnTouchEnd_Attack(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._attackTouch && touch.getID() == this._attackTouch.getID()) {
                this._attackTouch = null;
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false);
            }
        }
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
                if (this._targetDoor?.TryOpenWithRoomCard()) {
                    this.ShowDoor(null);
                }
                break;
            case "CrackByVideo": {
                const targetDoor = this._targetDoor;
                if (!targetDoor) break;
                Banner.Instance.ShowVideoAd(() => {
                    targetDoor.Open();
                    if (this._targetDoor === targetDoor) {
                        this.ShowDoor(null);
                    }
                })
                break;
            }
        }
    }

    // 切换武器
    SwitchWeapon(showTip: boolean = false, targetWeaponIndex: number = this._curWeaponIndex): boolean {
        const normalizedIndex = targetWeaponIndex % 2;
        if (!this.HasWeapon(normalizedIndex)) {
            this.RefreshWeaponSwitchState();
            if (showTip) ZRSJZ_UIManager.Instance.ShowTip("未装备对应武器，无法切换");
            return false;
        }

        this._curWeaponIndex = normalizedIndex;
        if (this._reloadingCD > 0) {
            this._reloadingCD = 0;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, 1, true);
        }
        if (this._attackTouch != null) {
            this._attackTouch = null;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false);
        }
        this._switchSprite.spriteFrame = this.SwitchSFs[this._curWeaponIndex % 2];
        this._attackSprite.spriteFrame = this.AttackSFs[this._curWeaponIndex % 2];
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, ZRSJZ_Joystick_Attack.WeaponType[this._curWeaponIndex % 2]);
        this._switchButton.active = this._curWeaponIndex % 2 == 0;
        this.RefreshWeaponSwitchState();
        return true;
    }

    /** index 0 对应枪，index 1 对应刀；ID 和道具实例必须同时存在。 */
    private HasWeapon(index: number): boolean {
        const weaponryIndex = index === 0 ? 0 : 4;
        const propID = ZRSJZ_GameData.Instance.WeaponryID[weaponryIndex];
        return !!propID && !!ZRSJZ_GameData.Instance.PropData[propID];
    }

    /** 只有枪和刀都存在时才有切换目标，因此才显示切换按钮。 */
    private RefreshWeaponSwitchState(): void {
        if (!this._switchSprite?.node?.isValid) return;

        const hasGun = this.HasWeapon(0);
        const hasKnife = this.HasWeapon(1);
        this._switchSprite.node.active = hasGun && hasKnife;
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
        if (this._slideCD > 0 || !ZRSJZ_Game.Instance.CurPlayer.IsSlide) return;
        if (this._attackTouch != null) {
            this._attackTouch = null;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false);
        }
        this._slideCD = ZRSJZ_Joystick_Attack.SlideCD;
        this._slideSprite.node.active = true;
        this._slideSprite.fillRange = 1;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE);
    }

    //换弹
    Reload() {
        if (this._reloadingCD > 0 || !ZRSJZ_Game.Instance.CurPlayer?.CanReload()) return;
        if (this._attackTouch != null) {
            this._attackTouch = null;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false);
        }
        this._reloadingCD = ZRSJZ_Joystick_Attack.LoadingCD;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, 0);
        ZRSJZ_AudioManager.Instance.PlaySound("换弹音效");
    }

    //搜索
    Search() {
        if (this._targetBox?.RequiresRewardVideo()) {
            if (this._targetBox.IsOpened()) {
                ZRSJZ_UIManager.Instance.ShowTip("医疗箱已经打开");
            } else {
                ZRSJZ_Game.Instance.GamePaused = true;
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.医疗箱弹窗, this._targetBox);
            }
            return;
        }
        if (this._targetBox?.RequiresPassword() && !this._targetBox.IsPasswordUnlocked()) {
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.密码箱弹窗, this._targetBox);
            return;
        }
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.物资弹窗, this._targetBox);
    }

    //加载技能按钮
    LoadSkillButton() {
        ZRSJZ_PoolManager.Instance.GetNode(ZRSJZ_ROLE_CONFIG.get(ZRSJZ_GameData.Instance.CurRole[0]).SkillPath).then((skillButton: Node) => {
            skillButton.parent = this.node;
            skillButton.active = true;
        })
    }

    ShowSearch(box: ZRSJZ_Box) {
        this._targetBox = box;
        this._searchButton.active = box != null;
    }

    ShowDoor(door: ZRSJZ_Door) {
        this._targetDoor = door;
        this._doorCardButton.active = door != null;
        this._doorVideoButton.active = door != null;
    }

    //装备切换
    ShowEquipment(equipmentName: string, isEquipment: boolean = true) {
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


