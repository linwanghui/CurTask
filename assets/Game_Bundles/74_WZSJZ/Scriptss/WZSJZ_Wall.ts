import { _decorator, Component, director, Label, Node, Sprite, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_Wall')
export class WZSJZ_Wall extends Component {
    @property({ displayName: "生命值显示节点", type: Node })
    public HealthViewNode: Node = null;

    private _maxHealth: number = 1;
    private _currentHealth: number = 1;
    private _isDestroyed: boolean = false;
    private _invincibleRemaining: number = 0;
    private _permanentInvincible: boolean = false;

    public get IsAlive(): boolean {
        return !this._isDestroyed && this._currentHealth > 0;
    }

    public get IsInvincible(): boolean {
        return this._permanentInvincible || this._invincibleRemaining > 0;
    }

    protected update(deltaTime: number): void {
        this._invincibleRemaining = Math.max(0, this._invincibleRemaining - deltaTime);
    }

    /** 返回面向来袭单位一侧的城墙外边缘世界坐标。 */
    public GetFrontWorldX(attackerWorldX: number): number {
        const transform = this.getComponent(UITransform);
        if (!transform) {
            return this.node.worldPosition.x;
        }
        const bounds = transform.getBoundingBoxToWorld();
        return attackerWorldX >= this.node.worldPosition.x ? bounds.xMax : bounds.xMin;
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

    public SetHealthViewNode(healthViewNode: Node): void {
        this.HealthViewNode = healthViewNode;
        this.RefreshView();
    }

    public SetInvincible(duration: number): void {
        this._invincibleRemaining = Math.max(this._invincibleRemaining, Math.max(0, duration));
    }

    /** 测试面板使用的永久无敌，不影响技能提供的限时无敌。 */
    public TogglePermanentInvincible(): boolean {
        this._permanentInvincible = !this._permanentInvincible;
        return this._permanentInvincible;
    }

    public TakeDamage(damage: number): void {
        if (!this.IsAlive || this.IsInvincible || damage <= 0) {
            return;
        }
        this._currentHealth = Math.max(0, this._currentHealth - damage);
        this.RefreshView();
        if (this._currentHealth <= 0) {
            this._isDestroyed = true;
            director.loadScene("WZSJZ_Start");
        }
    }

    /** 回复城墙生命值并返回实际回复量；不会超过当前最大生命值。 */
    public Heal(amount: number): number {
        if (!this.IsAlive || amount <= 0) {
            return 0;
        }
        const previous = this._currentHealth;
        this._currentHealth = Math.min(this._maxHealth, previous + amount);
        const healed = this._currentHealth - previous;
        if (healed > 0) {
            this.RefreshView();
        }
        return healed;
    }

    private RefreshView(): void {
        const healthNode = this.HealthViewNode || this.node.getChildByName("生命值");
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

