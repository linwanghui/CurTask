import { _decorator, Component, director, Label, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_Wall')
export class WZSJZ_Wall extends Component {
    private _maxHealth: number = 1;
    private _currentHealth: number = 1;
    private _isDestroyed: boolean = false;

    public get IsAlive(): boolean {
        return !this._isDestroyed && this._currentHealth > 0;
    }

    public SetMaxHealth(maxHealth: number, refill: boolean = false): void {
        const safeMaxHealth = Math.max(1, Math.floor(maxHealth));
        if (refill || this._maxHealth <= 1) {
            this._currentHealth = safeMaxHealth;
        } else {
            this._currentHealth = Math.min(
                safeMaxHealth,
                this._currentHealth + Math.max(0, safeMaxHealth - this._maxHealth),
            );
        }
        this._maxHealth = safeMaxHealth;
        this._isDestroyed = false;
        this.RefreshView();
    }

    public TakeDamage(damage: number): void {
        if (!this.IsAlive || damage <= 0) {
            return;
        }
        this._currentHealth = Math.max(0, this._currentHealth - damage);
        this.RefreshView();
        if (this._currentHealth <= 0) {
            this._isDestroyed = true;
            director.loadScene("WZSJZ_Start");
        }
    }

    private RefreshView(): void {
        const healthNode = this.node.getChildByName("生命值");
        const label = healthNode?.getChildByName("血量文本")?.getComponent(Label);
        if (label) {
            label.string = `${Math.ceil(this._currentHealth)}/${this._maxHealth}`;
        }

        const progress = healthNode?.getChildByName("进度条顶")?.getComponent(Sprite);
        if (progress) {
            progress.type = Sprite.Type.FILLED;
            progress.fillType = Sprite.FillType.HORIZONTAL;
            progress.fillStart = 0;
            progress.fillRange = this._currentHealth / this._maxHealth;
        }
    }
}

