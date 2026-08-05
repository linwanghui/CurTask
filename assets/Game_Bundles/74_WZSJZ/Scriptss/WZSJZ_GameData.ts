import { _decorator, Component, director, Node, sys } from 'cc';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';

const { ccclass, property } = _decorator;

@ccclass('WZSJZ_GameData')
export class WZSJZ_GameData extends Component {
    private static _instance: WZSJZ_GameData = null;
    private static _saveScheduled: boolean = false;
    public static get Instance(): WZSJZ_GameData {
        if (!this._instance) {
            this.ReadDate();
        }
        if (this._instance.node && !this._instance.node.parent) {
            director.addPersistRootNode(this._instance.node);
        }
        if (!this._saveScheduled && this._instance.node) {
            this._saveScheduled = true;
            this._instance.schedule(() => {
                WZSJZ_GameData.DateSave();
            }, 5);
        }
        return this._instance;
    }

    public static Maxversions: number = 0;//最高版本号
    public versions: number = 0;//版本号
    public Money: number = 100000;//钱



    public ChanggeMoney(num: number) {
        this.Money += num;
        WZSJZ_UIManager.Instance.SJZXD_Emit(WZSJZ_EventManager.货币变动, this.Money);
    }



    public GameData: number[] = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];//0.钥匙数量
    public TimeDate: number[] = [2023, 11, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];//0年1月2日3是否可以签到

    public static DateSave() {
        const data = WZSJZ_GameData.Instance;
        const json = JSON.stringify({
            versions: data.versions,
            Money: data.Money,
            GameData: data.GameData,
            TimeDate: data.TimeDate,
        });
        sys.localStorage.setItem("WZSJZ_DATA", json);
        console.log("游戏存档");
    }
    public static ReadDate() {
        let name = sys.localStorage.getItem("WZSJZ_DATA");
        const dataNode = new Node("WZSJZ_GameData");
        WZSJZ_GameData._instance = dataNode.addComponent(WZSJZ_GameData);
        if (name != "" && name != null) {
            console.log("读取存档");
            Object.assign(WZSJZ_GameData._instance, JSON.parse(name));
            WZSJZ_GameData.Instance.DataUp();//判断存档版本升级
        } else {
            console.log("新建存档");
        }
        //新一天判断
        var nowdate = new Date();
        var year = nowdate.getFullYear();           //年
        var month = nowdate.getMonth() + 1;         //月 获取当前月（注意：返回数值为0~11，需要自己+1来显示）
        var date = nowdate.getDate();               //日
        if (year != WZSJZ_GameData._instance.TimeDate[0] || month != WZSJZ_GameData._instance.TimeDate[1] || date != WZSJZ_GameData._instance.TimeDate[2]) {//新的一天
            WZSJZ_GameData._instance.TimeDate[0] = year;
            WZSJZ_GameData._instance.TimeDate[1] = month;
            WZSJZ_GameData._instance.TimeDate[2] = date;
            WZSJZ_GameData._instance.TimeDate[3] = 1;
        }
    }

    //存档版本升级
    DataUp() {
        if (this.versions == WZSJZ_GameData.Maxversions) {
            return;
        }
        switch (this.versions) {
            case 1:

                break;
        }
        console.log("存档版本已升级！");
        WZSJZ_GameData.DateSave();
        if (this.versions < WZSJZ_GameData.Maxversions) {
            this.DataUp();
        }
    }
}


