import { _decorator, Component, EventKeyboard, EventTouch, Touch, Input, input, KeyCode, Node, UITransform, Vec2, Vec3, SpriteFrame, Sprite } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
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

    private _attackSprite: Sprite = null;
    private _attackTouch: Touch = null;
    private _switchSprite: Sprite = null;
    private _curWeaponIndex: number = 0;
    private _slideSprite: Sprite = null;
    private _slideCD: number = 0;
    private _reloading: Node = null;
    private _reloadingSprite: Sprite = null;
    private _reloadingCD: number = 0;

    start() {
        this._attackSprite = this.node.getChildByName('Attack').getComponent(Sprite);
        this._switchSprite = this.node.getChildByName('Switch').getComponent(Sprite);
        this._slideSprite = this.node.getChildByPath('Slide/CD').getComponent(Sprite);
        this._reloading = this.node.getChildByName('Reloading');
        this._reloadingSprite = this.node.getChildByPath('Reloading/Loading').getComponent(Sprite);

        this._attackSprite.node.on(Node.EventType.TOUCH_START, this.OnTouchStart_Attack, this);
        this._attackSprite.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd_Attack, this);
        this._attackSprite.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd_Attack, this);

        this._curWeaponIndex = ZRSJZ_GameData.Instance.WeaponryID[0] ? 0 : 1;
        this.SwitchWeapon();
    }

    protected update(dt: number): void {
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
                this._reloading.active = false;
            }
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, (ZRSJZ_Joystick_Attack.LoadingCD - this._reloadingCD) / ZRSJZ_Joystick_Attack.LoadingCD);
            // this._reloadingSprite.fillRange = (ZRSJZ_Joystick_Attack.LoadingCD - this._reloadingCD) / ZRSJZ_Joystick_Attack.LoadingCD;
        }
    }

    //#region 射击
    OnTouchStart_Attack(event: EventTouch) {
        if (this._reloadingCD > 0) return;
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
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, 1);
        }
        if (this._attackTouch != null) {
            this._attackTouch = null;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false);
        }
        this._switchSprite.spriteFrame = this.SwitchSFs[this._curWeaponIndex % 2];
        this._attackSprite.spriteFrame = this.AttackSFs[this._curWeaponIndex % 2];
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, ZRSJZ_Joystick_Attack.WeaponType[this._curWeaponIndex % 2]);
    }

    //滑铲
    Slide() {
        if (this._attackTouch != null) {
            this._attackTouch = null;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false);
        }
        if (this._slideCD > 0) return;
        this._slideCD = ZRSJZ_Joystick_Attack.SlideCD;
        this._slideSprite.node.active = true;
        this._slideSprite.fillRange = 1;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE);
    }

    //换弹
    Reload() {
        if (this._attackTouch != null) {
            this._attackTouch = null;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false);
        }
        if (this._reloadingCD > 0) return;
        this._reloadingCD = ZRSJZ_Joystick_Attack.LoadingCD;
        // this._reloading.active = true;
        // this._reloadingSprite.fillRange = 0;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, 0);
    }

    //搜索
    Search() {
        console.error("搜索");
    }

}


