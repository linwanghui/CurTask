import { _decorator, Color, Component, Graphics, Node, UITransform } from 'cc';

const { ccclass, property } = _decorator;

/** 称号上的循环星光，不依赖 DLC 贴图，不接管点击事件。 */
@ccclass('ZRSJZ_TitleShine')
export class ZRSJZ_TitleShine extends Component {
    @property({ tooltip: '闪光循环间隔（秒）', min: 1 })
    public interval = 2.8;

    private graphics: Graphics = null;
    private effectNode: Node = null;
    private elapsed = 0;

    protected onLoad(): void {
        this.effectNode = new Node('称号闪光');
        this.effectNode.layer = this.node.layer;
        this.node.addChild(this.effectNode);
        this.effectNode.addComponent(UITransform);
        this.graphics = this.effectNode.addComponent(Graphics);
    }

    protected onEnable(): void {
        this.elapsed = 0;
    }

    protected update(dt: number): void {
        const size = this.node.getComponent(UITransform);
        if (!this.graphics || !size) return;
        this.elapsed = (this.elapsed + dt) % Math.max(1, this.interval);
        this.graphics.clear();
        // 从左向右依次闪烁，避开称号中央文字。
        const points = [[0.18, 0.56, 0], [0.5, 0.82, 0.24], [0.82, 0.46, 0.48]];
        for (const [px, py, delay] of points) {
            const t = (this.elapsed - delay) / 0.65;
            if (t <= 0 || t >= 1) continue;
            const strength = Math.sin(t * Math.PI);
            const radius = Math.min(size.height * 0.22, 12) * strength;
            const x = (px - size.anchorX) * size.width;
            const y = (py - size.anchorY) * size.height;
            this.DrawStar(x, y, radius * 1.5, new Color(255, 222, 128, Math.round(65 * strength)));
            this.DrawStar(x, y, radius, new Color(255, 250, 221, Math.round(240 * strength)));
        }
    }

    private DrawStar(x: number, y: number, radius: number, color: Color): void {
        const g = this.graphics;
        g.fillColor = color;
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;
            const r = i % 2 === 0 ? radius : radius * 0.2;
            const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.close();
        g.fill();
    }

    protected onDisable(): void { this.graphics?.clear(); }
    protected onDestroy(): void { this.effectNode?.destroy(); }
}
