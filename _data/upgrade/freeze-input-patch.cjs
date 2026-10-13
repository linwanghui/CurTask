const fs=require('fs');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
function edit(file,changes){let s=fs.readFileSync(root+file,'utf8');for(const [from,to] of changes){if(!s.includes(from))throw Error(file+': missing '+from);s=s.replace(from,to);}fs.writeFileSync(root+file,s);}
edit('Controller/ZRSJZ_Player.ts',[
 ['if (this.IsDead || this.IsFishing || this._isStop','if (this.IsDead || this.IsFrozen || this.IsFishing || this._isStop'],
 ['return this.CanUseAsyncResult(game) && !game.GamePaused','return !this.IsFrozen && this.CanUseAsyncResult(game) && !game.GamePaused'],
 ['if (this.IsFishing || this._isStop || this.IsDead','if (this.IsFrozen || this.IsFishing || this._isStop || this.IsDead'],
 ...['public CanCastFengYi(showTip = true): boolean','public get IsSlide(): boolean','public get IsSkill(): boolean','public get IsSwitch(): boolean','public CanReload(): boolean'].map(s=>[s+' {',s+' {\n        if (this.IsFrozen) return false;']),
 ...['Skill(skillName: string, dirX?: number, dirY?: number, radius?: number, playerIndex?: number)','Attack(fireing: boolean, playerIndex?: number)','KnifeAttack(skillRange: number)','SwitchWeapon(weaponType: string, playerIndex?: number)','Slide(playerIndex?: number)'].map(s=>[s+' {',s+' {\n        if (this.IsFrozen) return;']),
 ['Reload(fill: number, isCancelled: boolean = false, playerIndex?: number) {','Reload(fill: number, isCancelled: boolean = false, playerIndex?: number) {\n        if (this.IsFrozen && !isCancelled) return;'],
]);
edit('Controller/ZRSJZ_Joystick_Attack.ts',[
 ...['OnTouchStart_Attack(event: EventTouch)','OnButtonClick(event: EventTouch)'].map(s=>[s+' {',s+' {\n        if (ZRSJZ_Game.Instance?.GetPlayer(this.PlayerIndex)?.IsFrozen) return;']),
 ['protected update(dt: number): void {','protected update(dt: number): void {\n        if (ZRSJZ_Game.Instance?.GetPlayer(this.PlayerIndex)?.IsFrozen) {\n            this.ResetFishingInput();\n            return;\n        }'],
]);
edit('Skill/ZRSJZ_Skill_Button.ts',[
 ['const skillName = this.SkillName.trim();','if (ZRSJZ_Game.Instance?.GetPlayer(this.PlayerIndex)?.IsFrozen) return false;\n        const skillName = this.SkillName.trim();'],
 ['private OnTouchStart(event: EventTouch): void {','private OnTouchStart(event: EventTouch): void {\n        if (ZRSJZ_Game.Instance?.GetPlayer(this.PlayerIndex)?.IsFrozen) return;'],
]);
edit('Controller/ZRSJZ_Joystick_Drug.ts',[
 ['OnButtonClick(event: EventTouch) {','OnButtonClick(event: EventTouch) {\n        if (ZRSJZ_Game.Instance?.GetPlayer(this.PlayerIndex)?.IsFrozen) return;'],
 ['if (!game || !player) return;','if (!game || !player || player.IsFrozen) return;'],
]);
edit('Controller/ZRSJZ_SnowPrayer.ts',[
 ['player.IsDead || player.IsFishing','player.IsDead || player.IsFishing || player.IsFrozen'],
]);
console.log('Freeze combat input guards installed');
