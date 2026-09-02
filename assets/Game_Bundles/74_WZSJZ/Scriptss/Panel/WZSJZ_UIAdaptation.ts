import { _decorator, Component, Canvas, director, view, Node, v3, Widget } from 'cc';
const { ccclass, property } = _decorator;

/**
 * UI动态适配脚本
 * 根据设备尺寸动态缩放UI，确保在不同屏幕比例和物理尺寸下都有良好显示
 * 适用于平板、折叠屏等尺寸差异较大的设备
 */
@ccclass('WZSJZ_UIAdaptation')
export class WZSJZ_UIAdaptation extends Component {
    public static designWidth: number = 2340;           // 设计分辨率宽度
    public static designHeight: number = 1080;          // 设计分辨率高度
    public static practicalWidth: number = 0;           // 实际分辨率宽度
    public static practicalHeight: number = 0;          // 实际分辨率高度
    public static designAspectRatio: number = 0;  // 设计宽高比



    onLoad() {
        if (WZSJZ_UIAdaptation.designAspectRatio == 0) {
            WZSJZ_UIAdaptation.designAspectRatio = this.CalculateProportion();
        }
    }


    start() {
        this.node.scale = v3(WZSJZ_UIAdaptation.designAspectRatio, WZSJZ_UIAdaptation.designAspectRatio, 1);
        if (this.node.getComponent(Widget)) {
            this.node.getComponent(Widget).updateAlignment();
        }
    }



    /**
     * 计算缩放比例
     * 根据实际屏幕分辨率比例和设计比例来生成缩放比例
     * 缩放比例最大为1，就是只能缩小，用于适配窄屏情况下的UI问题
     */
    CalculateProportion(): number {
        // 获取实际屏幕分辨率
        WZSJZ_UIAdaptation.practicalWidth = view.getVisibleSize().width;
        WZSJZ_UIAdaptation.practicalHeight = view.getVisibleSize().height;

        // 计算设计宽高比
        WZSJZ_UIAdaptation.designAspectRatio = WZSJZ_UIAdaptation.designWidth / WZSJZ_UIAdaptation.designHeight;

        // 计算实际宽高比
        const practicalAspectRatio = WZSJZ_UIAdaptation.practicalWidth / WZSJZ_UIAdaptation.practicalHeight;

        let scaleRatio: number = 1;

        // 根据宽高比判断屏幕类型并计算缩放比例
        if (practicalAspectRatio > WZSJZ_UIAdaptation.designAspectRatio) {
            // 宽屏情况：实际比设计更宽（如带鱼屏、带鱼屏显示器）
            // 需要按高度比例缩放，确保内容不会被裁剪
            scaleRatio = WZSJZ_UIAdaptation.designHeight / WZSJZ_UIAdaptation.practicalHeight;
        } else {
            // 窄屏情况：实际比设计更窄（如手机竖屏、折叠屏展开后）
            // 需要按宽度比例缩放，确保内容不会被裁剪
            scaleRatio = WZSJZ_UIAdaptation.designWidth / WZSJZ_UIAdaptation.practicalWidth;
        }
        scaleRatio = 1 / scaleRatio;
        // 限制缩放比例最大为1，只能缩小不能放大
        scaleRatio = Math.min(scaleRatio, 1);

        // console.log(`[UI适配] 设计分辨率: ${SJZXD_UIAdaptation.designWidth}x${SJZXD_UIAdaptation.designHeight}, 设计比例: ${SJZXD_UIAdaptation.designAspectRatio.toFixed(3)}`);
        // console.log(`[UI适配] 实际分辨率: ${SJZXD_UIAdaptation.practicalWidth}x${SJZXD_UIAdaptation.practicalHeight}, 实际比例: ${practicalAspectRatio.toFixed(3)}`);
        // console.log(`[UI适配] 最终缩放比例: ${scaleRatio.toFixed(3)}`);

        return scaleRatio;
    }

}
