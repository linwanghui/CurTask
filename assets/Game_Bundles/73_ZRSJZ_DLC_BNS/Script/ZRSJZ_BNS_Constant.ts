import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

export type ZRSJZ_BNS_ResourceName = "木材" | "矿石" | "食物" | "宝石";
export type ZRSJZ_BNS_GatherConfig = {
    propertyName: ZRSJZ_BNS_ResourceName,
    minCount: number,
    maxCount: number,
    aniName: string,
};

@ccclass('ZRSJZ_BNS_Constant')
export class ZRSJZ_BNS_Constant {

    public static 砍树动画: string = "gj_dao3";
    public static 挖矿动画: string = "gj_dao3";
    public static 采集动画: string = "gj_dao3";

    public static 采集配置: { [nodeName: string]: ZRSJZ_BNS_GatherConfig } = {
        "桦树": { propertyName: "木材", minCount: 100, maxCount: 200, aniName: ZRSJZ_BNS_Constant.砍树动画 },
        "松树": { propertyName: "木材", minCount: 100, maxCount: 200, aniName: ZRSJZ_BNS_Constant.砍树动画 },
        "铁矿": { propertyName: "矿石", minCount: 80, maxCount: 140, aniName: ZRSJZ_BNS_Constant.挖矿动画 },
        "金矿": { propertyName: "矿石", minCount: 150, maxCount: 250, aniName: ZRSJZ_BNS_Constant.挖矿动画 },
        "钻石矿": { propertyName: "宝石", minCount: 5, maxCount: 15, aniName: ZRSJZ_BNS_Constant.挖矿动画 },
        "果丛": { propertyName: "食物", minCount: 60, maxCount: 120, aniName: ZRSJZ_BNS_Constant.采集动画 },
    };

}


