import { _decorator, Button, EventTouch, Label, ScrollView } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_NoticeService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_NoticeService';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_NoticePanel')
export class ZRSJZ_NoticePanel extends ZRSJZ_Panel {
    /**
     * 在这里添加公告；最新版本放数组第一项，旧公告保留供翻页。
     * Title=标题，Version=版本或日期说明，Content=正文。
     * 正文支持换行；超长正文会自动滚动。以下两条可直接替换。
     */
    public static readonly Notices: { Title: string; Version: string; Content: string }[] = [
        {
            Title: '神秘商人 · 每日特惠',
            Version: '最新公告9.17',
            Content: '各位干员：\n\n神秘商人现已来到基地！每次回到主页，都有机会遇见商人。\n\n【限时好价】\n商品以原价的 75% 出售，还有机会遇见高级装备。\n\n【每日限购】\n每天最多购买 5 件商品，购买一格算一次。次数在每日零点重置，刷新商品不会恢复次数。\n\n【购买提醒】\n每件商品仅售一份，售出后会显示售罄。仓库已满时，购买的商品将通过邮件送达。'
        },
        {
            Title: '行动补给 · 整装再出发',
            Version: '往期公告9.10',
            Content: '各位干员：\n\n基础行动补给已准备就绪，帮助你重新整装出发。\n\n【补给内容】\n补给包含基础头盔、护甲、背包、枪械及两组子弹。\n\n【出现规则】\n领取后每隔 5 小时可以再次获得补给；对局失败返回主页时，也有机会出现额外补给。\n\n祝各位行动顺利，满载而归！'
        },
    ];
    private page = 0;

    Show(): void {
        this.PlayerIndex = -1;
        this.page = 0;
        super.Show();
        this.RefreshPage();
    }

    private RefreshPage(): void {
        const notices = ZRSJZ_NoticePanel.Notices;
        this.page = Math.max(0, Math.min(this.page, Math.max(0, notices.length - 1)));
        const item = notices[this.page];
        this.Panel.getChildByName('标题').getComponent(Label).string = item?.Title ?? '暂无公告';
        this.Panel.getChildByName('版本').getComponent(Label).string = item?.Version ?? '';
        const scroll = this.Panel.getChildByName('正文滚动区').getComponent(ScrollView);
        const body = scroll.content.getComponent(Label);
        body.string = item?.Content ?? '感谢关注，敬请期待后续更新。';
        body.updateRenderData(true);
        scroll.stopAutoScroll();
        scroll.scrollToTop(0);
        this.Panel.getChildByName('页码').getComponent(Label).string =
            notices.length ? `${this.page + 1} / ${notices.length}` : '0 / 0';
        this.Panel.getChildByName('上一页').getComponent(Button).interactable = this.page > 0;
        this.Panel.getChildByName('下一页').getComponent(Button).interactable = this.page < notices.length - 1;
    }

    public OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        switch (event.getCurrentTarget().name) {
            case '关闭':
            case 'Mask':
                ZRSJZ_NoticeService.CloseForToday();
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.公告界面);
                break;
            case '上一页':
                if (this.page > 0) { this.page--; this.RefreshPage(); }
                break;
            case '下一页':
                if (this.page < ZRSJZ_NoticePanel.Notices.length - 1) { this.page++; this.RefreshPage(); }
                break;
        }
    }
}
