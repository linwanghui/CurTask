import { _decorator, Component, EventKeyboard, EventTouch, Touch, Input, input, KeyCode, Node, UITransform, Vec2, Vec3 } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Joystick')
export class ZRSJZ_Joystick extends Component {

    private _cameraArea: UITransform = null;

    private _joystickBase: UITransform = null;
    private _joystickDot: Node = null;
    private _movementTouch: Touch = null;

    private _attackBase: UITransform = null;
    private _attackDot: Node = null;
    private _attackTouch: Touch = null;

    start() {
        this._cameraArea = this.getComponent(UITransform);
        this._joystickBase = this.node.getChildByName('JoystickBase').getComponent(UITransform);
        this._joystickDot = this._joystickBase.node.getChildByName('JoystickDot');
        this._attackBase = this.node.getChildByName('AttackBase').getComponent(UITransform);
        this._attackDot = this._attackBase.node.getChildByName('AttackDot');

        let joystickArea = this.node.getChildByName(`JoystickArea`).getComponent(UITransform);
        joystickArea.node.on(Node.EventType.TOUCH_START, this.OnTouchStart_JoystickArea, this);
        joystickArea.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove_JoystickArea, this);
        joystickArea.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd_JoystickArea, this);
        joystickArea.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd_JoystickArea, this);

        this._attackBase.node.on(Node.EventType.TOUCH_START, this.OnTouchStart_Attack, this);
        this._attackBase.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove_Attack, this);
        this._attackBase.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd_Attack, this);
        this._attackBase.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd_Attack, this);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

    }

    onDestroy() { }

    //#region 移动
    OnTouchStart_JoystickArea(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            let x = touch.getUILocationX();
            let y = touch.getUILocationY();
            if (!this._movementTouch) {
                // we sub halfWidth,halfHeight here.
                // because, the touch event use left bottom as zero point(0,0), ui node use the center of screen as zero point(0,0)
                // this._ctrlRoot.setPosition(x - halfWidth, y - halfHeight, 0);

                let halfWidth = this._cameraArea.width / 2;
                let halfHeight = this._cameraArea.height / 2;

                this._joystickBase.node.active = true;
                this._joystickBase.node.setPosition(x - halfWidth, y - halfHeight, 0);
                this._joystickDot.setPosition(0, 0, 0);
                this._movementTouch = touch;
            }
        }
    }

    OnTouchMove_JoystickArea(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._movementTouch && touch.getID() == this._movementTouch.getID()) {
                let halfWidth = this._cameraArea.width / 2;
                let halfHeight = this._cameraArea.height / 2;
                let x = touch.getUILocationX();
                let y = touch.getUILocationY();

                let pos = this._joystickBase.node.position;
                let ox = x - halfWidth - pos.x;
                let oy = y - halfHeight - pos.y;

                let len = Math.sqrt(ox * ox + oy * oy);
                if (len <= 0) {
                    return;
                }

                let dirX = ox / len;
                let dirY = oy / len;
                let radius = this._joystickBase.width / 2;
                if (len > radius) {
                    len = radius;
                    ox = dirX * radius;
                    oy = dirY * radius;
                }

                this._joystickDot.setPosition(ox, oy, 0);
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, dirX, dirY, len / radius);
            }
        }
    }

    OnTouchEnd_JoystickArea(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._movementTouch && touch.getID() == this._movementTouch.getID()) {
                // director.getScene().emit(MyEvent.MOVEMENT_STOP)//移动停止
                this._movementTouch = null;
                // this._joystickBase.node.active = false;
                this._joystickDot.setPosition(Vec3.ZERO);
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, 0, 0, 0);
            }
        }
    }
    //#region 射击
    OnTouchStart_Attack(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (!this._attackTouch) {
                this._attackTouch = touch;
            }
        }
    }

    OnTouchMove_Attack(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._attackTouch && touch.getID() == this._attackTouch.getID()) {
                let halfWidth = this._cameraArea.width / 2;
                let halfHeight = this._cameraArea.height / 2;
                let x = touch.getUILocationX();
                let y = touch.getUILocationY();

                let pos = this._attackBase.node.position;
                let ox = x - halfWidth - pos.x;
                let oy = y - halfHeight - pos.y;

                let len = Math.sqrt(ox * ox + oy * oy);
                if (len <= 0) {
                    return;
                }

                let dirX = ox / len;
                let dirY = oy / len;
                let radius = this._attackBase.width / 2;
                if (len > radius) {
                    len = radius;
                    ox = dirX * radius;
                    oy = dirY * radius;
                }

                this._attackDot.setPosition(ox, oy, 0);

                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, dirX, dirY, len / radius);
            }
        }
    }

    OnTouchEnd_Attack(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._attackTouch && touch.getID() == this._attackTouch.getID()) {
                // director.getScene().emit(MyEvent.MOVEMENT_STOP)//移动停止
                this._attackTouch = null;
                this._attackDot.setPosition(Vec3.ZERO);
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, 0, 0, 0);
            }
        }
    }

    //#region 键盘监听
    private _keysRow = [];
    private _keysCol = [];

    dir: Vec2 = new Vec2(0, 0);

    onKeyDown(event: EventKeyboard) {
        let keyCode = event.keyCode;
        switch (keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.KEY_D:
                this._keysRow.push(keyCode);
                this.updateDirection();
                break;
            case KeyCode.KEY_W:
            case KeyCode.KEY_S:
                this._keysCol.push(keyCode);
                this.updateDirection();
                break;
            case KeyCode.KEY_P:
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.作弊界面);
                break;
        }
    }

    onKeyUp(event: EventKeyboard) {
        let keyCode = event.keyCode;
        switch (keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.KEY_D:
                this._keysRow.splice(this._keysRow.indexOf(keyCode), 1);
                this.updateDirection();
                break;
            case KeyCode.KEY_W:
            case KeyCode.KEY_S:
                this._keysCol.splice(this._keysCol.indexOf(keyCode), 1);
                this.updateDirection();
                break;
        }
    }

    private key2dirMap = null;

    updateDirection() {
        this.dir.set(
            this._keysRow.length == 0 ? 0 : this._keysRow[this._keysRow.length - 1] == KeyCode.KEY_A ? -1 : 1,
            this._keysCol.length == 0 ? 0 : this._keysCol[this._keysCol.length - 1] == KeyCode.KEY_S ? -1 : 1
        )
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.dir.x, this.dir.y, 1);
    }

}


