import PrefsManager from '../Managers/PrefsManager';

export default class CooldownUtil {

    /**开始冷却 */
    public static StartCooldown(key: string) {
        PrefsManager.SetNumber(key, Date.now());
    }

    /**获取据开始冷却已经流逝的时间，单位s */
    public static GetElapsedTime(key: string) {
        let date = PrefsManager.GetNumber(key, Date.now());
        return Math.floor((Date.now() - date) / 1000);
    }

}