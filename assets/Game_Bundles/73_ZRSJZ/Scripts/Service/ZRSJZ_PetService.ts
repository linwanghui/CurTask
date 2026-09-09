import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_PET_CONFIG, ZRSJZ_PET_GENE_CONFIG, ZRSJZ_PET_SKIN_CONFIG, ZRSJZ_PET_SKILL_CONFIG, ZRSJZ_PROP_CONFIG, ZRSJZ_PetGeneConfig, ZRSJZ_PetPlayerBonus } from "../ZRSJZ_Constant";
import { ZRSJZ_InventoryService } from "./ZRSJZ_InventoryService";
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";

export class ZRSJZ_PetService {
    public static AddPet(petName: string): boolean {
        const config = ZRSJZ_PET_CONFIG.get(petName);
        const data = ZRSJZ_GameData.Instance;
        if (!data || !config || this.CheckPet(petName)) return false;
        if (!data.PetData) data.PetData = {};
        data.PetData[petName] = { Skins: [config.PetSkins[0] ?? petName], Level: 0 };
        ZRSJZ_GameData.SaveData();
        return true;
    }

    public static GetPetGrade(petName: string): number {
        const level = this.CheckPet(petName) ? ZRSJZ_GameData.Instance.PetData[petName].Level : 0;
        return Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
    }

    public static GetGeneCostOwned(gene: Readonly<ZRSJZ_PetGeneConfig>): number {
        return gene.CostProp === "金币" ? ZRSJZ_GameData.Instance.Gold
            : ZRSJZ_InventoryService.GetPropCountByName(gene.CostProp);
    }

    public static GetGeneConfig(petName: string, level: number): Readonly<ZRSJZ_PetGeneConfig> | undefined {
        const base = ZRSJZ_PET_GENE_CONFIG.find(item => item.Level === level);
        if (!base) return undefined;
        return { ...base, Value: ZRSJZ_PET_CONFIG.get(petName)?.PetGeneValues?.[level] ?? base.Value };
    }

    public static GetSkill(petName: string, index: number) {
        return ZRSJZ_PET_SKILL_CONFIG.get(ZRSJZ_PET_CONFIG.get(petName)?.PetSkills[index]);
    }

    public static IsSkillUnlocked(petName: string, index: number): boolean {
        if (!this.CheckPet(petName)) return false;
        const skill = this.GetSkill(petName, index);
        if (!skill) return false;
        if (skill.Unlock === "购买") return true;
        if (skill.Unlock === "视频") return ZRSJZ_GameData.Instance.PetData[petName].VideoSkillUnlocked === true;
        const gene = this.GetGeneConfig(petName, skill.GeneLevel);
        return gene?.Type === "技能" && this.GetPetGrade(petName) >= skill.GeneLevel;
    }

    public static GetSkillUnlockText(petName: string, index: number): string {
        if (this.IsSkillUnlocked(petName, index)) return "已解锁";
        if (!this.CheckPet(petName)) return "购买宠物后解锁";
        const skill = this.GetSkill(petName, index);
        if (!skill) return "技能未配置";
        return skill.Unlock === "视频" ? "观看视频永久解锁"
            : skill.Unlock === "基因" ? `学习Lv.${skill.GeneLevel}基因解锁` : "购买宠物后解锁";
    }

    /** 仅由激励视频成功回调传true；旧存档缺失该字段时视为尚未视频解锁。 */
    public static TryUnlockVideoSkill(petName: string, videoRewarded: boolean = false): string {
        if (!this.CheckPet(petName)) return "请先购买宠物";
        if (this.GetSkill(petName, 3)?.Unlock !== "视频") return "视频技能配置不存在";
        if (this.IsSkillUnlocked(petName, 3)) return "";
        if (!videoRewarded) return "请完整观看视频后解锁";
        ZRSJZ_GameData.Instance.PetData[petName].VideoSkillUnlocked = true;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PET_GENE_CHANGE, petName);
        return "";
    }

    public static GetPlayerPassiveBonus(petName: string = ZRSJZ_GameData.Instance?.CurPet): ZRSJZ_PetPlayerBonus {
        const bonus = { Attack: 0, MaxHP: 0, DamageReduction: 0 };
        if (!this.CheckPet(petName)) return bonus;
        for (let index = 0; index < 4; index++) {
            const skill = this.GetSkill(petName, index);
            if (skill?.Kind !== "被动" || !this.IsSkillUnlocked(petName, index) || !skill.PlayerBonus) continue;
            bonus.Attack += skill.PlayerBonus.Attack;
            bonus.MaxHP += skill.PlayerBonus.MaxHP;
            bonus.DamageReduction += skill.PlayerBonus.DamageReduction;
        }
        return bonus;
    }

    public static GetGeneLearnError(petName: string, level: number): string {
        if (!this.CheckPet(petName)) return "请先解锁宠物";
        const gene = this.GetGeneConfig(petName, level);
        if (!gene) return "基因配置不存在";
        const learned = this.GetPetGrade(petName);
        if (level <= learned) return "已学习";
        if (level !== learned + 1) return `请先学习Lv.${learned + 1}`;
        if (!Number.isSafeInteger(gene.CostCount) || gene.CostCount < 0
            || !Number.isFinite(gene.Value) || gene.Value <= 0
            || (gene.Type === "技能" && !Number.isSafeInteger(gene.Value))
            || (gene.CostProp !== "金币" && !ZRSJZ_PROP_CONFIG.has(gene.CostProp))) return "基因配置不正确";
        if (this.GetGeneCostOwned(gene) < gene.CostCount) return `${gene.CostProp}不足`;
        return "";
    }

    /** 同步校验和扣费，等级是唯一学习进度，重复点击不会重复发放加成。 */
    public static TryLearnGene(petName: string, level: number): string {
        const error = this.GetGeneLearnError(petName, level);
        if (error) return error;
        const gene = this.GetGeneConfig(petName, level)!;
        const data = ZRSJZ_GameData.Instance;
        const previousLevel = data.PetData[petName].Level;
        // ConsumeProp会通知库存并存档，先写等级，让同一次库存存档包含学习结果。
        data.PetData[petName].Level = level;
        if (gene.CostProp === "金币") data.Gold -= gene.CostCount;
        else if (gene.CostCount > 0 && !ZRSJZ_InventoryService.ConsumeProp(gene.CostProp, gene.CostCount)) {
            data.PetData[petName].Level = previousLevel;
            return `${gene.CostProp}不足`;
        }
        ZRSJZ_GameData.SaveData();
        if (gene.CostProp === "金币") ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PET_GENE_CHANGE, petName);
        return "";
    }

    /** 基础属性 + 已学基因 + 当前穿戴皮肤；每次重新汇总，不修改配置或存档属性。 */
    public static GetPetStats(petName: string) {
        const config = ZRSJZ_PET_CONFIG.get(petName);
        const result = { Attack: config?.PetHarmony ?? 0, HP: config?.PetHP ?? 0,
            Defense: config?.PetArmor ?? 0, Backpack: config?.PetBackpack ?? 0,
            AttackSpeedMultiplier: 1, Skills: [] as string[] };
        const level = this.GetPetGrade(petName);
        for (const base of ZRSJZ_PET_GENE_CONFIG) {
            const gene = this.GetGeneConfig(petName, base.Level)!;
            if (gene.Level > level) continue;
            switch (gene.Type) {
                case "生命值": result.HP += gene.Value; break;
                case "防御": result.Defense += gene.Value; break;
                case "攻击": result.Attack += gene.Value; break;
                case "攻速": result.AttackSpeedMultiplier += gene.Value; break;
                case "背包": result.Backpack += gene.Value; break;
            }
        }
        const skinBonus = this.GetPetSkinBonus(petName);
        result.Attack += skinBonus.Attack;
        result.HP += skinBonus.HP;
        result.Defense += skinBonus.Defense;
        result.Backpack += skinBonus.Backpack;
        result.AttackSpeedMultiplier += skinBonus.AttackSpeedMultiplier;
        result.Skills = config?.PetSkills.filter((_, index) => this.IsSkillUnlocked(petName, index)) ?? [];
        return result;
    }

    /** 仅当前已拥有且穿戴的皮肤生效，使用与皮肤界面一致的PetSkinAddition配置。 */
    public static GetPetSkinBonus(petName: string) {
        const bonus = { Attack: 0, HP: 0, Defense: 0, Backpack: 0, AttackSpeedMultiplier: 0 };
        const addition = ZRSJZ_PET_SKIN_CONFIG.get(this.GetCurrentSkin(petName))?.PetSkinAddition ?? "";
        for (const entry of addition.split(/[,，、;；\n]+/)) {
            const match = entry.trim().match(/^(攻击|生命值|防御|背包|攻速)\s*[+＋]\s*(\d+(?:\.\d+)?)\s*([%％]?)$/);
            if (!match) continue;
            const value = Number(match[2]);
            if (!Number.isFinite(value)) continue;
            // 攻速用百分比，其余属性使用固定数值，避免把“攻击+10%”误算为攻击+10。
            if (match[1] === "攻速") {
                if (match[3]) bonus.AttackSpeedMultiplier += value / 100;
                continue;
            }
            if (match[3]) continue;
            switch (match[1]) {
                case "攻击": bonus.Attack += value; break;
                case "生命值": bonus.HP += value; break;
                case "防御": bonus.Defense += value; break;
                case "背包": bonus.Backpack += value; break;
            }
        }
        return bonus;
    }

    public static GetGeneEffectText(petName: string, gene: Readonly<ZRSJZ_PetGeneConfig>): string {
        gene = this.GetGeneConfig(petName, gene.Level) ?? gene;
        if (gene.Type === "攻速") return `攻速+${Math.round(gene.Value * 100)}%`;
        if (gene.Type === "技能") {
            const skills = (ZRSJZ_PET_CONFIG.get(petName)?.PetSkills ?? []).map(id => ZRSJZ_PET_SKILL_CONFIG.get(id));
            const names = skills.filter(skill => skill?.Unlock === "基因" && skill.GeneLevel === gene.Level).map(skill => skill.Name);
            return names.length ? `解锁${names.join("、")}` : "该等级未配置技能";
        }
        return `${gene.Type}+${gene.Value}`;
    }

    public static CheckPet(petName: string): boolean {
        const pets = ZRSJZ_GameData.Instance?.PetData;
        return !!pets && Object.prototype.hasOwnProperty.call(pets, petName) && !!pets[petName];
    }

    public static CheckPetSkin(petName: string, skinName: string): boolean {
        return this.CheckPet(petName) && ZRSJZ_GameData.Instance.PetData[petName].Skins.includes(skinName);
    }

    public static SetBattlePet(petName: string): boolean {
        if (!ZRSJZ_PET_CONFIG.has(petName) || !this.CheckPet(petName)) return false;
        const data = ZRSJZ_GameData.Instance;
        if (data.CurPet === petName) return true;
        if (this.CheckPet(data.CurPet)) {
            data.PetData[data.CurPet].CurrentSkin = this.GetCurrentSkin(data.CurPet);
        }
        const skinName = this.GetCurrentSkin(petName);
        data.CurPet = petName;
        data.CurPetSkin = skinName;
        data.PetData[petName].CurrentSkin = skinName;
        ZRSJZ_GameData.SaveData();
        return true;
    }

    public static GetCurrentSkin(petName: string): string {
        if (!this.CheckPet(petName)) return "";
        const data = ZRSJZ_GameData.Instance;
        const saved = data.PetData[petName].CurrentSkin
            || (data.CurPet === petName ? data.CurPetSkin : "");
        const skins = ZRSJZ_PET_CONFIG.get(petName)?.PetSkins ?? [];
        if (skins.includes(saved) && this.CheckPetSkin(petName, saved)) return saved;
        return skins.find(skin => this.CheckPetSkin(petName, skin)) ?? "";
    }

    public static UseSkin(petName: string, skinName: string): boolean {
        if (!ZRSJZ_PET_CONFIG.get(petName)?.PetSkins.includes(skinName)
            || !this.CheckPetSkin(petName, skinName)) return false;
        const data = ZRSJZ_GameData.Instance;
        data.PetData[petName].CurrentSkin = skinName;
        if (data.CurPet === petName) data.CurPetSkin = skinName;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PET_SKIN_CHANGE, petName);
        return true;
    }

    public static GetSkinUnlock(skinName: string): { resource: string; label: string; count: number } {
        const condition = ZRSJZ_PET_SKIN_CONFIG.get(skinName)?.PetSkinUnlock ?? "";
        if (!condition) return { resource: "", label: "免费获取", count: 0 };
        const separator = condition.indexOf("x");
        const resource = (separator < 0 ? condition : condition.slice(0, separator)).trim();
        const label = separator < 0 ? "" : condition.slice(separator + 1).trim();
        return { resource, label, count: Number(label) };
    }

    public static TryUnlockSkin(petName: string, skinName: string, videoRewarded: boolean = false): string {
        if (!this.CheckPet(petName)) return "请先解锁宠物";
        if (!ZRSJZ_PET_CONFIG.get(petName)?.PetSkins.includes(skinName)
            || !ZRSJZ_PET_SKIN_CONFIG.has(skinName)) return "宠物皮肤配置不存在";
        if (this.CheckPetSkin(petName, skinName)) return "";
        const { resource, count } = this.GetSkinUnlock(skinName);
        const data = ZRSJZ_GameData.Instance;
        if (resource === "视频") {
            if (!videoRewarded) return "请完整观看视频后解锁";
        } else if (resource) {
            if (!Number.isSafeInteger(count) || count <= 0) return "皮肤解锁数量配置不正确";
            if (resource === "金币") {
                if (data.Gold < count) return "金币不足";
                data.Gold -= count;
            } else {
                if (!ZRSJZ_PROP_CONFIG.has(resource)) return "皮肤解锁道具配置不存在";
                if (!ZRSJZ_InventoryService.ConsumeProp(resource, count)) return `${resource}不足`;
            }
        }
        data.PetData[petName].Skins.push(skinName);
        ZRSJZ_GameData.SaveData();
        if (resource === "金币") ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        return "";
    }

    public static GetUnlockLabel(petName: string): string {
        const config = ZRSJZ_PET_CONFIG.get(petName);
        if (!config) return "无法解锁";
        if (config.PetUnlock === "金币解锁") return `${config.PetUnlockValue ?? 0}金币解锁`;
        if (config.PetUnlock === "等级解锁") return `${config.PetUnlockValue ?? 0}级解锁`;
        return config.PetUnlock || "免费解锁";
    }

    /** 视频奖励只能由广告成功回调传入；条件不足和未知配置均不发放宠物。 */
    public static TryUnlockPet(petName: string, videoRewarded: boolean = false): string {
        const config = ZRSJZ_PET_CONFIG.get(petName);
        const data = ZRSJZ_GameData.Instance;
        if (!config || !data) return "宠物配置不存在";
        if (this.CheckPet(petName)) return "";
        let cost = 0;
        switch (config.PetUnlock) {
            case "视频解锁":
                if (!videoRewarded) return "请完整观看视频后解锁";
                break;
            case "金币解锁":
            case "等级解锁": {
                const value = config.PetUnlockValue;
                if (!Number.isInteger(value) || value <= 0) return "宠物解锁条件配置不完整";
                if (config.PetUnlock === "金币解锁") {
                    if (data.Gold < value) return "金币不足";
                    cost = value;
                } else if (data.Grade < value) return `账号达到${value}级后解锁`;
                break;
            }
            case "":
            case "免费解锁":
                break;
            default:
                return `尚未满足解锁条件：${config.PetUnlock}`;
        }
        // 扣费与宠物写入同一次存档，重复回调不会重复扣费或重置等级。
        data.Gold -= cost;
        this.AddPet(petName);
        if (cost > 0) ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        return "";
    }
}
