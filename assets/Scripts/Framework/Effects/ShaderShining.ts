import { _decorator, Component, Material, UIRenderer, Vec4 } from 'cc';
const { ccclass, property, menu, disallowMultiple, executeInEditMode } = _decorator;

import Timer from "../Const/Timer";
import { DEV } from 'cc/env';

@ccclass('ShaderShining')
@disallowMultiple @executeInEditMode @menu("Framework/Shader/ShaderShining")
export default class ShaderShining extends Component {
    @property({ tooltip: DEV && "流光速度" })
    public speed: number = 1;
    @property({ tooltip: DEV && "流光斜率" })
    public slope: number = 1;
    @property({ tooltip: DEV && "流光宽度", range: [0, Number.MAX_SAFE_INTEGER] })
    public len: number = 0.25;
    @property({ tooltip: DEV && "流光强度", range: [0, Number.MAX_SAFE_INTEGER] })
    public strength: number = 2;
    @property({ tooltip: DEV && "两次流光动画之间的间隔时间", range: [0, Number.MAX_SAFE_INTEGER] })
    public interval: number = 1;
    @property({ tooltip: DEV && "流光速度是否受到timeScale的影响" })
    public timeScale: boolean = false;
    private _mat: Material | null = null;
    public get mat(): Material {
        if (!this._mat) {
            this._mat = this.getComponent(UIRenderer).getRenderMaterial(0);
        }
        return this._mat;
    }
    onLoad() {
        this.updateShader();
    }
    protected update(): void {
        this.updateShader();
    }
    public updateShader(): void {
        this.mat.setProperty("shiningData", new Vec4(this.speed, this.slope, this.len, this.interval));
        this.mat.setProperty("extra", new Vec4(this.timeScale ? Timer.scaleGameSec : Timer.gameSec, this.strength));
    }
}