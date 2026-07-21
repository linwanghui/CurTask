import { _decorator, Component, Node, v2, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SkyLineItem')
export class SkyLineItem {

    /** 稀有度 */
    rare = 0;
    /** 类型 */
    type = 0;
    /** 数量 */
    num = 0;
    /** 最大数量 */
    maxNum = 1;
    /** 价格 */
    price = 0;
    /** 物品名称 */
    itemName: string;

    /** X坐标 */
    x = 0;
    /** Y坐标 */
    y = 0;
    /** 宽度 */
    width = 0;
    /** 高度 */
    height = 0;
    /** 位置 */
    public get Pos(): Vec2 {
        return v2(this.x, this.y);
    }
    public set Pos(value: Vec2) {
        this.x = value.x;
        this.y = value.y;
    }

    /** 尺寸 */
    public get Size(): Vec2 {
        return v2(this.width, this.height);
    }
    public set Size(value: Vec2) {
        this.width = value.x;
        this.height = value.y;
    }
}


