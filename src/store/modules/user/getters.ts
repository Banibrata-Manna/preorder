import { GetterTree } from 'vuex'
import UserState from './UserState'
import RootState from '../../RootState'

const getters: GetterTree <UserState, RootState> = {
    isAuthenticated (state) {
        return !!state.token;
    },
    isUserAuthenticated(state) {
        return state.token && state.current
    },
    getUserToken (state) {
        return state.token
    },
    getUserPermissions (state) {
        return state.permissions;
    },
    getUserProfile (state) {
        return state.current
    },
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    getBaseUrl (state) {
        let baseURL = process.env.VUE_APP_BASE_URL;
        if (!baseURL) baseURL = state.instanceUrl;
        return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`;
    },
    getPwaState(state) {
        return state.pwaState;
    },
    getCurrentEComStore(state) {
        return state.currentEComStore
    },
    getVirtualFacilities(state) {
        return state.virtualFacilities
    },
    getCurrentOrderParking(state) {
        return state.currentOrderParking
    },
    getMaargeInstanceUrl(state) {
        return state.maargeInstanceUrl;
    },
    getMaargeBaseUrl(state) {
        const maargeInstanceUrl = state.maargeInstanceUrl;
        return maargeInstanceUrl.startsWith('http') ? maargeInstanceUrl.includes('/rest/s1') ? maargeInstanceUrl : `${maargeInstanceUrl}/rest/s1` : `https://${maargeInstanceUrl}.hotwax.io/rest/s1`;
    }
}
export default getters;