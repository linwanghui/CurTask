import { _decorator, Button, Color, Component, Label, Node, Prefab } from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant, WZSJZ_MaterialConfig } from './WZSJZ_Constant';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
const { ccclass } = _decorator;

type MaterialWeightKey = "PurchaseWeight" | "ItemLockWeight";
type CreateMaterialCallback = (prefab: Prefab, cell: WZSJZ_Cell, level: number) => boolean;

/** 经济域：购买、价格、资源产出与对应UI刷新。 */
@ccclass('WZSJZ_EconomySystem')
export class WZSJZ_EconomySystem extends Component {
    private _preparationZone: Node = null;
    private _formationCells: WZSJZ_Cell[] = [];
    private _preparationCells: WZSJZ_Cell[] = [];
    private _materialPrefabs: Prefab[] = [];
    private _createMaterial: CreateMaterialCallback = null;
    private _money: number = 0;
    private _food: number = 0;
    private _purchaseCount: number = 0;
    private _baseMoneyCost: number = 10;
    private _baseFoodCost: number = 10;
    private _priceIncreaseRate: number = 0.5;
    private _enoughColor: Color = null;
    private _insufficientColor: Color = null;

    protected onLoad(): void {
        this.node.on(WZSJZ_EventManager.游戏开始, this.OnGameStart, this);
    }

    public Configure(
        preparationZone: Node,
        formationCells: WZSJZ_Cell[],
        preparationCells: WZSJZ_Cell[],
        materialPrefabs: Prefab[],
        startMoney: number,
        startFood: number,
        baseMoneyCost: number,
        baseFoodCost: number,
        priceIncreaseRate: number,
        createMaterial: CreateMaterialCallback,
    ): void {
        this._preparationZone = preparationZone;
        this._formationCells = formationCells;
        this._preparationCells = preparationCells;
        this._materialPrefabs = materialPrefabs;
        this._money = startMoney;
        this._food = startFood;
        this._baseMoneyCost = baseMoneyCost;
        this._baseFoodCost = baseFoodCost;
        this._priceIncreaseRate = priceIncreaseRate;
        this._createMaterial = createMaterial;
        this.BindPurchaseButton();
        this.CacheRequirementColors();
        this.RefreshViews();
    }

    private OnGameStart(): void {
        this.schedule(this.ProduceResources, 1);
    }

    public BuyMaterial(): boolean {
        const emptyCell = this._preparationCells.find((cell) => cell.IsUnlocked && cell.IsEmpty());
        if (!emptyCell) {
            console.warn("[WZSJZ] 备战框已满，无法购买物资。");
            return false;
        }
        const moneyCost = this.CurrentMoneyCost;
        const foodCost = this.CurrentFoodCost;
        if (this._money < moneyCost || this._food < foodCost) {
            WZSJZ_UIManager.Instance.ShowText(this.GetInsufficientResourceText(moneyCost, foodCost));
            return false;
        }
        const prefab = this.RollMaterialPrefab("PurchaseWeight");
        if (!prefab) {
            return false;
        }
        const level = prefab.data.name === "钥匙"
            ? 1
            : WZSJZ_Constant.GetPurchaseMaterialLevel(Math.floor(this._purchaseCount / 5));
        this._money -= moneyCost;
        this._food -= foodCost;
        this._purchaseCount++;
        if (!this._createMaterial?.(prefab, emptyCell, level)) {
            this._money += moneyCost;
            this._food += foodCost;
            this._purchaseCount--;
            return false;
        }
        this.RefreshViews();
        return true;
    }

    public AddResources(money: number, food: number): void {
        this._money += Math.max(0, money);
        this._food += Math.max(0, food);
        this.RefreshViews();
    }

    public RollMaterialPrefab(weightKey: MaterialWeightKey): Prefab {
        const candidates = this._materialPrefabs
            .map((prefab) => ({
                prefab,
                config: WZSJZ_Constant.GetMaterialConfig(prefab?.data?.name),
            }))
            .filter((entry): entry is { prefab: Prefab; config: WZSJZ_MaterialConfig } =>
                !!entry.prefab && !!entry.config && entry.config[weightKey] > 0,
            );
        const totalWeight = candidates.reduce((sum, entry) => sum + entry.config[weightKey], 0);
        if (totalWeight <= 0) {
            return null;
        }
        let random = Math.random() * totalWeight;
        for (const entry of candidates) {
            random -= entry.config[weightKey];
            if (random < 0) {
                return entry.prefab;
            }
        }
        return candidates[candidates.length - 1]?.prefab || null;
    }

    private ProduceResources = (): void => {
        let money = 0;
        let food = 0;
        for (const cell of this._formationCells) {
            if (!cell.IsUnlocked || cell.IsEmpty()) {
                continue;
            }
            const material = cell.Occupant.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
            const config = material ? WZSJZ_Constant.GetMaterialConfig(material.Name) : null;
            const production = material?.GetProductionPerSecond() || 0;
            if (config?.ResourceType === "money") money += production;
            if (config?.ResourceType === "food") food += production;
        }
        this._money += money;
        this._food += food;
        this.RefreshViews();
    };

    private BindPurchaseButton(): void {
        const button = this._preparationZone?.getChildByName("购买物资");
        if (button) {
            button.on(Button.EventType.CLICK, this.BuyMaterial, this);
        }
    }

    private get CurrentMoneyCost(): number {
        const stage = Math.floor(this._purchaseCount / 5);
        return Math.ceil(this._baseMoneyCost * (1 + stage * this._priceIncreaseRate));
    }

    private get CurrentFoodCost(): number {
        const stage = Math.floor(this._purchaseCount / 5);
        return Math.ceil(this._baseFoodCost * (1 + stage * this._priceIncreaseRate));
    }

    private GetInsufficientResourceText(moneyCost: number, foodCost: number): string {
        const missingMoney = Math.max(0, Math.ceil(moneyCost - this._money));
        const missingFood = Math.max(0, Math.ceil(foodCost - this._food));
        if (missingMoney > 0 && missingFood > 0) return `钞票不足${missingMoney}，食物不足${missingFood}`;
        if (missingMoney > 0) return `钞票不足${missingMoney}`;
        return `食物不足${missingFood}`;
    }

    private RefreshViews(): void {
        const dataBar = this._preparationZone?.parent?.getChildByName("数据栏");
        this.SetLabel(dataBar?.getChildByName("钞票")?.getChildByName("数量"), this._money);
        this.SetLabel(dataBar?.getChildByName("食物")?.getChildByName("数量"), this._food);
        const requirement = this._preparationZone?.getChildByName("购买需求");
        const foodLabel = requirement?.getChildByName("食物数量")?.getComponent(Label);
        const moneyLabel = requirement?.getChildByName("钞票数量")?.getComponent(Label);
        this.SetRequirementLabel(foodLabel, this.CurrentFoodCost, this._food >= this.CurrentFoodCost);
        this.SetRequirementLabel(moneyLabel, this.CurrentMoneyCost, this._money >= this.CurrentMoneyCost);
        const fallback = this._preparationZone?.getChildByName("购买物资")?.getChildByName("价格")?.getComponent(Label);
        if (fallback) fallback.string = `${this.CurrentMoneyCost}/${this.CurrentFoodCost}`;
    }

    private CacheRequirementColors(): void {
        const requirement = this._preparationZone?.getChildByName("购买需求");
        this._enoughColor = requirement?.getChildByName("食物数量")?.getComponent(Label)?.color.clone() || null;
        this._insufficientColor = requirement?.getChildByName("钞票数量")?.getComponent(Label)?.color.clone() || null;
    }

    private SetRequirementLabel(label: Label, cost: number, enough: boolean): void {
        if (!label) return;
        label.string = Math.ceil(cost).toString();
        const color = enough ? this._enoughColor : this._insufficientColor;
        if (color) label.color = color.clone();
    }

    private SetLabel(node: Node, value: number): void {
        const label = node?.getComponent(Label);
        if (label) label.string = Math.floor(value).toString();
    }
}
