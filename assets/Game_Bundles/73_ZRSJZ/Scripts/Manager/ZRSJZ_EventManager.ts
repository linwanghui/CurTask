import { director } from "cc";
import { ZRSJZ_UIManager } from "./ZRSJZ_UIManager";

export class ZRSJZ_MyEvent {
    public static ZRSJZ_LOADED_DLC: string = 'ZRSJZ_LOADED_DLC';//DLC加载完毕
    public static ZRSJZ_LOADED_UI: string = 'ZRSJZ_LOADED_UI';//UI加载完毕

    public static ZRSJZ_PLAYER_MOVE: string = 'ZRSJZ_PLAYER_MOVE';//玩家移动
    public static ZRSJZ_PLAYER_ATTACK: string = 'ZRSJZ_PLAYER_ATTACK';//射击
    public static ZRSJZ_PLAYER_SWITCH_WEAPON: string = 'ZRSJZ_PLAYER_SWITCH_WEAPON';//切换武器
    public static ZRSJZ_PLAYER_RELOAD: string = 'ZRSJZ_PLAYER_RELOAD';//装填弹药
    public static ZRSJZ_PLAYER_SLIDE: string = 'ZRSJZ_PLAYER_SLIDE';//滑铲
    public static ZRSJZ_PLAYER_SKILL: string = 'ZRSJZ_PLAYER_SKILL';//玩家技能
    public static ZRSJZ_PLAYER_SEARCH: string = 'ZRSJZ_PLAYER_SEARCH';//玩家搜索显示
    public static ZRSJZ_PLAYER_DOOR: string = 'ZRSJZ_PLAYER_DOOR';//玩家遇到门
    public static ZRSJZ_PLAYER_SPECIAL_OPERATION: string = 'ZRSJZ_PLAYER_SPECIAL_OPERATION';//玩家进入/离开特别行动接取点
    public static ZRSJZ_PLAYER_RESURGENCE: string = 'ZRSJZ_PLAYER_RESURGENCE';//玩家复活

    public static ZRSJZ_CURRENCY_CHANGE: string = 'ZRSJZ_CURRENCY_CHANGE';//货币发生变动
    public static ZRSJZ_PROP_MOVE: string = 'ZRSJZ_PROP_MOVE';//道具拖动
    public static ZRSJZ_INVENTORY_CHANGE: string = 'ZRSJZ_INVENTORY_CHANGE';//道具所属库存发生变化
    public static ZRSJZ_BACKPACK_EXPANDED: string = 'ZRSJZ_BACKPACK_EXPANDED';//指定玩家领取背包扩容
    public static ZRSJZ_GRID_SHOW: string = 'ZRSJZ_GRID_SHOW';//格子显示
    public static ZRSJZ_GRID_MOVE: string = 'ZRSJZ_GRID_MOVE';//格子移动
    public static ZRSJZ_EMPTY_GRID_REMOVE: string = 'ZRSJZ_EMPTY_GRID_REMOVE';//删除格子
    public static ZRSJZ_CHECK_PROP: string = 'ZRSJZ_CHECK_PROP';//道具移动判断
    public static ZRSJZ_PROP_DRAG_ROTATE: string = 'ZRSJZ_PROP_DRAG_ROTATE';//拖动时切换道具横竖方向
    public static ZRSJZ_WAREHOUSE_DROP: string = 'ZRSJZ_WAREHOUSE_DROP';//仓库道具拖到分类按钮
    public static ZRSJZ_CANCEL_PROP_DRAG: string = 'ZRSJZ_CANCEL_PROP_DRAG';//强制取消当前道具拖动
    public static ZRSJZ_SELL_PROP: string = 'ZRSJZ_SELL_PROP';//道具出售 
    public static ZRSJZ_SELL_PROP_ADD: string = 'ZRSJZ_SELL_PROP_ADD';//添加道具出售ID 
    public static ZRSJZ_SELL_PROP_SHOW: string = 'ZRSJZ_SELL_PROP_SHOW';//道具显示出售图标
    public static ZRSJZ_SELL_PROP_HIDE: string = 'ZRSJZ_SELL_PROP_HIDE';//道具隐藏出售图标
    public static ZRSJZ_SHOW_ROLE_ITEM: string = 'ZRSJZ_SHOW_ROLE_ITEM';//角色选中显示
    public static ZRSJZ_SHOW_ROLE_DESC: string = 'ZRSJZ_SHOW_ROLE_DESC';//显示角色描述
    public static ZRSJZ_SHOW_EQUIPMENT: string = 'ZRSJZ_SHOW_EQUIPMENT';//显示皮肤装备
    public static ZRSJZ_MAIN_CHANGE_SKIN: string = 'ZRSJZ_MAIN_CHANGE_SKIN';//主界面切换皮肤
    public static ZRSJZ_DRUG_ADD: string = 'ZRSJZ_DRUG_ADD';//药品数量增加
    public static ZRSJZ_DRUG_CHANGE: string = 'ZRSJZ_DRUG_CHANGE';//药品数量变化
    public static ZRSJZ_AUDIO_INIT: string = 'ZRSJZ_AUDIO_INIT';//声音初始化完毕
    public static ZRSJZ_MODEL_SWITCH: string = 'ZRSJZ_MODEL_SWITCH';//切换模式
    public static ZRSJZ_LOADOUT_PLAYER_CHANGE: string = 'ZRSJZ_LOADOUT_PLAYER_CHANGE';//仓库切换随身配置玩家
    public static ZRSJZ_PLAYER_INFO_CHANGE: string = 'ZRSJZ_PLAYER_INFO_CHANGE';//等级、角色或账号统计发生变化
    public static ZRSJZ_EXPERIENCE_ADDED: string = 'ZRSJZ_EXPERIENCE_ADDED';//玩家获得经验，用于播放等级增长表现

    public static ZRSJZ_TUTORIAL: string = 'ZRSJZ_TUTORIAL';//新手教程引导
    public static ZRSJZ_TUTORIAL_CLOSE_COLLIDER: string = 'ZRSJZ_TUTORIAL_CLOSE_COLLIDER';//新手教程引导中关闭碰撞体
    public static ZRSJZ_MAIN_TASK_SHOW: string = 'ZRSJZ_MAIN_TASK_SHOW';//主线任务Item显示UI
    public static ZRSJZ_MAIN_TASK_CHECK: string = 'ZRSJZ_MAIN_TASK_CHECK';//主线任务Item选中
    public static ZRSJZ_MAIN_TASK_ADD: string = 'ZRSJZ_MAIN_TASK_ADD';//主线任务Item添加
    public static ZRSJZ_BOOSTER_SHOT_REFRESH: string = 'ZRSJZ_BOOSTER_SHOT_REFRESH';//刷新增强针UI

    public static ZRSJZ_INVENTORY_ADD_ROW: string = 'ZRSJZ_INVENTORY_ADD_ROW';//添加库存行---仓库扩容
    public static ZRSJZ_MAIL_GET_PROP: string = 'ZRSJZ_MAIL_GET_PROP';//领取邮件中的道具
    public static ZRSJZ_MAIL_GET_PROP_ADD: string = 'ZRSJZ_MAIL_GET_PROP_ADD';//领取邮件中的道具--添加一个
    public static ZRSJZ_MAIL_CHANGE: string = 'ZRSJZ_MAIL_CHANGE';//邮件新增、领取、删除或过期

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


