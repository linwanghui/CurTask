import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
import { ZRSJZ_Tools } from './ZRSJZ_Tools';
import { ZRSJZ_GameCamera } from './Controller/ZRSJZ_GameCamera';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Game')
export class ZRSJZ_Game extends Component {

    @property(Node)
    public PlayerPoint: Node = null;

    @property(Node)
    Map: Node = null;

    @property(ZRSJZ_GameCamera)
    Camera: ZRSJZ_GameCamera = null;

    protected start(): void {
        this.LoadPlayer();
    }

    LoadPlayer() {
        ZRSJZ_Tools.LoadPrefab("Prefabs/Unit/Player").then((prefab: Prefab) => {
            const player = instantiate(prefab);
            player.parent = this.Map;
            player.setWorldPosition(this.PlayerPoint.worldPosition.clone());
            this.Camera.Init(player, this.Map);
        })
    }

}


