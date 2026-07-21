import { _decorator, JsonAsset, Node } from 'cc';
import { ResourceUtil } from '../Utils/ResourceUtil';
import { PhysicsManager } from './PhysicsManager';
import { GameManager } from '../../GameManager';
import Banner from '../../Banner';

export class DataManager {
    private static LocalGameData: GameData[] = [];
    private static RemoteGameData: GameData[] = [];
    static AllGameData: GameData[] = [];

    private static _gameData: GameData[] = [];
    public static get GameData() {
        if (GameManager.ShowAllGame) {
            this._gameData = DataManager.AllGameData;
            return this._gameData;
        }

        if (Banner.IsShowServerBundle) {
            this._gameData = [...DataManager.LocalGameData, ...DataManager.RemoteGameData]
        }
        else {
            this._gameData = DataManager.LocalGameData;
        }

        return this._gameData;
    };

    public static async LoadData() {
        try {
            //游戏数据
            const ja = await ResourceUtil.LoadJson("GameData") as JsonAsset;
            const data = ja.json as any;

            let localGameNames = [];
            let remoteGameNames = [];

            for (let i = 0; i < data.LocalGameData.length; i++) {
                localGameNames.push(data.LocalGameData[i]);
            }

            for (let i = 0; i < data.RemoteGameData.length; i++) {
                remoteGameNames.push(data.RemoteGameData[i]);
            }

            for (let i = 0; i < data.AllGameData.length; i++) {
                let e = data.AllGameData[i];
                DataManager.AllGameData.push(new GameData(e.gameName, e.startScene, e.bundles, e.collisionMatrix));
            }

            //筛选出符合条件的数据
            for (let i = 0; i < localGameNames.length; i++) {
                const data = this.AllGameData.find(e => e.gameName == localGameNames[i]);
                this.LocalGameData.push(data);
            }

            for (let i = 0; i < remoteGameNames.length; i++) {
                const data = this.AllGameData.find(e => e.gameName == remoteGameNames[i]);
                this.RemoteGameData.push(data);
            }

            let str = "";
            this.LocalGameData.forEach(e => str += `[${e.gameName}] `);
            console.log(`本地游戏：${str}`);
            str = ""
            this.RemoteGameData.forEach(e => str += `[${e.gameName}] `);
            console.log(`远程游戏：${str}`);

        } catch (error) {
            console.error("Error loading game data:", error);
            return [];
        }
    }

    //**加载需要的资源 */
    public static async GetBundles(): Promise<string[]> {
        await DataManager.LoadData();

        let bundles: string[] = [];

        //添加本地分包
        this.LocalGameData.forEach(e => e.Bundles.forEach(e => { if (e) bundles.push(e) }));

        let str = ""
        bundles.forEach(e => str += `[${e}] `);
        console.log(`需要加载的本地包：${str}`);

        return bundles;
    }

    public static GetStartGameData() {
        return this.LocalGameData[0];
    }

    public static GetGameDataByName(name: string): GameData {
        return this.AllGameData.find(e => e.gameName == name);
    }

    //**判断是否为本地游戏 */
    public static IsLoaclGame(data: GameData): boolean {
        if (this.LocalGameData.find(e => e == data)) return true;
        return false;
    }

    //**判断是否为远程游戏 */
    public static IsRemoteGame(data: GameData): boolean {
        if (this.RemoteGameData.find(e => e == data)) return true;
        return false;
    }

    //**通过游戏名字获取物理分层的数据 */
    public static GetGameData(name: string) {
        return this.AllGameData.find(e => e.gameName == name);
    }

    public static IsBundleGame(data: GameData): boolean {
        if (this.LocalGameData.find(e => e == data)) return true;
        if (this.RemoteGameData.find(e => e == data)) return true;
        return false;
    }
}

export class GameData {
    constructor(public gameName: string, public startScene: string, private bundles: string, public collisionMatrix: string) {
        let index = 0;

        for (let i = 1; i <= (1 << PhysicsManager.maxLayer); i <<= 1) {
            this.matrices.set(i, parseInt(this.collisionMatrix.split(`-`)[index], 2));
            index++;
        }
    }

    matrices: Map<number, number> = new Map();

    get Bundles() {
        return this.bundles.split(`,`).map(str => str.trim());
    }

    get DefaultBundle() {
        return this.Bundles[0];
    }

    GetMatrixByLayer(layer: number): number {
        if (this.matrices.has(layer)) {
            return this.matrices.get(layer);
        }
        console.error(`[${this.gameName}]中没有找到层[${layer}]的物理层数据`);
        return -1;
    }
}