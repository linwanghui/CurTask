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
    private _isDetailSelected: boolean = false;

    protected onLoad(): void {
        this.Chekced = this.node.getChildByName("Checked");
    }

    protected onEnable(): void {
        this._isDetailSelected = false;
        this.ShowItem();
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, this.ShowItem, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.OnRoleDescChanged, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, this.ShowItem, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.OnRoleDescChanged, this);
    }

    ShowItem(roleName: string = ZRSJZ_GameData.Instance.CurRole[ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1]) {
        this.Chekced.active = this.RoleName == roleName;
    }

    OnClick() {
        if (this._isDetailSelected) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, this.RoleName);
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.RoleName);
    }

    private OnRoleDescChanged(roleName: string): void {
        this._isDetailSelected = this.RoleName === roleName;
    }
}


