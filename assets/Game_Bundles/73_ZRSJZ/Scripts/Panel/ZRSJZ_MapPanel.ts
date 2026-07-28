import { _decorator, Component, EventTouch, find, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MapPanel')
export class ZRSJZ_MapPanel extends ZRSJZ_Panel {

    @property
    HeroSFs: SpriteFrame[] = [];

    Icon: Sprite = null;
    AllMap: Node = null;
    CurMap: Node = null;
    CurPoint: Node = null;

    protected onLoad(): void {
        this.Icon = find("Panel/我的位置/Icon", this.node).getComponent(Sprite);
        this.AllMap = find("Panel/Map", this.node);
        this.CurPoint = find("Panel/我的位置", this.node);
    }

    Show(...args: any[]) {
        super.Show();
        this.AllMap.children.forEach(map => map.active = false);
        this.CurMap = this.AllMap.children[args[0]];
        this.Icon.spriteFrame = this.HeroSFs[args[1]];

    }

    async OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.道具弹窗);
                break;
        }
    }

    ShowPoint(x: number, y: number) {
        const curUITransform: UITransform = this.CurMap.getComponent(UITransform);
    }
}


