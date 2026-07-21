import { _decorator, Component, Node, Event, SystemEvent, systemEvent, macro, KeyCode } from 'cc';
const { ccclass, property } = _decorator;

import { EventManager, MyEvent } from "../Managers/EventManager";
// //**十字键 */

@ccclass('DPad')
export default class DPad extends Component {
    UpButton: Node | null = null;
    DownButton: Node | null = null;
    LeftButton: Node | null = null;
    RightButton: Node | null = null;
    x: number = 0;
    y: number = 0;
    onLoad() {
        this.UpButton = this.node.getChildByName("UpButton");
        this.DownButton = this.node.getChildByName("DownButton");
        this.LeftButton = this.node.getChildByName("LeftButton");
        this.RightButton = this.node.getChildByName("RightButton");
    }
    protected onEnable(): void {
        this.UpButton.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.UpButton.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.UpButton.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
        this.DownButton.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.DownButton.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.DownButton.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
        this.LeftButton.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.LeftButton.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.LeftButton.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
        this.RightButton.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.RightButton.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.RightButton.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);

        systemEvent.on(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.on(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }
    protected onDisable(): void {
        this.UpButton.off(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.UpButton.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.UpButton.off(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
        this.DownButton.off(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.DownButton.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.DownButton.off(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
        this.LeftButton.off(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.LeftButton.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.LeftButton.off(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
        this.RightButton.off(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.RightButton.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.RightButton.off(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);

        systemEvent.off(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.off(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }
    OnTouchStart(event: Event) {
        switch (event.target.name) {
            case "UpButton": this.y = 1; break;
            case "DownButton": this.y = -1; break;
            case "LeftButton": this.x = -1; break;
            case "RightButton": this.x = 1; break;
        }

        this.UpdateDirection();
    }
    OnTouchEnd(event: Event) {
        switch (event.target.name) {
            case "UpButton": this.y = 0; break;
            case "DownButton": this.y = 0; break;
            case "LeftButton": this.x = 0; break;
            case "RightButton": this.x = 0; break;
        }

        this.UpdateDirection();
    }
    UpdateDirection() {
        EventManager.Scene.emit(MyEvent.MOVEMENT, this.x, this.y, 1.0);
    }
    //    //#region 键盘控制
    private _keys = [];
    onKeyDown(event) {
        let keyCode = event.keyCode;
        if (keyCode == KeyCode.KEY_A || keyCode == KeyCode.KEY_S || keyCode == KeyCode.KEY_D || keyCode == KeyCode.KEY_W) {
            if (this._keys.indexOf(keyCode) == -1) {
                this._keys.push(keyCode);
                this.RefreshKey();
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
                    case KeyCode.KEY_D: this.x = 0; break;
                    case KeyCode.KEY_W:
                    case KeyCode.KEY_S: this.y = 0; break;
                }
                this.RefreshKey();
            }
        }
    }
    RefreshKey() {
        if (this._keys.some(e => e == KeyCode.KEY_A)) this.x = -1;
        if (this._keys.some(e => e == KeyCode.KEY_D)) this.x = 1;
        if (this._keys.some(e => e == KeyCode.KEY_W)) this.y = 1;
        if (this._keys.some(e => e == KeyCode.KEY_S)) this.y = -1;

        this.UpdateDirection();
    }
    //    //#endregion
}