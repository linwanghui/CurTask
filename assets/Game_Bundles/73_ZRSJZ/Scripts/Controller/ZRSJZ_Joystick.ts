import { _decorator, Component, EventKeyboard, EventTouch, Touch, Game, game, Input, input, KeyCode, Node, UITransform, Vec2, Vec3, v3 } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Joystick')
export class ZRSJZ_Joystick extends Component {
    PlayerIndex: number = 0;

    private _cameraArea: UITransform = null;

    private _joystickBase: UITransform = null;
    private _joystickDot: Node = null;
    private _movementTouch: Touch = null;
    private _inputCanvas: HTMLCanvasElement | null = null;

    start() {
        this._cameraArea = this.getComponent(UITransform);
        this._joystickBase = this.node.getChildByName('JoystickBase').getComponent(UITransform);
        this._joystickDot = this._joystickBase.node.getChildByName('JoystickDot');

        let joystickArea = this.node.getChildByName(`JoystickArea`).getComponent(UITransform);
        joystickArea.node.on(Node.EventType.TOUCH_START, this.OnTouchStart_JoystickArea, this);
        joystickArea.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove_JoystickArea, this);
        joystickArea.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd_JoystickArea, this);
        joystickArea.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd_JoystickArea, this);

    }

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.on(Game.EVENT_HIDE, this.resetMovement, this);
        if (typeof window !== 'undefined') {
            window.addEventListener('blur', this.resetMovement);
        }
        if (typeof document !== 'undefined') {
            this._inputCanvas = game.canvas;
            this._inputCanvas?.addEventListener('blur', this.resetMovement);
            document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
            document.addEventListener('visibilitychange', this.onVisibilityChange);
        }
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.off(Game.EVENT_HIDE, this.resetMovement, this);
        if (typeof window !== 'undefined') {
            window.removeEventListener('blur', this.resetMovement);
        }
        if (typeof document !== 'undefined') {
            this._inputCanvas?.removeEventListener('blur', this.resetMovement);
            this._inputCanvas = null;
            document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
        }
        this.resetMovement();
    }

    private onDocumentPointerDown = (event: PointerEvent): void => {
        // 同一网页内点击画布外不会触发 window.blur；捕获阶段也能覆盖阻止冒泡的页面控件。
        if (this._inputCanvas && event.target !== this._inputCanvas) {
            this.resetMovement();
        }
    };

    private onVisibilityChange = (): void => {
        if (document.hidden) this.resetMovement();
    };

    // 失焦后可能收不到 KEY_UP，主动清空输入并通知玩家停止。
    private resetMovement = (): void => {
        this._keysRow.length = 0;
        this._keysCol.length = 0;
        this.dir.set(0, 0);
        this._movementTouch = null;
        this._joystickDot?.setPosition(Vec3.ZERO);
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, 0, 0, 0, this.PlayerIndex);
    };

    //#region 移动
    OnTouchStart_JoystickArea(event: EventTouch) {
        let touches = event.getTouches();
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            if (!this._movementTouch) {
                const local = this._cameraArea.convertToNodeSpaceAR(v3(
                    touch.getUILocationX(), touch.getUILocationY(), 0,
                ));

                this._joystickBase.node.active = true;
                this._joystickBase.node.setPosition(local);
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
                const local = this._cameraArea.convertToNodeSpaceAR(v3(
                    touch.getUILocationX(), touch.getUILocationY(), 0,
                ));

                let pos = this._joystickBase.node.position;
                let ox = local.x - pos.x;
                let oy = local.y - pos.y;

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
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, dirX, dirY, len / radius, this.PlayerIndex);
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
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, 0, 0, 0, this.PlayerIndex);
            }
        }
    }

    //#region 键盘监听
    private _keysRow = [];
    private _keysCol = [];

    dir: Vec2 = new Vec2(0, 0);

    onKeyDown(event: EventKeyboard) {
        if (this.PlayerIndex !== 0) return;
        let keyCode = event.keyCode;
        switch (keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.KEY_D:
                if (this._keysRow.indexOf(keyCode) !== -1) return;
                this._keysRow.push(keyCode);
                this.updateDirection();
                break;
            case KeyCode.KEY_W:
            case KeyCode.KEY_S:
                if (this._keysCol.indexOf(keyCode) !== -1) return;
                this._keysCol.push(keyCode);
                this.updateDirection();
                break;
        }
    }

    onKeyUp(event: EventKeyboard) {
        if (this.PlayerIndex !== 0) return;
        let keyCode = event.keyCode;
        switch (keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.KEY_D:
                if (this._keysRow.indexOf(keyCode) === -1) return;
                this._keysRow.splice(this._keysRow.indexOf(keyCode), 1);
                this.updateDirection();
                break;
            case KeyCode.KEY_W:
            case KeyCode.KEY_S:
                if (this._keysCol.indexOf(keyCode) === -1) return;
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
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.dir.x, this.dir.y, 1, this.PlayerIndex);
    }

}


