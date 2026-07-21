import { _decorator } from 'cc';
import { HealthAdvicePanel } from '../../UI/Panel/HealthAdvicePanel';


//** 全局常量脚本 */
export class Constant {

    public static Path = {
        Tip: "Prefabs/UI/Tip",
        MoreGameItem: "Prefabs/UI/MoreGameItem",
        NewMoreGameItem: "Prefabs/UI/NewMoreGameItem",
    }

    public static Scene = {
        Main: "Main",
    }

    public static Key = {
        AgreePolicy: "AgreePolicy",
        Money: "Money",
        EnergyBattery: "EnergyBattery",
        IsMusicOn: "IsMusicOn",
        IsSoundOn: "IsSoundOn",
        IsVibrateOn: "IsVibrateOn",
        AddShortcut: "AddShortcut",
    }

    public static Group = {
        Player: 1 << 5,
        Enemy: 1 << 6,
        Bullet: 1 << 7,
        Obstacle: 1 << 9,
    }

    //界面优先级
    public static PRIORITY = {
        NORMAL: 10,     //普通界面
        DIALOG: 100,    //弹窗的Z序
        REWARD: 200,    //奖励的弹窗
        WAITING: 300,   //等待界面弹窗
        TIPS: 400,      //提示
    }
}

export enum ColorHex {
    RED = "#960000",//红色
    PURPLE = "#7B0096",//紫色
    GREEN = "#0fff00",//绿色
    GOLD = "#CFBA5E",//金色
    BROWN = "#B87942"//棕色
}

export enum Quality {
    Common,// 普通（Common）
    Uncommon,// 优秀（Uncommon）
    Rare,// 稀有（Rare）
    Superior,// 精良（Superior）
    Epic,// 史诗（Epic）
    Legendary,// 传说（Legendary）
    Mythic,// 神话（Mythic）
}

export enum QualityColorHex {
    Common = "#858585",// 普通（Common）：白色
    Uncommon = "#2fa170",// 优秀（Uncommon）：绿色
    Rare = "#276abf",// 稀有（Rare）：蓝色
    Superior = "#7430b9",// 精良（Superior）：紫色
    Epic = "#cd23b2",// 史诗（Epic）：粉色
    Legendary = "#e09a1a",// 传说（Legendary）：金色
    Mythic = "#f03a39",// 神话（Mythic）：红色
}