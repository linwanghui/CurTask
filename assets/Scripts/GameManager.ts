import { _decorator, Component, director, Node, PhysicsSystem2D, sys } from 'cc';
import { GameData } from './Framework/Managers/DataManager';
import Banner from './Banner';
import { PhysicsManager } from './Framework/Managers/PhysicsManager';
import PrefsManager from './Framework/Managers/PrefsManager';
const { ccclass, property } = _decorator;

//所有游戏的总管理脚本
@ccclass('GameManager')
export class GameManager extends Component {

    static Instance: GameManager = null;

    //规范统一，需要添加的游戏固定以 游戏名缩写_PathData脚本作为链接文本配置，方便打包查询修改(因为可能路径文本内容需要更改)
    //可以参考SJZXD_PathData的配置
    static PathShow: boolean = false;//路径显示(一般用于抖音无广链接)

    //**是否显示所有的游戏 */
    static ShowAllGame: boolean = false;

    //**当前游戏的数据 */
    static GameData: GameData = null;

    //**游戏的总开始场景 */
    static StartScene: string = `Start`;

    /**全局奖励，用于平台奖励 */
    public static get RewardItemCount(): number {
        return PrefsManager.GetNumber("GameCommonReward", 0);
    }

    public static set RewardItemCount(value: number) {
        value = Math.floor(value);
        PrefsManager.SetNumber("GameCommonReward", value);
    }

    protected onLoad(): void {
        GameManager.Instance = this;
        director.addPersistRootNode(this.node);
        PhysicsSystem2D.instance.debugDrawFlags = 0;

        this.InitPools();
    }

    start() {
        Banner.Instance.Init();
    }

    InitPools() {

    }

}