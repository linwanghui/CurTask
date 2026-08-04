import { _decorator, Component, EventKeyboard, EventTouch, Touch, Input, input, KeyCode, Node, UITransform, Vec2, Vec3, SpriteFrame, Sprite, Label } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_ROLE_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
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
        this._attackSprite = this.node.getChildByName('Attack').getComponent(Sprite);
        this._switchSprite = this.node.getChildByName('Switch').getComponent(Sprite);
        this._slideSprite = this.node.getChildByPath('Slide/CD').getComponent(Sprite);
        this._switchButton = this.node.getChildByPath("Reload");
        this._bulletCount = this.node.getChildByPath("Reload/Count").getComponent(Label);

        this._attackSprite.node.on(Node.EventType.TOUCH_START, this.OnTouchStart_Attack, this);
        this._attackSprite.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd_Attack, this);
        this._attackSprite.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd_Attack, this);

        this._curWeaponIndex = ZRSJZ_GameData.Instance.WeaponryID[0] ? 0 : 1;
        this.SwitchWeapon();
        this.LoadSkillButton();
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this.ShowSearch, this);
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
                this._curWeaponIndex++;
                this.SwitchWeapon();
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
        }
    }

    // 切换武器
    SwitchWeapon() {
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
}


