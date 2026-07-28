import { director } from "cc";
import { ZRSJZ_UIManager } from "./ZRSJZ_UIManager";

export class ZRSJZ_MyEvent {
    public static ZRSJZ_LOADED_DLC: string = 'ZRSJZ_LOADED_DLC';//DLC加载完毕

    public static ZRSJZ_PLAYER_MOVE: string = 'ZRSJZ_PLAYER_MOVE';//玩家移动
    public static ZRSJZ_PLAYER_ATTACK: string = 'ZRSJZ_PLAYER_ATTACK';//射击
    public static ZRSJZ_PLAYER_SWITCH_WEAPON: string = 'ZRSJZ_PLAYER_SWITCH_WEAPON';//切换武器
    public static ZRSJZ_PLAYER_RELOAD: string = 'ZRSJZ_PLAYER_RELOAD';//装填弹药
    public static ZRSJZ_PLAYER_SLIDE: string = 'ZRSJZ_PLAYER_SLIDE';//滑铲

    public static ZRSJZ_CURRENCY_CHANGE: string = 'ZRSJZ_CURRENCY_CHANGE';//货币发生变动
    public static ZRSJZ_PROP_MOVE: string = 'ZRSJZ_PROP_MOVE';//道具拖动
    public static ZRSJZ_GRID_SHOW: string = 'ZRSJZ_GRID_SHOW';//格子显示
    public static ZRSJZ_GRID_MOVE: string = 'ZRSJZ_GRID_MOVE';//格子移动
    public static ZRSJZ_EMPTY_GRID_REMOVE: string = 'ZRSJZ_EMPTY_GRID_REMOVE';//删除格子
    public static ZRSJZ_CHECK_PROP: string = 'ZRSJZ_CHECK_PROP';//道具移动判断
    public static ZRSJZ_SELL_PROP: string = 'ZRSJZ_SELL_PROP';//道具出售 
    public static ZRSJZ_SELL_PROP_ADD: string = 'ZRSJZ_SELL_PROP_ADD';//添加道具出售ID 
    public static ZRSJZ_SELL_PROP_SHOW: string = 'ZRSJZ_SELL_PROP_SHOW';//道具显示出售图标
    public static ZRSJZ_SELL_PROP_HIDE: string = 'ZRSJZ_SELL_PROP_HIDE';//道具隐藏出售图标
    public static ZRSJZ_SHOW_ROLE_ITEM: string = 'ZRSJZ_SHOW_ROLE_ITEM';//角色选中显示
    public static ZRSJZ_SHOW_ROLE_DESC: string = 'ZRSJZ_SHOW_ROLE_DESC';//显示角色描述
    public static ZRSJZ_SHOW_EQUIPMENT: string = 'ZRSJZ_SHOW_EQUIPMENT';//显示皮肤装备
}

export class ZRSJZ_EventManager {

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

    // 常驻节点的事件监听
    public static OnPersist(type: string, callback: Function, target?: any) {
        ZRSJZ_UIManager.Instance?.node.on(type, callback, target);
    }
    public static OffPersist(type: string, callback?: Function, target?: any) {
        ZRSJZ_UIManager.Instance?.node.off(type, callback, target);
    }
    public static EmitPersist(type: string, ...args: any) {
        ZRSJZ_UIManager.Instance?.node.emit(type, ...args);
    }

}


