import { _decorator, Component, Animation } from 'cc';
import { PoolManager } from '../Managers/PoolManager';
const { ccclass, property } = _decorator;


@ccclass('AniFinishRecycle')
export default class AniFinishRecycle extends Component {
    ani: Animation | null = null;
    protected onEnable(): void {
        this.ani = this.node.getComponent(Animation);
        this.ani.on(Animation.EventType.FINISHED, this.Put, this);
        this.ani.play();
    }
    protected onDisable(): void {
        this.ani?.off(Animation.EventType.FINISHED, this.Put, this);
    }
    Put() {
        PoolManager.PutNode(this.node);
    }
}