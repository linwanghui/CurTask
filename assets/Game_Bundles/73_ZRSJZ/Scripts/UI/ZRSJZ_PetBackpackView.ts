import { BlockInputEvents, find, isValid, Node, UITransform } from 'cc';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_GRID_SIZE, ZRSJZ_GRID_INTERVAL, ZRSJZ_INVENTORY } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_FriendlyDamageService } from '../Service/ZRSJZ_FriendlyDamageService';

/** 两个弹窗共用的宠物背包显示规则，不加载DLC资源。 */
export class ZRSJZ_PetBackpackView {
    private readonly root: Node;
    private inventory: Node = null;
    private version = 0;
    private shownKey = '';
    constructor(panel: Node) {
        this.root = find('Panel/宠物背包', panel) ?? find('Panel/宠物背包底', panel);
        if (!this.root) console.error('[宠物背包] 弹窗缺少 Panel/宠物背包 节点', panel.name);
        if (this.root) this.root.active = false;
    }
    public Refresh(playerIndex: number): void {
        if (!isValid(this.root, true)) return;
        const pet = ZRSJZ_UIManager.ZRSJZ_DLC
            ? ZRSJZ_FriendlyDamageService.GetFollowingPetBackpack(playerIndex === 1 ? 1 : 0) : null;
        this.root.active = !!pet;
        if (!pet) { this.Hide(); return; }
        const slots = Math.max(0, Math.min(4, Math.floor(pet.slots)));
        ZRSJZ_InventoryService.SetPetBackpackSlots(playerIndex, slots);
        for (let index = 1; index <= 4; index++) {
            const slot = this.root.getChildByName(String(index));
            const lock = slot?.getChildByName('Lock');
            if (!lock) continue;
            lock.active = index > slots;
            if (!lock.getComponent(BlockInputEvents)) lock.addComponent(BlockInputEvents);
        }
        const key = `${playerIndex}:${slots}`;
        if (key !== this.shownKey) {
            this.shownKey = key;
            const version = ++this.version;
            this.ShowInventory(playerIndex, version).catch(error => {
                if (version === this.version) this.shownKey = '';
                console.error('[宠物背包] 加载失败', error);
            });
        }
    }

    public Hide(): void {
        this.version++;
        this.shownKey = '';
        if (isValid(this.inventory, true) && this.inventory.parent === this.root) this.inventory.active = false;
        if (isValid(this.root, true)) this.root.active = false;
    }

    private async ShowInventory(playerIndex: number, version: number): Promise<void> {
        const node = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.宠物背包, playerIndex, true);
        if (version !== this.version || !isValid(this.root, true) || !this.root.activeInHierarchy) return;
        await node.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.宠物背包, playerIndex);
        if (version !== this.version || !isValid(this.root, true) || !this.root.activeInHierarchy) return;
        this.inventory = node;
        node.active = false;
        node.parent = this.root;
        const first = this.root.getChildByName('1').position;
        const second = this.root.getChildByName('2').position;
        const pitch = ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL;
        const scale = Math.abs(second.x - first.x) / pitch;
        const transform = node.getComponent(UITransform);
        transform.setAnchorPoint(0, 1);
        transform.setContentSize(pitch * 2, pitch * 2);
        node.setScale(scale, scale, 1);
        node.setPosition(first.x - ZRSJZ_GRID_SIZE * scale / 2, first.y + ZRSJZ_GRID_SIZE * scale / 2, 0);
        node.active = true;
    }
}
