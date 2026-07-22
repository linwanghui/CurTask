import { _decorator, Component, director, Node } from 'cc';
const { ccclass, property } = _decorator;
export class ZRSJZ_BNS_MyEvent {
    public static 进入交互对象范围: string = 'ZRSJZ_BNS_进入交互对象范围';//进入交互对象范围，参数0为对象Node
    public static 离开交互对象范围: string = 'ZRSJZ_BNS_离开交互对象范围';//离开交互对象范围，参数0为对象Node
    public static 交互被按下: string = 'ZRSJZ_BNS_交互被按下';//交互被按下，参数0为对象Node
}
@ccclass('ZRSJZ_BNS_EventManager')
export class ZRSJZ_BNS_EventManager extends Component {
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


