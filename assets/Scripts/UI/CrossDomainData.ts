import { _decorator, Component, Node, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CrossDomainData')
export class CrossDomainData extends Component {
    //跨域游戏资产
    private static _instance: CrossDomainData = null;
    public static get Instance(): CrossDomainData {
        if (!this._instance) {
            this.ReadDate();
        }
        return this._instance;
    }
    //超级硬币
    private _coin: number = 0;
    public get Coin(): number {
        return this._coin;
    }
    public set Coin(value: number) {
        this._coin = value;
        CrossDomainData.DateSave();
    }

    public static DateSave() {
        let json = JSON.stringify(CrossDomainData.Instance);
        sys.localStorage.setItem("CrossDomainData", json);
        console.log("跨域数据存档");
    }
    public static ReadDate() {
        let name = sys.localStorage.getItem("CrossDomainData");
        if (name != "" && name != null) {
            console.log("跨域数据读取");
            CrossDomainData._instance = Object.assign(new CrossDomainData(), JSON.parse(name));
        } else {
            console.log("新建跨域数据");
            CrossDomainData._instance = new CrossDomainData();
        }


    }

}


