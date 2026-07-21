import { _decorator, Component, Node, Event, Vec2, SystemEvent, systemEvent, Touch, Vec3, v2, macro, UITransform, KeyCode, EventTarget, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

import { EventManager, MyEvent } from "../Managers/EventManager";

@ccclass('Joystick')
export class Joystick extends Component {
    private _joystickBase: Node | null = null;
    private _joystickDot: Node | null = null;
    private _attack: Node | null = null;
    private _attackDot: Node | null = null;
    private _movementTouch: Touch = null;
    private _attackMovementTouch: Touch = null;
    protected onLoad(): void {
        let joystickArea = this.node.getChildByName(`JoystickArea`);
        joystickArea.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        joystickArea.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        joystickArea.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        joystickArea.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);

        this._joystickBase = this.node.getChildByName('JoystickBase');
        this._joystickDot = this._joystickBase.getChildByName('JoystickDot');

        this._attack = this.node.getChildByName(`Attack`);
        this._attackDot = this._attack.getChildByName(`AttackDot`);

        this._attack.on(Node.EventType.TOUCH_START, this.OnAttackTouchStart, this);
        this._attack.on(Node.EventType.TOUCH_MOVE, this.OnAttackTouchMove, this);
        this._attack.on(Node.EventType.TOUCH_END, this.OnAttackTouchEnd, this);
        this._attack.on(Node.EventType.TOUCH_CANCEL, this.OnAttackTouchEnd, this);

    }
    start() {
        systemEvent.on(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.on(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }
    onDestroy() { }
    OnTouchStart(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            let x = touch.getUILocationX();
            let y = touch.getUILocationY();
            if (!this._movementTouch) {
                // this._joystickBase.setPosition(x - this.node.width / 2, y - this.node.height / 2, 0);
                this._joystickDot.setPosition(0, 0, 0);
                this._movementTouch = touch;
            }
        }
    }
    OnTouchMove(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._movementTouch && touch.getID() == this._movementTouch.getID()) {
                let x = touch.getUILocationX();
                let y = touch.getUILocationY();

                let pos = this._joystickBase.position;
                let ox = x - this.node.getComponent(UITransform).width / 2 - pos.x;
                let oy = y - this.node.getComponent(UITransform).height / 2 - pos.y;

                let len = Math.sqrt(ox * ox + oy * oy);
                if (len <= 0) {
                    return;
                }

                let dirX = ox / len;
                let dirY = oy / len;
                let radius = this._joystickBase.getComponent(UITransform).width / 2;
                if (len > radius) {
                    len = radius;
                    ox = dirX * radius;
                    oy = dirY * radius;
                }

                this._joystickDot.setPosition(ox, oy, 0);

                // // degree 0 ~ 360 based on x axis.
                // let degree = Math.atan(dirY / dirX) / Math.PI * 180;
                // if (dirX < 0) {
                //     degree += 180;
                // }
                // else {
                //     degree += 360;
                // }

                EventManager.Scene.emit(MyEvent.MOVEMENT, dirX, dirY, len / radius);
            }
        }
    }
    OnTouchEnd(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._movementTouch && touch.getID() == this._movementTouch.getID()) {
                EventManager.Scene.emit(MyEvent.MOVEMENT_STOP);
                this._movementTouch = null;
                this._joystickDot.setPosition(Vec3.ZERO);
            }
        }
    }
    OnAttackTouchStart(event: EventTouch) {
        let touches = event.getTouches();
        EventManager.Scene.emit(MyEvent.Start_Fire);

        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            let x = touch.getUILocationX();
            let y = touch.getUILocationY();
            if (!this._attackMovementTouch) {
                // this._joystickBase.setPosition(x - this.node.width / 2, y - this.node.height / 2, 0);
                this._attackDot.setPosition(0, 0, 0);
                this._attackMovementTouch = touch;
            }
        }
    }
    OnAttackTouchMove(event: EventTouch) {
        let touches = event.getTouches();

        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._attackMovementTouch && touch.getID() == this._attackMovementTouch.getID()) {
                let x = touch.getUILocationX();
                let y = touch.getUILocationY();

                let pos = this._attack.position;
                let ox = x - this.node.getComponent(UITransform).width / 2 - pos.x;
                let oy = y - this.node.getComponent(UITransform).height / 2 - pos.y;

                let len = Math.sqrt(ox * ox + oy * oy);
                if (len <= 0) {
                    return;
                }

                let dirX = ox / len;
                let dirY = oy / len;
                let radius = this._attack.getComponent(UITransform).width / 2;
                if (len > radius) {
                    len = radius;
                    ox = dirX * radius;
                    oy = dirY * radius;
                }

                this._attackDot.setPosition(ox, oy, 0);
                EventManager.Scene.emit(MyEvent.SET_ATTACK_DIR, v2(dirX, dirY));
            }
        }
    }
    OnAttackTouchEnd(event: EventTouch) {
        let touches = event.getTouches();
        EventManager.Scene.emit(MyEvent.Stop_Fire);

        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (this._attackMovementTouch && touch.getID() == this._attackMovementTouch.getID()) {
                this._attackMovementTouch = null;
                this._attackDot.setPosition(Vec3.ZERO);
            }
        }
    }
    //    //#region 键盘控制
    private _keys = [];
    private _dir: Vec2 = new Vec2(0, 0);
    onKeyDown(event) {
        let keyCode = event.keyCode;
        if (keyCode == KeyCode.KEY_A || keyCode == KeyCode.KEY_S || keyCode == KeyCode.KEY_D || keyCode == KeyCode.KEY_W) {
            if (this._keys.indexOf(keyCode) == -1) {
                this._keys.push(keyCode);
                this.updateDirection();
            }
        }

        if (keyCode == keyCode.SPACE) {
            // EventManager.Scene.emit(MyEvent.JUMP);
        }
    }
    onKeyUp(event) {
        let keyCode = event.keyCode;
        if (keyCode == KeyCode.KEY_A || keyCode == KeyCode.KEY_S || keyCode == KeyCode.KEY_D || keyCode == KeyCode.KEY_W) {
            let index = this._keys.indexOf(keyCode);
            if (index != -1) {
                this._keys.splice(index, 1);
                switch (keyCode) {
                    case KeyCode.KEY_A:
                    case KeyCode.KEY_D: this._dir.x = 0; break;
                    case KeyCode.KEY_W:
                    case KeyCode.KEY_S: this._dir.y = 0; break;
                }
                this.updateDirection();
            }
        }
    }
    updateDirection() {
        if (this._keys.some(e => e == KeyCode.KEY_A)) this._dir.x = -1;
        if (this._keys.some(e => e == KeyCode.KEY_D)) this._dir.x = 1;
        if (this._keys.some(e => e == KeyCode.KEY_W)) this._dir.y = 1;
        if (this._keys.some(e => e == KeyCode.KEY_S)) this._dir.y = -1;

        EventManager.Scene.emit(MyEvent.MOVEMENT, this._dir.x, this._dir.y, 1.0);
    }
    //    //#endregion
}