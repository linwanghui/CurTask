import { _decorator, Component, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PrefsManager')
export default class PrefsManager extends Component {
    public jsonData: { [key: string]: any } = {};
    public static ClearData() {
        sys.localStorage.clear();
    }
    public static GetItem(key: string) {
        return sys.localStorage.getItem(key);
    }
    public static SetItem(key: string, value: any) {
        sys.localStorage.setItem(key, value.toString());
    }

    public static SetString(key: string, value: string) {
        sys.localStorage.setItem(key, value);
    }

    public static GetString(key: string, defaultValue: string = "") {
        if (PrefsManager.GetItem(key)) {
            return sys.localStorage.getItem(key).toString();
        }
        return defaultValue;
    }

    public static GetBool(key: string, defaultValue: boolean = false) {
        if (sys.localStorage.getItem(key) == null || isNaN(Number(sys.localStorage.getItem(key)))) return defaultValue;
        return Boolean(Number(sys.localStorage.getItem(`${key}`)));
    }

    public static SetBool(key: string, value: boolean) {
        sys.localStorage.setItem(key, Number(value).toString());
    }

    public static SetNumber(key: string, value: any) {
        sys.localStorage.setItem(key, value.toString());
    }

    public static GetNumber(key: string, defaultValue: number = 0) {
        if (!sys.localStorage.getItem(key)) return defaultValue;
        return Number(sys.localStorage.getItem(key));
    }
}