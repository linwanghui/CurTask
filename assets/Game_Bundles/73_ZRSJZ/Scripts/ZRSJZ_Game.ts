import { _decorator, Component, EventTouch, instantiate, math, Node, Prefab, Vec3 } from 'cc';
import { ZRSJZ_Tools } from './ZRSJZ_Tools';
import { ZRSJZ_GameCamera } from './Controller/ZRSJZ_GameCamera';
import { ZRSJZ_Map } from './Controller/ZRSJZ_Map';
import { ZRSJZ_PoolManager } from './Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Effect_CB } from './Effect/ZRSJZ_Effect_CB';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from './ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Game')
export class ZRSJZ_Game extends Component {
    public static Instance: ZRSJZ_Game = null;

    @property(Node)
    MapParent: Node = null;

    @property(ZRSJZ_GameCamera)
    Camera: ZRSJZ_GameCamera = null;

    CurMap: ZRSJZ_Map = null;

    protected onLoad(): void {
        ZRSJZ_Game.Instance = this;
    }

    protected start(): void {
        this.LoadMap();
    }

    LoadMap() {
        const map = "城镇";
        ZRSJZ_Tools.LoadPrefab("Prefabs/Map/" + map).then((prefab: Prefab) => {
            const map = instantiate(prefab);
            map.parent = this.MapParent;
            this.CurMap = map.getComponent(ZRSJZ_Map);
            this.CurMap.Init();
            this.LoadPlayer();
        })
    }

    LoadPlayer() {
        ZRSJZ_Tools.LoadPrefab("Prefabs/Unit/Player").then((prefab: Prefab) => {
            const player = instantiate(prefab);
            player.parent = this.CurMap.Unit;
            player.setWorldPosition(this.CurMap.PlayerPoints[math.randomRangeInt(0, this.CurMap.PlayerPoints.length)].worldPosition.clone());
            this.Camera.Init(player, this.CurMap.Map);
        })
    }

    async CreateDieEffect(worldPos: Vec3) {
        const effect = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/DieEffect");
        effect.parent = this.CurMap.BulletParent;
        effect.getComponent(ZRSJZ_Effect_CB).Show(worldPos);
    }

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "小地图":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.地图弹窗);
                break;
        }
    }

}


