import { _decorator, Label, Sprite, SpriteFrame } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_Incident } from '../WZSJZ_Incident';
import {
    WZSJZ_NodeInspectSystem,
    type WZSJZ_NodeIntroduceData,
} from '../WZSJZ_NodeInspectSystem';


const { ccclass, property } = _decorator;

@ccclass('WZSJZ_IntroducePanel')
export class WZSJZ_IntroducePanel extends PanelBase {
    private _showVersion: number = 0;
    private _refreshTimer: number = 0;
    private _refreshData: (() => WZSJZ_NodeIntroduceData | null) = null;
    private _currentImagePath: string = '';

    Show(data: WZSJZ_NodeIntroduceData): void {
        // data是详情数据而不是动画节点，不能传给PanelBase当作tweenTarget。
        super.Show(this.node.getChildByName("Panel"));
        if (!data) {
            return;
        }
        this._refreshTimer = 0;
        this._refreshData = data.RefreshData || null;
        this.ApplyData(data);
    }

    protected update(deltaTime: number): void {
        if (!this._refreshData) {
            return;
        }
        this._refreshTimer -= deltaTime;
        if (this._refreshTimer > 0) {
            return;
        }
        this._refreshTimer = 0.1;
        const data = this._refreshData();
        if (data) {
            this.ApplyData(data);
        }
    }

    protected onDisable(): void {
        this._refreshData = null;
    }

    private ApplyData(data: WZSJZ_NodeIntroduceData): void {
        const detailRoot = this.node.getChildByPath('Panel/详情框');
        this.SetLabel(detailRoot?.getChildByName('名字')?.getComponent(Label), data.Name);
        const levelNode = detailRoot?.getChildByName('等级');
        if (levelNode) {
            levelNode.active = data.ShowLevel;
        }
        this.SetLabel(levelNode?.getComponent(Label), data.LevelText);
        this.SetLabel(detailRoot?.getChildByName('攻击')?.getComponent(Label), data.DetailLines[0] || '');
        this.SetLabel(detailRoot?.getChildByName('攻速')?.getComponent(Label), data.DetailLines[1] || '');
        this.SetLabel(detailRoot?.getChildByName('攻击距离')?.getComponent(Label), data.DetailLines[2] || '');
        if (data.ImagePath !== this._currentImagePath) {
            this._currentImagePath = data.ImagePath;
            this.LoadImage(detailRoot?.getChildByName('图片')?.getComponent(Sprite), data.ImagePath);
        }
    }

    OnExitClick() {
        this._refreshData = null;
        WZSJZ_NodeInspectSystem.Instance?.HideAttackRange();
        WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.IntroducePanel);
    }

    private async LoadImage(sprite: Sprite, path: string): Promise<void> {
        const version = ++this._showVersion;
        if (!sprite || !path) {
            if (sprite) sprite.spriteFrame = null;
            return;
        }
        sprite.spriteFrame = null;
        const spriteFrame = await WZSJZ_Incident.LoadSprite(path) as SpriteFrame;
        if (version === this._showVersion && sprite?.node?.isValid) {
            sprite.spriteFrame = spriteFrame;
        }
    }

    private SetLabel(label: Label, value: string): void {
        if (label) {
            label.string = value;
        }
    }
}
