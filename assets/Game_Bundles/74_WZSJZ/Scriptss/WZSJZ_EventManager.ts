import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_EventManager')
export class WZSJZ_EventManager {
    public static 货币变动 = "文字三角洲_货币变动";//参数为变动后的值
    public static 游戏开始 = "文字三角洲_游戏开始";//参数为当前围墙组件
    public static 拖拽物变化 = "文字三角洲_拖拽物变化";//参数为当前拖拽物，拖拽结束时为null
    public static 布阵变化 = "文字三角洲_布阵变化";//拖拽落位、合成、交换或回收后触发
    public static 组合单位变化 = "文字三角洲_组合单位变化";//参数为当前场上的组合单位组件数组
}


