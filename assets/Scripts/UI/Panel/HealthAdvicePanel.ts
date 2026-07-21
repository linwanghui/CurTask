import { _decorator, Component, Label, resources, Sprite, SpriteAtlas } from 'cc';
import Banner from '../../Banner';
import PrefsManager from '../../Framework/Managers/PrefsManager';
const { ccclass, property } = _decorator;

@ccclass('HealthAdvicePanel')
export class HealthAdvicePanel extends Component {

    ageLimitAtalsPath: string = `Sprites/Common/AgeLimit`;

    start() {
        let showCompany = !(Banner.IS_ANDROID || Banner.IS_HarmonyOSNext_GAME || Banner.IS_BYTEDANCE_MINI_GAME || Banner.IS_WECHAT_MINI_GAME);

        this.node.getChildByName(`TitleLb`).active = showCompany;
        this.node.getChildByName(`ContentLb`).active = showCompany;
        this.node.getChildByName(`CompanyLb`).active = showCompany;
        this.node.getChildByName(`ContentLb`).active = showCompany;
        this.node.getChildByName(`LicenseLb`).active = showCompany;
        this.node.getChildByName(`AgeLimitSp`).active = showCompany;
        this.node.getChildByName(`LoadingLb`).active = !showCompany;

        this.node.getChildByName(`CompanyLb`).getComponent(Label).string = `${Banner.Owner}`;
        this.node.getChildByName(`LicenseLb`).getComponent(Label).string = `${Banner.License}`;

        //适龄提示角标
        let ageLimitSp: Sprite = this.node.getChildByName(`AgeLimitSp`).getComponent(Sprite);
        switch (Banner.AgeLimit) {
            case 8:
                resources.load(this.ageLimitAtalsPath, SpriteAtlas, (err, res: SpriteAtlas) => {
                    ageLimitSp.spriteFrame = res.getSpriteFrame(`8`);
                });
                break;
            case 12:
                resources.load(this.ageLimitAtalsPath, SpriteAtlas, (err, res: SpriteAtlas) => {
                    ageLimitSp.spriteFrame = res.getSpriteFrame(`12`);
                });
                break;
            case 16:
                resources.load(this.ageLimitAtalsPath, SpriteAtlas, (err, res: SpriteAtlas) => {
                    ageLimitSp.spriteFrame = res.getSpriteFrame(`16`);
                });
                break;
            default:
                resources.load(this.ageLimitAtalsPath, SpriteAtlas, (err, res: SpriteAtlas) => {
                    ageLimitSp.spriteFrame = res.getSpriteFrame(`16`);
                });
                break;
        }
    }
}