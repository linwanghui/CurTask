import { _decorator, Component, director, Node } from 'cc';
import { ZRSJZ_GameData } from '../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
const { ccclass, property } = _decorator;
export class ZRSJZ_BNS_MyEvent {
    public static 进入交互对象范围: string = 'ZRSJZ_BNS_进入交互对象范围';//进入交互对象范围，参数0为对象Node
    public static 离开交互对象范围: string = 'ZRSJZ_BNS_离开交互对象范围';//离开交互对象范围，参数0为对象Node
    public static 交互被按下: string = 'ZRSJZ_BNS_交互被按下';//交互被按下，参数0为对象Node
    public static 资源数量改变: string = 'ZRSJZ_BNS_资源数量改变';//参数0为资源名称，参数1为最新数量
    public static 开启建筑指引: string = 'ZRSJZ_BNS_开启建筑指引';//参数0为目标建筑Node，参数1为到达关闭距离
}
@ccclass('ZRSJZ_BNS_EventManager')
export class ZRSJZ_BNS_EventManager extends Component {
    /**
     * 将基础包存档的通用回调出口接入 DLC 场景广播。
     * 由需要资源事件的 DLC 组件初始化，不会让基础包反向引用 DLC。
     */
    public static BindGameDataEvent(): void {
        ZRSJZ_GameData.BNS_PropertyChangeCallback = (propertyName, value) => {
            this.Emit(ZRSJZ_BNS_MyEvent.资源数量改变, propertyName, value);
        };
    }

    // 场景的事件监听
    public static On(type: string, callback: Function, target?: any) {
        director.getScene()?.on(type, callback, target);
    }
    public static Off(type: string, callback?: Function, target?: any) {
        director.getScene()?.off(type, callback, target);
    }
    public static Emit(type: string, ...args: any) {
        director.getScene()?.emit(type, ...args);
    }
}

