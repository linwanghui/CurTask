import { _decorator, Component, director, EventTouch, Label, Node, Tween, tween, v3 } from 'cc';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_AMMO_MAX_COUNT, ZRSJZ_INVENTORY, ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from './ZRSJZ_GameData';
import { ProjectEvent, ProjectEventManager } from '../../../Scripts/Framework/Managers/ProjectEventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Start')
export class ZRSJZ_Start extends Component {

    @property(Node)
    SignBtn: Node = null;

    protected start(): void {
        if (!ZRSJZ_GameData.Instance.IsTutorial) {
            //没通过新手教程就跳转新手教程场景
            ZRSJZ_GameData.Instance.CurMap = "新手村";

            //初始化装备
            if (ZRSJZ_GameData.Instance.WeaponryID[0] != "") {
                ZRSJZ_GameData.Instance.RemovePropID(ZRSJZ_GameData.Instance.WeaponryID[0]);
                ZRSJZ_GameData.Instance.WeaponryID[0] = "";
            }

            //初始化弹药
            if (ZRSJZ_GameData.Instance.AmmoID[0] == "") {
                let propId = ZRSJZ_GameData.Instance.AddPropByName("1级子弹", ZRSJZ_AMMO_MAX_COUNT);
                ZRSJZ_GameData.Instance.AmmoID[0] = propId;
                ZRSJZ_GameData.Instance.MovePropToInventory(propId, ZRSJZ_INVENTORY.弹药, 1, 0, 0);
            } else if (ZRSJZ_GameData.Instance.AmmoID[1] == "") {
                let propId = ZRSJZ_GameData.Instance.AddPropByName("1级子弹", ZRSJZ_AMMO_MAX_COUNT);
                ZRSJZ_GameData.Instance.AmmoID[1] = propId;
                ZRSJZ_GameData.Instance.MovePropToInventory(propId, ZRSJZ_INVENTORY.弹药, 1, 0, 0);
            } else if (ZRSJZ_GameData.Instance.AmmoID[2] == "") {
                let propId = ZRSJZ_GameData.Instance.AddPropByName("1级子弹", ZRSJZ_AMMO_MAX_COUNT);
                ZRSJZ_GameData.Instance.AmmoID[2] = propId;
                ZRSJZ_GameData.Instance.MovePropToInventory(propId, ZRSJZ_INVENTORY.弹药, 1, 0, 0);
            }
            // director.loadScene("ZRSJZ_Tutorial");
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.加载界面, "ZRSJZ_Tutorial");
            return;
        }

        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.加载界面);
        if (ZRSJZ_GameData.Instance.CanClaimSignInReward()) {
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.签到弹窗);
        }
        // this.SignBtn.active = !ZRSJZ_GameData.Instance.IsSignInCompleted();
        ZRSJZ_AudioManager.Instance.PlayMusic("BGM", true, 0.3);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_AUDIO_INIT, () => {
            ZRSJZ_AudioManager.Instance.PlayMusic("BGM", true, 0.3);
        })
    }

    protected onDisable(): void {
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Switch":
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON);
                break;
            case "Slide":
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE);
                break;
            case "商城":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.商店界面);
                break;
            case "仓库":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.仓库界面);
                break;
            case "角色":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.角色界面);
                break;
            case "收藏室":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.收藏室界面);
                break;
            case "盲盒":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.盲盒界面);
                break;
            case "强化":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.强化界面);
                break;
            case "开始游戏":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.选关界面);
                break;
            case "签到":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.签到弹窗);
                break;
            case "设置":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.设置界面);
                break;
            case "主页":
                ProjectEventManager.emit(ProjectEvent.返回主页按钮事件, () => {
                    ProjectEventManager.emit(ProjectEvent.返回主页);
                    director.loadScene("Start");
                });
                break;

        }
    }

}


