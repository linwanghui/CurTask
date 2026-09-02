import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_EventManager')
export class WZSJZ_EventManager {
    public static 货币变动 = "文字三角洲_货币变动";//参数为变动后的值
    public static 体力变动 = "文字三角洲_体力变动";//参数：当前体力、体力上限
    public static 钻石变动 = "文字三角洲_钻石变动";//参数：当前钻石
    public static 招募卡变动 = "文字三角洲_招募卡变动";//参数：当前招募卡数量
    public static 钥匙变动 = "文字三角洲_钥匙变动";//参数：当前钥匙数量
    public static 挂机宝箱变动 = "文字三角洲_挂机宝箱变动";//参数：挂机宝箱快照
    public static 关卡进度变动 = "文字三角洲_关卡进度变动";//参数：首页关卡进度快照
    public static 游戏开始 = "文字三角洲_游戏开始";//参数为当前围墙组件
    public static 敌人死亡 = "文字三角洲_敌人死亡";//参数：死亡的敌人组件
    public static Boss逃跑 = "文字三角洲_Boss逃跑";//参数：逃跑的Boss组件
    public static 城墙摧毁 = "文字三角洲_城墙摧毁";//参数：被摧毁的城墙组件
    public static 战斗阶段变动 = "文字三角洲_战斗阶段变动";//参数：是否处于本轮战斗阶段
    public static 回合公告 = "文字三角洲_回合公告";//参数：Boss来袭或Boss暂退
    public static 拖拽物变化 = "文字三角洲_拖拽物变化";//参数为当前拖拽物，拖拽结束时为null
    public static 布阵变化 = "文字三角洲_布阵变化";//拖拽落位、合成、交换或回收后触发
    public static 组合单位变化 = "文字三角洲_组合单位变化";//参数为当前场上的组合单位组件数组
    public static 修改增加资源 = "文字三角洲_修改增加资源";//参数：钞票数量、食物数量
    public static 修改增加钥匙 = "文字三角洲_修改增加钥匙";//参数：钥匙数量
    public static 修改添加单位 = "文字三角洲_修改添加单位";//参数：单位名（可附带等级）
    public static 修改添加敌人 = "文字三角洲_修改添加敌人";//参数：敌人名
    public static 修改城墙无敌 = "文字三角洲_修改城墙无敌";//无参数，切换永久无敌状态
    public static 修改批量生成小怪 = "文字三角洲_修改批量生成小怪";//无参数，切换普通小怪定时生成
    public static 修改无限技能 = "文字三角洲_修改无限技能";//无参数，切换全部技能无CD

    /** 修改面板属于常驻UI，通过当前游戏管理节点向场景模块广播命令。 */
    private static _sceneEventNode: Node = null;

    public static BindSceneEventNode(node: Node): void {
        this._sceneEventNode = node;
    }

    public static EmitScene(type: string, ...args: any[]): boolean {
        if (!this._sceneEventNode?.isValid) {
            return false;
        }
        this._sceneEventNode.emit(type, ...args);
        return true;
    }
}


