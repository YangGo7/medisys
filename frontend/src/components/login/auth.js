import axios from 'axios';

export async function login({username, password , code}){
    return axios.post('/api/login/',{username , password ,code});
}

export async function autoLogin({code}){
    return axios.post('/api/auto-login/', {code});
}