import { ZRSJZ_GameData } from "../ZRSJZ_GameData";

type BNSPropertyName = keyof ZRSJZ_GameData["BNS_Property"];

/** DLC 基地资源和建筑等级业务；回调不进入存档。 */
export class ZRSJZ_BNSDataService {
    public static PropertyChangeCallback: ((propertyName: BNSPropertyName, value: number) => void) | null = null;
    public static BuildingChangeCallback: ((buildingName: string, level: number) => void) | null = null;

    public static GetBNSProperty(propertyName: BNSPropertyName): number {
        return ZRSJZ_GameData.Instance.BNS_Property[propertyName] ?? 0;
    }

    public static SetBNSProperty(propertyName: BNSPropertyName, value: number): void {
        if (!Number.isFinite(value)) return;
        const newValue = Math.max(0, Math.floor(value));
        if (this.GetBNSProperty(propertyName) === newValue) return;
        ZRSJZ_GameData.Instance.BNS_Property[propertyName] = newValue;
        ZRSJZ_GameData.SaveData();
        this.PropertyChangeCallback?.(propertyName, newValue);
    }

    public static ChangeBNSProperty(propertyName: BNSPropertyName, changeValue: number): void {
        this.SetBNSProperty(propertyName, this.GetBNSProperty(propertyName) + changeValue);
    }

    public static GetBNSBuildingLevel(buildingName: string): number {
        return ZRSJZ_GameData.Instance.BNS_Building.find(building => building.name === buildingName)?.Level ?? 0;
    }

    public static SetBNSBuildingLevel(buildingName: string, level: number): void {
        if (!Number.isFinite(level)) return;
        const data = ZRSJZ_GameData.Instance;
        const newLevel = Math.max(0, Math.floor(level));
        let building = data.BNS_Building.find(item => item.name === buildingName);
        if (!building) {
            building = { name: buildingName, Level: 0 };
            data.BNS_Building.push(building);
        }
        if (building.Level === newLevel) return;
        building.Level = newLevel;
        ZRSJZ_GameData.SaveData();
        this.BuildingChangeCallback?.(buildingName, newLevel);
    }

    public static ChangeBNSBuildingLevel(buildingName: string, changeValue: number): void {
        this.SetBNSBuildingLevel(buildingName, this.GetBNSBuildingLevel(buildingName) + changeValue);
    }
}
