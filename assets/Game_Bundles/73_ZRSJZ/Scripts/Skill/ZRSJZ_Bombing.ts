import { ZRSJZ_FriendlyDamageService } from '../Service/ZRSJZ_FriendlyDamageService';
import { _decorator, Component, director, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Player } from '../Controller/ZRSJZ_Player';
import { ZRSJZ_Bomb } from './ZRSJZ_Bomb';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Bombing')
export class ZRSJZ_Bombing extends ZRSJZ_Bomb {

    Init(): void {
        super.Init();
        this.SkillRange = 400;
    }
    Attack() {
        ZRSJZ_FriendlyDamageService.DamageArea(this.node.worldPosition, this.SkillRange, this.SkillDamage);
    }
}
