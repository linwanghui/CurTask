import { _decorator, Component, Node } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_PlayerSwitchButton } from './ZRSJZ_PlayerSwitchButton';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_RoleItem')
export class ZRSJZ_RoleItem extends Component {
    @property
    RoleName: string = "";

    Chekced: Node = null;

    protected onLoad(): void {
        this.Chekced = this.node.getChildByName("Checked");
    }

    protected onEnable(): void {
        this.ShowItem();
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, this.ShowItem, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, this.ShowItem, this);
    }

    ShowItem(roleName: string = ZRSJZ_GameData.Instance.CurRole[ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1]) {
        this.Chekced.active = this.RoleName == roleName;
    }

    OnClick() {
        // const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1;
        // if (this.RoleName == ZRSJZ_GameData.Instance.CurRole[roleIndex]) return;
        // ZRSJZ_GameData.Instance.SetCurRole(this.RoleName, roleIndex);
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, this.RoleName);
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.RoleName);
    }
}


