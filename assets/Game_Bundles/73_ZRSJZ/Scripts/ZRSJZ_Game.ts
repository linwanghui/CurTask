import { _decorator, Component, instantiate, math, Node, Prefab } from 'cc';
import { ZRSJZ_Tools } from './ZRSJZ_Tools';
import { ZRSJZ_GameCamera } from './Controller/ZRSJZ_GameCamera';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Game')
export class ZRSJZ_Game extends Component {

    @property(Node)
    MapParent: Node = null;

    @property(ZRSJZ_GameCamera)
    Camera: ZRSJZ_GameCamera = null;

    PlayerPoints: Node[] = [];
    PlayerParent: Node = null;
    Map: Node = null;

    protected start(): void {
        this.LoadMap();
    }

    LoadMap() {
        const map = "城镇";
        ZRSJZ_Tools.LoadPrefab("Prefabs/Map/" + map).then((prefab: Prefab) => {
            const map = instantiate(prefab);
            map.parent = this.MapParent;
            this.PlayerPoints = map.getChildByName("PlayerPoints")?.children;
            this.Map = map.getChildByName("Map");
            this.PlayerParent = this.Map.getChildByName("对象层 1");
            this.LoadPlayer();
        })

    }

    LoadPlayer() {
        ZRSJZ_Tools.LoadPrefab("Prefabs/Unit/Player").then((prefab: Prefab) => {
            const player = instantiate(prefab);
            player.parent = this.PlayerParent;
            player.setWorldPosition(this.PlayerPoints[math.randomRangeInt(0, this.PlayerPoints.length)].worldPosition.clone());
            this.Camera.Init(player, this.Map);
        })
    }

}


