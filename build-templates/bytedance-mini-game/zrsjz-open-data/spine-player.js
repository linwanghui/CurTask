'use strict';
// Original game artwork only. Animation time is created locally, never uploaded.
const spine = require('./spine-runtime.js');
module.exports = function (image, paint) {
    let resources = {}, dataCache = {}, instances = new Map();
    function install(data) { Object.assign(resources,data); for(const id of Object.keys(data))delete dataCache[id]; instances.clear(); }
    function skeletonData(id) {
        if (dataCache[id]) return dataCache[id];
        const source = resources[id];
        if (!source) return null;
        for (const page of Object.values(source.pages)) if (!image(page)) return null;
        const atlas = new spine.TextureAtlas(source.atlas, name => {
            const img = image(source.pages[name]);
            return { getImage: () => img, setFilters() {}, setWraps() {}, dispose() {} };
        });
        const loader = new spine.AtlasAttachmentLoader(atlas);
        // The game's skeleton contains optional attachments (e.g. helicopters) absent from its atlas.
        for(const method of ['newRegionAttachment','newMeshAttachment']) {
            const create=loader[method];
            loader[method]=function(skin,name,path){return atlas.findRegion(path) ? create.call(this,skin,name,path) : null;};
        }
        return dataCache[id] = new spine.SkeletonJson(loader).readSkeletonData(source.json);
    }
    function instance(id, skin, animation, key, knife) {
        let current = instances.get(key);
        if (current) return current;
        const data = skeletonData(id); if (!data) return null;
        const skeleton = new spine.Skeleton(data);
        skeleton.setSkinByName(skin); skeleton.setToSetupPose();
        const state = new spine.AnimationState(new spine.AnimationStateData(data));
        state.setAnimation(0, animation || data.animations[0].name, true);
        if (knife) state.setAnimation(1, animation, true);
        current = { skeleton, state, time: Date.now(), attachment: null, sourceAttachment: null };
        instances.set(key, current); return current;
    }
    function update(current) {
        const now = Date.now(), dt = Math.min(.1, Math.max(0, (now-current.time)/1000)); current.time = now;
        current.state.update(dt); current.state.apply(current.skeleton);
    }
    function render(current, weapon, slotName, weaponPath, ctx, isRole) {
        const skeleton = current.skeleton;
        if (isRole) {
            const knife = slotName === 'dao' || !weapon;
            for (const slot of skeleton.slots) {
                const name = slot.data.name;
                if (['t','j','b'].includes(name) || (knife ? name.includes('左手3拿枪手2') : name.includes('左手3拿枪手1'))) slot.setAttachment(null);
                if (!knife && name.includes('左手3拿枪手2') || knife && name.includes('左手3拿枪手1')) {
                    if (!slot.getAttachment()) slot.setAttachment(skeleton.getAttachmentByName(name,name));
                }
            }
            for (const name of ['dao','步枪','狙击枪','散弹枪']) {
                const slot = skeleton.findSlot(name); if (!slot) continue;
                if (name !== slotName || !weapon) { slot.setAttachment(null); continue; }
                const source = skeleton.getAttachmentByName(name, name === 'dao' ? weapon : name);
                if (name === 'dao') { slot.setAttachment(source); continue; }
                const img = image(weaponPath);
                if (!img || !(source instanceof spine.RegionAttachment)) { slot.setAttachment(null); continue; }
                if (current.sourceAttachment !== source) {
                    const attachment = source.copy();
                    // Match the game's resizeSlotRegion, preserving trimmed atlas offsets.
                    attachment.width = img.width; attachment.height = img.height;
                    attachment.setRegion({ ...source.region, width: img.width, height: img.height,
                        originalWidth: img.width, originalHeight: img.height, u:0, v:0, u2:1, v2:1, rotate:false,
                        texture: { getImage: () => img } });
                    attachment.updateOffset(); current.attachment = attachment; current.sourceAttachment = source;
                }
                slot.setAttachment(current.attachment);
            }
        }
        skeleton.updateWorldTransform();
        let endSlot = null;
        for (const slot of skeleton.drawOrder) {
            const attachment = slot.getAttachment();
            if (attachment instanceof spine.ClippingAttachment && !endSlot) {
                const xy = new Float32Array(attachment.worldVerticesLength);
                attachment.computeWorldVertices(slot,0,xy.length,xy,0,2);
                ctx.save(); ctx.beginPath(); ctx.moveTo(xy[0],xy[1]);
                for(let i=2;i<xy.length;i+=2)ctx.lineTo(xy[i],xy[i+1]);
                ctx.closePath();ctx.clip();endSlot=attachment.endSlot || true;
            } else if (attachment instanceof spine.RegionAttachment || attachment instanceof spine.MeshAttachment) {
                const region = attachment instanceof spine.RegionAttachment;
                const xy = new Float32Array(region ? 8 : attachment.worldVerticesLength);
                if(region) attachment.computeWorldVertices(slot.bone,xy,0,2);
                else attachment.computeWorldVertices(slot,0,xy.length,xy,0,2);
                paint(attachment.region.texture.getImage(), {xy, uv:attachment.uvs,
                    ix:region ? [0,1,2,2,3,0] : attachment.triangles,
                    alpha:skeleton.color.a*slot.color.a*attachment.color.a, blend:slot.data.blendMode});
            }
            if(endSlot === slot.data){ctx.restore();endSlot=null;}
        }
        if(endSlot)ctx.restore();
    }
    return { install, clear: () => instances.clear(),
        role(entry, catalog, ctx) {
            const name=catalog.skins[entry.extra.s]||catalog.skins[0], weapon=catalog.weapons[entry.extra.w]||'', slot=catalog.weaponSlots[weapon];
            const variants=catalog.weaponSkins[weapon]||[], variant=variants[entry.extra.p]||variants[0]||weapon;
            const knife=slot==='dao'||!weapon, key='role:'+entry.extra.s+':'+entry.extra.w+':'+entry.extra.p;
            const current=instance('player',catalog.skinNames[name],knife?'daiji_dao1':'daiji_q',key,knife);
            if(current){update(current);render(current,weapon,slot,catalog.weaponImages[variant],ctx,true);}
        },
        frame(id, ctx) {
            const current=instance('frame'+id,'default',null,'frame:'+id,false);
            if(current){update(current);render(current,'','','',ctx,false);}
        }
    };
};
